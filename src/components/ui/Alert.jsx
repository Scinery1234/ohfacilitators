export default function Alert({ type = 'info', children, className = '', ...props }) {
  const styles = {
    info: 'bg-sky-50 border-sky-200/80 text-sky-800',
    success: 'bg-green-50 border-green-200/80 text-green-800',
    error: 'bg-red-50 border-red-200/80 text-red-800',
    warning: 'bg-amber-50 border-amber-200/80 text-amber-800',
  };

  return (
    <div
      className={`rounded-xl border p-4 text-sm ${styles[type]} ${className}`}
      role="alert"
      {...props}
    >
      {children}
    </div>
  );
}
