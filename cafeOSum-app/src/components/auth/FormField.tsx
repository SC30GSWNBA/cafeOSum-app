import { useState } from 'react'
import type { FieldError } from 'react-hook-form'

interface FormFieldProps {
  label: string
  required?: boolean
  error?: FieldError
  hint?: string
  children: React.ReactNode
}

export function FormField({ label, required, error, hint, children }: FormFieldProps) {
  return (
    <div className="mb-[18px]">
      <label className="block text-[13px] font-semibold mb-1.5" style={{ color: '#3B1F0E' }}>
        {label}
        {required && <span className="ml-0.5" style={{ color: '#DC2626' }}>*</span>}
      </label>
      {children}
      {hint && !error && (
        <p className="text-xs mt-1" style={{ color: '#9E8E7E' }}>{hint}</p>
      )}
      {error && (
        <p className="text-xs mt-1" style={{ color: '#DC2626' }}>{error.message}</p>
      )}
    </div>
  )
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon: string
  hasError?: boolean
  rightElement?: React.ReactNode
}

export function Input({ icon, hasError, rightElement, ...props }: InputProps) {
  return (
    <div className="relative flex items-center">
      <span
        className="absolute left-3 pointer-events-none text-[15px]"
        style={{ color: '#9E8E7E' }}
      >
        {icon}
      </span>
      <input
        {...props}
        className={[
          'w-full py-[10px] px-3 pl-[38px] border rounded-lg text-sm outline-none transition-all font-[inherit]',
          hasError
            ? 'border-[#DC2626] bg-[#FEE2E2] focus:shadow-[0_0_0_3px_rgba(220,38,38,0.1)]'
            : 'border-[#DDD5C8] bg-[#F9F5F0] focus:border-[#7C4A1E] focus:bg-white focus:shadow-[0_0_0_3px_rgba(124,74,30,0.1)]',
          props.className ?? '',
        ].join(' ')}
        style={{ color: '#3B1F0E', ...props.style }}
      />
      {rightElement && (
        <div className="absolute right-3">{rightElement}</div>
      )}
    </div>
  )
}

interface PasswordInputProps extends Omit<InputProps, 'type' | 'rightElement'> {}

export function PasswordInput(props: PasswordInputProps) {
  const [visible, setVisible] = useState(false)
  return (
    <Input
      {...props}
      type={visible ? 'text' : 'password'}
      rightElement={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="text-[15px] cursor-pointer border-none bg-transparent p-0 leading-none"
          style={{ color: '#9E8E7E' }}
          tabIndex={-1}
        >
          {visible ? '🙈' : '👁'}
        </button>
      }
    />
  )
}
