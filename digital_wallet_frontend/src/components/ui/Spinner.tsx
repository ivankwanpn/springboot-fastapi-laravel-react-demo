interface SpinnerProps {
  className?: string;
}

export default function Spinner({ className = 'h-8 w-8' }: SpinnerProps) {
  return (
    <div className="flex items-center justify-center p-8">
      <svg className={`animate-spin text-emerald-400 ${className}`} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-20" />
        <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-80" />
      </svg>
    </div>
  );
}
