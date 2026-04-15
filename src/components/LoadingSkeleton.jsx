function Shimmer({ className = '' }) {
  return (
    <div
      className={`bg-gray-700 rounded animate-pulse ${className}`}
      style={{ background: 'linear-gradient(90deg, #374151 25%, #4b5563 50%, #374151 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }}
    />
  )
}

export function RequestCardSkeleton() {
  return (
    <div className="bg-gray-800 rounded-2xl p-5 border border-gray-700">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <Shimmer className="w-9 h-9 rounded-full" />
          <div className="space-y-1.5">
            <Shimmer className="w-24 h-3.5 rounded" />
            <Shimmer className="w-16 h-3 rounded" />
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <Shimmer className="w-16 h-6 rounded-full" />
          <Shimmer className="w-12 h-3 rounded" />
        </div>
      </div>
      <Shimmer className="w-40 h-4 rounded mb-2" />
      <Shimmer className="w-full h-3 rounded mb-1" />
      <Shimmer className="w-3/4 h-3 rounded mb-4" />
      <div className="flex items-center justify-between pt-2 border-t border-gray-700/50">
        <Shimmer className="w-20 h-3 rounded" />
        <Shimmer className="w-20 h-8 rounded-lg" />
      </div>
    </div>
  )
}

export function ProfileSkeleton() {
  return (
    <div className="space-y-4">
      <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
        <div className="flex items-center gap-5">
          <Shimmer className="w-20 h-20 rounded-full" />
          <div className="space-y-2">
            <Shimmer className="w-36 h-5 rounded" />
            <Shimmer className="w-24 h-4 rounded" />
            <Shimmer className="w-28 h-3 rounded" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-800 rounded-2xl p-5 border border-gray-700 text-center">
          <Shimmer className="w-16 h-10 rounded mx-auto mb-2" />
          <Shimmer className="w-24 h-3 rounded mx-auto" />
        </div>
        <div className="bg-gray-800 rounded-2xl p-5 border border-gray-700 text-center">
          <Shimmer className="w-20 h-6 rounded mx-auto mb-2" />
          <Shimmer className="w-20 h-3 rounded mx-auto" />
        </div>
      </div>
    </div>
  )
}

export function ChatSkeleton() {
  return (
    <div className="space-y-3 px-5 py-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
          <Shimmer className={`h-10 rounded-2xl ${i % 2 === 0 ? 'w-48' : 'w-36'}`} />
        </div>
      ))}
    </div>
  )
}

export default function LoadingSkeleton({ type = 'request', count = 3 }) {
  if (type === 'request') {
    return (
      <div className="space-y-3">
        {[...Array(count)].map((_, i) => <RequestCardSkeleton key={i} />)}
        <style>{`
          @keyframes shimmer {
            0% { background-position: 200% 0 }
            100% { background-position: -200% 0 }
          }
        `}</style>
      </div>
    )
  }
  return null
}
