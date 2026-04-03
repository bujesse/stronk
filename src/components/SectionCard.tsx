import type { ReactNode } from 'react'

interface SectionCardProps {
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
}

export function SectionCard({
  title,
  description,
  action,
  children,
}: SectionCardProps) {
  return (
    <section className="section-card">
      <div className="section-header">
        <div>
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}
