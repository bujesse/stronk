import type { ReactNode } from 'react'

interface AppShellProps {
  title: string
  subtitle: string
  status: string
  onStatusClick?: () => void
  children: ReactNode
  footer: ReactNode
}

export function AppShell({
  title,
  subtitle,
  status,
  onStatusClick,
  children,
  footer,
}: AppShellProps) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Stronk</p>
          <h1>{title}</h1>
          <p className="subtitle">{subtitle}</p>
        </div>
        <button className="status-pill" onClick={onStatusClick} disabled={!onStatusClick}>
          {status}
        </button>
      </header>
      <main className="content">{children}</main>
      <footer className="bottom-nav">{footer}</footer>
    </div>
  )
}
