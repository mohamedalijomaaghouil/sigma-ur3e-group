import { useMemo, useState } from 'react'
import { EvidenceGallery } from '../components/EvidenceGallery'
import { Card, PageHead, initials } from '../components/ui'
import { data, progress } from '../data'

/** Individual contributions and the evidence gallery. Nothing here is generated: it all comes from media/evidence/ and git. */
export default function Evidence() {
  const ev = data.evidence ?? []
  const [subsystem, setSubsystem] = useState('all')
  const [type, setType] = useState('all')
  const subsystems = useMemo(() => ['all', ...new Set(ev.map((e) => e.subsystem).filter(Boolean))], [ev])
  const types = useMemo(() => ['all', ...new Set(ev.map((e) => e.type).filter(Boolean))], [ev])
  const filtered = ev.filter((e) => (subsystem === 'all' || e.subsystem === subsystem) && (type === 'all' || e.type === type))

  const commitsBy = new Map<string, number>()
  for (const c of data.git.commits) commitsBy.set(c.author, (commitsBy.get(c.author) ?? 0) + 1)

  return (
    <>
      <PageHead eyebrow="Evidence" title="Contributions and evidence">
        Every member documents their own work: code, pictures, screenshots, videos, metrics and short notes, each linked to a task, date, experiment and commit. Records live in <code>media/evidence/</code>; only approved, real material is displayed.
      </PageHead>

      <Card title="Contributions by member" hint="evidence records in media/evidence/">
        <div className="grid g3">
          {progress.team.members.map((m) => {
            const mine = ev.filter((e) => e.contributor === m.name)
            const approved = mine.filter((e) => e.status === 'approved').length
            return (
              <div key={m.name} className="member" style={{ padding: 8, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                <div className="avatar">{initials(m.name)}</div>
                <div>
                  <div style={{ fontWeight: 600 }}>{m.name}</div>
                  <div className="tiny muted">{approved} approved · {mine.length - approved} draft · tasks {[...new Set(mine.map((e) => e.task))].join(', ') || '—'}</div>
                </div>
              </div>
            )
          })}
        </div>
        <div className="sep" />
        <div className="tiny muted">
          Commits on this branch by Git author: {[...commitsBy.entries()].map(([a, n]) => `${a} (${n})`).join(' · ') || '—'}. Git author names are shown as recorded by Git.
        </div>
      </Card>

      <Card title="Gallery" hint={`${filtered.filter((e) => e.status === 'approved').length} approved items`}
        right={
          <div className="row">
            <select className="btn" value={subsystem} onChange={(e) => setSubsystem(e.target.value)} aria-label="Subsystem">
              {subsystems.map((s) => <option key={s} value={s}>{s === 'all' ? 'All subsystems' : s}</option>)}
            </select>
            <select className="btn" value={type} onChange={(e) => setType(e.target.value)} aria-label="Type">
              {types.map((s) => <option key={s} value={s}>{s === 'all' ? 'All types' : s}</option>)}
            </select>
          </div>
        }>
        <EvidenceGallery items={filtered} emptyHint="Add a record to media/evidence/ (copy _template.yaml) for each picture, screenshot, video or plot; it is shown once approved." />
      </Card>
    </>
  )
}
