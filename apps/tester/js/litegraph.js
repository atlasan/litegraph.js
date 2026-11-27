// Browser requests use the editor's /build route. Node integration tests load the same local bundle.
let bundle;
if (globalThis.process?.versions?.node) {
    const { bundlePath } = await import('../../../tools/local-build.mjs');
    const { pathToFileURL } = await import('node:url');
    bundle = await import(pathToFileURL(bundlePath('build/litegraph.js')).href);
} else {
    bundle = await import('../../../build/litegraph.js');
}

export const { LiteGraph } = bundle;
