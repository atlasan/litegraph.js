#!/usr/bin/env node
// Hook and typed-event tables of docs/callbacks.md, generated from the declarations (Wave 7
// leftover, state audit N-1).
//
//   npm run docs:callbacks              rewrites the generated blocks of docs/callbacks.md
//   node tools/hook-docs.mjs --check    exits 1 when they are stale
//
// Sources: the hook maps (LiteGraphHooks, LGraphHooks, LGraphNodeHooks, LGraphCanvasHooks,
// LGraphGroupHooks) and the event maps (LiteGraphEventMap, LGraphEventMap, LGraphCanvasEventMap)
// in src/litegraph.d.cts. `// group` lines in a map name the group of the entries after them, and
// `/** … */` comments become the notes of the next entry. Only the text between the markers
// `<!-- generated:hooks:start … -->` / `<!-- generated:hooks:end -->` (and `events`) is replaced.
// tools/tests/hook-docs.test.mjs fails when the committed page differs from a fresh render.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DECLARATIONS = path.join(ROOT, 'src/litegraph.d.cts');
const DOC = path.join(ROOT, 'docs/callbacks.md');

/** hook map → the host it belongs to */
const HOOK_HOSTS = {
    LiteGraphHooks: '`LiteGraph`',
    LGraphHooks: '`LGraph` (a graph)',
    LGraphNodeHooks: '`LGraphNode` (a node)',
    LGraphCanvasHooks: '`LGraphCanvas` (a canvas)',
    LGraphGroupHooks: '`LGraphGroup` (a group)',
};
/** event map → where it is listened to */
const EVENT_TARGETS = {
    LiteGraphEventMap: '`LiteGraph.events`',
    LGraphEventMap: '`graph.events`',
    LGraphCanvasEventMap: '`canvas.events`',
};
export const HOOK_MAPS = Object.keys(HOOK_HOSTS);
export const EVENT_MAPS = Object.keys(EVENT_TARGETS);

const ENTRY = /^ {4}"?([A-Za-z_][\w-]*)"?\??:\s*(.*)$/;

/** Balance of opening over closing brackets in a type text (angle brackets left out: `=>`). */
const depth = (text) => [...text].reduce((n, c) => n + ('{[('.includes(c) ? 1 : '}])'.includes(c) ? -1 : 0), 0);

/**
 * Parses the hook and event maps.
 * @param {string} declarations the text of src/litegraph.d.cts
 * @returns {Record<string, {name: string, type: string, group: string, notes: string}[]>} entries per map, in declaration order
 */
export function parseMaps(declarations) {
    const maps = {};
    for (const map of [...HOOK_MAPS, ...EVENT_MAPS]) {
        const match = declarations.match(new RegExp(`export interface ${map} \\{([\\s\\S]*?)\\n\\}`));
        if (!match) throw new Error(`interface ${map} not found in src/litegraph.d.cts`);
        const entries = [];
        let group = '';
        let notes = [];
        let comment = null; // lines of an open /** … */ block
        let current = null; // an entry whose type spans several lines
        for (const line of match[1].split('\n')) {
            if (current) {
                current.type += ' ' + line.trim();
                if (depth(current.type) <= 0) current = finish(current);
                continue;
            }
            const trimmed = line.trim();
            if (comment) {
                const end = trimmed.endsWith('*/');
                comment.push(trimmed.replace(/\*\/$/, '').replace(/^\*\s?/, '').trim());
                if (end) { notes.push(comment.filter(Boolean).join(' ')); comment = null; }
                continue;
            }
            if (trimmed.startsWith('/**')) {
                const body = trimmed.replace(/^\/\*\*/, '');
                if (body.endsWith('*/')) notes.push(body.replace(/\*\/$/, '').trim());
                else comment = [body.trim()];
                continue;
            }
            if (trimmed.startsWith('//')) { group = trimmed.replace(/^\/\/\s*/, ''); continue; }
            const entry = line.match(ENTRY);
            if (!entry) continue;
            const item = { name: entry[1], type: entry[2], group, notes: notes.join('; ') };
            notes = [];
            entries.push(item);
            current = depth(item.type) > 0 ? item : finish(item);
        }
        maps[map] = entries;
    }
    return maps;
}

/** Normalises a finished entry's type: one line, no trailing semicolon. */
function finish(item) {
    item.type = item.type.replace(/\s+/g, ' ').replace(/;\s*}/g, ' }').replace(/;$/, '').trim();
    return null;
}

const cell = (text) => text.replace(/\|/g, '\\|');
const code = (text) => '`' + cell(text) + '`';
const capital = (text) => text.charAt(0).toUpperCase() + text.slice(1);

/** The hook tables, one per host. */
export function renderHooks(maps) {
    const out = [];
    for (const map of HOOK_MAPS) {
        out.push(`**${HOOK_HOSTS[map]}** (\`${map}\`)`, '', '| Group | Hook | Handler arguments, after `info` |', '|---|---|---|');
        let last = null;
        for (const { name, type, group } of maps[map]) {
            const args = type.replace(/^\[|\]$/g, '').trim();
            out.push(`| ${group !== last && group ? capital(cell(group)) : ''} | \`${name}\` | ${args ? code(args) : 'none'} |`);
            last = group;
        }
        out.push('');
    }
    return out.join('\n');
}

/** The typed-event tables, one per target. */
export function renderEvents(maps) {
    const out = [];
    for (const map of EVENT_MAPS) {
        out.push(`**${EVENT_TARGETS[map]}** (\`${map}\`)`, '', '| Event | Detail | Notes |', '|---|---|---|');
        for (const { name, type, notes } of maps[map]) out.push(`| \`${name}\` | ${code(type)} | ${cell(notes)} |`);
        out.push('');
    }
    return out.join('\n');
}

/** Replaces the text between the start and end markers of one generated block. */
function replaceBlock(text, block, content) {
    const start = new RegExp(`<!-- generated:${block}:start[^>]*-->\\n`);
    const end = `<!-- generated:${block}:end -->`;
    const from = text.search(start);
    const to = text.indexOf(end);
    if (from < 0 || to < from) throw new Error(`docs/callbacks.md: missing the <!-- generated:${block}:start --> / <!-- generated:${block}:end --> markers`);
    const head = text.slice(0, from) + text.slice(from).match(start)[0];
    return head + '\n' + content + '\n' + text.slice(to);
}

/**
 * The page with its generated blocks rendered from the declarations.
 * @param {string} doc the current text of docs/callbacks.md
 * @param {string} declarations the text of src/litegraph.d.cts
 */
export function renderDoc(doc, declarations) {
    const maps = parseMaps(declarations);
    return replaceBlock(replaceBlock(doc, 'hooks', renderHooks(maps)), 'events', renderEvents(maps));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const doc = fs.readFileSync(DOC, 'utf8');
    const fresh = renderDoc(doc, fs.readFileSync(DECLARATIONS, 'utf8'));
    if (process.argv.includes('--check')) {
        if (fresh !== doc) {
            console.error('docs/callbacks.md is stale: run npm run docs:callbacks');
            process.exit(1);
        }
        console.log('docs/callbacks.md is fresh.');
    } else if (fresh !== doc) {
        fs.writeFileSync(DOC, fresh);
        console.log('docs/callbacks.md: generated tables updated.');
    } else {
        console.log('docs/callbacks.md: already fresh.');
    }
}
