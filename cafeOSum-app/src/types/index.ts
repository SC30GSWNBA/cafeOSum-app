export interface User {
  id: string
  email: string
  cafeName: string
  emailVerified: boolean
  createdAt: string
}

export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  login: (user: User, token: string) => void
  logout: () => void
}

export interface LoginFormValues {
  email: string
  password: string
  rememberMe: boolean
}

export interface RegisterFormValues {
  cafeName: string
  email: string
  password: string
  confirmPassword: string
}

export interface ForgotPasswordFormValues {
  email: string
}
