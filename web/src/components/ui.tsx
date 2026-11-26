import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { CHECK_LABEL, LEVELS, WP_STATUS_LABEL, blockById, levelStatus } from '../data'
import type { CheckStatus, WorkPackage, WpStatus } from '../types'
import { IconInbox } from './Icons'

export const STATUS_COLOR: Record<WpStatus, string> = {
  done: 'var(--s-done)',
  in_review: 'var(--s-review)',
  in_progress: 'var(--s-progress)',
  blocked: 'var(--s-blocked)',
  planned: 'var(--s-planned)',
  deferred: 'var(--s-deferred)',
}

export const CHECK_COLOR: Record<CheckStatus, string> = {
  passed: 'var(--s-done)',
  in_progress: 'var(--s-progress)',
  failed: 'var(--s-failed)',
  not_started: 'var(--s-planned)',
  not_applicable: 'var(--s-deferred)',
}

export const BLOCK_COLOR: Record<string, string> = {
  upstream: 'var(--b-upstream)',
  parallel: 'var(--b-parallel)',
  downstream: 'var(--b-downstream)',
  common: 'var(--b-common)',
  optional: 'var(--b-optional)',
  external: 'var(--b-external)',
}

const cssVar = (c: string) => ({ ['--c' as string]: c }) as CSSProperties

export function StatusBadge({ status }: { status: WpStatus }) {
  return (
    <span className={`badge${status === 'deferred' ? ' dashed' : ''}`} style={cssVar(STATUS_COLOR[status])}>
      <span className="dot" />
      {WP_STATUS_LABEL[status] ?? status}
    </span>
  )
}

export function CheckBadge({ status }: { status: CheckStatus }) {
  return (
    <span className="badge" style={cssVar(CHECK_COLOR[status])}>
      {CHECK_LABEL[status] ?? status}
    </span>
  )
}

export function BlockBadge({ block }: { block: string }) {
  const b = blockById.get(block)
  return (
    <span className="badge" style={cssVar(BLOCK_COLOR[block] ?? 'var(--muted)')}>
      {b?.name ?? block}
    </span>
  )
}

export function Badge({ color, children, dashed }: { color: string; children: ReactNode; dashed?: boolean }) {
  return (
    <span className={`badge${dashed ? ' dashed' : ''}`} style={cssVar(color)}>
      {children}
    </span>
  )
}

/** Four small cells: implementation, offline, simulation, hardware. */
export function ValidationTrack({ wp }: { wp: Pick<WorkPackage, 'validation'> }) {
  return (
    <span className="vtrack" aria-label="Validation levels">
      {LEVELS.map((l) => {
        const s = levelStatus(wp, l.key)
        return <span key={l.key} className={`vcell ${s}`} title={`${l.label}: ${CHECK_LABEL[s]}`} />
      })}
    </span>
  )
}

export function ValidationTrackLarge({ wp }: { wp: Pick<WorkPackage, 'validation'> }) {
  return (
    <div className="vtrack-lg">
      {LEVELS.map((l) => {
        const s = levelStatus(wp, l.key)
        return (
          <div className="vbox" key={l.key}>
            <div className="tiny muted">{l.label}</div>
            <div className="small" style={{ fontWeight: 550, color: CHECK_COLOR[s] }}>
              {l.key === 'implementation' && wp.validation.implementation === 'done' ? 'Done' : CHECK_LABEL[s]}
            </div>
            <div className={`vcell ${s}`} />
          </div>
        )
      })}
    </div>
  )
}

export function WpChip({ id }: { id: string }) {
  return (
    <Link className="chip" to={`/progress?wp=${id}`}>
      {id}
    </Link>
  )
}

export function Empty({ title, children, icon }: { title: string; children?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="empty">
      {icon ?? <IconInbox />}
      <b>{title}</b>
      {children && <div className="small">{children}</div>}
    </div>
  )
}

export function Card({ title, hint, right, children, className, style }: {
  title?: ReactNode
  hint?: ReactNode
  right?: ReactNode
  children: ReactNode
  className?: string
  style?: CSSProperties
}) {
  return (
    <section className={`card ${className ?? ''}`} style={style}>
      {(title || right) && (
        <div className="card-head">
          {title && <h3>{title}</h3>}
          {hint && <span className="hint">{hint}</span>}
          {right && <div className="right">{right}</div>}
        </div>
      )}
      {children}
    </section>
  )
}

export function PageHead({ eyebrow, title, children, right }: { eyebrow?: string; title: string; children?: ReactNode; right?: ReactNode }) {
  return (
    <div className="page-head">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h2>{title}</h2>
        {children && <p>{children}</p>}
      </div>
      {right && <div className="right">{right}</div>}
    </div>
  )
}

export function StackedBar({ parts, total }: { parts: { value: number; color: string; label: string }[]; total: number }) {
  return (
    <div className="stacked" role="img" aria-label={parts.map((p) => `${p.label}: ${p.value}`).join(', ')}>
      {parts.map((p) =>
        p.value > 0 ? <span key={p.label} title={`${p.label}: ${p.value}`} style={{ width: `${(100 * p.value) / Math.max(total, 1)}%`, background: p.color }} /> : null,
      )}
    </div>
  )
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter((w) => /^[A-Z]/.test(w))
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
}
