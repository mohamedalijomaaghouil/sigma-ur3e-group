import type { CSSProperties } from 'react'
import { Badge, Card, Empty, PageHead, WpChip } from '../components/ui'
import { commitUrl, data, fmtDate, progress } from '../data'
import type { Experiment } from '../types'
import { IconFlask } from '../components/Icons'

const ROLE_COLOR: Record<string, string> = {
  primary: 'var(--accent)',
  alternative: 'var(--b-parallel)',
  reference: 'var(--b-upstream)',
  validation: 'var(--s-done)',
}
const LEVEL_COLOR: Record<string, string> = { offline: 'var(--s-planned)', simulation: 'var(--b-parallel)', hardware: 'var(--s-done)' }

export default function Results() {
  const bySubsystem = new Map<string, Experiment[]>()
  for (const e of data.experiments) bySubsystem.set(e.subsystem, [...(bySubsystem.get(e.subsystem) ?? []), e])
  const known = new Set(progress.subsystems.map((s) => s.id))
  const orphan = data.experiments.filter((e) => !known.has(e.subsystem))

  return (
    <>
      <PageHead eyebrow="Evidence" title="Experimental results">
        Every subsystem compares a primary method with purposeful alternatives and external references, then validates independently. Results appear here only when an experiment folder with a <code>metrics.json</code> exists in <code>experiments/</code>.
      </PageHead>

      {data.experiments.length === 0 && (
        <Empty title="No experimental results recorded yet" icon={<IconFlask />}>
          The project is at the planning baseline. Results will appear after the first experiments (camera acquisition and intrinsic calibration).
        </Empty>
      )}
      {data.experimentErrors.length > 0 && (
        <Card title="Unreadable experiment files">
          {data.experimentErrors.map((e) => <div key={e.folder} className="small mono">{e.folder}: {e.error}</div>)}
        </Card>
      )}

      {progress.subsystems.map((s) => {
        const exps = bySubsystem.get(s.id) ?? []
        const selected = exps.find((e) => e.selected_method)?.selected_method
        return (
          <Card key={s.id} title={s.name} hint={`${exps.length} experiment${exps.length === 1 ? '' : 's'}`}
            right={<div className="row">{s.work_packages.map((w) => <WpChip key={w} id={w} />)}</div>}>
            <div className="grid g4" style={{ marginBottom: exps.length ? 16 : 0 }}>
              <MethodCol role="primary" title="Primary candidate" items={[s.primary]} />
              <MethodCol role="alternative" title="Alternatives" items={s.alternatives} />
              <MethodCol role="reference" title="References" items={s.references} />
              <MethodCol role="validation" title="Independent validation" items={[s.validation]} />
            </div>
            <div className="row tiny muted" style={{ marginTop: 12 }}>
              Metrics: {s.metrics.join(' · ')}
            </div>
            {selected && <div className="small" style={{ marginTop: 10 }}>Selected method: <b>{selected}</b></div>}
            {exps.map((e) => <ExperimentBlock key={e.folder} e={e} />)}
          </Card>
        )
      })}

      {orphan.length > 0 && (
        <Card title="Other experiments">
          {orphan.map((e) => <ExperimentBlock key={e.folder} e={e} />)}
        </Card>
      )}
    </>
  )
}

function MethodCol({ role, title, items }: { role: string; title: string; items: string[] }) {
  return (
    <div className="stack" style={{ gap: 6, alignContent: 'start' }}>
      <span className="method-role" style={{ color: ROLE_COLOR[role] }}>{title}</span>
      {items.length === 0 ? <span className="tiny muted">—</span> : items.map((i) => <span key={i} className="small">{i}</span>)}
    </div>
  )
}

function ExperimentBlock({ e }: { e: Experiment }) {
  const metricKeys = [...new Set(e.methods.flatMap((m) => Object.keys(m.metrics ?? {})))]
  return (
    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 14 }} className="stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div className="row">
          <b style={{ fontWeight: 600 }}>{e.title || e.experiment_id}</b>
          <Badge color={LEVEL_COLOR[e.validation_level] ?? 'var(--s-planned)'}>{e.validation_level}</Badge>
        </div>
        <div className="row tiny muted">
          {e.date && <span>{fmtDate(e.date)}</span>}
          {e.git_commit && <a className="chip" href={commitUrl(e.git_commit)} target="_blank" rel="noreferrer">{e.git_commit.slice(0, 7)}</a>}
          <span className="mono">{e.folder}</span>
        </div>
      </div>
      {metricKeys.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Method</th><th>Role</th>{metricKeys.map((k) => <th key={k}>{k}</th>)}</tr></thead>
            <tbody>
              {e.methods.map((m) => (
                <tr key={m.name}>
                  <td>{m.name}{e.selected_method === m.name && <span className="badge" style={{ marginLeft: 8, ['--c' as string]: 'var(--s-done)' } as CSSProperties}>selected</span>}</td>
                  <td><span className="method-role" style={{ color: ROLE_COLOR[m.role] }}>{m.role}</span></td>
                  {metricKeys.map((k) => <td key={k} className="mono">{fmtMetric(m.metrics?.[k])}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {e.conclusion && <div className="small">{e.conclusion}</div>}
      {e.limitations?.length > 0 && <ul className="small muted" style={{ margin: 0 }}>{e.limitations.map((l) => <li key={l}>{l}</li>)}</ul>}
      {e.plots.length > 0 && (
        <div className="grid g3">
          {e.plots.map((p) => <a key={p} href={`${import.meta.env.BASE_URL}repo/${p}`} target="_blank" rel="noreferrer"><img src={`${import.meta.env.BASE_URL}repo/${p}`} alt={p} style={{ width: '100%', borderRadius: 8, border: '1px solid var(--border)' }} /></a>)}
        </div>
      )}
    </div>
  )
}

function fmtMetric(v: unknown) {
  if (v == null) return '—'
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : v.toPrecision(4)
  return String(v)
}
