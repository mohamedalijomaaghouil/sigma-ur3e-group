import { Link } from 'react-router-dom'
import { ProgressSummary } from '../components/ProgressSummary'
import { Badge, BlockBadge, Card, StackedBar, STATUS_COLOR, StatusBadge, ValidationTrack, WpChip } from '../components/ui'
import {
  LEVELS, WP_STATUS_LABEL, WP_STATUS_ORDER, countBy, data, daysUntil, fmtDate,
  levelStats, parseDate, progress, wpById,
} from '../data'

export default function Overview() {
  const p = progress
  const wps = p.work_packages
  const core = wps.filter((w) => w.block !== 'optional')
  const statusCounts = countBy(wps, (w) => w.status)
  const demoDays = daysUntil(p.project.demo.date)
  const today = new Date()
  const nextMs = p.milestones.find((m) => parseDate(m.date) >= new Date(today.getFullYear(), today.getMonth(), today.getDate()))
  const active = wps.filter((w) => w.status === 'in_progress' || w.status === 'in_review')
  const openQ = p.open_questions.filter((q) => q.status === 'open')
  const todayD = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const phase = p.phases.find((ph) => parseDate(ph.start) <= todayD && todayD <= parseDate(ph.end))

  return (
    <>
      <section className="card hero">
        <div className="eyebrow">{p.project.institution}</div>
        <h2 style={{ marginTop: 8 }}>{p.project.title}</h2>
        <p>{p.project.summary}</p>
        <ProgressSummary embedded />
        <div className="hero-meta">
          <Badge color="var(--accent)">Phase 0 · Planning baseline</Badge>
          <Badge color="var(--s-planned)">ROS 2 {p.project.software.ros_distro}</Badge>
          <Badge color={p.project.demo.status === 'to_confirm' ? 'var(--s-blocked)' : 'var(--s-done)'} dashed={p.project.demo.status === 'to_confirm'}>
            Demo {fmtDate(p.project.demo.date)}{p.project.demo.status === 'to_confirm' ? ' · to confirm' : ''}
          </Badge>
          <Badge color="var(--s-review)">Branch {p.project.repository.working_branch}</Badge>
        </div>
      </section>

      <div className="grid g4">
        <Card>
          <div className="kpi">
            <div className="label">Days to demo</div>
            <div className="value">{demoDays}<small>days</small></div>
            <div className="tiny muted">{p.project.demo.status === 'to_confirm' ? 'Date to reconfirm with the professors' : 'Confirmed'}</div>
          </div>
        </Card>
        <Card>
          <div className="kpi">
            <div className="label">Current phase</div>
            <div className="value" style={{ fontSize: 22 }}>{phase ? `${phase.id} · ${phase.title}` : '—'}</div>
            <div className="tiny muted">{phase ? `${fmtDate(phase.start, { day: '2-digit', month: 'short' })} – ${fmtDate(phase.end, { day: '2-digit', month: 'short' })} · ${phase.goal}` : 'Outside the planned phases'}</div>
          </div>
        </Card>
        <Card>
          <div className="kpi">
            <div className="label">Next milestone</div>
            <div className="value" style={{ fontSize: 22 }}>{nextMs ? `${nextMs.id} · ${nextMs.title}` : '—'}</div>
            <div className="tiny muted">{nextMs ? `${fmtDate(nextMs.date)} · in ${daysUntil(nextMs.date)} days` : 'No upcoming milestone'}</div>
          </div>
        </Card>
        <Card>
          <div className="kpi">
            <div className="label">Open questions</div>
            <div className="value">{openQ.length}<small>open</small></div>
            <div className="tiny muted">{openQ.filter((q) => q.blocks.length).length} block at least one work package</div>
          </div>
        </Card>
      </div>

      <div className="grid g-main-side">
        <Card title="Work package status" hint={`${wps.length} work packages`} right={<Link to="/progress" className="small">Open progress →</Link>}>
          <StackedBar total={wps.length} parts={WP_STATUS_ORDER.map((s) => ({ value: statusCounts.get(s) ?? 0, color: STATUS_COLOR[s], label: WP_STATUS_LABEL[s] }))} />
          <div className="legend" style={{ marginTop: 10 }}>
            {WP_STATUS_ORDER.map((s) => (
              <span key={s}><i style={{ background: STATUS_COLOR[s] }} />{WP_STATUS_LABEL[s]} · {statusCounts.get(s) ?? 0}</span>
            ))}
          </div>
          <div className="sep" />
          <div className="grid g4">
            {LEVELS.map((l) => {
              const s = levelStats(core, l.key)
              return (
                <div key={l.key} className="stack" style={{ gap: 6 }}>
                  <div className="small muted">{l.label}</div>
                  <div style={{ fontWeight: 650, fontSize: 18 }}>{s.passed}<span className="muted small"> / {s.applicable}</span></div>
                  <div className="bar"><span style={{ width: `${(100 * s.passed) / Math.max(s.applicable, 1)}%`, background: 'var(--s-done)' }} /></div>
                </div>
              )
            })}
          </div>
        </Card>

        <Card title="Currently active" hint="in progress or in review">
          {active.length === 0 ? (
            <div className="muted small">No work package is in progress.</div>
          ) : (
            <div className="stack">
              {active.map((w) => (
                <Link key={w.id} to={`/progress?wp=${w.id}`} className="row" style={{ justifyContent: 'space-between', color: 'inherit' }}>
                  <span className="row"><span className="chip">{w.id}</span><span>{w.title}</span></span>
                  <span className="row"><ValidationTrack wp={w} /><StatusBadge status={w.status} /></span>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card title="Use case" hint="what the robot must do, in order">
        <div className="pipeline">
          {p.project.use_case_steps.map((s) => <div key={s} className="step">{s}</div>)}
        </div>
        <div className="sep" />
        <div className="grid g3">
          {p.project.development_levels.map((l) => (
            <div key={l.id} className="stack" style={{ gap: 4 }}>
              <div className="row"><span className="chip">{l.id}</span><b style={{ fontWeight: 600 }}>{l.name}</b></div>
              <div className="tiny muted">{l.note ?? `Status: ${l.status}`}</div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid g-main-side">
        <Card title="Graded requirements" hint="coverage by work package">
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Step</th><th>Requirement</th><th>Work packages</th><th>Report</th></tr></thead>
              <tbody>
                {p.requirements.map((r) => r.items.map((it, i) => (
                  <tr key={r.id + i}>
                    {i === 0 && <td rowSpan={r.items.length}><span className="chip">{r.id}</span><div className="small" style={{ marginTop: 6, fontWeight: 550 }}>{r.title}</div></td>}
                    <td>{it.text}</td>
                    <td><div className="row">{it.work_packages.map((id) => {
                      const w = wpById.get(id)
                      return <span key={id} className="row" style={{ gap: 4 }}><WpChip id={id} />{w && <ValidationTrack wp={w} />}</span>
                    })}</div></td>
                    {i === 0 && <td rowSpan={r.items.length}><Badge color="var(--s-planned)">{r.report.replace('_', ' ')}</Badge></td>}
                  </tr>
                )))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="stack" style={{ gap: 16 }}>
          <Card title="Hardware" hint="known and unknown">
            <div className="stack">
              {p.project.hardware.map((h) => (
                <div key={h.item} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 10, alignItems: 'center' }}>
                  <span className="small">{h.item}</span>
                  <Badge color={h.status === 'confirmed' ? 'var(--s-done)' : 'var(--s-blocked)'} dashed={h.status !== 'confirmed'}>{h.status}</Badge>
                </div>
              ))}
            </div>
          </Card>
          <Card title="Blocking questions" right={<Link to="/progress#questions" className="small">All →</Link>}>
            <div className="stack">
              {openQ.filter((q) => q.blocks.length).slice(0, 5).map((q) => (
                <div key={q.id} className="small">
                  <span className="chip">{q.id}</span> {q.question}
                  <div className="row" style={{ marginTop: 4 }}>{q.blocks.map((b) => <WpChip key={b} id={b} />)}</div>
                </div>
              ))}
            </div>
          </Card>
          <Card title="Blocks">
            <div className="row">{p.blocks.map((b) => <BlockBadge key={b.id} block={b.id} />)}</div>
            <div className="tiny muted" style={{ marginTop: 10 }}>Data: progress.yaml · {data.docs.length} documents · {data.experiments.length} experiments</div>
          </Card>
        </div>
      </div>
    </>
  )
}
