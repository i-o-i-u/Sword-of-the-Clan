interface Props {
  size?: number
  className?: string
}

// شعار المكتبة: كتاب مفتوح يعلوه سيف — رمزًا إلى "سيف العشيرة"
export default function Logo({ size = 40, className }: Props) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="شعار مكتبة سيف العشيرة"
    >
      <defs>
        <linearGradient id="logo-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-logo-blade-top, #f1d798)" />
          <stop offset="100%" stopColor="var(--color-logo-blade-bottom, #c8963f)" />
        </linearGradient>
      </defs>

      <path
        d="M10 40 L32 18 L38 24 L16 46 Z"
        fill="var(--color-logo-book, #6b4226)"
        opacity="0.15"
      />

      <path d="M32 6 L35 30 L32 46 L29 30 Z" fill="url(#logo-gold)" />
      <path d="M25 40 L39 40 L36 46 L28 46 Z" fill="var(--color-logo-hilt, #4e2f1a)" />
      <rect x="30.5" y="44" width="3" height="9" rx="1.2" fill="var(--color-logo-hilt, #4e2f1a)" />

      <path
        d="M12 50 C12 46 20 44 32 48 C44 44 52 46 52 50 L52 54 C52 50 44 48 32 52 C20 48 12 50 12 54 Z"
        fill="var(--color-logo-book, #6b4226)"
      />
      <path
        d="M32 48 L32 52"
        stroke="var(--color-logo-spine, #f7f5f2)"
        strokeWidth="0.6"
        opacity="0.6"
      />
    </svg>
  )
}
