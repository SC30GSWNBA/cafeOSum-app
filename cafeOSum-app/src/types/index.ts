export interface User {
  id: string
  email: string
  name: string | null
  role: string
  isVerified: boolean
  cafeId: string | null
  cafeName: string
}

export interface AuthState {
  user: User | null
  token: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  login: (user: User, accessToken: string, refreshToken: string) => void
  setTokens: (accessToken: string, refreshToken: string) => void
  logout: () => void
}
