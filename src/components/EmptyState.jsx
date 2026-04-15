const STATES = {
  requests: {
    emoji: '🏝️',
    title: 'All quiet here!',
    desc: 'Be the first to post a request in your community.',
  },
  community: {
    emoji: '🏘️',
    title: 'No requests nearby',
    desc: 'Your community is all good right now. Check back soon!',
  },
  notifications: {
    emoji: '🔔',
    title: 'Nothing new yet',
    desc: "You're all caught up! Notifications will appear here.",
  },
  chat: {
    emoji: '💬',
    title: 'No messages yet',
    desc: 'Say hello and break the ice!',
  },
  history: {
    emoji: '🌟',
    title: 'No completed helps yet',
    desc: 'Complete your first help to see it here.',
  },
  search: {
    emoji: '🔍',
    title: 'No results found',
    desc: 'Try different keywords or clear the search.',
  },
}

export default function EmptyState({ type = 'requests', message }) {
  const state = STATES[type] || STATES.requests
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center px-4">
      <div className="text-5xl mb-4 animate-float">{state.emoji}</div>
      <h3 className="text-white font-bold text-base mb-1">{state.title}</h3>
      <p className="text-gray-500 text-sm max-w-xs leading-relaxed">{message || state.desc}</p>
    </div>
  )
}
