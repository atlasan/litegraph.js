#!/usr/bin/env node
// Browser smoke test (USE-09): loads apps/editor/editor_build.html in a headless Firefox through
// WebDriver BiDi and drives it with real pointer and key input: two nodes linked by dragging, a
// node drag, a reroute added from the link menu and dragged, a search box insert with Enter, then
// undo step by step. Every step checks the graph; any page error or failed request fails the run.
// Skips (exit 0) when no Firefox is found. Usage: npm run check:browser [-- --verbose]
// Settings: LG_FIREFOX (the executable), LG_BROWSER_SMOKE=0 (skip), LG_BROWSER_SMOKE=require
// (no Firefox is a failure). Plan: agents/plans/2026-11-25-browser-smoke.md.
import { findFirefox, launchFirefox } from './firefox-bidi.mjs';
import { createEditorApp } from '../../apps/editor/server.js';

const PAGE = '/editor/editor_build.html';
const BLANK = '/__browser-smoke/blank.html';
const VIEWPORT = { width: 1280, height: 800 };
const TOTAL_TIMEOUT_MS = 180000;
const verbose = process.argv.includes('--verbose');
const env = process.env;

const say = (line) => console.log(line);
const debug = (line) => { if (verbose) console.log(`  # ${line}`); };
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ---------- page side ----------

/** Installed in the page once: graph snapshots and graph-to-viewport coordinates. */
const PAGE_HELPER = `(async () => {
    const { LiteGraph } = await import('/src/litegraph.js');
    const round = (v) => Math.round(v);
    const links = () => { const l = graph.links; return (l instanceof Map ? [...l.values()] : Object.values(l ?? {})).filter(Boolean); };
    window.__lgSmoke = {
        LiteGraph,
        links,
        snapshot() {
            return {
                nodes: graph._nodes.map((n) => ({ id: n.id, type: n.type, pos: [round(n.pos[0]), round(n.pos[1])] })).sort((a, b) => a.id - b.id),
                links: links().map((l) => ({ id: l.id, from: [l.origin_id, l.origin_slot], to: [l.target_id, l.target_slot], parentId: l.parentId ?? null })).sort((a, b) => a.id - b.id),
                reroutes: [...(graph.reroutes?.values?.() ?? [])].map((r) => ({ id: r.id, pos: [round(r.pos[0]), round(r.pos[1])], parentId: r.parentId ?? null })).sort((a, b) => a.id - b.id),
            };
        },
        toClient(x, y) {
            const rect = graphcanvas.canvas.getBoundingClientRect();
            const offset = graphcanvas.ds.convertCanvasToOffset([x, y]);
            return [round(rect.left + offset[0]), round(rect.top + offset[1])];
        },
        node(id) { return graph.getNodeById(id); },
        /** where a drag ending at v lands: snapped to the grid when the editor aligns to it, else rounded */
        snap(v) {
            const grid = graph.config?.align_to_grid || graphcanvas.align_to_grid ? LiteGraph.CANVAS_GRID_SIZE : 0;
            return v.map((x) => (grid ? grid * Math.round(x / grid) : Math.round(x)));
        },
        frame() { return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))); },
    };
    return true;
})()`;

/** Loads the built bundles as modules in the page and runs a small graph with each. */
const BUNDLE_CHECK = `(async () => {
    const out = {};
    const core = await import('/build/litegraph.js');
    for (const name of ['LiteGraph', 'LGraph', 'LGraphNode', 'LGraphCanvas', 'LLink']) if (!core[name]) throw new Error('build/litegraph.js: no export ' + name);
    out.core = typeof core.LiteGraph.createNode;
    const full = await import('/build/litegraph.full.js');
    const LG = full.LiteGraph;
    const graph = new full.LGraph();
    const a = LG.createNode('basic/const');
    const b = LG.createNode('basic/watch');
    if (!a || !b) throw new Error('build/litegraph.full.js: basic/const or basic/watch is not registered');
    graph.add(a); graph.add(b);
    a.setProperty?.('value', 42);
    if (!a.connect(0, b, 0)) throw new Error('build/litegraph.full.js: connect failed');
    graph.runStep(1);
    out.full = { types: Object.keys(LG.registered_node_types).length, value: b.value ?? b.properties?.value ?? null };
    return JSON.stringify(out);
})()`;

// ---------- the run ----------

class StepFailure extends Error {}
const expect = (condition, message) => { if (!condition) throw new StepFailure(message); };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const near = (a, b, tolerance = 1) => Math.abs(a[0] - b[0]) <= tolerance && Math.abs(a[1] - b[1]) <= tolerance;

async function main() {
    if (env.LG_BROWSER_SMOKE === '0') { say('browser smoke: skipped: LG_BROWSER_SMOKE=0'); return 0; }
    const found = findFirefox(env);
    if (!found.executable) {
        if (found.configured) { say(`browser smoke: FAIL: ${found.reason}`); return 1; }
        if (env.LG_BROWSER_SMOKE === 'require') { say(`browser smoke: FAIL: ${found.reason} (LG_BROWSER_SMOKE=require)`); return 1; }
        say(`browser smoke: skipped: ${found.reason}`);
        return 0;
    }

    const app = createEditorApp();
    // a blank page for the bundle check: the bundles share one global LiteGraph with the editor page
    app.get(BLANK, (_req, res) => res.type('html').send('<!doctype html><meta charset="utf-8"><title>bundles</title>'));
    const server = app.listen(0, '127.0.0.1');
    await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
    const origin = `http://127.0.0.1:${server.address().port}`;
    let browser = null;
    const pageErrors = [];
    const results = [];
    let failed = false;

    const watchdog = setTimeout(() => {
        say(`browser smoke: FAIL: the run took more than ${TOTAL_TIMEOUT_MS / 1000} s`);
        Promise.resolve(browser?.close()).finally(() => process.exit(1));
    }, TOTAL_TIMEOUT_MS);

    try {
        debug(`firefox: ${found.executable}${found.snap ? ' (snap)' : ''}`);
        const started = Date.now();
        browser = await launchFirefox({ ...found, log: (line) => debug(`firefox: ${line}`) });
        debug(`firefox ${browser.capabilities.browserVersion} ready in ${Date.now() - started} ms`);

        browser.onEvent(({ method, params }) => {
            if (method === 'log.entryAdded') {
                const text = params.text ?? params.args?.map((arg) => arg.value).join(' ') ?? '';
                debug(`page ${params.type}/${params.level}: ${text.slice(0, 300)}`);
                if (params.type === 'javascript' || params.level === 'error') {
                    const where = params.stackTrace?.callFrames?.[0];
                    pageErrors.push(`${params.type === 'javascript' ? 'uncaught' : 'console.error'}: ${text}${where ? ` (${where.url}:${where.lineNumber + 1})` : ''}`);
                }
            } else if (method === 'network.responseCompleted') {
                const { url } = params.request;
                const { status } = params.response;
                if (status >= 400 && url.startsWith(origin) && !url.endsWith('/favicon.ico')) pageErrors.push(`HTTP ${status}: ${url.slice(origin.length)}`);
            } else if (method === 'network.fetchError') {
                if (params.request.url.startsWith(origin)) pageErrors.push(`request failed: ${params.request.url.slice(origin.length)}: ${params.errorText}`);
            }
        });
        await browser.send('session.subscribe', { events: ['log.entryAdded', 'network.responseCompleted', 'network.fetchError'] });
        const { contexts } = await browser.send('browsingContext.getTree', {});
        const context = contexts[0].context;
        await browser.send('browsingContext.setViewport', { context, viewport: VIEWPORT });

        // ----- page helpers -----
        const evaluate = async (expression) => {
            const response = await browser.send('script.evaluate', { expression, target: { context }, awaitPromise: true, resultOwnership: 'none' });
            if (response.type === 'exception') throw new StepFailure(`page script threw: ${response.exceptionDetails.text}`);
            return response.result;
        };
        const json = async (expression) => {
            const result = await evaluate(`(async () => JSON.stringify(await (${expression})))()`);
            return result.value === undefined ? undefined : JSON.parse(result.value);
        };
        const frame = () => evaluate('__lgSmoke.frame()');
        const snapshot = () => json('__lgSmoke.snapshot()');
        const toClient = (pos) => json(`__lgSmoke.toClient(${pos[0]}, ${pos[1]})`);
        const waitFor = async (expression, what, timeoutMs = 5000) => {
            const until = Date.now() + timeoutMs;
            for (;;) {
                const value = await json(expression);
                if (value) return value;
                if (Date.now() > until) throw new StepFailure(`timed out waiting for ${what}`);
                await delay(50);
            }
        };
        const perform = async (actions) => {
            await browser.send('input.performActions', { context, actions });
            await frame();
        };
        const mouse = (list) => perform([{ type: 'pointer', id: 'mouse', parameters: { pointerType: 'mouse' }, actions: list }]);
        const move = (at, duration = 0) => ({ type: 'pointerMove', x: at[0], y: at[1], duration, origin: 'viewport' });
        const drag = (from, to, steps = 8) => mouse([
            move(from), { type: 'pointerDown', button: 0 }, { type: 'pause', duration: 30 },
            ...Array.from({ length: steps }, (_, i) => move([Math.round(from[0] + ((to[0] - from[0]) * (i + 1)) / steps), Math.round(from[1] + ((to[1] - from[1]) * (i + 1)) / steps)], 16)),
            { type: 'pause', duration: 30 }, { type: 'pointerUp', button: 0 },
        ]);
        const click = (at) => mouse([move(at), { type: 'pointerDown', button: 0 }, { type: 'pause', duration: 20 }, { type: 'pointerUp', button: 0 }]);
        const doubleClick = (at) => mouse([
            move(at), { type: 'pointerDown', button: 0 }, { type: 'pointerUp', button: 0 }, { type: 'pause', duration: 60 },
            { type: 'pointerDown', button: 0 }, { type: 'pointerUp', button: 0 },
        ]);
        const keys = (list) => perform([{ type: 'key', id: 'keyboard', actions: list }]);
        const type = (text) => keys([...text].flatMap((value) => [{ type: 'keyDown', value }, { type: 'keyUp', value }]));
        const ENTER = '';
        const CONTROL = '';
        // a human pause: longer than CanvasPointer.double_click_time (300 ms), so the next press on the
        // canvas is not read as the second half of a double click with the previous one
        const pause = () => delay(400);
        const ctrl = (value) => keys([{ type: 'keyDown', value: CONTROL }, { type: 'keyDown', value }, { type: 'keyUp', value }, { type: 'keyUp', value: CONTROL }]);

        // ----- the steps -----
        const states = []; // snapshot after each undoable step, newest last
        let constId = null;
        let watchId = null;
        let insertedType = null;

        const step = async (name, body) => {
            if (failed) { results.push({ name, status: 'skip' }); say(`skip - ${name}`); return; }
            const errorsBefore = pageErrors.length;
            const t0 = Date.now();
            try {
                const detail = await body();
                await frame();
                await delay(50); // late log events
                const errors = pageErrors.slice(errorsBefore);
                expect(errors.length === 0, `page errors:\n    ${errors.join('\n    ')}`);
                results.push({ name, status: 'pass' });
                say(`ok - ${name}${detail ? `: ${detail}` : ''} (${Date.now() - t0} ms)`);
            } catch (error) {
                failed = true;
                results.push({ name, status: 'fail' });
                say(`FAIL - ${name}: ${error instanceof StepFailure ? error.message : error.stack ?? error.message}`);
                const extra = pageErrors.slice(errorsBefore);
                if (extra.length && !(error instanceof StepFailure && /^page errors/.test(error.message))) say(`  page errors:\n    ${extra.join('\n    ')}`);
                try { say(`  graph: ${JSON.stringify(await snapshot())}`); } catch { /* the page may be gone */ }
            }
        };

        await step(`load ${PAGE}`, async () => {
            await browser.send('browsingContext.navigate', { context, url: origin + PAGE, wait: 'complete' }, 60000);
            await waitFor('typeof window.graph === "object" && typeof window.graphcanvas === "object" && graphcanvas.canvas.width > 0', 'the editor (window.graph, window.graphcanvas)', 15000);
            await evaluate(PAGE_HELPER);
            // the page keeps Ctrl+Z off (js/defaults.js); the test turns the action history on
            await evaluate('__lgSmoke.LiteGraph.actionHistory_enabled = true');
            const state = await snapshot();
            expect(state.nodes.length === 0 && state.links.length === 0, `expected an empty graph, got ${state.nodes.length} nodes and ${state.links.length} links`);
            return `Firefox ${browser.capabilities.browserVersion}`;
        });

        await step('built bundles load and run (build/litegraph.js, build/litegraph.full.js)', async () => {
            // in a tab of its own: the full bundle registers every node type into the global
            // LiteGraph, and the editor page would then instantiate them (auto_load_slot_types)
            const { context: tab } = await browser.send('browsingContext.create', { type: 'tab', background: true });
            let result;
            try {
                await browser.send('browsingContext.navigate', { context: tab, url: origin + BLANK, wait: 'complete' });
                const response = await browser.send('script.evaluate', { expression: BUNDLE_CHECK, target: { context: tab }, awaitPromise: true, resultOwnership: 'none' });
                if (response.type === 'exception') throw new StepFailure(`bundle check threw: ${response.exceptionDetails.text}`);
                result = JSON.parse(response.result.value);
            } finally {
                await browser.send('browsingContext.close', { context: tab }).catch(() => {});
            }
            expect(result.full.value === 42, `basic/watch got ${JSON.stringify(result.full.value)} from basic/const, expected 42`);
            return `${result.full.types} node types in the full bundle`;
        });

        await step('create two nodes', async () => {
            [constId, watchId] = await json(`(() => {
                const { LiteGraph } = __lgSmoke;
                const a = LiteGraph.createNode('basic/const'); a.pos = [100, 140]; graph.add(a);
                const b = LiteGraph.createNode('basic/watch'); b.pos = [460, 160]; graph.add(b);
                graphcanvas.setDirty(true, true);
                return [a.id, b.id];
            })()`);
            const state = await snapshot();
            expect(state.nodes.length === 2, `expected 2 nodes, got ${state.nodes.length}`);
            states.push(state);
        });

        await step('link them by dragging output to input', async () => {
            const [from, to] = await json(`[Array.from(__lgSmoke.node(${constId}).getConnectionPos(false, 0)), Array.from(__lgSmoke.node(${watchId}).getConnectionPos(true, 0))]`);
            await drag(await toClient(from), await toClient(to));
            const state = await snapshot();
            expect(state.links.length === 1, `expected 1 link, got ${state.links.length}`);
            const [link] = state.links;
            expect(same(link.from, [constId, 0]) && same(link.to, [watchId, 0]), `the link goes ${JSON.stringify(link.from)} -> ${JSON.stringify(link.to)}`);
            states.push(state);
        });

        await step('drag a node by its title', async () => {
            const [pos, titleHeight] = await json(`[Array.from(__lgSmoke.node(${watchId}).pos), __lgSmoke.LiteGraph.NODE_TITLE_HEIGHT]`);
            const grab = [pos[0] + 40, pos[1] - titleHeight / 2];
            const delta = [120, 160];
            await drag(await toClient(grab), await toClient([grab[0] + delta[0], grab[1] + delta[1]]));
            const state = await snapshot();
            const moved = state.nodes.find((n) => n.id === watchId).pos;
            const target = await json(`__lgSmoke.snap([${pos[0] + delta[0]}, ${pos[1] + delta[1]}])`);
            expect(same(moved, target), `node at ${JSON.stringify(moved)}, expected ${JSON.stringify(target)}`);
            expect(same(state.nodes.find((n) => n.id === constId).pos, states.at(-1).nodes.find((n) => n.id === constId).pos), 'the other node moved too');
            states.push(state);
        });

        await step('add a reroute from the link menu', async () => {
            const center = await waitFor('(() => { const l = __lgSmoke.links()[0]; return l?._pos ? [l._pos[0], l._pos[1]] : null; })()', 'the link center marker');
            await click(await toClient(center));
            const entry = await waitFor(`(() => {
                const item = [...document.querySelectorAll('.litecontextmenu .litemenu-entry')].find((e) => e.textContent.trim() === 'Add Reroute');
                if (!item) return null;
                const r = item.getBoundingClientRect();
                const at = [Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2)];
                // the menu ignores the pointer for its first 100 ms (pointer-events: none)
                return item.contains(document.elementFromPoint(at[0], at[1])) ? at : null;
            })()`, 'the link menu with "Add Reroute"');
            await click(entry);
            const state = await snapshot();
            expect(state.reroutes.length === 1, `expected 1 reroute, got ${state.reroutes.length}`);
            expect(state.links[0].parentId === state.reroutes[0].id, `the link's parentId is ${state.links[0].parentId}, the reroute is ${state.reroutes[0].id}`);
            expect(await json('!document.querySelector(".litecontextmenu")'), 'the link menu stayed open');
            states.push(state);
        });

        await step('drag the reroute', async () => {
            const before = await json('Array.from(graph.reroutes.values().next().value.pos)');
            const delta = [-40, 110];
            await pause(); // the reroute sits where the link center was clicked
            await drag(await toClient(before), await toClient([before[0] + delta[0], before[1] + delta[1]]));
            const state = await snapshot();
            const pos = state.reroutes[0]?.pos;
            const target = await json(`__lgSmoke.snap([${before[0] + delta[0]}, ${before[1] + delta[1]}])`);
            expect(pos && same(pos, target), `reroute at ${JSON.stringify(pos)}, expected ${JSON.stringify(target)}`);
            expect(same(state.nodes, states.at(-1).nodes), 'nodes moved with the reroute');
            states.push(state);
        });

        await step('search box: double click, type, insert with Enter', async () => {
            const at = [180, 520];
            await pause();
            await doubleClick(await toClient(at));
            await waitFor('!!document.querySelector(".litesearchbox input")', 'the search box');
            const focused = await json('document.activeElement === document.querySelector(".litesearchbox input")');
            expect(focused, `the search input does not have the focus (focus on ${await json('document.activeElement?.tagName + "." + document.activeElement?.className')})`);
            await type('watch');
            await delay(400); // the result list refreshes 250 ms after the last key
            insertedType = await waitFor(`(() => {
                const item = document.querySelector('.litesearchbox .lite-search-item.selected') ?? document.querySelector('.litesearchbox .lite-search-item');
                return item ? unescape(item.dataset.type) : null;
            })()`, 'search results');
            await keys([{ type: 'keyDown', value: ENTER }, { type: 'keyUp', value: ENTER }]);
            await waitFor('!document.querySelector(".litesearchbox")', 'the search box to close');
            const state = await snapshot();
            expect(state.nodes.length === 3, `expected 3 nodes, got ${state.nodes.length}`);
            const added = state.nodes.find((n) => !states.at(-1).nodes.some((m) => m.id === n.id));
            expect(added?.type === insertedType, `inserted ${added?.type}, the first result was ${insertedType}`);
            expect(near(added.pos, at, 40), `inserted at ${JSON.stringify(added.pos)}, expected near ${JSON.stringify(at)}`);
            states.push(state);
            return added.type;
        });

        const labels = ['the search insert', 'the reroute drag', 'the reroute', 'the node drag', 'the link'];
        await step(`undo with Ctrl+Z, ${labels.length} times`, async () => {
            await pause();
            await click(await toClient([900, 700])); // empty canvas: gives the canvas the key focus
            expect(same(await snapshot(), states.at(-1)), 'a click on empty canvas changed the graph');
            for (let i = 0; i < labels.length; i++) {
                await ctrl('z');
                const expected = states[states.length - 2 - i];
                const state = await snapshot();
                expect(same(state, expected), `undo ${i + 1} (${labels[i]}):\n    got      ${JSON.stringify(state)}\n    expected ${JSON.stringify(expected)}`);
            }
        });
    } catch (error) {
        failed = true;
        say(`FAIL - ${error.stack ?? error.message}`);
    } finally {
        clearTimeout(watchdog);
        await browser?.close();
        server.closeAllConnections?.();
        await new Promise((resolve) => server.close(resolve));
    }

    const passed = results.filter((r) => r.status === 'pass').length;
    const total = results.length;
    say(`browser smoke: ${passed}/${total} passed${failed ? ' FAIL' : ''} (firefox ${browser?.capabilities?.browserVersion ?? 'n/a'})`);
    return failed ? 1 : 0;
}

process.exitCode = await main();
