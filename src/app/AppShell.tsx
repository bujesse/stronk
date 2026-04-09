import type { ReactNode } from 'react'

interface AppShellProps {
  title: string
  status: string | null
  stickyStatus?: boolean
  onStatusClick?: () => void
  children: ReactNode
  footer: ReactNode
}

export function AppShell({
  title,
  status,
  stickyStatus = false,
  onStatusClick,
  children,
  footer,
}: AppShellProps) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <h1>{title}</h1>
        {status && !stickyStatus ? (
          <button className="status-pill" onClick={onStatusClick} disabled={!onStatusClick}>
            {status}
          </button>
        ) : null}
      </header>
      {status && stickyStatus ? (
        <button
          className="status-pill floating-status-pill"
          onClick={onStatusClick}
          disabled={!onStatusClick}
        >
          {status}
        </button>
      ) : null}
      <main className="content">{children}</main>
      <footer className="bottom-nav">{footer}</footer>
    </div>
  )
}
