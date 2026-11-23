import { jest } from '@jest/globals';
import { LiteGraph } from '../src/litegraph.js';

// Library state in the node UI (fork inventory §4): a node waiting for its libraries, or whose
// libraries failed, shows a badge; the setting LiteGraph.Node.LibraryBadge hides it.

beforeAll(async () => {
    LiteGraph.initialize();
    await LiteGraph.LibraryManager.ready;
});
afterEach(() => {
    jest.restoreAllMocks();
    LiteGraph.settings.set('LiteGraph.Node.LibraryBadge', true);
});

function deferredLibrary() {
    let resolve;
    let reject;
    const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
    jest.spyOn(LiteGraph.LibraryManager, 'loadLibrary').mockReturnValue(promise);
    return { resolve, reject };
}

function libraryNode(type) {
    class NeedsLib { constructor() { this.requiredLibraries = ['some-lib']; } }
    LiteGraph.registerNodeType(type, NeedsLib);
    return LiteGraph.createNode(type);
}

const libraryBadges = (node) => LiteGraph.nodeBadges.collect(node).filter((b) => /librar/.test(b.text));

test('a node shows a badge while its libraries load, and none once they are loaded', async () => {
    const lib = deferredLibrary();
    const node = libraryNode('libbadge/loading');
    expect(libraryBadges(node).map((b) => b.text)).toEqual(['loading libraries']);
    lib.resolve();
    await node.ready;
    expect(libraryBadges(node)).toEqual([]);
});

test('a node whose libraries failed shows an error badge with the message', async () => {
    const lib = deferredLibrary();
    const node = libraryNode('libbadge/failed');
    lib.reject(new Error('some-lib: 404'));
    await expect(node.ready).rejects.toThrow('404');
    const [badge] = libraryBadges(node);
    expect(badge.text).toBe('library error');
    expect(badge.title).toContain('some-lib: 404');
});

test('the setting LiteGraph.Node.LibraryBadge hides the badges', () => {
    deferredLibrary();
    const node = libraryNode('libbadge/hidden');
    LiteGraph.settings.set('LiteGraph.Node.LibraryBadge', false);
    expect(libraryBadges(node)).toEqual([]);
});
