import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LiteGraph } from '../src/litegraph.js';
import { applyEditorPreset } from '../apps/editor/js/defaults.js';

// The editor pages load `js/defaults.js?preset=<name>` first and their page scripts after it, so
// `defaults.js` must be the only editor script that decides `allow_scripts` (state audit D-1).

const editorDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'apps', 'editor');
const assignsAllowScripts = /\bLiteGraph\s*\.\s*allow_scripts\s*=(?!=)/;

function editorScripts() {
    const js = readdirSync(join(editorDir, 'js'))
        .filter((file) => file.endsWith('.js') && file !== 'defaults.js')
        .map((file) => ({ file: `js/${file}`, source: readFileSync(join(editorDir, 'js', file), 'utf8') }));
    const inline = readdirSync(editorDir)
        .filter((file) => file.endsWith('.html'))
        .map((file) => ({ file, source: readFileSync(join(editorDir, file), 'utf8') }));
    return [...js, ...inline];
}

test('only defaults.js assigns LiteGraph.allow_scripts in the editor app', () => {
    const offenders = editorScripts()
        .filter(({ source }) => source.split('\n').some((line) => !/^\s*\/\//.test(line) && assignsAllowScripts.test(line)))
        .map(({ file }) => file);
    expect(offenders).toEqual([]);
});

test('the default editor page allows scripts; the mobile and event_based presets turn them off', () => {
    expect(LiteGraph.allow_scripts).toBe(true);
    for (const preset of ['mobile', 'event_based']) {
        LiteGraph.allow_scripts = true;
        expect(applyEditorPreset(preset)).toBe(true);
        expect(LiteGraph.allow_scripts).toBe(false);
    }
    expect(LiteGraph.do_add_triggers_slots).toBe(true);
});
