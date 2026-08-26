import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type FormFieldProps = {
  error?: string;
  hint?: string;
  inputClassName?: string;
  label: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "className"> & { id: string };

export function FormField({
  error,
  hint,
  id,
  inputClassName,
  label,
  ...props
}: FormFieldProps) {
  const descriptionId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [descriptionId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="form-field">
      <label className="form-field__label" htmlFor={id}>
        {label}
      </label>
      {hint && (
        <span className="form-field__hint" id={descriptionId}>
          {hint}
        </span>
      )}
      <input
        className={cn("form-field__input", error && "form-field__input--error", inputClassName)}
        id={id}
        aria-describedby={describedBy}
        aria-invalid={error ? true : undefined}
        {...props}
      />
      {error && (
        <span className="form-field__error" id={errorId} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
