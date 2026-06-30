interface PasswordStrengthProps {
  password: string
}

function getScore(pwd: string) {
  if (!pwd) return 0
  let score = 0
  if (pwd.length >= 8) score++
  if (/\d/.test(pwd)) score++
  if (/[^a-zA-Z0-9]/.test(pwd)) score++
  if (pwd.length >= 12) score++
  return score
}

const barColors = ['', '#DC2626', '#D97706', '#D4A017', '#2E8B57']
const labels = ['', 'Weak', 'Fair', 'Good', 'Strong ✓']
const labelColors = ['#9E8E7E', '#DC2626', '#D97706', '#D4A017', '#2E8B57']

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const score = getScore(password)
  const hasLen = password.length >= 8
  const hasNum = /\d/.test(password)
  const hasSpc = /[^a-zA-Z0-9]/.test(password)

  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-[3px] flex-1 rounded-sm transition-colors duration-200"
            style={{
              background: score >= i ? barColors[score] : '#DDD5C8',
            }}
          />
        ))}
      </div>
      <p className="text-[11px]" style={{ color: password ? labelColors[score] : '#9E8E7E' }}>
        {password ? labels[score] : 'Enter a password'}
      </p>
      <div className="flex flex-col gap-1 mt-2">
        {[
          { met: hasLen, label: 'At least 8 characters' },
          { met: hasNum, label: 'At least one number' },
          { met: hasSpc, label: 'At least one special character' },
        ].map((rule) => (
          <div
            key={rule.label}
            className="flex items-center gap-1.5 text-[11px]"
            style={{ color: rule.met ? '#2E8B57' : '#9E8E7E' }}
          >
            <span>{rule.met ? '✓' : '○'}</span>
            {rule.label}
          </div>
        ))}
      </div>
    </div>
  )
}
