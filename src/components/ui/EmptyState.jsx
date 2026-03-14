export default function EmptyState({
  title,
  message,
  action,
  icon,
  className = '',
}) {
  return (
    <div className={`text-center py-12 ${className}`}>
      {icon && <div className="mb-4 flex justify-center">{icon}</div>}
      <h3 className="text-xl font-display font-semibold text-stone-900 tracking-tight mb-2">
        {title}
      </h3>
      {message && <p className="text-stone-600 mb-6 max-w-md mx-auto">{message}</p>}
      {action && <div>{action}</div>}
    </div>
  );
}
