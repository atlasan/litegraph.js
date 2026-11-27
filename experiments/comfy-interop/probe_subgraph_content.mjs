import fs from 'node:fs'
import { LGmod as lg } from './lg.mjs'
const { LiteGraph } = lg
for (const k of ['log_debug', 'log_verbose', 'log_warn', 'log_info', 'log_error']) LiteGraph[k] = () => {}
const { ComfyInterop } = await import('../../src/extensions/comfy_interop.js')
const json = (v) => JSON.parse(JSON.stringify(v))
const sortKeys = (v) => Array.isArray(v) ? v.map(sortKeys) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortKeys(v[k])])) : v
const link = (l) => Array.isArray(l) ? l.slice(0, 6).join(',') : [l.id, l.origin_id, l.origin_slot, l.target_id, l.target_slot, l.type].join(',') + (l.parentId != null ? `^${l.parentId}` : '')
const diffs = {}
let appended = 0
for (const file of fs.readdirSync('fixtures/subgraphs').sort()) {
  const original = JSON.parse(fs.readFileSync('fixtures/subgraphs/' + file, 'utf8'))
  const g = new LiteGraph.LGraph(); ComfyInterop.importWorkflow(g, original)
  const out = json(ComfyInterop.exportWorkflow(g, { version: original.version === 1 ? 1 : 0.4 }))
  const issues = []
  const byId = new Map((out.definitions?.subgraphs ?? []).map((d) => [d.id, d]))
  for (const d of original.definitions?.subgraphs ?? []) {
    const o = byId.get(d.id); if (!o) { issues.push(`def ${d.id} missing`); continue }
    const ids = (ns) => ns.map((n) => n.id).sort().join(',')
    if (ids(d.nodes) !== ids(o.nodes)) issues.push(`def ${d.name}: node ids`)
    const L = (ls) => (Array.isArray(ls) ? ls : Object.values(ls ?? {})).map(link).sort().join('|')
    if (L(d.links) !== L(o.links)) issues.push(`def ${d.name}: links`)
    for (const k of ['inputs', 'outputs']) if ((d[k] ?? []).map((s) => s.id + ':' + s.name).join() !== (o[k] ?? []).map((s) => s.id + ':' + s.name).join()) issues.push(`def ${d.name}: ${k}`)
    if (JSON.stringify(d.widgets ?? []) !== JSON.stringify(o.widgets ?? [])) issues.push(`def ${d.name}: widgets`)
    for (const n of d.nodes) {
      const m = o.nodes.find((x) => x.id === n.id); if (!m) continue
      for (const key of ['type', 'widgets_values', 'mode', 'properties', 'inputs', 'outputs']) {
        if (JSON.stringify(sortKeys(n[key])) !== JSON.stringify(sortKeys(m[key]))) issues.push(`def ${d.name}: node ${n.id} ${key}`)
      }
    }
  }
  for (const n of original.nodes) {
    const m = out.nodes.find((x) => x.id === n.id)
    if (!m) { issues.push(`root node ${n.id} missing`); continue }
    for (const key of ['type', 'widgets_values', 'mode', 'inputs', 'outputs']) {
      if (JSON.stringify(sortKeys(n[key])) === JSON.stringify(sortKeys(m[key]))) continue
      // interface slots the instance did not list are appended, as ComfyUI does on load
      const def = (original.definitions?.subgraphs ?? []).find((d) => d.id === n.type)
      const a = n[key] ?? [], b = m[key] ?? []
      if (def && Array.isArray(b) && a.every((s, i) => JSON.stringify(sortKeys(s)) === JSON.stringify(sortKeys(b[i])))
        && b.slice(a.length).every((s) => (def[key] ?? []).some((slot) => slot.name === s.name))) { appended += b.length - a.length; continue }
      issues.push(`root node ${n.id} ${key}`)
    }
    const pn = n.properties ?? {}, pm = { ...(m.properties ?? {}) }; delete pm.subgraph_id; delete pm.enabled
    if (JSON.stringify(sortKeys(pn)) !== JSON.stringify(sortKeys(pm))) issues.push(`root node ${n.id} properties`)
  }
  if (issues.length) diffs[file] = issues
}
for (const [f, i] of Object.entries(diffs)) console.log(f, '\n   ', [...new Set(i)].slice(0, 8).join('\n    '))
console.log(`${appended} interface slots appended to instances (as ComfyUI does on load)`)
console.log(Object.keys(diffs).length, 'files with content differences of', fs.readdirSync('fixtures/subgraphs').length)
