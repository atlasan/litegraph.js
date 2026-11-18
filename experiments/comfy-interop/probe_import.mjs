// Task 1: load Comfy workflow JSON into our LGraph, round-trip, diff.
import fs from 'node:fs'
import { LiteGraph, LGraph, diff, summarize } from './lg.mjs'
const files = process.argv.slice(2)
for (const f of files) {
  const orig = JSON.parse(fs.readFileSync(f))
  const g = new LGraph()
  let threw = null, err
  try { err = g.configure(structuredClone(orig)) } catch (e) { threw = e.message }
  try { await g.whenReady?.() } catch (e) { threw ??= 'whenReady: ' + e.message }
  const linksIn = Array.isArray(orig.links) ? orig.links.length : Object.keys(orig.links ?? {}).length
  const nodesLoaded = g._nodes.length
  const placeholders = g._nodes.filter(n => n.has_errors).length
  const p0 = g._nodes.find(n => n.has_errors)
  let ser, serErr = null
  try { ser = JSON.parse(JSON.stringify(g.serialize())) } catch (e) { serErr = e.message }
  console.log('\n=== ' + f.split('/').pop(), `version=${orig.version}`)
  console.log({ threw, configureReturnedError: err, nodesInFile: orig.nodes.length, nodesLoaded, placeholders,
    placeholderCtor: p0?.constructor?.name, placeholderType: p0?.type, placeholderHasSlots: !!p0?.inputs, placeholderWidgets: !!p0?.widgets,
    linksInFile: linksIn, linksInGraph: Object.keys(g.links ?? {}).length, linksSerialized: ser?.links?.length,
    linkFormatOut: ser && Array.isArray(ser.links?.[0]) ? 'array' : typeof ser?.links?.[0],
    groupsIn: orig.groups?.length ?? 0, groupsOut: ser?.groups?.length, serErr,
    versionOut: ser?.version, last_node_id_out: ser?.last_node_id,
    graphOwnStrayKeys: ['state','reroutes','definitions','floatingLinks','id','revision'].filter(k => k in g) })
  if (ser) {
    const wvIn = orig.nodes.filter(n => n.widgets_values).length
    const wvOut = orig.nodes.filter(n => { const o = ser.nodes.find(s => s.id === n.id); return n.widgets_values && JSON.stringify(o?.widgets_values) === JSON.stringify(n.widgets_values) }).length
    console.log(`widgets_values preserved on ${wvOut}/${wvIn} nodes; nodes byte-identical: ${orig.nodes.filter(n => JSON.stringify(ser.nodes.find(s=>s.id===n.id))===JSON.stringify(n)).length}/${orig.nodes.length}`)
    const d = diff(orig, ser)
    console.log('diff entries:', d.length); for (const s of summarize(d)) console.log('  ' + s)
  }
  await g.clearAsync?.()
}
