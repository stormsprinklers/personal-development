type MiniBarsProps = {
  values: number[];
  labels?: string[];
  maxHeight?: number;
  barClassName?: string;
};

export function MiniBars({ values, labels, maxHeight = 72, barClassName = "bg-sky-500" }: MiniBarsProps) {
  const max = Math.max(1, ...values);
  return (
    <div className="flex items-end gap-1">
      {values.map((v, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1">
          <div
            className={`w-full max-w-[14px] rounded-sm ${barClassName}`}
            style={{ height: `${Math.max(4, (v / max) * maxHeight)}px` }}
            title={labels?.[i] ?? String(v)}
          />
          {labels?.[i] ? (
            <span className="max-w-[3rem] truncate text-[10px] text-sky-700/70">{labels[i]}</span>
          ) : null}
        </div>
      ))}
    </div>
  );
}
