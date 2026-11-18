import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
export const LGmod = require('../../build_node/litegraph_nodejs.full.cjs')
export const { LiteGraph, LGraph } = LGmod
LiteGraph.logging_set_level?.(0)
// recursive diff: returns list of {path, kind}
export function diff(a, b, p = '', out = []) {
  if (a === b) return out
  const ta = Array.isArray(a) ? 'array' : a === null ? 'null' : typeof a
  const tb = Array.isArray(b) ? 'array' : b === null ? 'null' : typeof b
  if (ta === 'object' && tb === 'object' || ta === 'array' && tb === 'array') {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)])
    for (const k of keys) {
      if (!(k in b)) out.push({ path: p + '.' + k, kind: 'lost', a: a[k] })
      else if (!(k in a)) out.push({ path: p + '.' + k, kind: 'added', b: b[k] })
      else diff(a[k], b[k], p + '.' + k, out)
    }
    return out
  }
  if (typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) < 1e-6) return out
  out.push({ path: p, kind: 'changed', a, b })
  return out
}
export const norm = p => p.replace(/\.(nodes|links|groups|inputs|outputs|subgraphs|reroutes|widgets_values|floatingLinks|linkIds)\.\d+/g, '.$1[]')
export function summarize(d) {
  const m = {}
  for (const x of d) { const k = x.kind + ' ' + norm(x.path); m[k] ??= { n: 0, ex: x }; m[k].n++ }
  return Object.entries(m).map(([k, v]) => `${k} x${v.n}  e.g. ${JSON.stringify(v.ex.a ?? null)?.slice(0, 60)} -> ${JSON.stringify(v.ex.b ?? null)?.slice(0, 60)}`)
}
