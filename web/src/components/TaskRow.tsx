import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { repoUrl, vsTaskById, wpById } from '../data'
import type { VsTask } from '../types'
import { BLOCK_COLOR, StatusBadge, ValidationTrack, ValidationTrackLarge, WpChip } from './ui'

const GROUP_COLOR: Record<string, string> = {
  ibvs: 'var(--b-upstream)',
  pbvs: 'var(--b-parallel)',
  hybrid: 'var(--b-downstream)',
}

export function DepChip({ id }: { id: string }) {
  const t = vsTaskById.get(id)
  if (t) return <Link className="chip" to={`/${t.group === 'hybrid' ? 'comparison' : t.group}?task=${id}`}>{id}</Link>
  if (wpById.has(id)) return <WpChip id={id} />
  return <span className="chip">{id}</span>
}

/** Expandable row for one visual servoing task (IBVS-xx, PBVS-xx, HYB-xx). */
export function TaskRow({ task, open, onToggle }: { task: VsTask; open: boolean; onToggle: () => void }) {
  return (
    <div id={`task-${task.id}`} className={`wp${open ? ' open' : ''}`}
      style={{ ['--bc' as string]: GROUP_COLOR[task.group] ?? BLOCK_COLOR.parallel } as CSSProperties} onClick={onToggle}>
      <div className="id" style={{ fontSize: 12 }}>{task.id}</div>
      <div style={{ minWidth: 0 }}>
        <div className="title">{task.title}</div>
        <div className="meta">
          <span>{task.week}</span>
          {task.level && task.level !== '—' && <span>· level {task.level}</span>}
          {task.parent_wp && <span>· {task.parent_wp}</span>}
          {task.depends_on.length > 0 && <span>· needs {task.depends_on.join(', ')}</span>}
        </div>
      </div>
      <div className="right row" style={{ flexWrap: 'nowrap' }}>
        <ValidationTrack wp={task} />
        <StatusBadge status={task.status} />
      </div>

      {open && (
        <div className="wp-detail" onClick={(e) => e.stopPropagation()}>
          <div className="small" style={{ color: 'var(--text-2)' }}><b style={{ color: 'var(--text)' }}>Objective.</b> {task.objective}</div>
          <ValidationTrackLarge wp={task} />
          <div className="grid g2">
            <div className="stack">
              <div>
                <h4>Expected implementation</h4>
                <div className="small mono" style={{ color: 'var(--text-2)' }}>{task.implementation}</div>
              </div>
              <div>
                <h4>Deliverables</h4>
                <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>{task.deliverables.map((d) => <li key={d}>{d}</li>)}</ul>
              </div>
              <div>
                <h4>Acceptance criteria {task.acceptance_preliminary && <span className="tag-prelim">preliminary</span>}</h4>
                <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>{task.acceptance.map((d) => <li key={d}>{d}</li>)}</ul>
              </div>
            </div>
            <div className="stack" style={{ alignContent: 'start' }}>
              <div>
                <h4>Depends on</h4>
                <div className="row">{task.depends_on.length ? task.depends_on.map((d) => <DepChip key={d} id={d} />) : <span className="tiny muted">Nothing — can start now</span>}</div>
              </div>
              <div>
                <h4>Expected visual evidence</h4>
                <div className="row">{task.evidence_expected.map((e) => <span key={e} className="chip" style={{ fontFamily: 'var(--font)' }}>{e}</span>)}</div>
              </div>
              <div>
                <h4>Evidence</h4>
                {task.evidence.length === 0 ? <span className="tiny muted">No evidence yet</span> : (
                  <div className="row">{task.evidence.map((e) => (
                    <a key={e.label} className="chip" href={e.url ?? (e.path ? repoUrl(e.path) : '#')} target="_blank" rel="noreferrer">{e.label}</a>
                  ))}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
