// litegl was ported from a global script to an ES module. These cover what that port
// broke: helpers that lost `static`, globals the file still reads unqualified, and
// classes that were never attached to GL. Texture/fx nodes failed on all of them.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const root = new URL('../../', import.meta.url);
const read = (path) => fs.readFileSync(new URL(path, root), 'utf8');

// litegl expects a browser page with gl-matrix already loaded.
globalThis.window ??= globalThis;
new Function(read('editor/js/libs/gl-matrix-min.js')).call(globalThis);
const { GL, Shader } = await import('../../editor/js/libs/litegl.js');

// Minimal WebGL context: enough for a Shader to compile, link and introspect.
function fakeContext() {
    const calls = { sources: [] };
    const gl = {
        context_id: 0, webgl_version: 1, shaders: {},
        VERTEX_SHADER: 1, FRAGMENT_SHADER: 2, COMPILE_STATUS: 3, LINK_STATUS: 4,
        ACTIVE_UNIFORMS: 5, ACTIVE_ATTRIBUTES: 6,
        createProgram: () => ({}),
        createShader: (type) => ({ type }),
        shaderSource: (shader, source) => calls.sources.push(source),
        compileShader() {},
        getShaderParameter: () => true,
        attachShader() {},
        linkProgram() {},
        getProgramParameter: (program, name) => (name === 4 ? true : 0),
    };
    return { gl, calls };
}

test('Shader and Mesh helpers called as Shader.x() / Mesh.x() are static', () => {
    for (const name of ['injectCode', 'compileSource', 'getBlendShader', 'getBlurShader',
        'getCubemapShowShader', 'getCubemapCopyShader', 'getFlatShader']) {
        assert.equal(typeof Shader[name], 'function', `Shader.${name}`);
    }
    for (const name of ['plane', 'plane2D', 'point', 'cube', 'box', 'circle', 'cylinder',
        'cone', 'sphere', 'grid', 'icosahedron']) {
        assert.equal(typeof GL.Mesh[name], 'function', `Mesh.${name}`);
    }
});

test('GL exposes Texture and is published globally like the original litegl', () => {
    assert.equal(typeof GL.Texture, 'function');
    assert.equal(GL.Texture.name, 'Texture');
    assert.equal(globalThis.GL, GL);
    assert.equal(typeof globalThis.getTime, 'function');
});

test('a Shader compiles both stages with the WebGL define injected', () => {
    const { gl, calls } = fakeContext();
    const saved = globalThis.gl;
    globalThis.gl = gl;
    try {
        const shader = new Shader('void main(){}', '#version 300 es\nvoid main(){}', { A: 1 });
        assert.equal(shader.gl, gl);
        assert.deepEqual(calls.sources, [
            '#define WEBGL1\n#define A 1\nvoid main(){}',
            '#version 300 es\n#define WEBGL1\n#define A 1\n\nvoid main(){}',
        ]);
    } finally {
        globalThis.gl = saved;
    }
});

// Static check: as modules these files run in strict mode, so any name that is neither
// declared nor a real global is a ReferenceError waiting for its code path.
test('litegl and the WebGL node files only use declared names', () => {
    const require = createRequire(new URL('package.json', root));
    const espree = require('espree');
    const { analyze } = require('eslint-scope');
    const browser = ['window', 'document', 'location', 'Image', 'XMLHttpRequest', 'WebGLRenderbuffer'];
    const glMatrix = ['glMatrix', 'vec2', 'vec3', 'vec4', 'mat3', 'mat4', 'quat'];
    const litegl = read('editor/js/libs/litegl.js');
    // what litegl itself publishes with `global.X = ...`
    const published = [...litegl.matchAll(/global\.(\w+)\s*=/g)].map((m) => m[1]);
    const allowed = {
        'editor/js/libs/litegl.js': [...browser, ...glMatrix, ...published, 'WBin'],
        // LS is litescene, checked through window.LS; enableWebGLCanvas through typeof
        'src/nodes/gltextures.js': [...browser, ...glMatrix, 'LS', 'enableWebGLCanvas'],
        'src/nodes/glfx.js': ['LS'],
        'src/nodes/glshaders.js': [],
        // its WebGL nodes register only once litegl has published GL and gl
        'src/nodes/geometry.js': [...glMatrix, 'GL', 'gl'],
    };
    for (const [file, ok] of Object.entries(allowed)) {
        const ast = espree.parse(read(file), { ecmaVersion: 'latest', sourceType: 'module', range: true });
        const free = analyze(ast, { ecmaVersion: 2022, sourceType: 'module' }).globalScope.through
            .map((ref) => ref.identifier.name)
            .filter((name) => !(name in globalThis) && !ok.includes(name));
        assert.deepEqual([...new Set(free)], [], file);
    }
});
