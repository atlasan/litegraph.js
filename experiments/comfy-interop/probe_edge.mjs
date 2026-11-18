// Edge checks: placeholder edits after load; id allocation after v1 load (no last_node_id)
import fs from 'node:fs'
import { LiteGraph, LGraph } from './lg.mjs'
const g = new LGraph()
g.configure(JSON.parse(fs.readFileSync(process.argv[2])))
const n = g.getNodeById(3); n.pos = [1, 2]; n.title = 'moved'
const s = g.serialize().nodes.find(x => x.id === 3)
console.log('placeholder edit persisted?', JSON.stringify(s.pos), s.title)
const lnk = g.getNodeById(4) // disconnect a link on a placeholder
console.log('placeholder can disconnect?', (()=>{ try { return g.getNodeById(3).disconnectInput(0) } catch(e){ return 'throw '+e.message } })(), 'links now', Object.keys(g.links).length, 'serialized node3.inputs[0].link', g.serialize().nodes.find(x=>x.id===3).inputs[0].link)
const g2 = new LGraph(); g2.configure(JSON.parse(fs.readFileSync(process.argv[3])))
const c = LiteGraph.createNode('basic/const'); g2.add(c)
console.log('v1 load: last_node_id', g2.last_node_id, 'new node id', c.id, 'collides?', g2._nodes.filter(x => x.id === c.id).length > 1)
console.log('group bounding type', g2._groups[0]._bounding?.constructor?.name)
