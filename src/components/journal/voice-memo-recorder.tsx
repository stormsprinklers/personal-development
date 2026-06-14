"use client";

import { useEffect, useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { GlassButton } from "@/components/ui/glass-button";
import { useAuth } from "@/lib/auth/auth-context";
import { voiceMemoBlobPath, VOICE_MEMO_MAX_DURATION_MS } from "@/lib/journal/voice-memo";

export type TranscribedVoiceMemo = {
  transcript: string;
  voiceMemo: {
    id: string;
    expiresAt: string;
  };
};

type Props = {
  onTranscribed: (result: TranscribedVoiceMemo) => void;
  disabled?: boolean;
};

type RecorderState = "idle" | "recording" | "uploading" | "transcribing" | "error";

function formatDuration(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function pickRecorderMimeType() {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

export function VoiceMemoRecorder({ onTranscribed, disabled = false }: Props) {
  const { user } = useAuth();
  const [state, setState] = useState<RecorderState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  function stopTracks() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  async function processRecording(blob: Blob, mimeType: string) {
    if (!user) {
      setState("error");
      setError("Sign in to record voice memos.");
      return;
    }

    setState("uploading");
    setError(null);

    const extension = mimeType.includes("mp4") ? "m4a" : mimeType.includes("ogg") ? "ogg" : "webm";
    const pathname = voiceMemoBlobPath(user.id, `${crypto.randomUUID()}.${extension}`);

    let uploaded;
    try {
      uploaded = await upload(pathname, blob, {
        access: "private",
        handleUploadUrl: "/api/journal/voice-upload",
        contentType: mimeType || blob.type || "audio/webm",
      });
    } catch (uploadError) {
      setState("error");
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed.");
      return;
    }

    setState("transcribing");
    try {
      const response = await fetch("/api/journal/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blobUrl: uploaded.url,
          pathname: uploaded.pathname,
        }),
      });
      const payload = (await response.json()) as TranscribedVoiceMemo & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Transcription failed.");
      }
      if (!payload.transcript?.trim() || !payload.voiceMemo?.id) {
        throw new Error("No transcript returned.");
      }
      onTranscribed({
        transcript: payload.transcript.trim(),
        voiceMemo: payload.voiceMemo,
      });
      setState("idle");
      setElapsedMs(0);
    } catch (transcribeError) {
      setState("error");
      setError(transcribeError instanceof Error ? transcribeError.message : "Transcription failed.");
    }
  }

  async function startRecording() {
    if (!user) {
      setError("Sign in to record voice memos.");
      setState("error");
      return;
    }
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("Voice recording is not supported in this browser.");
      setState("error");
      return;
    }

    setError(null);
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = pickRecorderMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        if (timerRef.current) {
          window.clearInterval(timerRef.current);
          timerRef.current = null;
        }
        stopTracks();
        const type = recorder.mimeType || mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        chunksRef.current = [];
        if (!blob.size) {
          setState("error");
          setError("No audio captured. Try recording again.");
          return;
        }
        void processRecording(blob, type);
      };

      recorder.onerror = () => {
        setState("error");
        setError("Recording failed.");
        stopTracks();
      };

      recorder.start();
      startedAtRef.current = Date.now();
      setElapsedMs(0);
      setState("recording");
      timerRef.current = window.setInterval(() => {
        setElapsedMs(Date.now() - startedAtRef.current);
      }, 250);

      window.setTimeout(() => {
        if (mediaRecorderRef.current?.state === "recording") {
          stopRecording();
        }
      }, VOICE_MEMO_MAX_DURATION_MS);
    } catch (captureError) {
      stopTracks();
      setState("error");
      setError(captureError instanceof Error ? captureError.message : "Microphone access denied.");
    }
  }

  function stopRecording() {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== "recording") return;
    recorder.stop();
    mediaRecorderRef.current = null;
  }

  const busy = state === "uploading" || state === "transcribing";
  const recording = state === "recording";

  return (
    <div className="ios-card-muted grid gap-2 rounded-2xl p-4" data-no-tab-swipe="">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-ios-label">Voice memo</p>
          <p className="ios-footnote text-ios-secondary">
            Record up to {formatDuration(VOICE_MEMO_MAX_DURATION_MS)}. Audio is kept for 7 days; transcript stays in your journal.
          </p>
        </div>
        {recording ? <span className="text-sm font-medium text-copper">{formatDuration(elapsedMs)}</span> : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {!recording ? (
          <GlassButton variant="secondary" onClick={() => void startRecording()} disabled={disabled || busy}>
            {busy ? (state === "uploading" ? "Uploading…" : "Transcribing…") : "Record memo"}
          </GlassButton>
        ) : (
          <GlassButton variant="primary" onClick={stopRecording}>
            Stop & transcribe
          </GlassButton>
        )}
      </div>

      {error ? <p className="text-sm text-copper">{error}</p> : null}
    </div>
  );
}
