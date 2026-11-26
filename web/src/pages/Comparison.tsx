import { useState } from 'react'
import { Link } from 'react-router-dom'
import { EvidenceGallery } from '../components/EvidenceGallery'
import { TaskRow } from '../components/TaskRow'
import { Card, Empty, PageHead } from '../components/ui'
import { data, evidenceFor, groupProgress, progress, tasksOf } from '../data'
import { IconFlask } from '../components/Icons'

/** Shared controller comparison (IBVS vs PBVS vs hybrid) and the mandatory hybrid tasks. */
export default function Comparison() {
  const b = progress.benchmark
  const [openId, setOpenId] = useState<string | null>(null)
  const runs = data.experiments.filter((e) => e.subsystem === 'visual_servoing_benchmark')
  // A scenario/controller cell is "recorded" when a benchmark experiment lists that controller and scenario.
  const has = (controller: string, scenario: string) =>
    runs.some((r) => r.experiment_id.toLowerCase().includes(scenario.toLowerCase()) &&
      r.methods.some((m) => m.name.toLowerCase().includes(controller.toLowerCase())))

  return (
    <>
      <PageHead eyebrow="Visual servoing" title="Controller comparison"
        right={<Link className="btn" to="/docs/visual_servoing_benchmark">Open benchmark protocol</Link>}>
        IBVS, PBVS and hybrid visual servoing compared under equivalent conditions: same starts, target motions, perception source, backend, limits and stop criterion. ArUco first, then markerless perception, to separate perception errors from control errors.
      </PageHead>

      <div className="grid g3">
        {(['ibvs', 'pbvs', 'hybrid'] as const).map((g) => {
          const p = groupProgress(g)
          const grp = progress.vs_groups.find((x) => x.id === g)
          return (
            <Card key={g}>
              <div className="kpi">
                <div className="label">{grp?.name ?? g}</div>
                <div className="value">{p.pct.toFixed(0)}<small>%</small></div>
                <div className="bar"><span style={{ width: `${p.pct}%`, background: 'var(--accent)' }} /></div>
                <div className="tiny muted">{p.done} / {p.total} tasks done · {p.passed} / {p.applicable} checkpoints</div>
                {g !== 'hybrid' && <Link to={`/${g}`} className="small">Open {g.toUpperCase()} section →</Link>}
              </div>
            </Card>
          )
        })}
      </div>

      <Card title="Benchmark matrix" hint={`${runs.length} benchmark run${runs.length === 1 ? '' : 's'} recorded`}>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Scenario</th>{b.controllers.map((c) => <th key={c}>{c}</th>)}</tr></thead>
            <tbody>
              {b.scenarios.map((s) => (
                <tr key={s.id}>
                  <td><span className="chip">{s.id}</span> {s.name}</td>
                  {b.controllers.map((c) => (
                    <td key={c}>{has(c, s.id) ? <span style={{ color: 'var(--s-done)', fontWeight: 600 }}>recorded</span> : <span className="muted tiny">no run yet</span>}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="sep" />
        <div className="grid g2">
          <div>
            <div className="eyebrow" style={{ marginBottom: 6 }}>Stages</div>
            <div className="stack" style={{ gap: 4 }}>{b.stages.map((s) => <div key={s.id} className="small"><span className="chip">{s.id}</span> {s.name}</div>)}</div>
          </div>
          <div>
            <div className="eyebrow" style={{ marginBottom: 6 }}>Metrics</div>
            <div className="row">{b.metrics.map((m) => <span key={m} className="chip" style={{ fontFamily: 'var(--font)' }}>{m}</span>)}</div>
          </div>
        </div>
      </Card>

      <Card title="Hybrid visual servoing (mandatory, joint work)" hint="HYB tasks">
        <div className="wp-list">
          {tasksOf('hybrid').map((t) => (
            <TaskRow key={t.id} task={t} open={openId === t.id} onToggle={() => setOpenId(openId === t.id ? null : t.id)} />
          ))}
        </div>
      </Card>

      <Card title="Benchmark results">
        {runs.length === 0 ? (
          <Empty title="No benchmark runs yet" icon={<IconFlask />}>Comparison tables and plots appear when experiments/visual_servoing_benchmark/ contains runs.</Empty>
        ) : (
          <div className="stack">{runs.map((r) => <div key={r.folder} className="small"><b>{r.title}</b> <span className="muted mono">{r.folder}</span></div>)}</div>
        )}
      </Card>

      <Card title="Comparative media">
        <EvidenceGallery items={evidenceFor('hybrid')} />
      </Card>
    </>
  )
}
