// Generated hook and typed-event tables in docs/callbacks.md (Wave 7 leftover, state audit N-1):
// the committed page matches the declarations in src/litegraph.d.cts.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { HOOK_MAPS, EVENT_MAPS, parseMaps, renderDoc } from '../hook-docs.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const declarations = fs.readFileSync(path.join(ROOT, 'src/litegraph.d.cts'), 'utf8');
const doc = fs.readFileSync(path.join(ROOT, 'docs/callbacks.md'), 'utf8');

test('docs/callbacks.md is fresh (run npm run docs:callbacks after changing a hook or event map)', () => {
    assert.equal(renderDoc(doc, declarations), doc);
});

test('the parser finds every name the declared-hooks and declared-events checks find', () => {
    const maps = parseMaps(declarations);
    const names = (interfaces, pattern) => {
        const found = new Set();
        for (const [, body] of declarations.matchAll(new RegExp(`export interface (?:${interfaces.join('|')}) \\{([\\s\\S]*?)\\n\\}`, 'g'))) {
            for (const [, name] of body.matchAll(pattern)) found.add(name);
        }
        return found;
    };
    const parsed = (list) => new Set(list.flatMap((map) => maps[map].map((entry) => entry.name)));
    assert.deepEqual(parsed(HOOK_MAPS), names(HOOK_MAPS, /^ {4}(\w+)\??:/gm)); // the regex of tools/check-types.mjs
    assert.deepEqual(parsed(EVENT_MAPS), names(EVENT_MAPS, /^ {4}"?([a-z][a-z-]*)"?\??:/gm));
    assert.ok(parsed(HOOK_MAPS).size > 100);
});

test('entries keep their group, arguments and notes', () => {
    const maps = parseMaps(declarations);
    const execute = maps.LGraphNodeHooks.find((entry) => entry.name === 'onExecute');
    assert.match(execute.group, /execution/);
    assert.equal(execute.type, '[param?: any, options?: ExecutionOptions]');
    const missing = maps.LGraphEventMap.find((entry) => entry.name === 'missing-nodes');
    assert.match(missing.notes, /missing node types/);
    const dropped = maps.LGraphCanvasEventMap.find((entry) => entry.name === 'link-dropped-on-empty');
    assert.match(dropped.type, /canvasX: number/); // a detail spread over several lines
    assert.doesNotMatch(dropped.type, /\n/);
});

test('a stale table is detected, and text outside the generated blocks is kept', () => {
    const stale = doc.replace('| `onExecute` |', '| `onExecuted` |');
    assert.notEqual(stale, doc);
    assert.equal(renderDoc(stale, declarations), doc);
    const edited = doc.replace('# Callback handlers', '# Callback handlers (edited)');
    assert.equal(renderDoc(edited, declarations), edited);
    assert.throws(() => renderDoc('# no markers\n', declarations), /generated:hooks/);
});
