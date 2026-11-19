import test from 'node:test';
import assert from 'node:assert/strict';
import { LibraryManager } from '../../src/librarymanager.js';

const descriptor = (extra = {}) => ({ key: 'fixture', localPaths: [], remoteUrls: [], npmPackages: [], serverRemoteUrls: [], ...extra });

test('concurrent library callers share loading and each receive their callback', async () => {
    const manager = new LibraryManager();
    manager.registerLibrary({ key: 'fixture', server: { npm: 'node:path' } });
    let loads = 0;
    manager.loadServerLibrary = async () => { loads++; return ['loaded']; };
    const callbacks = [];
    const [a, b] = await Promise.all([
        manager.loadLibrary('fixture', (value) => callbacks.push(value)),
        manager.loadLibrary('fixture', (value) => callbacks.push(value)),
    ]);
    assert.equal(loads, 1);
    assert.equal(a, b);
    assert.equal(callbacks.length, 2);
    assert.equal(manager.getLibraryState('fixture'), 'loaded');
    assert.deepEqual(manager.libraries_to_load, []);
    assert.equal(await manager.loadLibrary('fixture'), a);
});

test('missing or partly available dependencies fail and can be retried', async () => {
    const manager = new LibraryManager();
    await assert.rejects(manager.loadLibrary('unregistered'), /not registered/);
    manager.registerLibrary({ key: 'fixture', server: { npm: ['node:path', 'litegraph-missing-test-dependency'] } });
    await assert.rejects(manager.loadLibrary('fixture'), /Could not load server library/);
    assert.equal(manager.getLibraryState('fixture'), 'error');
    assert.equal(manager.loading_promises.fixture, undefined);
    assert.deepEqual(manager.libraries_to_load, []);
    manager.libraries_known.fixture.npmPackages = ['node:path'];
    const result = await manager.loadLibrary('fixture');
    assert.equal(typeof result[0].join, 'function');
    assert.equal(manager.getLibraryState('fixture'), 'loaded');
});

test('default and named exports are selected before publishing the global', async () => {
    const manager = new LibraryManager();
    manager.registerLibrary({ key: 'default-path', globalObject: '__testDefaultPath', defaultExport: true, server: { npm: 'node:path' } });
    manager.registerLibrary({ key: 'named-path', globalObject: '__testJoin', defaultExport: 'join', server: { npm: 'node:path' } });
    try {
        await manager.loadLibrary('default-path');
        await manager.loadLibrary('named-path');
        assert.equal(typeof globalThis.__testDefaultPath.join, 'function');
        assert.equal(typeof globalThis.__testJoin, 'function');
    } finally {
        delete globalThis.__testDefaultPath;
        delete globalThis.__testJoin;
    }
});

test('browser dependency lists load in order and fall back after local failure', async () => {
    const manager = new LibraryManager();
    const calls = [];
    manager.loadScript = async (url) => { calls.push(url); if (url === 'missing') throw new Error('missing'); return url; };
    assert.deepEqual(await manager.loadBrowserLibrary(descriptor({ localPaths: ['one', 'two'] })), ['one', 'two']);
    assert.deepEqual(calls, ['one', 'two']);
    calls.length = 0;
    assert.deepEqual(await manager.loadBrowserLibrary(descriptor({ localPaths: ['missing'], remoteUrls: ['cdn-one', 'cdn-two'] })), ['cdn-one', 'cdn-two']);
    assert.deepEqual(calls, ['missing', 'cdn-one', 'cdn-two']);
    await assert.rejects(manager.loadBrowserLibrary(descriptor({ remoteUrls: ['missing'] })), /Could not load browser library/);
    await assert.rejects(manager.loadServerLibrary(descriptor({ remoteUrls: ['browser-only'] })), /not available on the server/);
});

test('browser module loading waits for evaluation and propagates import failures', async () => {
    const manager = new LibraryManager();
    await manager.ready;
    const previous = globalThis.document;
    globalThis.document = { baseURI: 'https://example.invalid/' };
    manager.isESModule = async () => true;
    try {
        const value = await manager.loadScript('data:text/javascript,await Promise.resolve(); export const answer = 42;', '__testModule');
        assert.equal(value.answer, 42);
        assert.equal(globalThis.__testModule.answer, 42);
        await assert.rejects(manager.loadScript('data:text/javascript,throw new Error("module failed"); export const value = 1;', '__testFailed'), /module failed/);
        assert.equal(globalThis.__testFailed, undefined);
    } finally {
        if (previous === undefined) delete globalThis.document;
        else globalThis.document = previous;
        delete globalThis.__testModule;
    }
});

test('waitForLib starts loading, surfaces errors, and unload works without a DOM', async () => {
    const manager = new LibraryManager();
    manager.registerLibrary({ key: 'fixture', globalObject: '__testWaitPath', server: { npm: 'node:path' } });
    try {
        assert.equal(typeof (await manager.waitForLib('fixture')).join, 'function');
        manager.unloadLibrary('fixture');
        assert.equal(manager.getLibraryState('fixture'), 'not_loaded');
        await assert.rejects(manager.waitForLib('missing'), /not registered/);
        manager.loadServerLibrary = async () => { throw new Error('offline'); };
        await assert.rejects(manager.waitForLib('fixture'), /offline/);
        assert.equal(manager.areAllLibrariesLoaded(), false);
    } finally { delete globalThis.__testWaitPath; }
});

test('npm install specs are validated and never reach a shell', async () => {
    const ok = ['ws', 'socket.io-client', '@scope/pkg', 'osc-js@2.4.1', 'pkg@^1.2.3', 'pkg@latest', 'pkg@1.x'];
    const bad = ['ws; rm -rf ~', '$(id)', '`id`', 'a && b', '--registry=http://evil', '../local', 'git+https://x/y.git', 'https://x/y.tgz', 'pkg@1 || 2', 'pkg@>1', 'Upper', ''];
    for (const spec of ok) assert.equal(LibraryManager.isSafePackageSpec(spec), true, spec);
    for (const spec of bad) assert.equal(LibraryManager.isSafePackageSpec(spec), false, spec);
    const manager = new LibraryManager();
    manager.registerLibrary({ key: 'evil', server: { npm: 'ws; touch /tmp/pwned' } });
    await assert.rejects(manager.npmInstall('evil'), /unsafe package spec/);
});

test('remote server code is refused unless explicitly allowed', async () => {
    const manager = new LibraryManager();
    await manager.ready;
    await assert.rejects(manager.loadServerRemoteScript('https://example.invalid/lib.js'), /Refusing to evaluate remote server code/);
});

test('waitAllLibrariesLoaded settles on success, rejects on failure and on timeout', async () => {
    const manager = new LibraryManager();
    manager.registerLibrary({ key: 'good', server: { npm: 'node:path' } });
    manager.registerLibrary({ key: 'bad', server: { npm: 'node:path' } });
    await manager.waitAllLibrariesLoaded();
    const loading = manager.loadLibrary('good');
    await manager.waitAllLibrariesLoaded();
    await loading;
    manager.loadServerLibrary = async () => { throw new Error('offline'); };
    manager.loadLibrary('bad').catch(() => {});
    await assert.rejects(manager.waitAllLibrariesLoaded(), /Libraries failed to load: bad/);
    manager.libraries_state.bad = 'not_loaded';
    manager.loadServerLibrary = () => new Promise(() => {});
    manager.loadLibrary('bad').catch(() => {});
    await assert.rejects(manager.waitAllLibrariesLoaded({ timeout: 30 }), /still loading after 30ms: bad/);
});

test('describeLibraries lists the manifest; probeLibraries reports missing npm packages without loading', async () => {
    const manager = new LibraryManager();
    manager.registerLibrary({ key: 'path-lib', version: '1', globalObject: '__probePath', description: 'node path', server: { npm: 'node:path' }, browser: { remote: 'https://example.invalid/p.js' } });
    manager.registerLibrary({ key: 'gone', optional: false, server: { npm: 'litegraph-missing-probe-dependency' } });
    manager.registerLibrary({ key: 'browser-only', browser: { local: 'x.js' } });
    const manifest = manager.describeLibraries();
    assert.deepEqual(manifest.find((entry) => entry.key === 'path-lib'), {
        key: 'path-lib', version: '1', globalObject: '__probePath', description: 'node path', optional: true,
        browser: { local: [], remote: ['https://example.invalid/p.js'] }, server: { npm: ['node:path'], remote: [] }, state: 'not_loaded',
    });
    assert.equal(manifest.find((entry) => entry.key === 'gone').optional, false);
    const probe = await manager.probeLibraries();
    const byKey = Object.fromEntries(probe.map((entry) => [entry.key, entry]));
    assert.equal(byKey['path-lib'].available, true);
    assert.deepEqual(byKey.gone.missing, ['litegraph-missing-probe-dependency']);
    assert.equal(byKey.gone.available, false);
    assert.equal(byKey['browser-only'].available, null);
    assert.equal(manager.getLibraryState('path-lib'), 'not_loaded', 'probing does not load');
    assert.equal(globalThis.__probePath, undefined);
    assert.equal((await manager.probeLibraries(['nope']))[0].error, 'not registered');
});
