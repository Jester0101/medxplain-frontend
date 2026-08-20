export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <span
        aria-hidden
        className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-foreground"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--background)"
             strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12h4l2.2-6 3.4 10 2.6-8 1.8 4H21" />
        </svg>
      </span>
      <span className="font-heading text-[15px] font-semibold tracking-tight">DoctorSHAP</span>
    </div>
  );
}
