type Props = {
  text: string;
  className?: string;
};

/** Renders AI summary text; lines starting with `###` become headings (prefix omitted). */
export function AiSummaryText({ text, className = "" }: Props) {
  const lines = text.split("\n");

  return (
    <div className={`grid gap-2 ${className}`.trim()}>
      {lines.map((line, index) => {
        const trimmedStart = line.trimStart();
        if (trimmedStart.startsWith("###")) {
          const heading = trimmedStart.slice(3).trimStart();
          if (!heading) return null;
          return (
            <h4 key={index} className="pt-1 text-sm font-semibold text-ios-label">
              {heading}
            </h4>
          );
        }
        if (!line.trim()) {
          return <div key={index} className="h-0.5" aria-hidden />;
        }
        return (
          <p key={index} className="text-sm leading-relaxed whitespace-pre-wrap text-ios-label">
            {line}
          </p>
        );
      })}
    </div>
  );
}
