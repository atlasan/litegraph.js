import fs from 'node:fs'
import { diff, summarize, LiteGraph } from './lg.mjs'
import { importComfy, exportComfy } from './comfy_adapter.mjs'
import { zComfyWorkflow, zComfyWorkflow1 } from './schema/workflowSchema.ts'
LiteGraph.use_uuids = false
for (const f of process.argv.slice(2)) {
  const orig = JSON.parse(fs.readFileSync(f))
  const { graph, configureError } = importComfy(orig)
  const out = exportComfy(graph)
  const d = diff(orig, out)
  const keyOrderSame = JSON.stringify(Object.keys(orig)) === JSON.stringify(Object.keys(out))
  const sem = d.length === 0
  const zr = (out.version === 1 ? zComfyWorkflow1 : zComfyWorkflow).safeParse(out)
  console.log(`${f.split('/').pop()}: configureError=${configureError} placeholders=${graph._nodes.filter(n=>n.type.startsWith('comfy/')).length}/${graph._nodes.length} semanticDiff=${d.length} bytesEqual=${JSON.stringify(orig)===JSON.stringify(out)} topKeyOrderSame=${keyOrderSame} zod=${zr.success}`)
  for (const s of summarize(d)) console.log('   ' + s)
  // edit test: move node, disconnect a link, re-export, validate
  const n = graph._nodes[0]; n.pos = [5, 5]
  const withIn = graph._nodes.find(x => x.inputs?.some(i => i.link != null)); const slot = withIn?.inputs.findIndex(i => i.link != null)
  if (withIn) withIn.disconnectInput(slot)
  const out2 = exportComfy(graph); const z2 = (out2.version === 1 ? zComfyWorkflow1 : zComfyWorkflow).safeParse(out2)
  const dangling = out2.nodes.flatMap(x => (x.inputs ?? []).map(i => i.link)).filter(l => l != null && !out2.links.some(L => (L.id ?? L[0]) === l)).length
  console.log(`   after edit: pos persisted=${JSON.stringify(out2.nodes.find(x=>x.id===n.id).pos)} links ${out.links.length}->${out2.links.length} dangling=${dangling} zod=${z2.success}`)
}
