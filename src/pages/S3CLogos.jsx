const concepts = [
  {
    num: '01',
    title: 'Circular Seal',
    favorite: true,
    desc: 'Official seal aesthetic. Institutional authority. The kind of mark you stamp on a document or emboss on a plaque. Commands respect.',
    img: '/images/s3c/c03-circular-seal-nobg.png',
  },
  {
    num: '02',
    title: 'Angular Monogram',
    favorite: false,
    desc: 'S3C interlocked in a diamond. Bold geometric construction. Sharp angles communicate precision and engineering.',
    img: '/images/s3c/c01-angular-monogram-nobg.png',
  },
  {
    num: '03',
    title: 'Hexagonal Badge',
    favorite: false,
    desc: 'Hex frame references semiconductor wafer geometry. Clean, badge-ready. Works on hard hats, lanyards, and digital.',
    img: '/images/s3c/c02-hexagonal-badge-nobg.png',
  },
  {
    num: '04',
    title: 'Lockup',
    favorite: false,
    desc: 'Full brand lockup variant. S3C mark with coalition name. Ready for headers, signage, and formal presentations.',
    img: '/images/s3c/c11-lockup-nobg.png',
  },
]

const bgCards = [
  { cls: 'dark', label: 'Dark', style: { background: '#0a0e1a', border: '1px solid #1f2937' } },
  { cls: 'navy', label: 'Navy', style: { background: '#1e2a4a' } },
  { cls: 'white', label: 'White', style: { background: '#ffffff' } },
  { cls: 'copper', label: 'Copper', style: { background: 'linear-gradient(135deg, #b87333, #d4956b)' } },
  { cls: 'gray', label: 'Gray', style: { background: '#374151' } },
  { cls: 'warm', label: 'Warm', style: { background: '#f5f0eb' } },
]

const sizes = [
  { px: 32, label: '32px favicon' },
  { px: 48, label: '48px badge' },
  { px: 80, label: '80px app icon' },
  { px: 120, label: '120px card' },
  { px: 200, label: '200px email sig' },
]

export default function S3CLogos() {
  return (
    <div style={{ margin: 0, padding: 0, background: '#0a0e1a', color: '#e0e0e0', fontFamily: "-apple-system, 'Helvetica Neue', sans-serif", minHeight: '100vh' }}>
      {/* Hero */}
      <div style={{ padding: '60px 40px 40px', textAlign: 'center' }}>
        <h1 style={{ fontSize: 40, fontWeight: 700, color: '#fff', marginBottom: 8 }}>S3C</h1>
        <p style={{ color: '#b87333', fontSize: 13, textTransform: 'uppercase', letterSpacing: 3 }}>
          Semiconductor Services &amp; Supply Coalition
        </p>
        <p style={{ color: '#6b7280', fontSize: 14, marginTop: 16, maxWidth: 500, marginLeft: 'auto', marginRight: 'auto' }}>
          Round 2 -- 4 finalists. Transparent backgrounds. Exploring each concept across sizes, surfaces, and use cases.
        </p>
      </div>

      {/* Concepts */}
      {concepts.map((c, i) => (
        <div
          key={c.num}
          style={{
            padding: '60px 40px',
            borderTop: '1px solid #1f2937',
            background: i % 2 === 1 ? '#111827' : 'transparent',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 32, justifyContent: 'center', textAlign: 'center' }}>
            <span style={{ fontSize: 48, fontWeight: 800, color: '#b87333', lineHeight: 1 }}>{c.num}</span>
            <div>
              <div style={{ fontSize: 24, fontWeight: 600, color: '#fff' }}>
                {c.title}
                {c.favorite && (
                  <span style={{
                    display: 'inline-block',
                    background: '#b87333',
                    color: '#0a0e1a',
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: 4,
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                    marginLeft: 12,
                    verticalAlign: 'middle',
                  }}>Favorite</span>
                )}
              </div>
              <p style={{ fontSize: 14, color: '#9ca3af', marginTop: 4, maxWidth: 400, marginLeft: 'auto', marginRight: 'auto' }}>{c.desc}</p>
            </div>
          </div>

          {/* Size test */}
          <p style={{ fontSize: 12, color: '#b87333', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 16, fontWeight: 600, textAlign: 'center' }}>Size Test</p>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 40, marginBottom: 40, flexWrap: 'wrap', justifyContent: 'center' }}>
            {sizes.map(s => (
              <div key={s.px} style={{ textAlign: 'center' }}>
                <img src={c.img} alt={c.title} style={{ display: 'block', margin: '0 auto 8px', width: s.px, height: s.px }} />
                <span style={{ fontSize: 11, color: '#6b7280' }}>{s.label}</span>
              </div>
            ))}
          </div>

          {/* Background test */}
          <p style={{ fontSize: 12, color: '#b87333', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 16, fontWeight: 600, textAlign: 'center' }}>Background Test</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 20 }}>
            {bgCards.map(bg => (
              <div key={bg.cls}>
                <div style={{
                  borderRadius: 12,
                  padding: 40,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 200,
                  ...bg.style,
                }}>
                  <img src={c.img} alt={c.title} style={{ maxWidth: 160, maxHeight: 160 }} />
                </div>
                <p style={{ fontSize: 11, color: '#6b7280', marginTop: 8, textAlign: 'center' }}>{bg.label}</p>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Footer */}
      <div style={{ padding: 40, textAlign: 'center', borderTop: '1px solid #1f2937' }}>
        <p style={{ color: '#6b7280', fontSize: 12 }}>S3C Brand Exploration -- Round 2 -- Steffen / AOM -- March 2026</p>
      </div>
    </div>
  )
}
