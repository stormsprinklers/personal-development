type SparklineProps = {
  values: number[];
  width?: number;
  height?: number;
  className?: string;
};

export function Sparkline({ values, width = 160, height = 40, className = "stroke-sky-600" }: SparklineProps) {
  if (!values.length) {
    return <p className="text-xs text-sky-700/70">No data</p>;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = values.length > 1 ? width / (values.length - 1) : width;
  const points = values.map((v, i) => {
    const x = i * step;
    const y = height - ((v - min) / span) * (height - 4) - 2;
    return `${x},${y}`;
  });
  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline fill="none" strokeWidth="2" className={className} points={points.join(" ")} />
    </svg>
  );
}
