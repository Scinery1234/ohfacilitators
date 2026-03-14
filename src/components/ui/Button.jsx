export default function Button({
  children,
  variant = 'primary',
  type = 'button',
  disabled = false,
  loading = false,
  onClick,
  className = '',
  ...props
}) {
  const baseStyles =
    'inline-flex items-center justify-center font-semibold py-2.5 px-5 rounded-xl text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-stone-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none';

  const variants = {
    primary:
      'bg-stone-900 text-stone-50 hover:bg-stone-800 shadow-sm shadow-stone-900/10 focus:ring-stone-400',
    secondary:
      'bg-stone-100 text-stone-800 border border-stone-200 hover:bg-stone-200 hover:border-stone-300 focus:ring-stone-300',
    accent:
      'bg-primary-200 text-primary-100 hover:bg-primary-300 focus:ring-primary-200/50',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-400',
    outline:
      'bg-transparent text-stone-700 border-2 border-stone-300 hover:border-stone-400 hover:bg-stone-50 focus:ring-stone-300',
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`${baseStyles} ${variants[variant]} ${className}`}
      {...props}
    >
      {loading ? (
        <>
          <svg
            className="animate-spin -ml-0.5 mr-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Loading...
        </>
      ) : (
        children
      )}
    </button>
  );
}
