// Sources are ES modules, so they run in strict mode: reading or assigning a name that
// was never declared throws a ReferenceError the first time that code path runs.
// `no-undef` is an error in eslint.config.js (browser, Node and provided globals declared there);
// this test keeps it on and keeps src/ clean, so the regression tests of #361 stay meaningful.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { loadESLint } from 'eslint';

const root = fileURLToPath(new URL('../../', import.meta.url));
// ESLint 8 defaults to eslintrc; the repository uses the flat config (eslint.config.js).
const FlatESLint = await loadESLint({ useFlatConfig: true });

test('the lint config reports undeclared names as errors', async () => {
    const eslint = new FlatESLint({ cwd: root });
    const config = await eslint.calculateConfigForFile('src/lgraph.js');
    const level = config.rules['no-undef'];
    assert.equal(Array.isArray(level) ? level[0] : level, 2);
    const [probe] = await eslint.lintText('export const f = () => notDeclaredAnywhere;', { filePath: 'src/probe.js' });
    assert.ok(probe.messages.some((m) => m.ruleId === 'no-undef'));
});

test('sources only use declared names', async () => {
    const eslint = new FlatESLint({ cwd: root });
    const results = await eslint.lintFiles(['src']);
    const problems = results.flatMap((r) => r.messages
        .filter((m) => m.ruleId === 'no-undef')
        .map((m) => `${r.filePath.slice(root.length)}:${m.line} ${m.message}`));
    assert.deepEqual(problems, []);
});
