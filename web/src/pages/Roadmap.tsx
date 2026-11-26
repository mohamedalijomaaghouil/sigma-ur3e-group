import type { CSSProperties } from 'react'
import { Card, PageHead, STATUS_COLOR, StackedBar, StatusBadge, ValidationTrack, WpChip } from '../components/ui'
import { WP_STATUS_LABEL, WP_STATUS_ORDER, countBy, daysUntil, fmtDate, parseDate, progress, wpById } from '../data'
import type { WorkPackage } from '../types'

const PHASE_COLORS = ['var(--accent)', 'var(--b-upstream)', 'var(--s-planned)', 'var(--b-parallel)', 'var(--b-downstream)']

/** Milestone colour from the statuses of its work packages. */
function milestoneColor(wps: WorkPackage[]) {
  if (wps.length && wps.every((w) => w.status === 'done')) return 'var(--s-done)'
  if (wps.some((w) => w.status === 'blocked')) return 'var(--s-blocked)'
  if (wps.some((w) => w.status === 'in_progress' || w.status === 'in_review')) return 'var(--s-progress)'
  return 'var(--s-planned)'
}

export default function Roadmap() {
  const { phases, milestones } = progress
  const start = parseDate(phases[0]?.start ?? milestones[0].date)
  const end = parseDate(phases[phases.length - 1]?.end ?? milestones[milestones.length - 1].date)
  const span = end.getTime() - start.getTime() || 1
  const pct = (d: Date) => Math.min(100, Math.max(0, ((d.getTime() - start.getTime()) / span) * 100))
  const today = new Date()
  const todayPct = pct(new Date(today.getFullYear(), today.getMonth(), today.getDate()))

  // Month ticks
  const ticks: Date[] = []
  for (let d = new Date(start.getFullYear(), start.getMonth() + 1, 1); d <= end; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) ticks.push(d)

  return (
    <>
      <PageHead eyebrow="Delivery" title="Roadmap and milestones">
        Phases and milestones from <code>progress.yaml</code>. Dates are targets; the demo date is to be reconfirmed. Hybrid visual servoing is mandatory; optional AI extensions are deferred first.
      </PageHead>

      <Card title="Timeline" hint={`${fmtDate(phases[0].start)} → ${fmtDate(phases[phases.length - 1].end)}`}>
        <div className="table-wrap">
          <div className="timeline" style={{ minWidth: 760, padding: '22px 60px 0' }}>
            <div className="tl-scale">
              <span style={{ left: '0%' }}>{fmtDate(phases[0].start, { day: '2-digit', month: 'short' })}</span>
              {ticks.map((t) => (
                <span key={t.toISOString()} style={{ left: `${pct(t)}%` }}>{t.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}</span>
              ))}
              <div className="tl-today" style={{ left: `${todayPct}%`, height: 200 }}><span>Today</span></div>
            </div>
            <div className="tl-phases">
              {phases.map((ph, i) => {
                const l = pct(parseDate(ph.start))
                const r = pct(parseDate(ph.end))
                return (
                  <div key={ph.id} className="tl-phase" title={ph.goal}
                    style={{ left: `${l}%`, width: `calc(${r - l}% - 4px)`, ['--pc' as string]: PHASE_COLORS[i % PHASE_COLORS.length] } as CSSProperties}>
                    <b>{ph.id} · {ph.title}</b>
                    <span>{fmtDate(ph.start, { day: '2-digit', month: 'short' })} – {fmtDate(ph.end, { day: '2-digit', month: 'short' })}</span>
                  </div>
                )
              })}
            </div>
            <div className="tl-ms">
              {milestones.map((m) => {
                const wps = m.work_packages.map((id) => wpById.get(id)).filter(Boolean) as WorkPackage[]
                const past = daysUntil(m.date) < 0
                return (
                  <div key={m.id} className={`tl-m${past ? ' past' : ''}`} style={{ left: `${pct(parseDate(m.date))}%`, ['--mc' as string]: milestoneColor(wps) } as CSSProperties}>
                    <div className="diamond" />
                    <div className="lbl">{m.id}</div>
                    <div className="dt">{fmtDate(m.date, { day: '2-digit', month: 'short' })}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
        <div className="legend" style={{ marginTop: 4 }}>
          <span><i style={{ background: 'var(--s-planned)' }} />Not started</span>
          <span><i style={{ background: 'var(--s-progress)' }} />Work in progress</span>
          <span><i style={{ background: 'var(--s-blocked)' }} />Contains a blocked work package</span>
          <span><i style={{ background: 'var(--s-done)' }} />All work packages done</span>
        </div>
      </Card>

      <div className="grid g2">
        {milestones.map((m) => {
          const wps = m.work_packages.map((id) => wpById.get(id)).filter(Boolean) as WorkPackage[]
          const counts = countBy(wps, (w) => w.status)
          const d = daysUntil(m.date)
          return (
            <Card key={m.id} className="ms-card" style={{ ['--mc' as string]: milestoneColor(wps) } as CSSProperties}
              title={<span className="row"><span className="chip">{m.id}</span>{m.title}</span>}
              right={<span className="small muted">{fmtDate(m.date)} · {d >= 0 ? `in ${d} d` : `${-d} d ago`}</span>}>
              <div className="small" style={{ color: 'var(--text-2)', marginBottom: 12 }}>{m.description}</div>
              <StackedBar total={wps.length} parts={WP_STATUS_ORDER.map((s) => ({ value: counts.get(s) ?? 0, color: STATUS_COLOR[s], label: WP_STATUS_LABEL[s] }))} />
              <div className="stack" style={{ marginTop: 12, gap: 8 }}>
                {wps.map((w) => (
                  <div key={w.id} className="row" style={{ justifyContent: 'space-between' }}>
                    <span className="row" style={{ minWidth: 0 }}><WpChip id={w.id} /><span className="small">{w.title}</span></span>
                    <span className="row"><ValidationTrack wp={w} /><StatusBadge status={w.status} /></span>
                  </div>
                ))}
              </div>
            </Card>
          )
        })}
      </div>

      <Card title="Phases">
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Phase</th><th>Period</th><th>Goal</th></tr></thead>
            <tbody>
              {phases.map((ph, i) => (
                <tr key={ph.id}>
                  <td><span className="row"><i style={{ width: 9, height: 9, borderRadius: 3, background: PHASE_COLORS[i % PHASE_COLORS.length], display: 'inline-block' }} /><b style={{ fontWeight: 600 }}>{ph.id}</b> {ph.title}</span></td>
                  <td className="small muted" style={{ whiteSpace: 'nowrap' }}>{fmtDate(ph.start)} – {fmtDate(ph.end)}</td>
                  <td className="small">{ph.goal}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  )
}
