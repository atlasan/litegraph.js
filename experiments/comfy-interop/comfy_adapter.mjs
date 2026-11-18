// Prototype Comfy <-> ours adapter: on-demand "comfy/<Type>" placeholder node types.
import { LiteGraph, LGraph } from './lg.mjs'
const PREFIX = 'comfy/'
const GRAPH_KEYS = ['id', 'revision', 'version', 'state', 'reroutes', 'definitions', 'floatingLinks', 'models']

function ensureComfyType(type) {
  const full = PREFIX + type
  if (LiteGraph.registered_node_types[full]) return full
  class ComfyPlaceholder extends LiteGraph.LGraphNode {
    constructor(title) { super(title ?? type); this.serialize_widgets = false; this._comfy = {} }
    onConfigure(info) { // stash fields our core does not model
      this._comfy = {}
      for (const k of Object.keys(info)) if (!['id','type','pos','size','flags','order','mode','inputs','outputs','properties','title','color','bgcolor','shape','boxcolor'].includes(k)) this._comfy[k] = structuredClone(info[k])
      this._comfyAbsent = ['inputs','outputs'].filter(k => !(k in info))
    }
    onSerialize(o) {
      Object.assign(o, structuredClone(this._comfy))
      for (const k of this._comfyAbsent ?? []) if (Array.isArray(o[k]) && !o[k].length) delete o[k]
    }
  }
  ComfyPlaceholder.title = type
  LiteGraph.registerNodeType(full, ComfyPlaceholder)
  return full
}

export function importComfy(json) {
  const data = structuredClone(json)
  const isV1 = data.version === 1
  const stash = {}
  for (const k of GRAPH_KEYS) if (k in data) stash[k] = data[k]
  stash._linkObjects = isV1 ? (data.links ?? []).map(l => ({ ...l })) : null
  stash._groupExtras = (data.groups ?? []).map(g => { const { title, bounding, color, font_size, ...rest } = g; return rest })
  stash._hadLastIds = 'last_node_id' in data
  for (const n of data.nodes) if (!LiteGraph.registered_node_types[n.type]) n.type = ensureComfyType(n.type)
  if (isV1) { data.last_node_id = data.state.lastNodeId; data.last_link_id = data.state.lastLinkId }
  for (const k of GRAPH_KEYS) delete data[k]
  const g = new LGraph()
  const err = g.configure(data)
  g.__comfy = stash
  return { graph: g, configureError: err }
}

export function exportComfy(g) {
  const s = JSON.parse(JSON.stringify(g.serialize()))
  const st = g.__comfy ?? {}
  const out = {}
  for (const k of ['id', 'revision']) if (k in st) out[k] = st[k]
  for (const n of s.nodes) {
    if (typeof n.type === 'string' && n.type.startsWith(PREFIX)) n.type = n.type.slice(PREFIX.length)
    for (const k of ['pos', 'size']) if (n[k] && !Array.isArray(n[k])) n[k] = [n[k][0], n[k][1]] // Float32Array -> tuple
  }
  // our serialize mutates key order; restore Comfy-like order: id,type,pos,size,flags,order,mode,inputs,outputs,properties,widgets_values
  s.groups = s.groups.map((gr, i) => {
    const b = Array.from({ length: 4 }, (_, j) => gr.bounding[j])
    const r = { ...(st._groupExtras?.[i]?.id !== undefined ? { id: st._groupExtras[i].id } : {}), title: gr.title, bounding: b, color: gr.color, font_size: gr.font_size, ...st._groupExtras?.[i] }
    return r
  })
  const v1 = st.version === 1
  if (v1) {
    const byId = new Map((st._linkObjects ?? []).map(l => [l.id, l]))
    out.version = 1
    out.state = { ...(st.state ?? {}), lastNodeId: Math.max(st.state?.lastNodeId ?? 0, s.last_node_id), lastLinkId: Math.max(st.state?.lastLinkId ?? 0, s.last_link_id) }
    Object.assign(out, { config: s.config, extra: s.extra, groups: s.groups, nodes: s.nodes })
    out.links = s.links.map(([id, oid, os, tid, ts, type]) => ({ id, origin_id: oid, origin_slot: os, target_id: tid, target_slot: ts, type, ...(byId.get(id)?.parentId !== undefined ? { parentId: byId.get(id).parentId } : {}) }))
    for (const k of ['floatingLinks', 'reroutes', 'definitions', 'models']) if (k in st) out[k] = st[k]
  } else {
    Object.assign(out, { last_node_id: s.last_node_id, last_link_id: s.last_link_id, nodes: s.nodes, links: s.links })
    if ('floatingLinks' in st) out.floatingLinks = st.floatingLinks
    Object.assign(out, { groups: s.groups, config: s.config, extra: s.extra, version: typeof st.version === 'number' ? st.version : 0.4 })
    for (const k of ['definitions', 'models']) if (k in st) out[k] = st[k]
  }
  return out
}
