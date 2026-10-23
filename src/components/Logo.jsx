export default function Logo({ className = '', size = 48 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="48" y2="48">
          <stop offset="0%" stopColor="#0f2040" />
          <stop offset="100%" stopColor="#0a1628" />
        </linearGradient>
        <linearGradient id="lg2" x1="0" y1="0" x2="48" y2="48">
          <stop offset="0%" stopColor="#c9a84c" />
          <stop offset="100%" stopColor="#a8882e" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="22" fill="url(#lg)" stroke="url(#lg2)" strokeWidth="1.5" />
      <circle cx="24" cy="24" r="2" fill="#c9a84c" />
      <path d="M24 9v6M24 33v6" stroke="#c9a84c" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
      <path d="M9 24h6M33 24h6" stroke="#c9a84c" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
      <path d="M24 15a9 9 0 019 9" stroke="#c9a84c" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      <path d="M15 24a9 9 0 019-9" stroke="#c9a84c" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      <circle cx="24" cy="24" r="12" stroke="#c9a84c" strokeWidth="1" opacity="0.2" fill="none" />
      <path d="M20 20l8 8M28 20l-8 8" stroke="#c9a84c" strokeWidth="1.2" strokeLinecap="round" opacity="0.3" />
    </svg>
  )
}
