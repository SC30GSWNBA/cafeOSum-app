import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { BrandPanel } from '../components/auth/BrandPanel'
import { FormField, Input, PasswordInput } from '../components/auth/FormField'
import { Alert } from '../components/auth/Alert'
import { PasswordStrength } from '../components/auth/PasswordStrength'
import {
  loginSchema, registerSchema, forgotPasswordSchema,
  type LoginValues, type RegisterValues, type ForgotPasswordValues,
} from '../lib/validators'
import { useAuthStore } from '../store/authStore'
import { useAuditStore } from '../store/auditStore'

type AuthView = 'login' | 'login-error' | 'login-locked' | 'register' | 'verify-banner' | 'forgot' | 'reset-sent'

// ── Shared form wrapper ──────────────────────────────────────
function FormPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center overflow-y-auto bg-white px-10 py-12">
      <div className="w-full max-w-[400px]">{children}</div>
    </div>
  )
}

function FormHeading({ title, sub }: { title: string; sub: string }) {
  return (
    <>
      <h1 className="text-2xl font-bold mb-1.5 tracking-tight" style={{ color: '#3B1F0E' }}>{title}</h1>
      <p className="text-[14px] mb-7 leading-relaxed" style={{ color: '#9E8E7E' }}>{sub}</p>
    </>
  )
}

function BtnPrimary({ children, disabled, onClick, type = 'submit' }: {
  children: React.ReactNode; disabled?: boolean; onClick?: () => void; type?: 'submit' | 'button'
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="w-full py-[11px] px-4 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      style={{ background: disabled ? '#3B1F0E' : undefined, backgroundColor: '#3B1F0E' }}
      onMouseEnter={(e) => { if (!disabled) (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#7C4A1E' }}
      onMouseLeave={(e) => { if (!disabled) (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#3B1F0E' }}
    >
      {children}
    </button>
  )
}

function BtnSecondary({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full py-[11px] px-4 rounded-lg text-sm font-semibold mt-2.5 flex items-center justify-center gap-2 transition-colors border"
      style={{ background: '#FFFFFF', color: '#3B1F0E', borderColor: '#DDD5C8' }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#F9F5F0' }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#FFFFFF' }}
    >
      {children}
    </button>
  )
}

function Divider({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 my-5">
      <div className="flex-1 h-px" style={{ background: '#F0EBE3' }} />
      <span className="text-xs whitespace-nowrap" style={{ color: '#9E8E7E' }}>{text}</span>
      <div className="flex-1 h-px" style={{ background: '#F0EBE3' }} />
    </div>
  )
}

function SwitchText({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-center text-[13px] mt-6" style={{ color: '#9E8E7E' }}>{children}</p>
  )
}

function SwitchLink({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="font-semibold underline-offset-2 hover:underline bg-transparent border-none cursor-pointer p-0"
      style={{ color: '#7C4A1E' }}
    >
      {children}
    </button>
  )
}

function TermsText() {
  return (
    <p className="text-xs text-center mt-4 leading-relaxed" style={{ color: '#9E8E7E' }}>
      By signing in, you agree to our{' '}
      <a href="#" className="font-medium hover:underline" style={{ color: '#7C4A1E' }}>Terms of Service</a>
      {' '}and{' '}
      <a href="#" className="font-medium hover:underline" style={{ color: '#7C4A1E' }}>Privacy Policy</a>.
    </p>
  )
}

// ── LOGIN VIEW ───────────────────────────────────────────────
function LoginView({ setView }: { setView: (v: AuthView) => void }) {
  const { login } = useAuthStore()
  const addEvent = useAuditStore((s) => s.addEvent)
  const navigate = useNavigate()
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [apiError, setApiError] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { rememberMe: true },
  })

  const onSubmit = async (data: LoginValues) => {
    setApiError('')
    // Simulate auth — replace with real API call
    await new Promise((r) => setTimeout(r, 600))
    const newAttempts = failedAttempts + 1

    if (data.password !== 'demo@123') {
      const isLockout = newAttempts >= 5
      addEvent({
        eventType: 'FAILED_LOGIN',
        category: 'Auth',
        userId: data.email,
        entityType: 'Session',
        entityId: 'auth',
        payload: { email: data.email, attempt: newAttempts },
        status: isLockout ? 'error' : 'warn',
        summary: `Login failed (${newAttempts}${['st','nd','rd'][newAttempts-1]??'th'} attempt)` + (isLockout ? ' · Account locked 15 min' : ''),
      })
      if (isLockout) {
        setView('login-locked')
        return
      }
      setFailedAttempts(newAttempts)
      const remaining = 5 - newAttempts
      setApiError(`Incorrect password. You have ${remaining} attempt${remaining === 1 ? '' : 's'} remaining before your account is locked for 15 minutes.`)
      return
    }

    const user = {
      id: '1',
      email: data.email,
      cafeName: 'Demo Cafe',
      emailVerified: false,
      createdAt: new Date().toISOString(),
    }
    login(user, 'demo-token')
    addEvent({
      eventType: 'LOGIN',
      category: 'Auth',
      userId: data.email,
      entityType: 'Session',
      entityId: 'auth',
      payload: { email: data.email, remember_me: data.rememberMe ?? false },
      status: 'ok',
      summary: 'Login successful',
    })
    navigate('/dashboard')
  }

  return (
    <FormPanel>
      <FormHeading title="Welcome back" sub="Sign in to your CafeOSum account" />

      {apiError && (
        <Alert variant="error">
          <strong>Incorrect password.</strong> {apiError.replace('Incorrect password. ', '')}
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <FormField label="Email address" required error={errors.email}>
          <Input icon="✉" type="email" placeholder="you@yourcafe.com" hasError={!!errors.email} {...register('email')} />
        </FormField>

        <FormField label="Password" required error={errors.password}>
          <PasswordInput icon="🔒" placeholder="Enter your password" hasError={!!errors.password} {...register('password')} />
        </FormField>

        <div className="flex items-center justify-between mb-5">
          <label className="flex items-center gap-2 text-[13px] cursor-pointer select-none" style={{ color: '#6B5B4E' }}>
            <input type="checkbox" className="w-[15px] h-[15px] cursor-pointer" style={{ accentColor: '#3B1F0E' }} {...register('rememberMe')} />
            Remember me for 30 days
          </label>
          <button
            type="button"
            onClick={() => setView('forgot')}
            className="text-[13px] font-semibold hover:underline bg-transparent border-none cursor-pointer"
            style={{ color: '#7C4A1E' }}
          >
            Forgot password?
          </button>
        </div>

        <BtnPrimary disabled={isSubmitting}>
          {isSubmitting ? 'Signing in…' : 'Sign In →'}
        </BtnPrimary>
      </form>

      <Divider text="New to CafeOSum?" />
      <BtnSecondary onClick={() => setView('register')}>Create a free account</BtnSecondary>
      <TermsText />
    </FormPanel>
  )
}

// ── ACCOUNT LOCKED VIEW ──────────────────────────────────────
function AccountLockedView({ setView }: { setView: (v: AuthView) => void }) {
  const [remaining, setRemaining] = useState(15 * 60)

  useEffect(() => {
    const t = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000)
    return () => clearInterval(t)
  }, [])

  const mins = String(Math.floor(remaining / 60)).padStart(2, '0')
  const secs = String(remaining % 60).padStart(2, '0')

  return (
    <FormPanel>
      <div className="text-center mb-6">
        <div
          className="flex items-center justify-center rounded-full mx-auto mb-5 text-[28px]"
          style={{ width: 64, height: 64, background: '#FEE2E2' }}
        >
          🔐
        </div>
        <h1 className="text-2xl font-bold mb-2 tracking-tight" style={{ color: '#3B1F0E' }}>Account temporarily locked</h1>
        <p className="text-sm leading-relaxed" style={{ color: '#9E8E7E' }}>
          Too many failed login attempts. Your account has been locked for <strong>15 minutes</strong> as a security measure.
        </p>
      </div>

      <Alert variant="warning" icon="📧">
        A security alert has been sent to your registered email. Check your inbox for details.
      </Alert>

      <div
        className="rounded-[10px] p-4 mb-5 text-center border"
        style={{ background: '#F9F5F0', borderColor: '#F0EBE3' }}
      >
        <p className="text-[13px] mb-1.5" style={{ color: '#9E8E7E' }}>Time remaining</p>
        <p
          className="text-[32px] font-bold tabular-nums"
          style={{ color: '#DC2626', letterSpacing: 2 }}
        >
          {mins}:{secs}
        </p>
      </div>

      <BtnPrimary disabled>Sign In (Locked)</BtnPrimary>

      <Divider text="or" />
      <BtnSecondary onClick={() => setView('forgot')}>Reset password now</BtnSecondary>

      <SwitchText>
        Need help?{' '}
        <SwitchLink onClick={() => {}}>Contact support</SwitchLink>
      </SwitchText>
    </FormPanel>
  )
}

// ── REGISTER VIEW ────────────────────────────────────────────
function RegisterView({ setView }: { setView: (v: AuthView) => void }) {
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
  })
  const password = watch('password', '')

  const onSubmit = async (_data: RegisterValues) => {
    await new Promise((r) => setTimeout(r, 700))
    setView('verify-banner')
  }

  return (
    <FormPanel>
      <FormHeading title="Create your account" sub="Set up CafeOSum for your cafe — takes under 2 minutes." />

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <FormField label="Cafe name" required error={errors.cafeName}>
          <Input icon="☕" type="text" placeholder="e.g. Brew &amp; Bloom Cafe" hasError={!!errors.cafeName} {...register('cafeName')} />
        </FormField>

        <FormField label="Your name" required error={errors.ownerName}>
          <Input icon="👤" type="text" placeholder="e.g. Rajesh Kumar" hasError={!!errors.ownerName} {...register('ownerName')} />
        </FormField>

        <FormField label="Email address" required error={errors.email} hint="Used for billing receipts and account recovery.">
          <Input icon="✉" type="email" placeholder="you@yourcafe.com" hasError={!!errors.email} {...register('email')} />
        </FormField>

        <FormField label="Password" required error={errors.password}>
          <PasswordInput icon="🔒" placeholder="Min 8 chars, 1 number, 1 special char" hasError={!!errors.password} {...register('password')} />
          <PasswordStrength password={password} />
        </FormField>

        <FormField label="Confirm password" required error={errors.confirmPassword}>
          <PasswordInput icon="🔒" placeholder="Re-enter your password" hasError={!!errors.confirmPassword} {...register('confirmPassword')} />
        </FormField>

        <BtnPrimary disabled={isSubmitting}>
          {isSubmitting ? 'Creating account…' : 'Create Account →'}
        </BtnPrimary>

        <p className="text-xs text-center mt-4 leading-relaxed" style={{ color: '#9E8E7E' }}>
          By creating an account, you agree to our{' '}
          <a href="#" className="font-medium hover:underline" style={{ color: '#7C4A1E' }}>Terms of Service</a>
          {' '}and{' '}
          <a href="#" className="font-medium hover:underline" style={{ color: '#7C4A1E' }}>Privacy Policy</a>.
          GST-compliant billing from day one.
        </p>
      </form>

      <SwitchText>
        Already have an account?{' '}
        <SwitchLink onClick={() => setView('login')}>Sign in</SwitchLink>
      </SwitchText>
    </FormPanel>
  )
}

// ── VERIFY BANNER VIEW ───────────────────────────────────────
function VerifyBannerView() {
  const navigate = useNavigate()
  const [bannerVisible, setBannerVisible] = useState(true)

  return (
    <div className="flex-1 flex flex-col bg-[#F9F5F0]">
      {bannerVisible && (
        <div className="flex items-center gap-2.5 px-6 py-2.5 text-[13px] text-white" style={{ background: '#1E3A5F' }}>
          <span>📧</span>
          <span className="flex-1">
            <strong>Verify your email address.</strong> We've sent a confirmation link — check your inbox to activate all features.
          </span>
          <button
            className="px-3.5 py-1 rounded-md text-xs font-semibold cursor-pointer border-none"
            style={{ background: 'white', color: '#1E3A5F' }}
          >
            Resend email
          </button>
          <button
            onClick={() => setBannerVisible(false)}
            className="ml-2 opacity-60 text-lg leading-none bg-transparent border-none text-white cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      <div className="flex-1 flex items-center justify-center p-10">
        <div
          className="bg-white rounded-2xl p-10 max-w-[500px] w-full text-center border"
          style={{ borderColor: '#F0EBE3', boxShadow: '0 4px 24px rgba(59,31,14,0.06)' }}
        >
          <div
            className="flex items-center justify-center rounded-full mx-auto mb-5 text-[28px]"
            style={{ width: 64, height: 64, background: '#E8F5EE' }}
          >
            ✓
          </div>
          <h2 className="text-[22px] font-bold mb-2" style={{ color: '#3B1F0E' }}>Account created!</h2>
          <p className="text-sm mb-7 leading-relaxed" style={{ color: '#9E8E7E' }}>
            Welcome to CafeOSum. Let's set up your cafe so you can start taking orders.
          </p>

          <div className="flex flex-col gap-2.5 mb-7 text-left">
            {[
              { icon: '🏪', title: 'Set up your cafe profile', sub: 'Name, address, GSTIN, logo', step: '1' },
              { icon: '📋', title: 'Add your menu items', sub: 'Name, price, category, GST rate', step: '2', dim: true },
              { icon: '🪑', title: 'Configure your tables', sub: 'Table names, seating capacity', step: '3', dim: true },
            ].map((item) => (
              <div
                key={item.step}
                className={`flex items-center gap-3 p-3 rounded-[10px] border ${item.dim ? 'opacity-50' : ''}`}
                style={{ background: '#F9F5F0', borderColor: '#F0EBE3' }}
              >
                <span className="text-xl">{item.icon}</span>
                <div className="flex-1">
                  <p className="text-[13px] font-semibold" style={{ color: '#3B1F0E' }}>{item.title}</p>
                  <p className="text-xs" style={{ color: '#9E8E7E' }}>{item.sub}</p>
                </div>
                <span className="text-xs" style={{ color: '#9E8E7E' }}>Step {item.step} of 5</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => navigate('/onboarding')}
            className="py-[11px] px-6 rounded-lg text-sm font-semibold text-white mx-auto block transition-colors"
            style={{ background: '#3B1F0E', maxWidth: 280, width: '100%' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#7C4A1E' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#3B1F0E' }}
          >
            Start Setup Wizard →
          </button>

          <p
            onClick={() => navigate('/dashboard')}
            className="text-xs mt-3.5 cursor-pointer hover:underline"
            style={{ color: '#9E8E7E' }}
          >
            Skip for now — I'll set up later
          </p>
        </div>
      </div>
    </div>
  )
}

// ── FORGOT PASSWORD VIEW ─────────────────────────────────────
function ForgotPasswordView({ setView }: { setView: (v: AuthView) => void }) {
  const addEvent = useAuditStore((s) => s.addEvent)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  const onSubmit = async (data: ForgotPasswordValues) => {
    await new Promise((r) => setTimeout(r, 600))
    addEvent({
      eventType: 'PASSWORD_RESET',
      category: 'Auth',
      userId: data.email,
      entityType: 'Session',
      entityId: 'auth',
      payload: { email: data.email },
      status: 'ok',
      summary: `Password reset email sent · ${data.email}`,
    })
    setView('reset-sent')
  }

  return (
    <FormPanel>
      <button
        type="button"
        onClick={() => setView('login')}
        className="flex items-center gap-1 text-[13px] mb-5 bg-transparent border-none cursor-pointer p-0 hover:underline"
        style={{ color: '#9E8E7E' }}
      >
        ← Back to login
      </button>

      <FormHeading
        title="Reset your password"
        sub="Enter your registered email and we'll send a secure reset link. Link expires in 1 hour."
      />

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <FormField label="Registered email address" required error={errors.email}>
          <Input icon="✉" type="email" placeholder="you@yourcafe.com" hasError={!!errors.email} {...register('email')} />
        </FormField>

        <BtnPrimary disabled={isSubmitting}>
          {isSubmitting ? 'Sending…' : 'Send Reset Link →'}
        </BtnPrimary>
      </form>

      <SwitchText>
        Remembered it?{' '}
        <SwitchLink onClick={() => setView('login')}>Back to login</SwitchLink>
      </SwitchText>
    </FormPanel>
  )
}

// ── RESET LINK SENT VIEW ─────────────────────────────────────
function ResetLinkSentView({ setView }: { setView: (v: AuthView) => void }) {
  return (
    <FormPanel>
      <div className="text-center">
        <div
          className="flex items-center justify-center rounded-full mx-auto mb-5 text-[28px]"
          style={{ width: 64, height: 64, background: '#E8F5EE' }}
        >
          📧
        </div>
        <h1 className="text-2xl font-bold mb-2 tracking-tight" style={{ color: '#3B1F0E' }}>Check your email</h1>
        <p className="text-sm mb-7 leading-relaxed" style={{ color: '#9E8E7E' }}>
          We've sent a password reset link to your registered email address.
        </p>
      </div>

      <Alert variant="info">
        This link expires in <strong>1 hour</strong>. If you don't receive it within 2 minutes, check your spam folder.
      </Alert>

      <div
        className="rounded-[10px] p-4 text-left mb-5 border"
        style={{ background: '#F9F5F0', borderColor: '#F0EBE3' }}
      >
        <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#6B5B4E' }}>What to do next</p>
        <div className="flex flex-col gap-1.5 text-[13px] leading-relaxed" style={{ color: '#6B5B4E' }}>
          <p>① Open the email from <strong>noreply@cafeosum.in</strong></p>
          <p>② Click <em>"Reset my password"</em></p>
          <p>③ Choose a new password and sign in</p>
        </div>
      </div>

      <BtnSecondary onClick={() => setView('forgot')}>Resend reset email</BtnSecondary>

      <SwitchText>
        <SwitchLink onClick={() => setView('login')}>← Back to login</SwitchLink>
      </SwitchText>
    </FormPanel>
  )
}

// ── BRAND PANEL CONFIGS ──────────────────────────────────────
const brandConfigs: Record<AuthView, { tagline: React.ReactNode; sub: string; stats?: { value: string; label: string }[] }> = {
  'login': {
    tagline: <>Run your cafe<br />like a <span style={{ color: '#F0C040' }}>pro.</span></>,
    sub: 'Billing, orders, inventory, and analytics — all in one place, built for independent cafe owners in India.',
    stats: [
      { value: '₹499', label: 'Starting / month' },
      { value: '5 min', label: 'To first bill' },
      { value: 'GST', label: 'Compliant' },
    ],
  },
  'login-error': {
    tagline: <>Run your cafe<br />like a <span style={{ color: '#F0C040' }}>pro.</span></>,
    sub: 'Billing, orders, inventory, and analytics — all in one place, built for independent cafe owners in India.',
    stats: [
      { value: '₹499', label: 'Starting / month' },
      { value: '5 min', label: 'To first bill' },
      { value: 'GST', label: 'Compliant' },
    ],
  },
  'login-locked': {
    tagline: <>Run your cafe<br />like a <span style={{ color: '#F0C040' }}>pro.</span></>,
    sub: 'Billing, orders, inventory, and analytics — all in one place, built for independent cafe owners in India.',
  },
  'register': {
    tagline: <>Your cafe.<br /><span style={{ color: '#F0C040' }}>Your data.</span><br />Your growth.</>,
    sub: 'Join independent cafe owners across India who manage billing, inventory, and analytics with CafeOSum.',
    stats: [
      { value: '500+', label: 'Cafes onboarded' },
      { value: '4.8★', label: 'Owner rating' },
    ],
  },
  'verify-banner': {
    tagline: <>Run your cafe<br />like a <span style={{ color: '#F0C040' }}>pro.</span></>,
    sub: '',
  },
  'forgot': {
    tagline: <>We've got<br />you <span style={{ color: '#F0C040' }}>covered.</span></>,
    sub: "Enter your registered email and we'll send you a secure reset link. The link expires in 1 hour.",
  },
  'reset-sent': {
    tagline: <>Check your<br /><span style={{ color: '#F0C040' }}>inbox.</span></>,
    sub: "The reset link is on its way. If you don't see it in 2 minutes, check your spam folder.",
  },
}

// ── ROOT AUTH PAGE ───────────────────────────────────────────
export function AuthPage() {
  const [view, setView] = useState<AuthView>('login')
  const { isAuthenticated } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true })
  }, [isAuthenticated, navigate])

  const brand = brandConfigs[view]

  if (view === 'verify-banner') {
    return (
      <div className="flex min-h-screen">
        <BrandPanel tagline={brand.tagline} sub={brand.sub} stats={brand.stats} />
        <VerifyBannerView />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen">
      <BrandPanel tagline={brand.tagline} sub={brand.sub} stats={brand.stats} />

      {view === 'login' && <LoginView setView={setView} />}
      {view === 'login-error' && <LoginView setView={setView} />}
      {view === 'login-locked' && <AccountLockedView setView={setView} />}
      {view === 'register' && <RegisterView setView={setView} />}
      {view === 'forgot' && <ForgotPasswordView setView={setView} />}
      {view === 'reset-sent' && <ResetLinkSentView setView={setView} />}
    </div>
  )
}
