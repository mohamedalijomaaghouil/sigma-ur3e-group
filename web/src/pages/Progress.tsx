import type { CSSProperties } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import {
  Badge, BLOCK_COLOR, BlockBadge, Card, PageHead, StatusBadge, ValidationTrack, ValidationTrackLarge, WpChip,
} from '../components/ui'
import { LEVELS, WP_STATUS_LABEL, WP_STATUS_ORDER, levelStats, progress, questionById, repoUrl } from '../data'
import type { WorkPackage, WpStatus } from '../types'

export default function Progress() {
  const [params, setParams] = useSearchParams()
  const loc = useLocation()
  const openId = params.get('wp')
  const [block, setBlock] = useState('all')
  const [status, setStatus] = useState<'all' | WpStatus>('all')

  useEffect(() => {
    if (openId) document.getElementById(`wp-${openId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    else if (loc.hash === '#questions') document.getElementById('questions')?.scrollIntoView({ behavior: 'smooth' })
  }, [openId, loc.hash])

  const wps = useMemo(
    () => progress.work_packages.filter((w) => (block === 'all' || w.block === block) && (status === 'all' || w.status === status)),
    [block, status],
  )
  const toggle = (id: string) => setParams(openId === id ? {} : { wp: id }, { replace: true })

  return (
    <>
      <PageHead eyebrow="Delivery" title="Development and validation progress">
        Each work package tracks implementation separately from offline, simulation and hardware validation. A level is marked passed only with linked evidence. Acceptance numbers are preliminary engineering targets.
      </PageHead>

      <div className="grid g4">
        {LEVELS.map((l) => {
          const s = levelStats(progress.work_packages.filter((w) => w.block !== 'optional'), l.key)
          return (
            <Card key={l.key}>
              <div className="kpi">
                <div className="label">{l.label}</div>
                <div className="value">{s.passed}<small>/ {s.applicable}</small></div>
                <div className="bar"><span style={{ width: `${(100 * s.passed) / Math.max(s.applicable, 1)}%`, background: 'var(--s-done)' }} /></div>
              </div>
            </Card>
          )
        })}
      </div>

      <Card
        title="Work packages"
        hint={`${wps.length} shown`}
        right={
          <div className="legend">
            {LEVELS.map((l, i) => <span key={l.key} className="mono tiny">{i + 1}. {l.short}</span>)}
          </div>
        }
      >
        <div className="row" style={{ marginBottom: 14, justifyContent: 'space-between' }}>
          <div className="seg">
            {['all', ...progress.blocks.map((b) => b.id)].map((b) => (
              <button key={b} className={`btn${block === b ? ' active' : ''}`} onClick={() => setBlock(b)}>
                {b === 'all' ? 'All blocks' : progress.blocks.find((x) => x.id === b)?.name}
              </button>
            ))}
          </div>
          <div className="seg">
            {(['all', ...WP_STATUS_ORDER] as const).map((s) => (
              <button key={s} className={`btn${status === s ? ' active' : ''}`} onClick={() => setStatus(s)}>
                {s === 'all' ? 'Any status' : WP_STATUS_LABEL[s]}
              </button>
            ))}
          </div>
        </div>

        <div className="wp-list">
          {wps.map((w) => (
            <WpRow key={w.id} wp={w} open={openId === w.id} onToggle={() => toggle(w.id)} />
          ))}
          {wps.length === 0 && <div className="muted small">No work package matches the filters.</div>}
        </div>
      </Card>

      <Card title="Open questions" hint="decisions waiting for hardware access or the professors">
        <div id="questions" className="table-wrap">
          <table className="table">
            <thead><tr><th>ID</th><th>Question</th><th>Ask</th><th>Blocks</th><th>Status</th></tr></thead>
            <tbody>
              {progress.open_questions.map((q) => (
                <tr key={q.id}>
                  <td><span className="chip">{q.id}</span></td>
                  <td>{q.question}</td>
                  <td className="small muted">{q.ask}</td>
                  <td><div className="row">{q.blocks.map((b) => <WpChip key={b} id={b} />)}{q.blocks.length === 0 && <span className="tiny muted">—</span>}</div></td>
                  <td><Badge color={q.status === 'open' ? 'var(--s-blocked)' : 'var(--s-done)'}>{q.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Architecture decisions" hint={progress.decisions_note}>
        <div className="grid g3">
          {progress.decisions.map((d) => (
            <div key={d.id} className="row" style={{ alignItems: 'flex-start', flexWrap: 'nowrap' }}>
              <span className="chip">{d.id}</span>
              <span className="small">{d.title}<div className="tiny muted">{d.status.replace(/_/g, ' ')}</div></span>
            </div>
          ))}
        </div>
      </Card>
    </>
  )
}

function WpRow({ wp, open, onToggle }: { wp: WorkPackage; open: boolean; onToggle: () => void }) {
  return (
    <div id={`wp-${wp.id}`} className={`wp${open ? ' open' : ''}`} style={{ ['--bc' as string]: BLOCK_COLOR[wp.block] } as CSSProperties} onClick={onToggle}>
      <div className="id">{wp.id}</div>
      <div style={{ minWidth: 0 }}>
        <div className="title">{wp.title}</div>
        <div className="meta">
          <span>Phase {wp.phase ?? '—'}</span>
          {wp.milestone && <span>· {wp.milestone}</span>}
          {wp.graded_steps.length > 0 && <span>· {wp.graded_steps.join(', ')}</span>}
          {wp.blocked_by.length > 0 && <span style={{ color: 'var(--s-blocked)' }}>· waits on {wp.blocked_by.join(', ')}</span>}
        </div>
      </div>
      <div className="right row" style={{ flexWrap: 'nowrap' }}>
        <ValidationTrack wp={wp} />
        <StatusBadge status={wp.status} />
      </div>

      {open && (
        <div className="wp-detail" onClick={(e) => e.stopPropagation()}>
          <div className="small" style={{ color: 'var(--text-2)' }}>{wp.description}</div>
          <ValidationTrackLarge wp={wp} />
          <div className="grid g2">
            <div>
              <h4>Deliverables and acceptance</h4>
              <div className="deliv">
                {wp.deliverables.length === 0 && <span className="tiny muted">None defined yet</span>}
                {wp.deliverables.map((d) => (
                  <div key={d.name}>
                    <span>{d.name}</span>
                    <span className="muted">{d.acceptance ?? '—'} {d.preliminary && <span className="tag-prelim">preliminary</span>}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="stack" style={{ alignContent: 'start' }}>
              <div>
                <h4>Context</h4>
                <div className="row"><BlockBadge block={wp.block} />{wp.packages.map((p) => <span key={p} className="chip">{p}</span>)}</div>
              </div>
              <div>
                <h4>Depends on</h4>
                <div className="row">{wp.depends_on.length ? wp.depends_on.map((d) => <WpChip key={d} id={d} />) : <span className="tiny muted">Nothing</span>}</div>
              </div>
              {wp.blocked_by.length > 0 && (
                <div>
                  <h4>Waiting on</h4>
                  <div className="stack" style={{ gap: 4 }}>
                    {wp.blocked_by.map((q) => <div key={q} className="small"><span className="chip">{q}</span> {questionById.get(q)?.question}</div>)}
                  </div>
                </div>
              )}
              <div>
                <h4>Evidence</h4>
                {wp.evidence.length === 0 ? (
                  <span className="tiny muted">No evidence yet</span>
                ) : (
                  <div className="row">
                    {wp.evidence.map((e) => (
                      <a key={e.label} className="chip" href={e.url ?? (e.path ? repoUrl(e.path) : '#')} target="_blank" rel="noreferrer">{e.label}</a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
