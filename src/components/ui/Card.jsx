export default function Card({ children, className = '', padding = true, ...props }) {
  return (
    <div
      className={`bg-white rounded-2xl border border-stone-200 shadow-sm ${padding ? 'p-6 sm:p-8' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
