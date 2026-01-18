type StatusTone = 'good' | 'idle' | 'warn' | 'error';

type StatusPillProps = {
  label: string;
  tone?: StatusTone;
};

const toneStyles: Record<StatusTone, string> = {
  good: 'bg-emerald-100 text-emerald-900 border-emerald-200',
  idle: 'bg-amber-100 text-amber-900 border-amber-200',
  warn: 'bg-orange-100 text-orange-900 border-orange-200',
  error: 'bg-rose-100 text-rose-900 border-rose-200'
};

export function StatusPill({ label, tone = 'idle' }: StatusPillProps) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wide ${toneStyles[tone]}`}
    >
      <span className="h-2 w-2 rounded-full bg-current" />
      {label}
    </span>
  );
}
