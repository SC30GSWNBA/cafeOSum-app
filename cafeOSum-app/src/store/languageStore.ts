import { create } from 'zustand'

type Lang = 'en' | 'hi'

interface LanguageStore {
  lang: Lang
  setLang: (lang: Lang) => void
}

// No persist — resets to English on page reload / next login (AC-10.5)
export const useLanguageStore = create<LanguageStore>()((set) => ({
  lang: 'en',
  setLang: (lang) => set({ lang }),
}))
