import { useNavigate } from 'react-router-dom'

export default function Safety({ onAccept }) {
  const navigate = useNavigate()

  const handleAccept = () => {
    onAccept()
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-0 w-72 h-72 rounded-full bg-yellow-500 opacity-5 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full bg-brand-red opacity-5 blur-3xl" />
      </div>

      <div className="w-full max-w-lg animate-slide-up relative z-10">
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-full bg-yellow-500/10 border-2 border-yellow-500/30 flex items-center justify-center mx-auto mb-4 animate-float">
            <span className="text-4xl">🛡️</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white mb-2">Community Safety</h1>
          <p className="text-gray-400">Please read before using HelpNear</p>
        </div>

        <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700 mb-6">
          <div className="space-y-5">
            {[
              {
                icon: '🤝',
                title: 'Meet in public places',
                desc: 'When meeting a neighbour for a task, always choose well-lit, public locations when possible.'
              },
              {
                icon: '📱',
                title: 'Trust your instincts',
                desc: 'If something feels wrong, it probably is. Never feel pressured to complete a task that makes you uncomfortable.'
              },
              {
                icon: '🚨',
                title: 'Tell someone',
                desc: 'Let a friend or family member know when you\'re meeting a new neighbour to exchange help.'
              },
              {
                icon: '🏘️',
                title: 'This is a community',
                desc: 'HelpNear is built on trust. Be kind, be honest, and look out for each other.'
              },
              {
                icon: '⚠️',
                title: 'Report concerns',
                desc: 'If you witness unsafe behaviour, contact local emergency services and report it to your community leaders.'
              },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-lg">{icon}</span>
                </div>
                <div>
                  <h3 className="font-bold text-white mb-0.5">{title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-5 mb-6">
          <p className="text-yellow-300 text-sm text-center leading-relaxed">
            <strong>Disclaimer:</strong> HelpNear facilitates connections between community members but is not responsible
            for the actions of individual users. Always exercise caution and good judgment.
          </p>
        </div>

        <button
          onClick={handleAccept}
          className="w-full bg-brand-green hover:bg-green-500 text-white font-bold py-4 rounded-xl text-lg transition-all hover:scale-[1.02] active:scale-[0.98] hover:glow-green"
        >
          I Understand — Take Me In ✓
        </button>
      </div>
    </div>
  )
}
