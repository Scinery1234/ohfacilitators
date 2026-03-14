export default function Input({
  label,
  error,
  id,
  name,
  type = 'text',
  placeholder,
  required = false,
  className = '',
  ...props
}) {
  const inputId = id || name;

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-stone-700 mb-1.5"
        >
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <input
        id={inputId}
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        className={`w-full rounded-xl border bg-white px-4 py-3 text-stone-900 placeholder:text-stone-400 transition-colors focus:outline-none focus:ring-2 focus:ring-stone-300 focus:border-transparent ${
          error ? 'border-red-400' : 'border-stone-200 hover:border-stone-300'
        } ${className}`}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${inputId}-error` : undefined}
        {...props}
      />
      {error && (
        <p id={`${inputId}-error`} className="text-red-600 text-sm mt-1.5" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
