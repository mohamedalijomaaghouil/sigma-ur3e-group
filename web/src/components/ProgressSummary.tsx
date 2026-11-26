import { Link } from 'react-router-dom'
import { nextStep, overallProgress, progress, wpById } from '../data'
import { StatusBadge } from './ui'

/** Progress bar with percentage and the next step (Overview, inside the project header). */
export function ProgressSummary({ embedded = false }: { embedded?: boolean }) {
  const p = overallProgress()
  const next = nextStep()
  const nextWp = next?.work_package ? wpById.get(next.work_package) : undefined
  return (
    <section className={embedded ? 'progress-summary embedded' : 'card progress-summary'}>
      <div className="ps-top">
        <div>
          <div className="eyebrow">Overall progress{progress.maintainer ? ` · maintained by ${progress.maintainer}` : ''}</div>
          <div className="ps-pct">{p.pct.toFixed(0)}<span>%</span></div>
        </div>
        <div className="ps-facts small muted">
          <div><b>{p.passed}</b> of {p.applicable} validation checkpoints passed</div>
          <div><b>{p.wpDone}</b> of {p.wpTotal} work packages done</div>
        </div>
      </div>
      <div className="ps-bar" role="progressbar" aria-valuenow={Math.round(p.pct)} aria-valuemin={0} aria-valuemax={100}
        title={`${p.passed} / ${p.applicable} checkpoints`}>
        <span style={{ width: `${Math.max(p.pct, p.pct > 0 ? 1.5 : 0)}%` }} />
        {p.inProgress > 0 && <i style={{ width: `${(100 * p.inProgress) / Math.max(p.applicable, 1)}%` }} />}
      </div>
      <div className="tiny muted">
        A checkpoint is one validation level (implementation, offline, simulation, hardware) of one graded work package; it counts only when passed with evidence. {p.inProgress} in progress.
      </div>
      {next && (
        <div className="ps-next">
          <div className="eyebrow" style={{ color: 'var(--accent)' }}>Next step</div>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div className="row" style={{ minWidth: 0 }}>
              {next.work_package && <Link className="chip" to={`/progress?wp=${next.work_package}`}>{next.work_package}</Link>}
              <b style={{ fontWeight: 600 }}>{next.title}</b>
            </div>
            {nextWp && <StatusBadge status={nextWp.status} />}
          </div>
          {next.detail && <div className="small muted">{next.detail}</div>}
        </div>
      )}
    </section>
  )
}

/** Compact version for the sidebar, visible on every page. */
export function ProgressMini() {
  const p = overallProgress()
  const next = nextStep()
  return (
    <Link to="/" className="ps-mini">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="tiny muted">Progress</span>
        <span className="mono small" style={{ fontWeight: 600 }}>{p.pct.toFixed(0)}%</span>
      </div>
      <div className="ps-bar sm"><span style={{ width: `${Math.max(p.pct, p.pct > 0 ? 2 : 0)}%` }} /></div>
      {next && <div className="tiny" style={{ color: 'var(--text-2)' }}><span className="muted">Next:</span> {next.title}</div>}
    </Link>
  )
}
