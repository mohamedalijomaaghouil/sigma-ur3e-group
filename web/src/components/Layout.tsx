import { useEffect, useState, type ReactNode } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { data, progress, tasksOf } from '../data'
import { ProgressMini } from './ProgressSummary'
import {
  BrandMark, IconActivity, IconArch, IconBranch, IconDocs, IconMenu, IconMoon, IconOverview,
  IconProgress, IconResults, IconRoadmap, IconSun, IconTeam, IconTarget, IconCube, IconCompare, IconCamera,
} from './Icons'

export const NAV: { to: string; label: string; icon: ReactNode; count?: () => number | string }[] = [
  { to: '/', label: 'Overview', icon: <IconOverview /> },
  { to: '/architecture', label: 'Architecture', icon: <IconArch />, count: () => progress.packages.length },
  { to: '/roadmap', label: 'Roadmap', icon: <IconRoadmap />, count: () => progress.milestones.length },
  { to: '/progress', label: 'Progress', icon: <IconProgress />, count: () => progress.work_packages.length },
  { to: '/team', label: 'Team', icon: <IconTeam />, count: () => progress.team.members.length },
  { to: '/ibvs', label: 'IBVS · Group A', icon: <IconTarget />, count: () => tasksOf('ibvs').length },
  { to: '/pbvs', label: 'PBVS · Group B', icon: <IconCube />, count: () => tasksOf('pbvs').length },
  { to: '/comparison', label: 'Comparison', icon: <IconCompare />, count: () => tasksOf('hybrid').length },
  { to: '/results', label: 'Results', icon: <IconResults />, count: () => data.experiments.length },
  { to: '/evidence', label: 'Evidence', icon: <IconCamera />, count: () => (data.evidence ?? []).filter((e) => e.status === 'approved').length },
  { to: '/docs', label: 'Documentation', icon: <IconDocs />, count: () => data.docs.length },
  { to: '/activity', label: 'Activity', icon: <IconActivity />, count: () => data.git.commits.length },
]

function useTheme() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('ur3e-theme')
    if (saved === 'light' || saved === 'dark') return saved
    return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  })
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('ur3e-theme', theme)
  }, [theme])
  return [theme, () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))] as const
}

export function Layout() {
  const [theme, toggle] = useTheme()
  const [open, setOpen] = useState(false)
  const loc = useLocation()
  useEffect(() => {
    setOpen(false)
    window.scrollTo(0, 0)
  }, [loc.pathname])
  const current = NAV.find((n) => (n.to === '/' ? loc.pathname === '/' : loc.pathname.startsWith(n.to)))
  const synced = new Date(data.generatedAt)

  return (
    <div className="shell">
      <aside className={`sidebar${open ? ' open' : ''}`}>
        <div className="brand">
          <BrandMark className="brand-mark" />
          <div>
            <div className="brand-title">{progress.project.short_title}</div>
            <div className="brand-sub">SIGMA Clermont · Project-3A</div>
          </div>
        </div>
        <nav className="nav">
          <div className="nav-section">Project</div>
          {NAV.slice(0, 2).map((n) => <NavItem key={n.to} {...n} />)}
          <div className="nav-section">Delivery</div>
          {NAV.slice(2, 5).map((n) => <NavItem key={n.to} {...n} />)}
          <div className="nav-section">Visual servoing</div>
          {NAV.slice(5, 8).map((n) => <NavItem key={n.to} {...n} />)}
          <div className="nav-section">Knowledge</div>
          {NAV.slice(8).map((n) => <NavItem key={n.to} {...n} />)}
        </nav>
        <div className="sidebar-foot">
          <ProgressMini />
          <div className="row"><IconBranch width={14} height={14} /> <span className="mono">{data.git.branch || progress.project.repository.working_branch}</span></div>
          <div>Data synced {synced.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</div>
          <div>progress.yaml · updated {progress.updated}</div>
        </div>
      </aside>
      {open && <div className="scrim" onClick={() => setOpen(false)} />}
      <div className="main">
        <header className="topbar">
          <button className="icon-btn menu-btn" aria-label="Open navigation" onClick={() => setOpen(true)}><IconMenu /></button>
          <h1>{current?.label ?? 'Dashboard'}</h1>
          <span className="crumb">/ {progress.project.title}</span>
          <div className="topbar-right">
            <a className="btn" href={progress.project.repository.url} target="_blank" rel="noreferrer">Repository</a>
            <button className="icon-btn" aria-label="Toggle theme" onClick={toggle}>{theme === 'dark' ? <IconSun /> : <IconMoon />}</button>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function NavItem({ to, label, icon, count }: (typeof NAV)[number]) {
  return (
    <NavLink to={to} end={to === '/'}>
      {icon}
      {label}
      {count && <span className="count">{count()}</span>}
    </NavLink>
  )
}
