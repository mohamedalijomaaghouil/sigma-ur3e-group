import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { EvidenceGallery } from '../components/EvidenceGallery'
import { DepChip, TaskRow } from '../components/TaskRow'
import { Badge, Card, Empty, PageHead, StatusBadge, WpChip } from '../components/ui'
import {
  GROUP_SUBSYSTEMS, LEVELS, currentWeek, data, evidenceFor, fmtDate, groupProgress, levelStats, nextTaskOf, progress, tasksOf,
} from '../data'
import { IconFlask } from '../components/Icons'

/** Dedicated page for one visual servoing group (Group A — IBVS, Group B — PBVS). */
export default function VsGroupPage({ group }: { group: 'ibvs' | 'pbvs' }) {
  const g = progress.vs_groups.find((x) => x.id === group)!
  const tasks = useMemo(() => tasksOf(group), [group])
  const gp = groupProgress(group)
  const next = nextTaskOf(group)
  const week = currentWeek()
  const [params, setParams] = useSearchParams()
  const [openId, setOpenId] = useState<string | null>(params.get('task'))
  useEffect(() => {
    const t = params.get('task')
    setOpenId(t)
    if (t) setTimeout(() => document.getElementById(`task-${t}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50)
  }, [params])
  const docSlug = g.doc.split('/').pop()!.replace(/\.md$/, '').toLowerCase()
  const experiments = data.experiments.filter((e) => (GROUP_SUBSYSTEMS[group] ?? []).includes(e.subsystem))

  return (
    <>
      <PageHead eyebrow="Visual servoing" title={g.name}
        right={<Link className="btn" to={`/docs/${docSlug}`}>Open development guide ({g.doc.split('/').pop()})</Link>}>
        {g.objective} Strategy: theory → simulation → ArUco on the robot → real bottle. Shared perception, conventions, Cartesian velocity interface and execution backends (custom controller, MoveIt Servo).
      </PageHead>

      <section className="card progress-summary">
        <div className="ps-top">
          <div>
            <div className="eyebrow">Group progress</div>
            <div className="ps-pct">{gp.pct.toFixed(0)}<span>%</span></div>
          </div>
          <div className="ps-facts small muted">
            <div><b>{gp.passed}</b> of {gp.applicable} validation checkpoints passed</div>
            <div><b>{gp.done}</b> of {gp.total} tasks done</div>
            <div>Work packages: {g.work_packages.map((w) => <WpChip key={w} id={w} />)}</div>
          </div>
        </div>
        <div className="ps-bar"><span style={{ width: `${Math.max(gp.pct, gp.pct > 0 ? 1.5 : 0)}%` }} /></div>
        <div className="grid g4">
          {LEVELS.map((l) => {
            const s = levelStats(tasks, l.key)
            return <div key={l.key} className="small"><span className="muted">{l.label}:</span> <b>{s.passed}</b>/{s.applicable}</div>
          })}
        </div>
        {next && (
          <div className="ps-next">
            <div className="eyebrow" style={{ color: 'var(--accent)' }}>Next task</div>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div className="row"><DepChip id={next.id} /><b style={{ fontWeight: 600 }}>{next.title}</b><span className="small muted">{next.week}</span></div>
              <StatusBadge status={next.status} />
            </div>
            <div className="small muted">{next.objective}</div>
          </div>
        )}
      </section>

      <div className="grid g-main-side">
        <Card title="Development levels" hint="each level needs the previous level's evidence">
          <div className="levels">
            {g.levels.map((l, i) => (
              <div key={l.id} className="level">
                <span className="level-id">{l.id}</span>
                <div>
                  <div className="small" style={{ fontWeight: 550 }}>{l.features}</div>
                  <div className="tiny muted">{l.target}</div>
                </div>
                {i < g.levels.length - 1 && <span className="level-arrow">→</span>}
              </div>
            ))}
          </div>
        </Card>
        <Card title="Schedule" hint="relative weeks, target dates">
          <div className="stack" style={{ gap: 6 }}>
            {progress.vs_schedule.map((w) => (
              <div key={w.week} className={`week${week?.week === w.week ? ' current' : ''}`}>
                <span className="mono small" style={{ fontWeight: 600 }}>{w.week}</span>
                <span className="tiny muted">{fmtDate(w.start, { day: '2-digit', month: 'short' })}</span>
                <span className="small">{w[group]}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card title="Tasks" hint={`${tasks.length} tasks · click to expand`}>
        <div className="wp-list">
          {tasks.map((t) => (
            <TaskRow key={t.id} task={t} open={openId === t.id}
              onToggle={() => setParams(openId === t.id ? {} : { task: t.id }, { replace: true })} />
          ))}
        </div>
      </Card>

      <Card title="Experimental results" hint={`subsystems: ${(GROUP_SUBSYSTEMS[group] ?? []).join(', ')}`} right={<Link to="/results" className="small">All results →</Link>}>
        {experiments.length === 0 ? (
          <Empty title="No experiments recorded yet" icon={<IconFlask />}>Runs appear here when an experiment folder with metrics.json exists.</Empty>
        ) : (
          <div className="stack">
            {experiments.map((e) => (
              <div key={e.folder} className="row" style={{ justifyContent: 'space-between' }}>
                <span className="row"><b className="small" style={{ fontWeight: 600 }}>{e.title || e.experiment_id}</b><Badge color="var(--s-planned)">{e.validation_level}</Badge></span>
                <span className="tiny muted mono">{e.folder}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Pictures, videos and plots" hint="approved evidence for this group">
        <EvidenceGallery items={evidenceFor(group)} />
      </Card>
    </>
  )
}
