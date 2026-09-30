import type { ReactNode } from 'react'

// Small monospace section label, e.g. "[01] Selected work".
export function Label({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`font-mono text-xs font-medium text-label uppercase ${className}`}>{children}</div>
  )
}

export function Placeholder({
  caption,
  stripe,
  src,
  alt,
  className = '',
  style,
}: {
  caption?: string
  stripe?: string
  src?: string
  alt?: string
  className?: string
  style?: React.CSSProperties
}) {
  if (src) {
    return <img src={src} alt={alt ?? caption ?? ''} className={`object-cover ${className}`} style={style} />
  }
  return (
    <div
      role="img"
      aria-label={caption ? `Placeholder: ${caption}` : 'Placeholder image'}
      className={`stripes flex items-end p-3 ${className}`}
      style={{ ...style, ...(stripe ? { '--stripe': stripe } : {}) } as React.CSSProperties}
    >
      {caption && <span className="font-mono text-[11px] font-medium text-dim">{caption}</span>}
    </div>
  )
}
