import { useLanguageStore } from '../store/languageStore'

export function LanguageToggle() {
  const { lang, setLang } = useLanguageStore()
  return (
    <div
      style={{ display: 'flex', border: '1.5px solid #DDD5C8', borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}
      title="Toggle language — EN | HI (AC-10.1)"
    >
      <button
        onClick={() => setLang('en')}
        style={{
          padding: '5px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
          fontFamily: 'inherit', border: 'none', outline: 'none',
          background: lang === 'en' ? '#3B1F0E' : '#F9F5F0',
          color: lang === 'en' ? 'white' : '#9E8E7E',
          transition: 'background 0.15s, color 0.15s',
        }}
      >
        EN
      </button>
      <button
        onClick={() => setLang('hi')}
        style={{
          padding: '5px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
          fontFamily: 'inherit', border: 'none', borderLeft: '1.5px solid #DDD5C8', outline: 'none',
          background: lang === 'hi' ? '#3B1F0E' : '#F9F5F0',
          color: lang === 'hi' ? 'white' : '#9E8E7E',
          transition: 'background 0.15s, color 0.15s',
        }}
      >
        HI
      </button>
    </div>
  )
}
