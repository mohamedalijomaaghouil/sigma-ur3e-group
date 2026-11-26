import { BlockBadge, Card, Empty, PageHead, WpChip, initials } from '../components/ui'
import { progress, workPackagesForPackage } from '../data'

export default function Team() {
  const { team, packages } = progress
  const assigned = packages.filter((p) => p.maintainer).length
  return (
    <>
      <PageHead eyebrow="Delivery" title="Team and responsibilities">
        {team.note} One package has one designated maintainer and any number of contributors.
      </PageHead>

      <div className="grid g3">
        {team.members.map((m) => (
          <Card key={m.name}>
            <div className="member">
              <div className="avatar">{initials(m.name)}</div>
              <div>
                <div style={{ fontWeight: 600 }}>{m.name}</div>
                <div className="tiny muted">{m.responsibilities.length ? m.responsibilities.join(' · ') : 'Responsibilities to be assigned'}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid g4">
        {team.groups.map((g) => (
          <Card key={g.id} title={g.name}>
            {g.members.length === 0 ? <span className="small muted">Members to be assigned</span> : (
              <div className="stack">{g.members.map((n) => <span key={n} className="small">{n}</span>)}</div>
            )}
          </Card>
        ))}
      </div>

      <Card title="Package maintainers" hint={`${assigned} / ${packages.length} assigned`}>
        {assigned === 0 && (
          <div style={{ marginBottom: 14 }}>
            <Empty title="No maintainers assigned yet">Assigned by the group after the architecture review (decision D11).</Empty>
          </div>
        )}
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Package</th><th>Block</th><th>Maintainer</th><th>Work packages</th><th>Purpose</th></tr></thead>
            <tbody>
              {packages.map((p) => (
                <tr key={p.name}>
                  <td className="mono">{p.name}</td>
                  <td><BlockBadge block={p.block} /></td>
                  <td className="small">{p.maintainer ?? <span className="muted">—</span>}</td>
                  <td><div className="row">{workPackagesForPackage(p.name).map((w) => <WpChip key={w.id} id={w.id} />)}</div></td>
                  <td className="small muted">{p.purpose}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  )
}
