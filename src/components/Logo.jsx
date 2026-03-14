/**
 * oh places logo — Lora typography, orange accent for Oh, grey Places
 * Mark: small diamond (discovery / place) in logo accent
 */
export default function Logo({ className = '', size = 'md', showMark = true }) {
  const sizes = {
    sm: { text: 'text-lg sm:text-xl', mark: 18 },
    md: { text: 'text-xl sm:text-2xl', mark: 22 },
    lg: { text: 'text-3xl sm:text-4xl', mark: 32 },
  };
  const s = sizes[size] ?? sizes.md;

  return (
    <span className={`inline-flex items-center gap-1.5 sm:gap-2 font-logo font-semibold tracking-wide text-stone-900 min-w-0 ${className}`}>
      {showMark && (
        <svg
          width={s.mark}
          height={s.mark}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="shrink-0"
          aria-hidden
        >
          {/* Diamond mark — discovery / place, in logo orange */}
          <path
            d="M12 2L22 12L12 22L2 12L12 2Z"
            fill="currentColor"
            className="text-logo-accent"
          />
        </svg>
      )}
      <span className={s.text}>
        <span className="font-bold text-logo-accent">Oh</span>
        <span className="ml-1 text-stone-500">Places</span>
      </span>
    </span>
  );
}
