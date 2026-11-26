import { useMemo, useState, type CSSProperties } from 'react'
import { BLOCK_COLOR, BlockBadge, Card, PageHead, WpChip, Badge } from '../components/ui'
import { progress, workPackagesForPackage } from '../data'
import type { Interface } from '../types'

// Diagram layout: positions only. Nodes, statuses and edges come from progress.yaml.
const W = 158
const H = 50
const VIEW = { w: 1200, h: 610 }

type NodeDef = { x: number; y: number; external?: boolean; label?: string; note?: string }
const POS: Record<string, NodeDef> = {
  realsense2_camera: { x: 22, y: 110, external: true, note: 'Official Intel RealSense ROS 2 driver (RGB only)' },
  ur3e_camera: { x: 200, y: 110 },
  ur3e_calibration: { x: 200, y: 210 },
  ur3e_perception: { x: 200, y: 310 },
  ur3e_ibvs: { x: 455, y: 70 },
  ur3e_hybrid: { x: 455, y: 170 },
  ur3e_pose_estimation: { x: 455, y: 290 },
  ur3e_pbvs: { x: 640, y: 290 },
  ur3e_task_manager: { x: 845, y: 50 },
  ur3e_control: { x: 845, y: 170 },
  ur3e_moveit_config: { x: 845, y: 270 },
  ur3e_manipulation: { x: 845, y: 370 },
  ur_robot_driver: { x: 1040, y: 220, external: true, note: 'Official UR ROS 2 driver with ros2_control' },
  'gripper driver': { x: 1040, y: 370, external: true, label: 'gripper driver', note: 'OnRobot driver or adapter (model to confirm)' },
  ur3e_bringup: { x: 200, y: 520 },
  ur3e_description: { x: 370, y: 520 },
  ur3e_geometry: { x: 540, y: 520 },
  ur3e_simulation: { x: 710, y: 520 },
  ur3e_learning: { x: 640, y: 390 },
  ur3e_interfaces: { x: 880, y: 520 },
}

// Structural links that are not ROS topics (files, launch, external drivers).
const EXTRA: (Interface & { dashed?: boolean })[] = [
  { name: 'image_raw, camera_info_factory', type: 'sensor_msgs (driver)', from: 'realsense2_camera', to: ['ur3e_camera'] },
  { name: 'calibration files (promoted)', type: 'YAML', from: 'ur3e_calibration', to: ['ur3e_bringup'], dashed: true },
  { name: 'trajectory execution', type: 'scaled_joint_trajectory_controller', from: 'ur3e_moveit_config', to: ['ur_robot_driver'] },
  { name: '/learned/cmd_vel (later)', type: 'geometry_msgs/TwistStamped', from: 'ur3e_learning', to: ['ur3e_control'], dashed: true },
]

const LANES = [
  { id: 'upstream', label: 'Common upstream', x: 185, y: 30, w: 180, h: 350 },
  { id: 'parallel', label: 'Parallel visual servoing', x: 440, y: 30, w: 365, h: 430 },
  { id: 'downstream', label: 'Common downstream', x: 830, y: 20, w: 180, h: 420 },
  { id: 'common', label: 'Common infrastructure', x: 185, y: 480, w: 860, h: 110 },
]

type Edge = { key: string; from: string; to: string; items: (Interface & { dashed?: boolean })[]; dashed: boolean }

export default function Architecture() {
  const [selected, setSelected] = useState<string | null>(null)
  const [block, setBlock] = useState<string>('all')
  const [labels, setLabels] = useState(false)

  const pkgByName = useMemo(() => new Map(progress.packages.map((p) => [p.name, p])), [])

  const nodes = useMemo(() => {
    const names = new Set<string>([...progress.packages.map((p) => p.name)])
    for (const i of [...progress.interfaces, ...EXTRA]) {
      names.add(i.from)
      i.to.forEach((t) => names.add(t))
    }
    let extraX = 200
    return [...names].map((name) => {
      const pos = POS[name] ?? { x: (extraX += 170) - 170, y: 450 }
      const pkg = pkgByName.get(name)
      return { name, ...pos, external: pos.external || !pkg, pkg }
    })
  }, [pkgByName])
  const nodeByName = new Map(nodes.map((n) => [n.name, n]))

  const edges = useMemo(() => {
    const m = new Map<string, Edge>()
    for (const i of [...progress.interfaces, ...EXTRA]) {
      for (const to of i.to) {
        if (to === i.from) continue
        const key = `${i.from}→${to}`
        const e = m.get(key) ?? { key, from: i.from, to, items: [], dashed: false }
        e.items.push(i)
        e.dashed = e.items.every((x) => (x as { dashed?: boolean }).dashed)
        m.set(key, e)
      }
    }
    return [...m.values()]
  }, [])

  const inBlock = (name: string) => {
    if (block === 'all') return true
    const pkg = pkgByName.get(name)
    return pkg ? pkg.block === block : false
  }
  const connected = (e: Edge) => selected != null && (e.from === selected || e.to === selected)

  const sel = selected ? nodeByName.get(selected) : undefined
  const selPkg = selected ? pkgByName.get(selected) : undefined
  const inbound = [...progress.interfaces, ...EXTRA].filter((i) => selected && i.to.includes(selected) && i.from !== selected)
  const outbound = [...progress.interfaces, ...EXTRA].filter((i) => i.from === selected)

  return (
    <>
      <PageHead eyebrow="System" title="Interactive architecture">
        Packages and ROS 2 interfaces as agreed in planning (D1–D14). Click a package to inspect its interfaces and work packages; filter by block. Nodes and links are generated from <code>progress.yaml</code>.
      </PageHead>

      <div className="arch-wrap">
        <section className="card arch-canvas">
          <div className="arch-toolbar">
            <div className="seg">
              {['all', 'upstream', 'parallel', 'downstream', 'common'].map((b) => (
                <button key={b} className={`btn${block === b ? ' active' : ''}`} onClick={() => setBlock(b)}>
                  {b === 'all' ? 'All blocks' : progress.blocks.find((x) => x.id === b)?.name ?? b}
                </button>
              ))}
            </div>
            <button className={`btn${labels ? ' active' : ''}`} style={{ marginLeft: 'auto' }} onClick={() => setLabels((v) => !v)}>
              Topic labels
            </button>
          </div>
          <svg viewBox={`0 0 ${VIEW.w} ${VIEW.h}`} role="img" aria-label="System architecture diagram">
            <defs>
              <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 z" fill="var(--border-strong)" />
              </marker>
              <marker id="arrow-hl" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 z" fill="var(--accent)" />
              </marker>
            </defs>

            {LANES.map((l) => (
              <g key={l.id} className="arch-lane" style={{ ['--lc' as string]: BLOCK_COLOR[l.id] } as CSSProperties}>
                <rect x={l.x} y={l.y} width={l.w} height={l.h} rx={14} />
                <text x={l.x + 12} y={l.y + 18}>{l.label}</text>
              </g>
            ))}
            <text x={462} y={63} className="arch-edge-label">GROUP A</text>
            <text x={462} y={283} className="arch-edge-label">GROUP B</text>

            {edges.map((e) => {
              const a = nodeByName.get(e.from)
              const b = nodeByName.get(e.to)
              if (!a || !b) return null
              const sameColumn = Math.abs(b.x - a.x) < W / 2
              const forward = !sameColumn && b.x > a.x
              let x1: number, y1: number, x2: number, y2: number, d: string
              if (sameColumn) {
                // Route along the left side so the curve does not cross boxes in the same column.
                x1 = a.x; y1 = a.y + H / 2; x2 = b.x; y2 = b.y + H / 2
                d = `M${x1},${y1} C${x1 - 48},${y1} ${x2 - 48},${y2} ${x2},${y2}`
              } else if (forward) {
                x1 = a.x + W; y1 = a.y + H / 2; x2 = b.x; y2 = b.y + H / 2
                d = `M${x1},${y1} C${x1 + 50},${y1} ${x2 - 50},${y2} ${x2},${y2}`
              } else {
                x1 = a.x; y1 = a.y + H / 2; x2 = b.x + W; y2 = b.y + H / 2
                d = `M${x1},${y1} C${x1 - 50},${y1} ${x2 + 50},${y2} ${x2},${y2}`
              }
              const lx = sameColumn ? x1 - 40 : (x1 + x2) / 2
              const hl = connected(e)
              const dim = (selected && !hl) || !(inBlock(e.from) || inBlock(e.to))
              const label = e.items.map((i) => i.name).join(' · ')
              return (
                <g key={e.key}>
                  <path d={d} className={`arch-edge${hl ? ' hl' : ''}${dim ? ' dim' : ''}`} strokeDasharray={e.dashed ? '5 4' : undefined} markerEnd={`url(#${hl ? 'arrow-hl' : 'arrow'})`}>
                    <title>{label}</title>
                  </path>
                  {(labels || hl) && (
                    <text x={lx} y={(y1 + y2) / 2 - 5} textAnchor="middle" className={`arch-edge-label${hl ? ' hl' : ''}`}>
                      {label.length > 46 ? label.slice(0, 44) + '…' : label}
                    </text>
                  )}
                </g>
              )
            })}

            {nodes.map((n) => {
              const status = n.pkg?.status
              const color = n.pkg ? BLOCK_COLOR[n.pkg.block] : 'var(--b-external)'
              const dim = !inBlock(n.name) && block !== 'all'
              return (
                <g
                  key={n.name}
                  className={`arch-node${selected === n.name ? ' selected' : ''}${dim ? ' dim' : ''}${status === 'deferred' ? ' deferred' : ''}${n.external ? ' external' : ''}`}
                  transform={`translate(${n.x},${n.y})`}
                  onClick={() => setSelected(n.name === selected ? null : n.name)}
                  tabIndex={0}
                  onKeyDown={(ev) => (ev.key === 'Enter' || ev.key === ' ') && setSelected(n.name)}
                  role="button"
                  aria-label={n.name}
                >
                  <rect className="box" width={W} height={H} rx={9} />
                  {!n.external && <rect x={0} y={8} width={3} height={H - 16} rx={1.5} fill={color} />}
                  <text x={12} y={22}>{n.label ?? n.name}</text>
                  <text x={12} y={39} className="sub">
                    {n.external ? 'external' : `${status}${n.pkg?.maintainer ? ` · ${n.pkg.maintainer}` : ''}`}
                  </text>
                </g>
              )
            })}
          </svg>
        </section>

        <Card title={sel ? <span className="mono">{sel.label ?? sel.name}</span> : 'Package details'} hint={sel ? undefined : 'click a node in the diagram'}>
          {!sel ? (
            <div className="muted small">Select a package to see its purpose, inputs, outputs and work packages. Click it again to clear the selection.</div>
          ) : (
            <div className="grid g4" style={{ alignItems: 'start' }}>
              <div className="stack" style={{ gap: 10 }}>
              {selPkg ? (
                <>
                  <div className="small">{selPkg.purpose}</div>
                  <div className="row">
                    <BlockBadge block={selPkg.block} />
                    <Badge color={selPkg.status === 'deferred' ? 'var(--s-deferred)' : 'var(--s-planned)'} dashed={selPkg.status === 'deferred'}>{selPkg.status}</Badge>
                    {selPkg.phase != null && <span className="chip">phase {selPkg.phase}</span>}
                  </div>
                  <div className="small"><span className="muted">Maintainer:</span> {selPkg.maintainer ?? 'to be assigned'}</div>
                </>
              ) : (
                <div className="small muted">{sel.note ?? 'External component'}</div>
              )}
              </div>
              <div className="panel-section">
                <h4>Inputs</h4>
                {inbound.length === 0 ? <span className="tiny muted">None declared</span> : inbound.map((i) => (
                  <div key={i.name + i.from} className="iface">{i.name}<small>{i.type} · from {i.from}</small></div>
                ))}
              </div>
              <div className="panel-section">
                <h4>Outputs</h4>
                {outbound.length === 0 ? <span className="tiny muted">None declared</span> : outbound.map((i) => (
                  <div key={i.name + i.to.join()} className="iface">{i.name}<small>{i.type} · to {i.to.join(', ')}</small></div>
                ))}
              </div>
              {selPkg && (
                <div className="panel-section">
                  <h4>Work packages</h4>
                  <div className="row">
                    {workPackagesForPackage(selPkg.name).map((w) => <WpChip key={w.id} id={w.id} />)}
                    {workPackagesForPackage(selPkg.name).length === 0 && <span className="tiny muted">None yet</span>}
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      <div className="stack" style={{ gap: 16 }}>
        <Card title="Shared interfaces" hint={`${progress.interfaces.length} declared in progress.yaml`}>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Interface</th><th>Type</th><th>Producer</th><th>Consumers</th></tr></thead>
              <tbody>
                {progress.interfaces.map((i) => (
                  <tr key={i.name} className="clickable" onClick={() => setSelected(i.from)}>
                    <td className="mono">{i.name}</td>
                    <td className="mono small muted">{i.type}</td>
                    <td className="mono small">{i.from}</td>
                    <td className="mono small">{i.to.map((t) => <div key={t}>{t}</div>)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card title="Dependency rules" hint="docs/architecture.md">
          <ol className="small" style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 8, color: 'var(--text-2)' }}>
            <li>Runtime communication only through topics, TF, actions, services and configuration files.</li>
            <li>Library imports only towards pure <code>core/</code> modules (<code>ur3e_geometry</code>, perception, IBVS/PBVS cores for hybrid).</li>
            <li>A controller never imports the implementation it subscribes to.</li>
            <li><code>ur3e_control</code> never depends on visual servoing or learned controllers.</li>
            <li>Shared configuration lives in <code>ur3e_bringup/config/</code>; calibration files are promoted there after validation.</li>
          </ol>
          <div className="sep" />
          <div className="legend">
            {LANES.map((l) => <span key={l.id}><i style={{ background: BLOCK_COLOR[l.id] }} />{l.label}</span>)}
            <span><i style={{ background: 'transparent', border: '1px dashed var(--muted)' }} />Deferred / external</span>
          </div>
        </Card>
      </div>
    </>
  )
}
