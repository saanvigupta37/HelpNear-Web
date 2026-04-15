import { Link } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'

/* ── Floating orb that follows the cursor ── */
function CursorOrb() {
  const orbRef = useRef(null)
  useEffect(() => {
    let raf
    let mx = window.innerWidth / 2, my = window.innerHeight / 2
    let cx = mx, cy = my
    const onMove = (e) => { mx = e.clientX; my = e.clientY }
    window.addEventListener('mousemove', onMove)
    const tick = () => {
      cx += (mx - cx) * 0.08
      cy += (my - cy) * 0.08
      if (orbRef.current) {
        orbRef.current.style.transform = `translate(${cx - 200}px, ${cy - 200}px)`
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => { window.removeEventListener('mousemove', onMove); cancelAnimationFrame(raf) }
  }, [])
  return (
    <div ref={orbRef} style={{
      position: 'fixed', top: 0, left: 0, width: 400, height: 400,
      borderRadius: '50%', pointerEvents: 'none', zIndex: 0,
      background: 'radial-gradient(circle, rgba(52,199,89,0.12) 0%, transparent 70%)',
      transition: 'none',
    }} />
  )
}

/* ── Floating 3-D card ── */
function Card3D({ icon, title, desc, delay = 0 }) {
  const cardRef = useRef(null)
  const handleMove = (e) => {
    const card = cardRef.current
    if (!card) return
    const rect = card.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const cx = rect.width / 2
    const cy = rect.height / 2
    const rotX = ((y - cy) / cy) * -12
    const rotY = ((x - cx) / cx) * 12
    card.style.transform = `perspective(800px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale3d(1.04,1.04,1.04)`
  }
  const handleLeave = () => {
    if (cardRef.current) cardRef.current.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)'
  }
  return (
    <div
      ref={cardRef}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 24,
        padding: '32px 28px',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        cursor: 'default',
        animationDelay: `${delay}ms`,
        boxShadow: '0 4px 40px rgba(0,0,0,0.4)',
        backdropFilter: 'blur(12px)',
      }}
      className="animate-fade-in"
    >
      <div style={{
        width: 56, height: 56, borderRadius: 16,
        background: 'rgba(52,199,89,0.1)',
        border: '1px solid rgba(52,199,89,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 20, fontSize: 24,
      }}>
        {icon}
      </div>
      <p style={{ color: '#fff', fontWeight: 700, fontSize: '1.15rem', marginBottom: 8 }}>{title}</p>
      <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.9rem', lineHeight: 1.6 }}>{desc}</p>
    </div>
  )
}

/* ── Animated ticker ── */
function Ticker() {
  const items = ['🛒 groceries', '📦 carry stuff', '🐶 walk the dog', '🔧 quick fix', '🚶 walk together', '💊 meds run', '🌱 plant watering', '📮 mail pickup']
  return (
    <div style={{ overflow: 'hidden', width: '100%', position: 'relative', marginTop: 80 }}>
      <div style={{
        display: 'flex', gap: 32, width: 'max-content',
        animation: 'ticker 18s linear infinite',
      }}>
        {[...items, ...items].map((item, i) => (
          <span key={i} style={{
            whiteSpace: 'nowrap', color: 'rgba(255,255,255,0.3)',
            fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.05em',
            textTransform: 'uppercase', padding: '8px 20px',
            border: '1px solid rgba(255,255,255,0.07)', borderRadius: 999,
          }}>{item}</span>
        ))}
      </div>
      <style>{`@keyframes ticker { from { transform: translateX(0) } to { transform: translateX(-50%) } }`}</style>
    </div>
  )
}

const features = [
  {
    icon: '🛡️',
    title: 'Safe & Secure',
    desc: 'In-app chat, verified community members, and safety guidelines ensure you help with confidence.',
    delay: 0,
  },
  {
    icon: '🤝',
    title: 'Mutual Aid',
    desc: 'Request help for anything from groceries to quick fixes. Your neighbours are ready to step in.',
    delay: 100,
  },
  {
    icon: '✅',
    title: 'Verified Community',
    desc: 'Every helper is verified through our trust system to ensure a safe environment for everyone.',
    delay: 200,
  },
]

export default function Landing() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#030303', fontFamily: 'Syne, sans-serif', overflowX: 'hidden', color: '#fff' }}>
      <CursorOrb />

      {/* Noise grain overlay */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1, opacity: 0.025,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
      }} />

      {/* Glow blobs */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-20%', left: '-10%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(52,199,89,0.07) 0%, transparent 70%)', filter: 'blur(40px)' }} />
        <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(10,132,255,0.06) 0%, transparent 70%)', filter: 'blur(40px)' }} />
      </div>

      {/* Nav */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: scrolled ? 'rgba(3,3,3,0.85)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : '1px solid transparent',
        transition: 'all 0.3s ease',
        padding: '18px 40px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        maxWidth: 1100, margin: '0 auto', width: '100%',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, #34C759, #30D158)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, boxShadow: '0 0 20px rgba(52,199,89,0.4)',
          }}>💚</div>
          <span style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.02em' }}>HelpNear</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <Link to="/login" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 600, transition: 'color 0.2s' }}
            onMouseEnter={e => e.target.style.color = '#fff'}
            onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.5)'}
          >Log in</Link>
          <Link to="/signup" style={{
            background: 'linear-gradient(135deg, #34C759, #30D158)',
            color: '#000', fontWeight: 700, fontSize: '0.85rem',
            padding: '10px 22px', borderRadius: 999, textDecoration: 'none',
            boxShadow: '0 0 20px rgba(52,199,89,0.3)', transition: 'transform 0.2s, box-shadow 0.2s',
          }}
            onMouseEnter={e => { e.target.style.transform = 'scale(1.05)'; e.target.style.boxShadow = '0 0 32px rgba(52,199,89,0.5)' }}
            onMouseLeave={e => { e.target.style.transform = 'scale(1)'; e.target.style.boxShadow = '0 0 20px rgba(52,199,89,0.3)' }}
          >Get started →</Link>
        </div>
      </nav>

      {/* Hero */}
      <main style={{ position: 'relative', zIndex: 2, maxWidth: 900, margin: '0 auto', padding: '80px 24px 40px', textAlign: 'center' }}>

        {/* Badge */}
        <div className="animate-fade-in" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'rgba(52,199,89,0.08)', border: '1px solid rgba(52,199,89,0.2)',
          borderRadius: 999, padding: '8px 18px', marginBottom: 40,
        }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#34C759', display: 'inline-block', boxShadow: '0 0 8px #34C759', animation: 'pulse 2s ease-in-out infinite' }} />
          <span style={{ color: '#34C759', fontSize: '0.82rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Live in your neighbourhood</span>
        </div>

        {/* Headline - UPDATED */}
        <h1 className="animate-slide-up" style={{
          fontSize: 'clamp(3rem, 9vw, 6.5rem)',
          fontWeight: 900,
          lineHeight: 1.1,
          letterSpacing: '-0.04em',
          marginBottom: 32,
        }}>
          <span style={{ display: 'block', color: '#fff' }}>Fast.</span>
          <span style={{ display: 'block', color: '#fff' }}>Local.</span>
          <span style={{
            display: 'block',
            background: 'linear-gradient(90deg, #34C759 0%, #0A84FF 50%, #34C759 100%)',
            backgroundSize: '200% auto',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            animation: 'shimmer 3s linear infinite',
          }}>Human. ✦</span>
        </h1>

        {/* Subtext */}
        <p className="animate-fade-in" style={{
          color: 'rgba(255,255,255,0.45)',
          fontSize: 'clamp(1rem, 2.5vw, 1.2rem)',
          maxWidth: 560,
          margin: '0 auto 48px',
          lineHeight: 1.7,
          fontWeight: 400,
        }}>
          When you need quick help from a neighbour — or want to be that neighbour —
          HelpNear connects you in minutes.
        </p>

        {/* CTAs */}
        <div className="animate-slide-up" style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/signup" style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            background: 'linear-gradient(135deg, #34C759, #30D158)',
            color: '#000', fontWeight: 800, fontSize: '1rem',
            padding: '16px 36px', borderRadius: 999, textDecoration: 'none',
            boxShadow: '0 0 40px rgba(52,199,89,0.35), 0 0 80px rgba(52,199,89,0.1)',
            transition: 'all 0.25s ease',
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.06) translateY(-2px)'; e.currentTarget.style.boxShadow = '0 0 60px rgba(52,199,89,0.5), 0 0 120px rgba(52,199,89,0.15)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 0 40px rgba(52,199,89,0.35), 0 0 80px rgba(52,199,89,0.1)' }}
          >
            Get Started Free <span style={{ fontSize: '1.1rem' }}>→</span>
          </Link>
          <Link to="/login" style={{
            display: 'inline-flex', alignItems: 'center',
            color: 'rgba(255,255,255,0.6)', fontWeight: 600, fontSize: '1rem',
            padding: '16px 36px', borderRadius: 999, textDecoration: 'none',
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.03)',
            transition: 'all 0.25s ease',
          }}
            onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
          >
            I already have an account
          </Link>
        </div>

        {/* Social proof */}
        <div style={{ marginTop: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex' }}>
            {['🧑', '👩', '👨', '🧑‍🦱', '👩‍🦰'].map((e, i) => (
              <div key={i} style={{
                width: 36, height: 36, borderRadius: '50%',
                background: `hsl(${i * 60}, 60%, 25%)`,
                border: '2px solid #030303',
                marginLeft: i === 0 ? 0 : -10,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
              }}>{e}</div>
            ))}
          </div>
          <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.85rem', fontWeight: 600 }}>
            Neighbours already helping each other
          </span>
        </div>

        {/* Ticker */}
        <Ticker />
      </main>

      {/* Feature cards - UPDATED with Safe & Secure */}
      <section style={{ position: 'relative', zIndex: 2, maxWidth: 1000, margin: '80px auto 0', padding: '0 24px' }}>
        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 40 }}>
          what you get
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          {features.map((f) => (
            <Card3D key={f.title} {...f} />
          ))}
        </div>
      </section>

      {/* Bottom CTA band */}
      <section style={{ position: 'relative', zIndex: 2, margin: '100px 24px 0', padding: '0 24px' }}>
        <div style={{
          maxWidth: 800, margin: '0 auto',
          background: 'linear-gradient(135deg, rgba(52,199,89,0.08) 0%, rgba(10,132,255,0.08) 100%)',
          border: '1px solid rgba(52,199,89,0.15)',
          borderRadius: 32, padding: '60px 40px', textAlign: 'center',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(52,199,89,0.15) 0%, transparent 70%)' }} />
          <div style={{ position: 'absolute', bottom: -40, left: -40, width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle, rgba(10,132,255,0.15) 0%, transparent 70%)' }} />
          <p style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#34C759', marginBottom: 16 }}>no cap, fr fr 🔥</p>
          <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 16, lineHeight: 1.1 }}>
            Your community is<br />already waiting for you.
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '1rem', marginBottom: 36, maxWidth: 400, margin: '0 auto 36px' }}>
            Zero payments. Zero apps to install. Just neighbours being there for each other.
          </p>
          <Link to="/signup" style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            background: 'linear-gradient(135deg, #34C759, #30D158)',
            color: '#000', fontWeight: 800, fontSize: '1rem',
            padding: '16px 40px', borderRadius: 999, textDecoration: 'none',
            boxShadow: '0 0 40px rgba(52,199,89,0.4)',
          }}>
            Join for free ✦
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ textAlign: 'center', padding: '60px 24px 40px', color: 'rgba(255,255,255,0.18)', fontSize: '0.82rem', position: 'relative', zIndex: 2 }}>
        Built with <span style={{ color: '#FF3B30' }}>❤️</span> for neighbours everywhere · HelpNear {new Date().getFullYear()}
      </footer>

      <style>{`
        @keyframes shimmer {
          0% { background-position: 0% center }
          100% { background-position: 200% center }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1) }
          50% { opacity: 0.5; transform: scale(0.8) }
        }
      `}</style>
    </div>
  )
}