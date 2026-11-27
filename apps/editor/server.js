// Editor and tester dev server (npm run editor, lg start editor): serves the repository paths the
// pages load, read-only. Runs on Node and Bun, from any working directory.
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { localBuildRoot } from "../../tools/local-build.mjs";

const root = path.resolve(fileURLToPath(new URL("../../", import.meta.url)));
const serve = (directory) => express.static(path.join(root, directory));

export function createEditorApp() {
    const app = express();
    app.use('/css', serve('css'));
    app.use('/src', serve('src'));
    app.use('/build', express.static(path.join(localBuildRoot, 'build')), serve('build'));
    app.use('/external', serve('external'));
    app.use('/vendor', serve('vendor'));
    app.use('/docs', serve('docs')); // the generated API (docs/api/) and the reference pages
    // the apps live in apps/; their old URLs (/editor/..., /editor_tester/...) keep working
    app.use('/apps/editor', serve('apps/editor'));
    app.use('/apps/tester', serve('apps/tester'));
    app.use('/editor_tester', serve('apps/tester'));
    app.use('/editor', serve('apps/editor'));
    app.use('/', serve('apps/editor'));
    return app;
}

// started directly (node/bun apps/editor/server.js, nodemon, lg), not imported; paths compare case-insensitively on Windows
const same = (a, b) => process.platform === "win32" ? a.toLowerCase() === b.toLowerCase() : a === b;
if (process.argv[1] && same(path.resolve(process.argv[1]), fileURLToPath(import.meta.url))) {
    // PORT picks another port (for example when a second checkout already serves 8000)
    const port = Number(process.env.PORT) || 8000;
    createEditorApp().listen(port, '127.0.0.1', () => console.log(`Simple server running on http://127.0.0.1:${port}`));
}
