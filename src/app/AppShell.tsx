import type { ReactNode } from 'react'

interface AppShellProps {
  title: string
  status: string | null
  onStatusClick?: () => void
  children: ReactNode
  footer: ReactNode
}

export function AppShell({
  title,
  status,
  onStatusClick,
  children,
  footer,
}: AppShellProps) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <h1>{title}</h1>
        {status ? (
          <button className="status-pill" onClick={onStatusClick} disabled={!onStatusClick}>
            {status}
          </button>
        ) : null}
      </header>
      <main className="content">{children}</main>
      <footer className="bottom-nav">{footer}</footer>
    </div>
  )
}
