// Task 2: build graphs in ours, serialize, validate with Comfy's verbatim zod schema.
import fs from 'node:fs'
import { LiteGraph, LGraph } from './lg.mjs'
LiteGraph.use_uuids = false
import { zComfyWorkflow, zComfyWorkflow1 } from './schema/workflowSchema.ts'
const mk = (g, t, pos) => { const n = LiteGraph.createNode(t); n.pos = pos; g.add(n); return n }
const graphs = {}
{ const g = new LGraph(); const c = mk(g, 'basic/const', [0, 0]); const op = mk(g, 'math/operation', [200, 0]); const w = mk(g, 'basic/watch', [400, 0])
  c.connect(0, op, 0); op.connect(0, w, 0); const grp = new LiteGraph.LGraphGroup(); grp.title='G'; g.add(grp); graphs.basic = g }
{ const g = new LGraph(); const t = mk(g, 'events/timer', [0, 0]); const cnt = mk(g, 'events/counter', [200, 0]); const log = mk(g, 'events/log', [400, 0])
  t.connect(0, cnt, 0); cnt.connect(0, log, 0); graphs.events = g }
{ const g = new LGraph(); const sg = mk(g, 'graph/subgraph', [200, 0]); const sub = sg.subgraph
  const gi = LiteGraph.createNode('graph/input'); sub.add(gi); gi.setProperty?.('name', 'x'); gi.setProperty?.('type', 'number')
  const op = LiteGraph.createNode('math/operation'); sub.add(op); const go = LiteGraph.createNode('graph/output'); sub.add(go); go.setProperty?.('name','y'); go.setProperty?.('type','number')
  gi.connect(0, op, 0); op.connect(0, go, 0)
  const c = mk(g, 'basic/const', [0, 0]); const w = mk(g, 'basic/watch', [400, 0])
  try { c.connect(0, sg, 0); sg.connect(0, w, 0) } catch (e) { console.log('subgraph connect err', e.message) }
  graphs.subgraph = g }
for (const [name, g] of Object.entries(graphs)) {
  await g.whenReady?.()
  const ser = JSON.parse(JSON.stringify(g.serialize()))
  fs.writeFileSync(`out_int_${name}.json`, JSON.stringify(ser, null, 1))
  console.log(`\n=== ${name}: nodes=${ser.nodes.length} links=${ser.links.length} version=${JSON.stringify(ser.version)} last_node_id=${ser.last_node_id} types(ids)=${ser.nodes.map(n=>typeof n.id).join(',')}`)
  console.log('  sample link', JSON.stringify(ser.links[0]), ' node keys', Object.keys(ser.nodes[0]).join(','))
  if (name === 'subgraph') { const s = ser.nodes.find(n => n.type === 'graph/subgraph'); console.log('  subgraph inline at nodes[].subgraph?', !!s.subgraph, 'inner nodes', s.subgraph?.nodes?.length, 'inputs', JSON.stringify(s.inputs)) }
  for (const [label, schema, data] of [['as-is vs zComfyWorkflow(0.4)', zComfyWorkflow, ser], ['as-is with version:1 vs zComfyWorkflow1', zComfyWorkflow1, { ...ser, version: 1 }], ['0.4 + version=0.4 patched', zComfyWorkflow, { ...ser, version: 0.4 }]]) {
    const r = schema.safeParse(data)
    const iss = r.success ? [] : r.error.issues
    const agg = {}; for (const i of iss) { const k = i.path.map(p => typeof p === 'number' ? '[]' : p).join('.') + ' :: ' + i.message.slice(0, 70); agg[k] = (agg[k] ?? 0) + 1 }
    console.log(`  ${label}: ${r.success ? 'PASS' : 'FAIL ' + iss.length + ' issues'}`); for (const [k, v] of Object.entries(agg)) console.log(`     x${v} ${k}`)
  }
  await g.clearAsync?.()
}
