// The browser smoke test's plumbing (tools/browser): finding Firefox, the snap profile rule, the
// skip and require switches. The smoke test itself runs in npm run check (check:browser).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { findFirefox, isSnapFirefox, freePort, PROFILE_PREFS } from '../browser/firefox-bidi.mjs';

const SMOKE = fileURLToPath(new URL('../browser/smoke.mjs', import.meta.url));
const posix = process.platform !== 'win32';
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'litegraph-browser-'));
test.after(() => fs.rmSync(tempRoot, { recursive: true, force: true }));

function fakeExecutable(dir, name, body = '#!/bin/sh\nexit 0\n') {
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, name);
    fs.writeFileSync(file, body);
    fs.chmodSync(file, 0o755);
    return file;
}

test('findFirefox: LG_FIREFOX first, then the PATH in name order; a wrong LG_FIREFOX is reported as configured', { skip: !posix }, () => {
    const bin = path.join(tempRoot, 'bin');
    const esr = fakeExecutable(bin, 'firefox-esr');
    assert.deepEqual(findFirefox({ PATH: bin }, 'linux'), { executable: esr, snap: false });
    const plain = fakeExecutable(path.join(tempRoot, 'bin2'), 'firefox');
    assert.equal(findFirefox({ PATH: [bin, path.dirname(plain)].join(path.delimiter) }, 'linux').executable, plain, '"firefox" wins over "firefox-esr"');
    assert.equal(findFirefox({ PATH: bin, LG_FIREFOX: plain }, 'linux').executable, plain);

    const missing = findFirefox({ PATH: bin, LG_FIREFOX: path.join(tempRoot, 'nope') }, 'linux');
    assert.equal(missing.executable, null);
    assert.equal(missing.configured, true);
    assert.match(missing.reason, /LG_FIREFOX=.*nope is not an executable file/);

    const none = findFirefox({ PATH: path.join(tempRoot, 'empty') }, 'linux');
    assert.equal(none.executable, null);
    assert.equal(none.configured, undefined);
    assert.match(none.reason, /no Firefox found on PATH.*LG_FIREFOX/);
});

test('isSnapFirefox: a /snap path or the Ubuntu wrapper script that runs /snap/bin/firefox', { skip: !posix }, () => {
    const wrapper = fakeExecutable(path.join(tempRoot, 'snapbin'), 'firefox', '#!/bin/sh\nif ! [ -x /snap/bin/firefox ]; then exit 1; fi\nexec /snap/bin/firefox "$@"\n');
    assert.equal(isSnapFirefox(wrapper), true);
    assert.equal(isSnapFirefox(fakeExecutable(path.join(tempRoot, 'plainbin'), 'firefox')), false);
    assert.equal(isSnapFirefox(path.join(tempRoot, 'does-not-exist')), false);
});

test('freePort and the profile preferences', async () => {
    const port = await freePort();
    assert.ok(Number.isInteger(port) && port > 0 && port < 65536);
    assert.equal(PROFILE_PREFS['app.update.auto'], false);
    assert.match(PROFILE_PREFS['services.settings.server'], /^data:/, 'no remote settings traffic');
});

test('smoke.mjs: LG_BROWSER_SMOKE=0 skips, no Firefox skips, require and a wrong LG_FIREFOX fail', { skip: !posix, timeout: 60000 }, () => {
    const run = (env) => spawnSync(process.execPath, [SMOKE], { encoding: 'utf8', env: { HOME: os.homedir(), PATH: path.join(tempRoot, 'empty'), ...env } });
    let result = run({ LG_BROWSER_SMOKE: '0' });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /^browser smoke: skipped: LG_BROWSER_SMOKE=0$/m);

    result = run({});
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /^browser smoke: skipped: no Firefox found on PATH/m);

    result = run({ LG_BROWSER_SMOKE: 'require' });
    assert.equal(result.status, 1);
    assert.match(result.stdout, /^browser smoke: FAIL: no Firefox found .*\(LG_BROWSER_SMOKE=require\)$/m);

    result = run({ LG_FIREFOX: path.join(tempRoot, 'nope') });
    assert.equal(result.status, 1);
    assert.match(result.stdout, /^browser smoke: FAIL: LG_FIREFOX=.* is not an executable file$/m);
});
