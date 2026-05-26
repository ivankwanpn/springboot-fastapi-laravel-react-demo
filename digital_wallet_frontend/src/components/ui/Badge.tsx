type Variant = 'success' | 'warning' | 'info' | 'danger';

interface BadgeProps {
  children: string;
  variant?: Variant;
}

const variantStyles: Record<Variant, string> = {
  success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  info: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  danger: 'bg-red-500/10 text-red-400 border-red-500/20',
};

export default function Badge({ children, variant = 'info' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-xs font-medium ${variantStyles[variant]}`}
    >
      {children}
    </span>
  );
}
