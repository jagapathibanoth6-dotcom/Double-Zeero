/**
 * Small single-series bar chart for the dashboard (e.g. covers by hour).
 *
 * One colour per chart (no legend needed for a single series), bars anchored
 * to the baseline with rounded tops, a light grid, a tooltip on hover or
 * keyboard focus, and a hidden table so screen readers get the numbers.
 */
export type MiniBarPoint = {
  label: string;
  value: number;
  /** Longer text for the tooltip, e.g. "18:00 · 3 bookings". */
  detail?: string;
  /** Highlights the bar for "now" or "today". */
  current?: boolean;
};

/** Rounded axis top with an even step, so the halfway gridline is a whole number. */
function niceMax(value: number) {
  if (value <= 4) return 4;
  const step = value <= 10 ? 2 : value <= 20 ? 4 : value <= 50 ? 10 : value <= 100 ? 20 : 50;
  return Math.ceil(value / step) * step;
}

export function MiniBarChart({
  title,
  subtitle,
  unit,
  data,
  tone = "ember",
  everyOtherLabel = false,
}: {
  title: string;
  subtitle?: string;
  unit: string;
  data: MiniBarPoint[];
  tone?: "ember" | "violet";
  everyOtherLabel?: boolean;
}) {
  const total = data.reduce((sum, point) => sum + point.value, 0);
  const max = niceMax(Math.max(0, ...data.map((point) => point.value)));
  const ticks = [max, max / 2];

  return (
    <section className={`admin-panel mini-chart is-${tone}`}>
      <div className="mini-chart-head">
        <div>
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        <p className="mini-chart-total">
          {total}
          <small>{total === 1 ? unit.replace(/s$/, "") : unit}</small>
        </p>
      </div>

      <div className="mini-chart-plot">
        <div className="mini-chart-grid" aria-hidden="true">
          {ticks.map((tick) => (
            <span key={tick} style={{ top: `${100 - (tick / max) * 100}%` }}>
              <em>{tick}</em>
            </span>
          ))}
        </div>
        <div className="mini-chart-bars">
          {data.map((point) => (
            <button
              key={point.label}
              type="button"
              className={`mini-chart-bar ${point.value ? "" : "is-zero"} ${point.current ? "is-current" : ""}`}
              aria-label={`${point.detail || point.label}: ${point.value} ${unit}`}
            >
              <i style={{ height: point.value ? `${Math.max(3, (point.value / max) * 100)}%` : "2px" }} />
              <span className="mini-chart-tip">
                {point.detail || point.label} · <b>{point.value}</b> {unit}
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="mini-chart-axis" aria-hidden="true">
        {data.map((point, index) => (
          <span key={point.label}>{everyOtherLabel && index % 2 ? "" : point.label}</span>
        ))}
      </div>

      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col">When</th>
            <th scope="col">{unit}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((point) => (
            <tr key={point.label}>
              <th scope="row">{point.detail || point.label}</th>
              <td>{point.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
