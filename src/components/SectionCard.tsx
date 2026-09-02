import type { ReactNode } from 'react'

type SectionCardProps = {
  title?: string
  subtitle?: string
  children: ReactNode
  className?: string
  noPadding?: boolean
  plain?: boolean
}

export default function SectionCard({
  title,
  subtitle,
  children,
  className,
  noPadding,
  plain,
}: SectionCardProps) {
  return (
    <section
      className={['surface-card', plain ? 'surface-card--plain' : null, className]
        .filter(Boolean)
        .join(' ')}
    >
      {title ? (
        <div className="surface-card__header">
          <p className="section-label">{title}</p>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
      ) : null}
      <div className={noPadding ? 'surface-card__fill' : 'surface-card__body'}>{children}</div>
    </section>
  )
}
