"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";

type Props = {
  onScan: (code: string) => void;
  onError?: (message: string) => void;
};

export function BarcodeScanner({ onScan, onError }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [manualCode, setManualCode] = useState("");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const scannedRef = useRef(false);

  useEffect(() => {
    scannedRef.current = false;
    const reader = new BrowserMultiFormatReader();
    let active = true;

    let controls: { stop: () => void } | null = null;

    async function start() {
      try {
        const devices = await BrowserMultiFormatReader.listVideoInputDevices();
        const backCamera = devices.find((d) => /back|rear|environment/i.test(d.label)) ?? devices[0];
        if (!backCamera || !videoRef.current) {
          setCameraError("No camera found.");
          return;
        }
        controls = await reader.decodeFromVideoDevice(backCamera.deviceId, videoRef.current, (result) => {
          if (!active || scannedRef.current) return;
          if (result) {
            scannedRef.current = true;
            onScan(result.getText());
          }
        });
      } catch {
        setCameraError("Camera access denied or unavailable.");
        onError?.("Camera access denied or unavailable.");
      }
    }

    void start();
    return () => {
      active = false;
      controls?.stop();
    };
  }, [onScan, onError]);

  return (
    <div className="grid gap-3">
      {cameraError ? (
        <p className="text-sm text-copper">{cameraError}</p>
      ) : (
        <div className="overflow-hidden rounded-xl bg-black">
          <video ref={videoRef} className="aspect-video w-full object-cover" muted playsInline />
        </div>
      )}
      <label className="grid gap-1 text-xs font-medium text-ios-secondary">
        Or enter barcode manually
        <div className="flex gap-2">
          <input
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="Barcode number"
            className="ios-field min-w-0 flex-1 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => {
              const code = manualCode.replace(/\D/g, "");
              if (code.length >= 8) onScan(code);
            }}
            className="glass-button-tint rounded-xl px-3 py-2 text-sm font-semibold"
          >
            Look up
          </button>
        </div>
      </label>
    </div>
  );
}
