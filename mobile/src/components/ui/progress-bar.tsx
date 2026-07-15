type ProgressBarProps = Readonly<{
  accent?: "blue" | "coral" | "green" | "orange" | "purple";
  label: string;
  value: number;
}>;

export function ProgressBar({
  accent = "purple",
  label,
  value,
}: ProgressBarProps) {
  const normalizedValue = Math.max(0, Math.min(100, value));

  return (
    <div
      aria-label={label}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={normalizedValue}
      className={`progress-track accent-${accent}`}
      role="progressbar"
    >
      <span style={{ width: `${normalizedValue}%` }} />
    </div>
  );
}
