import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthState, User } from '../types'

const API_BASE = 'http://localhost:3001/api/v1'

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      login: (user: User, accessToken: string, refreshToken: string) =>
        set({ user, token: accessToken, refreshToken, isAuthenticated: true }),
      setTokens: (accessToken: string, refreshToken: string) =>
        set({ token: accessToken, refreshToken }),
      logout: () => {
        const { token, refreshToken } = get()
        if (refreshToken && token) {
          fetch(`${API_BASE}/auth/logout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ refreshToken }),
          }).catch(() => {})
        }
        set({ user: null, token: null, refreshToken: null, isAuthenticated: false })
      },
    }),
    {
      name: 'cafeOSum-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
