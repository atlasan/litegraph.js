// Sources are ES modules, so they run in strict mode: reading or assigning a name that
// was never declared throws a ReferenceError the first time that code path runs.
// The lint config keeps no-undef off for lack of browser globals; this check supplies them.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Linter } from 'eslint';
import { JSDOM } from 'jsdom';

const root = fileURLToPath(new URL('../../', import.meta.url));

// Globals other scripts provide on purpose: gl-matrix and litegl (WebGL nodes), litescene,
// jQuery and the optional audio/midi/osc/socket.io helpers, host-page hooks behind typeof checks.
const PROVIDED = ['glMatrix', 'vec2', 'vec3', 'vec4', 'mat3', 'mat4', 'quat', 'GL', 'gl', 'LS',
    'enableWebGLCanvas', 'showElement', '$', 'MidiParser', 'AudioSynth', 'OSC', 'io', 'Bun',
    'WebTransport', 'graphcanvas'];

// Real browser APIs jsdom does not implement (require is only used behind a typeof check).
const BROWSER_EXTRA = ['requestAnimationFrame', 'AudioParam', 'AudioContext', 'DeviceOrientationEvent',
    'RTCPeerConnection', 'RTCSessionDescription', 'require'];

// Loaded as plain scripts that read the global LiteGraph rather than importing it.
const SCRIPT_DIRS = ['src/nodes/nodejs_only', 'src/nodes/libraries'];

test('sources only use declared names', () => {
    const { window } = new JSDOM('');
    const browser = Object.getOwnPropertyNames(window);
    const globals = Object.fromEntries([...browser, ...Object.getOwnPropertyNames(globalThis), ...BROWSER_EXTRA, ...PROVIDED]
        .map((name) => [name, 'readonly']));
    const config = [{
        languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals },
        rules: { 'no-undef': 'error' },
    }];
    const linter = new Linter({ configType: 'flat' });
    const files = [];
    const walk = (dir) => {
        for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
            const rel = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                if (!SCRIPT_DIRS.includes(rel)) walk(rel);
            } else if (entry.name.endsWith('.js')) {
                files.push(rel);
            }
        }
    };
    walk('src');
    const problems = files.flatMap((file) => linter
        .verify(fs.readFileSync(path.join(root, file), 'utf8'), config, file)
        .map((m) => `${file}:${m.line} ${m.message}`));
    assert.deepEqual(problems, []);
});
