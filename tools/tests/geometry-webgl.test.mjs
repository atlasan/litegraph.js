// geometry.js loads before litegl in the editor, so its WebGL nodes must register when
// litegl announces itself ("litegl:ready"), not only if GL already exists at import.
import test from 'node:test';
import assert from 'node:assert/strict';

const listeners = {};
globalThis.addEventListener = (type, fn, options) => { listeners[type] = { fn, options }; };
const { LiteGraph } = await import('../../src/litegraph.js');
await import('../../src/nodes/geometry.js');

const WEBGL_TYPES = ['geometry/toGeometry', 'geometry/toMesh', 'geometry/render_mesh',
    'geometry/mesh_primitive', 'geometry/render_points'];

test('geometry WebGL nodes wait for litegl, then register once', () => {
    for (const type of WEBGL_TYPES) assert.equal(LiteGraph.registered_node_types[type], undefined, type);
    assert.equal(LiteGraph.registered_node_types['geometry/points3D'] !== undefined, true);

    const ready = listeners['litegl:ready'];
    assert.ok(ready, 'listens for litegl:ready');
    assert.equal(ready.options?.once, true);

    globalThis.GL = { Mesh: class Mesh {} };
    try {
        ready.fn();
        for (const type of WEBGL_TYPES) assert.equal(typeof LiteGraph.registered_node_types[type], 'function', type);
        const first = LiteGraph.registered_node_types['geometry/render_mesh'];
        ready.fn();
        assert.equal(LiteGraph.registered_node_types['geometry/render_mesh'], first, 'not registered twice');
    } finally {
        delete globalThis.GL;
    }
});
