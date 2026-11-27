// Wave 3a schema probe: our subgraph exports and ComfyUI subgraph workflows, validated with
// ComfyUI's own zod schema (local copy, never committed).
import fs from 'node:fs'
import path from 'node:path'
import { zComfyWorkflow, zComfyWorkflow1 } from './schema/workflowSchema.ts'

import { LGmod as lg } from './lg.mjs'
const { LiteGraph } = lg
const LGraph = LiteGraph.LGraph
for (const k of ['log_debug', 'log_verbose', 'log_warn', 'log_info', 'log_error']) LiteGraph[k] = () => {}
LiteGraph.actionHistory_enabled = false
const ComfyInterop = lg.ComfyInterop ?? (await import('../../src/extensions/comfy_interop.js')).ComfyInterop

const schemaFor = (doc) => (doc.version === 1 ? zComfyWorkflow1 : zComfyWorkflow)
function check(label, doc) {
  const r = schemaFor(doc).safeParse(doc)
  const issues = r.success ? [] : r.error.issues
  const agg = {}
  for (const i of issues) { const k = i.path.map((p) => (typeof p === 'number' ? '[]' : p)).join('.') + ' :: ' + i.message.slice(0, 80); agg[k] = (agg[k] ?? 0) + 1 }
  return { label, ok: r.success, issues: agg }
}
const results = []
const report = (r) => { results.push(r); console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.label}`); for (const [k, v] of Object.entries(r.issues)) console.log(`        x${v} ${k}`) }
const json = (v) => JSON.parse(JSON.stringify(v))
const mk = (g, t, pos) => { const n = LiteGraph.createNode(t); n.pos = pos; g.add(n); return n }

// --- our graphs ---
const ours = {}
{ const g = new LGraph(); const c = mk(g, 'basic/const', [0, 0]); const op = mk(g, 'math/operation', [250, 0]); const w = mk(g, 'basic/watch', [500, 0])
  c.connect(0, op, 0); c.connect(0, op, 1); op.connect(0, w, 0); g.convertToSubgraph([op]); ours.simple = g }
{ const g = new LGraph(); const c = mk(g, 'basic/const', [0, 0]); const a = mk(g, 'math/operation', [250, 0]); const b = mk(g, 'math/operation', [450, 0]); const w = mk(g, 'basic/watch', [700, 0])
  c.connect(0, a, 0); a.connect(0, b, 0); b.connect(0, w, 0); const outer = g.convertToSubgraph([a, b])
  const innerB = outer.subgraph._nodes.find((n) => n.type === 'math/operation' && n.inputs[0].link != null && outer.subgraph.links[n.inputs[0].link] && outer.subgraph.getNodeById(outer.subgraph.links[n.inputs[0].link].origin_id)?.type === 'math/operation')
  outer.subgraph.convertToSubgraph([innerB]); ours.nested = g }
{ const g = new LGraph(); const t = mk(g, 'events/timer', [0, 0]); const cnt = mk(g, 'events/counter', [250, 0]); const log = mk(g, 'events/log', [500, 0])
  t.connect(0, cnt, 0); cnt.connect(0, log, 0); g.convertToSubgraph([cnt]); ours.events = g }
{ const g = ours.simple; const g2 = new LGraph(); g2.configure(json(g.serialize())); g2.serialize()
  const fn = mk(g2, 'graph/function', [250, 300]); fn.setDefinition([...g2.subgraphs.keys()][0])
  const twin = g2._nodes.find((n) => n.type === 'graph/subgraph').clone(); twin.pos = [250, 500]; g2.add(twin); ours.functionAndLinked = g2 }
for (const [name, g] of Object.entries(ours)) {
  for (const version of [0.4, 1]) {
    const out = json(ComfyInterop.exportWorkflow(g, { version }))
    report(check(`ours/${name} v${version} (defs ${out.definitions?.subgraphs?.length ?? 0})`, out))
    fs.writeFileSync(`out_${name}_v${version}.json`, JSON.stringify(out, null, 1))
  }
}

// --- ComfyUI fixtures: as given, import -> export, import -> edit -> export ---
const dir = './fixtures/subgraphs'
for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
  const original = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'))
  const base = check(`comfy/${file} original`, original)
  if (!base.ok) {
    // the fixture itself is invalid: the round trip must not add issues
    const g = new LGraph(); ComfyInterop.importWorkflow(g, original)
    const out = json(ComfyInterop.exportWorkflow(g, { version: original.version === 1 ? 1 : 0.4 }))
    const after = check('', out)
    const added = Object.keys(after.issues).filter((k) => !(k in base.issues))
    report({ label: `comfy/${file} invalid as given (${Object.keys(base.issues).length} issue kinds); round trip adds ${added.length}`, ok: added.length === 0, issues: Object.fromEntries(added.map((k) => [k, after.issues[k]])) })
    continue
  }
  const graph = new LGraph()
  let res
  try { res = ComfyInterop.importWorkflow(graph, original) } catch (e) { report({ label: `comfy/${file} import threw: ${e.message}`, ok: false, issues: {} }); continue }
  const version = original.version === 1 ? 1 : 0.4
  let out
  try { out = json(ComfyInterop.exportWorkflow(graph, { version })) } catch (e) { report({ label: `comfy/${file} export threw: ${e.message}`, ok: false, issues: {} }); continue }
  const defsIn = original.definitions?.subgraphs?.length ?? 0, defsOut = out.definitions?.subgraphs?.length ?? 0
  report(check(`comfy/${file} roundtrip (defs ${defsIn}->${defsOut}, nodes ${original.nodes.length}->${out.nodes.length}${res.error ? ', configure error' : ''})`, out))
  // edit: move an inner node of the first instance and commit, then export again
  const inst = graph._nodes.find((n) => n.type === 'graph/subgraph')
  if (inst) {
    const inner = inst.subgraph._nodes.find((n) => !n.type.startsWith('graph/'))
    if (inner) { inner.pos[0] += 10; inst.subgraph.onGraphChanged({ action: 'probe' }); inst.commitDefinition() }
    const edited = json(ComfyInterop.exportWorkflow(graph, { version }))
    report(check(`comfy/${file} edited`, edited))
  }
}
const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} pass`)
