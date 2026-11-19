// Texture and fx nodes need litegl (GL, Shader) and a live context (gl). These run
// against the built bundle, where those are plain globals the host page provides.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// The editor loads gl-matrix as a global script before LiteGraph; do the same.
new Function(fs.readFileSync(new URL('../../editor/js/libs/gl-matrix-min.js', import.meta.url), 'utf8')).call(globalThis);
const { LiteGraph, LGraphTexture } = await import('../../build/litegraph.js');

const GL_TYPES = Object.keys(LiteGraph.registered_node_types).filter((t) => /^(texture|fx)\//.test(t));
const BAD = [null, undefined, NaN, Infinity, {}, [], 'x', 42];

function withFakeWebGL(run) {
    const created = [];
    class FakeShader {
        static SCREEN_VERTEX_SHADER = 'vs';
        constructor(vs, fs) { this.vs = vs; this.fs = fs; created.push(this); }
    }
    class FakeTexture { constructor(w, h, opts) { Object.assign(this, { w, h, opts }); } }
    const saved = { GL: globalThis.GL, Shader: globalThis.Shader, gl: globalThis.gl };
    globalThis.GL = { Shader: FakeShader, Texture: FakeTexture };
    globalThis.Shader = FakeShader;
    globalThis.gl = { RGB: 1, CLAMP_TO_EDGE: 2, LINEAR: 3 };
    try { return run(created, FakeShader); } finally {
        for (const [k, v] of Object.entries(saved)) {
            if (v === undefined) delete globalThis[k]; else globalThis[k] = v;
        }
    }
}

test('texture and fx node types are all guarded', () => {
    assert.ok(GL_TYPES.length > 40, `only ${GL_TYPES.length} GL node types found`);
    assert.ok(GL_TYPES.includes('texture/shaderGraph'));
    assert.ok(GL_TYPES.includes('fx/lens'));
    for (const type of GL_TYPES) {
        assert.ok(LGraphTexture._webgl_guarded.has(LiteGraph.registered_node_types[type]), type);
    }
});

test('without WebGL every texture/fx node constructs and stays inert', () => {
    assert.equal(LGraphTexture.hasWebGL(), false);
    for (const type of GL_TYPES) {
        const node = LiteGraph.createNode(type);
        assert.ok(node, `${type} failed to construct`);
        for (const value of BAD) {
            node.getInputData = () => value;
            assert.doesNotThrow(() => node.onExecute?.(), `${type} onExecute(${String(value)})`);
        }
        for (const name of Object.keys(node.properties || {})) {
            assert.doesNotThrow(() => node.setProperty(name, node.properties[name]), `${type}.${name}`);
        }
    }
});

test('without WebGL a property change still keeps the new value', () => {
    const node = LiteGraph.createNode('texture/color');
    node.setProperty('precision', 3);
    assert.equal(node.properties.precision, 3);
});

test('a node created before WebGL builds its shader on first use once WebGL is up', () => {
    const node = LiteGraph.createNode('fx/vigneting');
    const ctor = node.constructor;
    assert.equal(ctor._shader, undefined, 'no shader may be built without WebGL');
    withFakeWebGL((created, FakeShader) => {
        assert.equal(LGraphTexture.hasWebGL(), true);
        let reached = false;
        node.getInputData = () => { reached = true; return null; };
        node.onExecute();
        assert.equal(reached, true, 'original onExecute runs once WebGL is available');
        assert.ok(ctor._shader instanceof FakeShader);
        assert.equal(created.length, 1);
        node.onExecute();
        assert.equal(created.length, 1, 'the shared shader is built once');
    });
});

test('with WebGL, constructors build shared resources eagerly as before', () => {
    withFakeWebGL((created, FakeShader) => {
        const lens = LiteGraph.createNode('fx/lens');
        assert.ok(lens.constructor._shader instanceof FakeShader);
        assert.equal(lens.constructor._texture.opts.format, 1);
        const graph = LiteGraph.createNode('texture/shaderGraph');
        assert.match(graph._context.vs_template, /^#define VERTEX\nvs$/);
    });
});

test('shaderGraph created without WebGL gets its vertex template on first use', () => {
    const node = LiteGraph.createNode('texture/shaderGraph');
    assert.equal(node._context.vs_template, '');
    withFakeWebGL(() => {
        node.isOutputConnected = () => false;
        node.getInputData = () => undefined;
        try { node.onExecute(); } catch { /* rendering needs a real context; only the template matters */ }
        assert.match(node._context.vs_template, /^#define VERTEX\nvs$/);
    });
});

test('geometry/points3D generates sphere points without litegl', () => {
    const node = LiteGraph.createNode('geometry/points3D');
    node.properties.mode = node.constructor.SPHERE;
    node.properties.num_points = 64;
    node.properties.radius = 2;
    assert.doesNotThrow(() => node.setProperty('regular', true));
    node.getInputData = () => undefined;
    node.setOutputData = () => {};
    assert.doesNotThrow(() => node.onExecute());
    const points = node.points;
    assert.ok(points && points.length >= 3, 'sphere points generated');
    {
        for (let i = 0; i < points.length; i += 3) {
            const r = Math.hypot(points[i], points[i + 1], points[i + 2]);
            assert.ok(Math.abs(r - 2) < 1e-5, `point ${i / 3} has radius ${r}`);
        }
    }
});

test('property changes skipped without WebGL are applied once WebGL is up', () => {
    const applied = [];
    class SavedCode {
        constructor() { this.properties = { code: 'default', other: 1 }; }
        onPropertyChanged(name, value) { applied.push([name, value]); }
        onExecute() { applied.push(['execute']); }
    }
    LGraphTexture.requireWebGL(SavedCode);
    const node = new SavedCode();
    node.properties.code = 'saved';
    node.onPropertyChanged('code', 'saved'); // what configure() does when restoring
    assert.deepEqual(applied, [], 'nothing runs without WebGL');
    withFakeWebGL(() => {
        node.onExecute();
        node.onExecute();
    });
    assert.deepEqual(applied, [['code', 'saved'], ['execute'], ['execute']], 'replayed once, before running');
});
