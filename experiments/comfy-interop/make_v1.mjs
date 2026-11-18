// Builds two synthetic Comfy v1 workflows from the real default_workflow.json (0.4) fixture.
import fs from 'node:fs'
const src = JSON.parse(fs.readFileSync(process.argv[2]))
const out = process.argv[3]
const base = structuredClone(src)
const toObj = l => ({ id: l[0], origin_id: l[1], origin_slot: l[2], target_id: l[3], target_slot: l[4], type: l[5] })
// v1 plain: object links, state, one reroute on link 1 (MODEL)
const v1 = {
  id: '9a4a5ec1-7f50-4b52-9b0b-1d6c3a0f6c11', revision: 0, version: 1,
  state: { lastGroupId: 1, lastNodeId: 9, lastLinkId: 9, lastRerouteId: 1 },
  config: {}, extra: base.extra,
  groups: [{ id: 1, title: 'Sampler', bounding: [800, 100, 400, 400], color: '#3f789e', font_size: 24, flags: {} }],
  nodes: base.nodes,
  links: base.links.map(toObj).map(l => l.id === 1 ? { ...l, parentId: 1 } : l),
  reroutes: [{ id: 1, pos: [600, 300], linkIds: [1] }],
}
fs.writeFileSync(out + '/v1_default.json', JSON.stringify(v1, null, 1))
// v1 with subgraph: VAEDecode(8)+SaveImage(9) wrapped into a subgraph instance node
const SG = 'b7d2c1a0-0c3e-4c1f-9d55-2f1e7c6b5a01'
const IN_ID = '1f0e1c2d-3b4a-4c5d-8e6f-7a8b9c0d1e2f', IN2_ID = '2f0e1c2d-3b4a-4c5d-8e6f-7a8b9c0d1e2f'
const keep = base.nodes.filter(n => n.id !== 8 && n.id !== 9)
const dec = base.nodes.find(n => n.id === 8), save = base.nodes.find(n => n.id === 9)
const inst = { id: 10, type: SG, pos: [1209, 188], size: [210, 80], flags: {}, order: 5, mode: 0,
  inputs: [{ name: 'samples', type: 'LATENT', link: 7 }, { name: 'vae', type: 'VAE', link: 8 }], outputs: [], properties: {} }
const sgDef = {
  id: SG, revision: 0, version: 1, name: 'Decode+Save',
  state: { lastGroupId: 0, lastNodeId: 9, lastLinkId: 12, lastRerouteId: 0 },
  config: {}, extra: {},
  inputNode: { id: -10, bounding: [0, 0, 120, 80] }, outputNode: { id: -20, bounding: [700, 0, 120, 60] },
  inputs: [{ id: IN_ID, name: 'samples', type: 'LATENT', linkIds: [10] }, { id: IN2_ID, name: 'vae', type: 'VAE', linkIds: [11] }],
  outputs: [], widgets: [],
  nodes: [
    { ...dec, inputs: [{ name: 'samples', type: 'LATENT', link: 10 }, { name: 'vae', type: 'VAE', link: 11 }], outputs: [{ name: 'IMAGE', type: 'IMAGE', links: [12], slot_index: 0 }] },
    { ...save, inputs: [{ name: 'images', type: 'IMAGE', link: 12 }] },
  ],
  links: [
    { id: 10, origin_id: -10, origin_slot: 0, target_id: 8, target_slot: 0, type: 'LATENT' },
    { id: 11, origin_id: -10, origin_slot: 1, target_id: 8, target_slot: 1, type: 'VAE' },
    { id: 12, origin_id: 8, origin_slot: 0, target_id: 9, target_slot: 0, type: 'IMAGE' },
  ],
  groups: [],
}
const v1s = { ...structuredClone(v1), id: '3c4a5ec1-7f50-4b52-9b0b-1d6c3a0f6c12', reroutes: [],
  links: v1.links.filter(l => l.id !== 9).map(l => { const { parentId, ...r } = l; return l.target_id === 8 ? { ...r, target_id: 10, target_slot: l.target_slot } : r }),
  nodes: [...keep.map(n => structuredClone(n)), inst], definitions: { subgraphs: [sgDef] } }
v1s.links.forEach(l => { if (l.id === 7) l.target_slot = 0; if (l.id === 8) l.target_slot = 1 })
fs.writeFileSync(out + '/v1_subgraph.json', JSON.stringify(v1s, null, 1))
