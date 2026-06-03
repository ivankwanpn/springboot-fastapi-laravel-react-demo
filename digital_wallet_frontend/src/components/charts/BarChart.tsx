interface BarChartProps {
  data: { label: string; value: number }[];
  height?: number;
  className?: string;
}

export default function BarChart({ data, height = 200, className = '' }: BarChartProps) {
  if (data.length === 0) {
    return (
      <div className={`flex items-center justify-center text-navy-400 text-sm ${className}`} style={{ height }}>
        No data available
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const padding = { top: 20, bottom: 30, left: 50, right: 10 };
  const chartWidth = Math.max(data.length * 40, 200);
  const chartHeight = height;
  const barWidth = Math.min(24, (chartWidth - padding.left - padding.right) / data.length - 8);

  return (
    <svg
      viewBox={`0 0 ${chartWidth} ${chartHeight}`}
      className={`w-full ${className}`}
      style={{ maxHeight: height }}
    >
      {/* Y-axis labels */}
      <text x="8" y={padding.top + 4} className="fill-navy-400 text-[10px]" fontSize="10">{maxValue}</text>
      <text x="8" y={chartHeight / 2 + 4} className="fill-navy-400 text-[10px]" fontSize="10">{Math.round(maxValue / 2)}</text>
      <text x="8" y={chartHeight - padding.bottom + 4} className="fill-navy-400 text-[10px]" fontSize="10">0</text>

      {/* Grid line */}
      <line x1={padding.left} y1={chartHeight / 2} x2={chartWidth - padding.right} y2={chartHeight / 2} stroke="currentColor" className="text-navy-600" strokeDasharray="4" />

      {data.map((d, i) => {
        const barHeight = Math.max((d.value / maxValue) * (chartHeight - padding.top - padding.bottom), 2);
        const x = padding.left + i * ((chartWidth - padding.left - padding.right) / data.length) + ((chartWidth - padding.left - padding.right) / data.length - barWidth) / 2;
        const y = chartHeight - padding.bottom - barHeight;

        return (
          <g key={d.label}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              rx="3"
              ry="3"
              className="fill-emerald-400 hover:fill-emerald-300 transition-colors"
            >
              <title>{d.label}: {d.value}</title>
            </rect>
            {data.length <= 15 && (
              <text
                x={x + barWidth / 2}
                y={chartHeight - padding.bottom + 14}
                textAnchor="middle"
                className="fill-navy-400 text-[9px]"
                fontSize="9"
              >
                {d.label.slice(5)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
