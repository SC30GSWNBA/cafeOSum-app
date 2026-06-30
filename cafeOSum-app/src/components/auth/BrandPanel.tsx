interface BrandPanelProps {
  tagline: React.ReactNode
  sub: string
  stats?: { value: string; label: string }[]
}

export function BrandPanel({ tagline, sub, stats }: BrandPanelProps) {
  return (
    <div
      className="hidden md:flex flex-col justify-between relative overflow-hidden"
      style={{ width: '42%', background: '#3B1F0E', padding: '40px 48px' }}
    >
      {/* Decorative circles */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          top: -80, right: -80, width: 300, height: 300,
          background: 'rgba(212,160,23,0.08)',
        }}
      />
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          bottom: -60, left: -60, width: 240, height: 240,
          background: 'rgba(240,192,64,0.06)',
        }}
      />

      {/* Logo */}
      <div className="flex items-center gap-2.5 z-10">
        <div
          className="flex items-center justify-center rounded-[10px] text-xl"
          style={{ width: 40, height: 40, background: '#D4A017' }}
        >
          ☕
        </div>
        <span className="text-xl font-bold text-white tracking-tight">
          Cafe<span style={{ color: '#D4A017' }}>OSum</span>
        </span>
      </div>

      {/* Center content */}
      <div className="z-10">
        <div
          className="text-white font-bold leading-snug mb-4"
          style={{ fontSize: 32, letterSpacing: '-0.5px' }}
        >
          {tagline}
        </div>
        <p className="leading-relaxed text-sm" style={{ color: 'rgba(255,255,255,0.55)', maxWidth: 300 }}>
          {sub}
        </p>

        {stats && (
          <div className="flex gap-7 mt-9 z-10">
            {stats.map((s) => (
              <div key={s.label}>
                <div className="text-[22px] font-bold" style={{ color: '#F0C040' }}>{s.value}</div>
                <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-xs z-10" style={{ color: 'rgba(255,255,255,0.3)' }}>
        © 2026 CafeOSum · Made in India 🇮🇳
      </div>

      {/* Decorative illustration */}
      <div
        className="absolute z-0 select-none pointer-events-none"
        style={{ right: 32, bottom: 120, fontSize: 120, opacity: 0.06 }}
      >
        ☕
      </div>
    </div>
  )
}
