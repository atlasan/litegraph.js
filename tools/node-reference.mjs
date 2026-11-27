#!/usr/bin/env node
// Node reference (FLW-23): builds docs/nodes/ from the node registry.
//
//   npm run docs:nodes            writes docs/nodes/README.md, docs/nodes/<pack>.md, docs/nodes/nodes.json
//   node tools/node-reference.mjs --out <dir>
//
// Sources: LiteGraph.listNodeDefinitions / describeNodeType (title, description, usage, category,
// capabilities, execution), LiteGraph.packs (pack id, title, description), and one instance of each
// type for its slots and properties. It loads build/litegraph_nodejs.full.js, the bundle with every
// shipped pack, so run `npm run build` first after changing src/.
// docs/nodes/ is generated locally and git-ignored (roadmap decision D9).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ---- environment ------------------------------------------------------------------------------

/** A value that accepts any property read, call or assignment (stands in for Web Audio objects). */
function anything(name = 'stub') {
    const store = {};
    const fn = function () {};
    return new Proxy(fn, {
        get(_t, key) {
            if (key === Symbol.toPrimitive) return () => 0;
            if (key === 'then') return undefined; // never a thenable
            if (key === 'toString') return () => `[${name}]`;
            if (!(key in store)) store[key] = typeof key === 'string' ? anything(`${name}.${key}`) : undefined;
            return store[key];
        },
        set(_t, key, value) { store[key] = value; return true; },
        apply() { return anything(`${name}()`); },
        construct() { return anything(`new ${name}`); },
    });
}

class FakeAudioContext {
    constructor() { this.sampleRate = 44100; this.currentTime = 0; this.state = 'suspended'; this.destination = anything('destination'); }
    suspend() { return Promise.resolve(); }
    resume() { return Promise.resolve(); }
}
// createGain, createOscillator, ... all return a stub audio node
for (const name of ['createGain', 'createOscillator', 'createBiquadFilter', 'createConvolver', 'createDelay', 'createDynamicsCompressor',
    'createAnalyser', 'createScriptProcessor', 'createMediaElementSource', 'createMediaStreamSource', 'createBufferSource', 'createBuffer',
    'createChannelMerger', 'createChannelSplitter', 'createStereoPanner', 'createWaveShaper', 'createConstantSource', 'createPanner']) {
    FakeAudioContext.prototype[name] = function () { return anything(name); };
}
FakeAudioContext.prototype.decodeAudioData = function () { return Promise.resolve(anything('buffer')); };

/** An XMLHttpRequest that never sends: asset loads started while a node is configured stay pending. */
class FakeXMLHttpRequest {
    open() {}
    send() {}
    abort() {}
    setRequestHeader() {}
    addEventListener() {}
}

let dom = null;
async function browserStubs() {
    if (!dom) {
        const { JSDOM } = await import('jsdom');
        dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' });
        // jsdom has no 2D context
        dom.window.HTMLCanvasElement.prototype.getContext = function () { return anything('context2d'); };
    }
    const extra = { AudioContext: FakeAudioContext };
    const window = new Proxy(dom.window, {
        get: (target, key) => (key in extra ? extra[key] : Reflect.get(target, key)),
        set: (_target, key, value) => { extra[key] = value; return true; },
    });
    return { document: dom.window.document, window };
}

/**
 * Runs `run` with a browser-like `window` and `document` (jsdom, a fake AudioContext), then
 * removes them, so the bundle never sees a browser outside node construction.
 */
export async function withBrowserStubs(run) {
    const stubs = await browserStubs();
    const keys = ['window', 'document', 'AudioContext', 'XMLHttpRequest'];
    const saved = Object.fromEntries(keys.map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
    globalThis.window = stubs.window;
    globalThis.document = stubs.document;
    globalThis.AudioContext = FakeAudioContext; // audio.js calls the global constructor
    globalThis.XMLHttpRequest = FakeXMLHttpRequest; // asset loads (sound files) never complete
    try { return run(); } finally {
        for (const [key, desc] of Object.entries(saved)) {
            if (desc) Object.defineProperty(globalThis, key, desc); else delete globalThis[key];
        }
    }
}

let loaded = null;
/**
 * Loads the bundle with every shipped pack (browser and Node.js packs) the way the editor does:
 * gl-matrix as a global script first. Resolves to the bundle's exports.
 */
export async function loadCatalog() {
    if (loaded) return loaded;
    loaded = (async () => {
        if (typeof globalThis.glMatrix === 'undefined') {
            new Function(fs.readFileSync(path.join(ROOT, 'vendor/gl-matrix-min.js'), 'utf8')).call(globalThis);
        }
        const mod = await import(pathToFileURL(path.join(ROOT, 'build/litegraph_nodejs.full.js')).href);
        await mod.LiteGraph.LibraryManager.ready;
        return mod;
    })();
    return loaded;
}

// ---- reference ------------------------------------------------------------------------------

const BROWSER_CAPS = new Set(['browser', 'dom', 'audio', 'webgl', 'midi']);

function slotType(LiteGraph, type, isInput) {
    if (type === LiteGraph.EVENT || type === LiteGraph.ACTION) return isInput ? 'action' : 'event';
    if (type === 0 || type === '' || type === '*' || type == null) return 'any';
    return String(type);
}

function slotsOf(LiteGraph, list, isInput) {
    return (list ?? []).map((slot) => ({ name: String(slot.label ?? slot.name ?? ''), type: slotType(LiteGraph, slot.type, isInput) }));
}

function plainProperties(properties) {
    const out = {};
    for (const [key, value] of Object.entries(properties ?? {})) {
        const kind = typeof value;
        if (value == null || kind === 'number' || kind === 'string' || kind === 'boolean') out[key] = value;
        else if (Array.isArray(value) && value.length <= 8 && value.every((v) => typeof v === 'number')) out[key] = [...value];
        else out[key] = `<${Array.isArray(value) ? 'array' : kind}>`;
    }
    return out;
}

/** Creates one node of `type` (inside browser stubs for browser types); null when it cannot be created. */
export async function createForReference(LiteGraph, type) {
    const def = LiteGraph.getNodeDefinition(type);
    const browser = def?.capabilities?.some((c) => BROWSER_CAPS.has(c));
    const make = () => { try { return LiteGraph.createNode(type); } catch { return null; } };
    return browser ? withBrowserStubs(make) : make();
}

function executionSummary(LiteGraph, type, decl) {
    if (!decl) return null;
    const engine = LiteGraph.ExecutionEngine;
    const name = (m) => LiteGraph.NODE_MODES[m] ?? String(m);
    const defaults = {};
    const invalid = [];
    for (const rules of LiteGraph.listExecutionModels()) {
        if (rules.legacy) continue;
        if (decl.models?.[rules.name] === false) { invalid.push(rules.name); continue; }
        const mode = engine.declaredDefaultMode({ type }, rules);
        if (mode != null) defaults[rules.name] = name(mode);
    }
    return {
        pure: decl.pure, volatile: !!decl.volatile, ticks: decl.ticks, loop: decl.loop, branches: !!decl.branches, emit: decl.emit ?? null,
        modes: decl.modes ? decl.modes.map(name) : null,
        default_mode: decl.default_mode != null ? name(decl.default_mode) : null,
        defaults, invalid_in: invalid,
        immediate_inputs: [...decl.immediate_inputs],
    };
}

/**
 * Builds the reference from a loaded LiteGraph: `{json, pages}` where `pages` maps a file name
 * (README.md, <pack>.md) to its Markdown. Deterministic: no dates, sorted by pack and type.
 */
export async function buildReference(LiteGraph) {
    const definitions = LiteGraph.listNodeDefinitions({ includeHidden: true }).slice().sort((a, b) => (a.type < b.type ? -1 : a.type > b.type ? 1 : 0)); // code-point order, locale-free
    const nodes = [];
    for (const def of definitions) {
        const node = await createForReference(LiteGraph, def.type);
        const fromDef = (list, isInput) => (list ? slotsOf(LiteGraph, list, isInput) : null);
        nodes.push({
            type: def.type,
            title: def.title,
            description: def.description,
            usage: def.usage,
            category: def.category,
            pack: def.pack?.id ?? null,
            capabilities: [...def.capabilities].sort(),
            deprecated: def.deprecated,
            experimental: def.experimental,
            hidden: def.hidden,
            created: !!node,
            inputs: fromDef(def.inputs, true) ?? (node ? slotsOf(LiteGraph, node.inputs, true) : null),
            outputs: fromDef(def.outputs, false) ?? (node ? slotsOf(LiteGraph, node.outputs, false) : null),
            properties: node ? plainProperties(node.properties) : null,
            execution: executionSummary(LiteGraph, def.type, def.execution),
        });
    }
    const packs = LiteGraph.packs.list().map((manifest) => {
        const own = nodes.filter((n) => n.pack === manifest.id);
        return {
            id: manifest.id, title: manifest.title, description: manifest.description, version: manifest.version, builtin: manifest.builtin,
            file: `${pageName(manifest.id)}.md`,
            node_count: own.length,
            categories: [...new Set(own.map((n) => n.category))].sort(),
            declared: own.filter((n) => n.execution).length,
        };
    }).filter((pack) => pack.node_count > 0);
    const unpacked = nodes.filter((n) => !n.pack);
    if (unpacked.length) {
        packs.push({ id: null, title: 'Without a pack', description: 'Types registered outside any pack.', version: null, builtin: false,
            file: 'unpacked.md', node_count: unpacked.length, categories: [...new Set(unpacked.map((n) => n.category))].sort(), declared: unpacked.filter((n) => n.execution).length });
    }
    const json = { format: 'litegraph-node-reference', version: 1, litegraph: LiteGraph.VERSION, packs, nodes };
    const pages = { 'README.md': readmePage(json) };
    for (const pack of packs) pages[pack.file] = packPage(pack, nodes.filter((n) => n.pack === pack.id));
    return { json, pages };
}

const pageName = (id) => id.replace(/^litegraph\//, '').replace(/[^a-z0-9_-]+/gi, '-');
const cell = (text) => String(text ?? '').replace(/\|/g, '\\|').replace(/\r?\n+/g, ' ').trim();
const slotsText = (slots) => (slots === null ? '?' : slots.length ? slots.map((s) => `${s.name}:${s.type}`).join(', ') : '—');

function executionText(exec) {
    if (!exec) return '—';
    const parts = [];
    for (const flag of ['pure', 'volatile', 'ticks', 'loop', 'branches']) if (exec[flag]) parts.push(flag);
    if (exec.emit) parts.push(`emit ${exec.emit}`);
    const defaults = Object.entries(exec.defaults).map(([model, mode]) => `${model}: ${mode}`);
    if (defaults.length) parts.push(`default ${defaults.join(', ')}`);
    if (exec.modes) parts.push(`modes ${exec.modes.join('/')}`);
    if (exec.invalid_in.length) parts.push(`not in ${exec.invalid_in.join(', ')}`);
    if (exec.immediate_inputs.length) parts.push(`immediate ${exec.immediate_inputs.join(', ')}`);
    return parts.join('; ') || 'declared';
}

const HEADER = '<!-- Generated by tools/node-reference.mjs (npm run docs:nodes). Do not edit. -->';

function readmePage(json) {
    const total = json.nodes.length;
    const declared = json.nodes.filter((n) => n.execution).length;
    const lines = [HEADER, '', '# Node reference', '',
        `LiteGraph ${json.litegraph}: ${total} node types in ${json.packs.length} packs, ${declared} with execution declarations.`, '',
        'Each pack page has one table per category. Columns:',
        '- **Inputs / outputs:** `name:type`. `action` and `event` are execution slots; `any` accepts every type; `?` means the slots are only known in a browser.',
        '- **Execution:** the declared needs (`pure`, `volatile`, `ticks`, `loop`, `branches`, the default mode per execution model). `—` means undeclared: the node starts ALWAYS. See the [guide](../guide.md#execution-models).',
        '', 'The same data is in [nodes.json](nodes.json), for search and tools.', '',
        '| Pack | Description | Nodes | Declared | Categories |', '|---|---|---|---|---|'];
    for (const pack of json.packs) {
        lines.push(`| [${cell(pack.title)}](${pack.file})${pack.id ? ` \`${pack.id}\`` : ''} | ${cell(pack.description)} | ${pack.node_count} | ${pack.declared} | ${pack.categories.map((c) => `\`${c}\``).join(' ')} |`);
    }
    return lines.join('\n') + '\n';
}

function packPage(pack, nodes) {
    const lines = [HEADER, '', `# ${pack.title}`, ''];
    if (pack.id) lines.push(`Pack \`${pack.id}\`${pack.builtin ? ' (builtin)' : ''}. ${pack.node_count} node types.`, '');
    if (pack.description) lines.push(pack.description, '');
    lines.push('[All packs](README.md)', '');
    for (const category of pack.categories) {
        lines.push(`## ${category || '(no category)'}`, '', '| Type | Title | Description | Inputs | Outputs | Execution | Usage |', '|---|---|---|---|---|---|---|');
        for (const n of nodes.filter((node) => node.category === category)) {
            const marks = [n.deprecated && 'deprecated', n.experimental && 'experimental', n.hidden && 'hidden'].filter(Boolean);
            const needs = n.capabilities.filter((c) => c !== 'browser');
            const desc = [n.description, marks.length ? `*(${marks.join(', ')})*` : '', needs.length ? `Needs: ${needs.join(', ')}.` : ''].filter(Boolean).join(' ');
            lines.push(`| \`${n.type}\` | ${cell(n.title)} | ${cell(desc)} | ${cell(slotsText(n.inputs))} | ${cell(slotsText(n.outputs))} | ${cell(executionText(n.execution))} | ${cell(n.usage)} |`);
        }
        lines.push('');
    }
    return lines.join('\n');
}

/** Writes the reference into `dir`, removing pages of packs that no longer exist. */
export function writeReference({ json, pages }, dir) {
    fs.mkdirSync(dir, { recursive: true });
    for (const file of fs.readdirSync(dir)) {
        if (file.endsWith('.md') && !(file in pages)) fs.rmSync(path.join(dir, file));
    }
    for (const [file, text] of Object.entries(pages)) fs.writeFileSync(path.join(dir, file), text);
    fs.writeFileSync(path.join(dir, 'nodes.json'), JSON.stringify(json, null, 2) + '\n');
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
    const at = process.argv.indexOf('--out');
    const out = path.resolve(at > 0 ? process.argv[at + 1] : path.join(ROOT, 'docs/nodes'));
    for (const level of ['log', 'info', 'debug', 'warn', 'error']) console[level] = () => {};
    const { LiteGraph } = await loadCatalog();
    const reference = await buildReference(LiteGraph);
    writeReference(reference, out);
    process.stdout.write(`node reference: ${reference.json.nodes.length} types, ${reference.json.packs.length} packs → ${path.relative(process.cwd(), out) || '.'}\n`);
    process.exit(0); // library timers (network nodes) must not keep the process alive
}
