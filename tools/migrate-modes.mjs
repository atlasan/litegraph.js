#!/usr/bin/env node
/**
 * Rewrites graph documents to mode numbering 2 (BYPASS = 4, ON_REQUEST = 5), using
 * LGraph.migrateModes from the Node build (run `npm run build` first).
 *
 *   node tools/migrate-modes.mjs [--check] [--unmarked=on_request|bypass] file.json ...
 *
 * - A document written by LiteGraph before numbering 2 (it has `litegraph_version`) is migrated:
 *   mode 4 (ON_REQUEST then) becomes 5.
 * - A document without `litegraph_version` that has mode-4 nodes is ambiguous (ComfyUI and
 *   upstream litegraph use 4 for BYPASS; LiteGraph builds before 2026-11-18 used it for
 *   ON_REQUEST). It is skipped unless `--unmarked` says what 4 means there.
 * - `--check` changes nothing and exits with 1 when a file would change.
 *
 * Files keep their layout: one line stays one line; an indented file keeps its indentation.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

const args = process.argv.slice(2);
const check = args.includes('--check');
const unmarkedArg = args.find((a) => a.startsWith('--unmarked='))?.split('=')[1];
const files = args.filter((a) => !a.startsWith('--'));
if (unmarkedArg && !['on_request', 'bypass'].includes(unmarkedArg)) {
    console.error('--unmarked must be on_request or bypass');
    process.exit(2);
}
if (!files.length) {
    console.error('usage: node tools/migrate-modes.mjs [--check] [--unmarked=on_request|bypass] file.json ...');
    process.exit(2);
}

console.info = () => {}; // the bundle logs its start and each migration; this tool reports per file
const { LGraph } = require(path.join(ROOT, 'build_node/litegraph.core.cjs'));
if (typeof LGraph?.migrateModes !== 'function') {
    console.error('build_node/litegraph.core.cjs has no LGraph.migrateModes; run npm run build');
    process.exit(2);
}

/** true when any graph of the document (nested subgraphs and definitions included) has a mode-4 node */
function hasMode4(doc, seen = new Set()) {
    if (!doc || typeof doc !== 'object' || seen.has(doc)) return false;
    seen.add(doc);
    for (const node of Array.isArray(doc.nodes) ? doc.nodes : []) {
        if (node?.mode === 4 || hasMode4(node?.subgraph, seen)) return true;
    }
    return (doc.definitions?.subgraphs ?? []).some((definition) => hasMode4(definition, seen));
}

function layoutOf(text) {
    const second = text.split('\n')[1];
    if (second === undefined) return null; // one line
    const indent = second.match(/^(\s+)/)?.[1] ?? '';
    return indent.startsWith('\t') ? '\t' : indent.length || 2;
}

let pending = 0;
for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    let doc;
    try {
        doc = JSON.parse(text);
    } catch (error) {
        console.error(`${file}: not JSON (${error.message})`);
        process.exitCode = 2;
        continue;
    }
    const marked = Number(doc.litegraph_modes) >= 2;
    const old = !marked && !!doc.litegraph_version;
    if (!marked && !old && hasMode4(doc) && !unmarkedArg) {
        console.log(`${file}: skipped; no litegraph_version, so mode 4 is ambiguous (pass --unmarked=on_request or --unmarked=bypass)`);
        continue;
    }
    if (marked) {
        console.log(`${file}: already numbering ${doc.litegraph_modes}`);
        continue;
    }
    const result = LGraph.migrateModes(doc, { unmarked: unmarkedArg ?? 'bypass' });
    const indent = layoutOf(text);
    const out = (indent === null ? JSON.stringify(doc) : JSON.stringify(doc, null, indent)) + (text.endsWith('\n') ? '\n' : '');
    if (out === text) continue;
    pending++;
    console.log(`${file}: ${result.numbering} numbering, ${result.changed} node mode(s) changed${check ? ' (check only)' : ''}`);
    if (!check) fs.writeFileSync(file, out);
}
if (check && pending) process.exitCode = 1;
