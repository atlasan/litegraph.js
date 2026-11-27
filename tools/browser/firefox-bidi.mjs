// A minimal WebDriver BiDi client for a headless Firefox: no dependencies (Node 22's WebSocket).
// Finds Firefox, starts it on a throwaway profile, sends commands, collects events, closes it.
// Used by tools/browser/smoke.mjs (npm run check:browser). Plan: agents/plans/2026-11-25-browser-smoke.md.
import fs from 'node:fs';
import os from 'node:os';
import net from 'node:net';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';

const CANDIDATES = ['firefox', 'firefox-esr', 'firefox-developer-edition', 'firefox-nightly'];
const MAC_APP = '/Applications/Firefox.app/Contents/MacOS/firefox';
const WINDOWS_APPS = ['Mozilla Firefox/firefox.exe', 'Firefox Developer Edition/firefox.exe', 'Firefox Nightly/firefox.exe'];

/** Profile preferences: no first-run pages, updates, telemetry or remote settings traffic. */
export const PROFILE_PREFS = {
    'app.update.auto': false,
    'app.update.disabledForTesting': true,
    'browser.shell.checkDefaultBrowser': false,
    'browser.startup.homepage_override.mstone': 'ignore',
    'browser.startup.page': 0,
    'browser.newtabpage.enabled': false,
    'browser.aboutwelcome.enabled': false,
    'browser.tabs.warnOnClose': false,
    'browser.sessionstore.resume_from_crash': false,
    'datareporting.policy.dataSubmissionEnabled': false,
    'datareporting.healthreport.uploadEnabled': false,
    'toolkit.telemetry.reportingpolicy.firstRun': false,
    'toolkit.startup.max_resumed_crashes': -1,
    'services.settings.server': 'data:,#remote-settings-disabled',
    'network.captive-portal-service.enabled': false,
    'network.connectivity-service.enabled': false,
    'extensions.update.enabled': false,
    'extensions.getAddons.cache.enabled': false,
    'dom.disable_open_during_load': false,
    'ui.prefersReducedMotion': 1,
};

const isExecutable = (file) => {
    try { fs.accessSync(file, fs.constants.X_OK); return fs.statSync(file).isFile(); } catch { return false; }
};

/**
 * A snap-packaged Firefox (Ubuntu) runs confined: it cannot see the host's /tmp or hidden
 * directories in $HOME, so its profile goes under ~/snap/firefox/common.
 */
export function isSnapFirefox(file) {
    let real = file;
    try { real = fs.realpathSync(file); } catch { /* keep the given path */ }
    if (real.startsWith('/snap/')) return true;
    try {
        if (fs.statSync(real).size > 16384) return false;
        return /\/snap\/bin\/firefox/.test(fs.readFileSync(real, 'utf8'));
    } catch { return false; }
}

/**
 * Finds Firefox: `LG_FIREFOX` (a path), else the PATH, else the usual install places.
 * Returns {executable, snap} or {executable: null, reason}; `configured` when LG_FIREFOX is wrong.
 */
export function findFirefox(env = process.env, platform = process.platform) {
    if (env.LG_FIREFOX) {
        if (!isExecutable(env.LG_FIREFOX)) return { executable: null, configured: true, reason: `LG_FIREFOX=${env.LG_FIREFOX} is not an executable file` };
        return { executable: env.LG_FIREFOX, snap: isSnapFirefox(env.LG_FIREFOX) };
    }
    const dirs = (env.PATH ?? '').split(path.delimiter).filter(Boolean);
    const suffix = platform === 'win32' ? '.exe' : '';
    for (const name of CANDIDATES) {
        for (const dir of dirs) {
            const file = path.join(dir, name + suffix);
            if (isExecutable(file)) return { executable: file, snap: isSnapFirefox(file) };
        }
    }
    const extra = platform === 'darwin' ? [MAC_APP]
        : platform === 'win32' ? WINDOWS_APPS.flatMap((app) => [env.ProgramFiles, env['ProgramFiles(x86)']].filter(Boolean).map((root) => path.join(root, app)))
            : [];
    for (const file of extra) if (isExecutable(file)) return { executable: file, snap: false };
    return { executable: null, reason: 'no Firefox found on PATH (firefox, firefox-esr); set LG_FIREFOX=/path/to/firefox' };
}

/** A free TCP port on 127.0.0.1. */
export function freePort() {
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.unref();
        server.on('error', reject);
        server.listen(0, '127.0.0.1', () => {
            const { port } = server.address();
            server.close(() => resolve(port));
        });
    });
}

function profileDir(snap) {
    const base = snap ? path.join(os.homedir(), 'snap', 'firefox', 'common') : os.tmpdir();
    fs.mkdirSync(base, { recursive: true });
    const dir = path.join(base, `lg-browser-smoke-${process.pid}-${crypto.randomBytes(4).toString('hex')}`);
    fs.mkdirSync(dir);
    const prefs = Object.entries(PROFILE_PREFS).map(([key, value]) => `user_pref(${JSON.stringify(key)}, ${JSON.stringify(value)});`);
    fs.writeFileSync(path.join(dir, 'user.js'), prefs.join('\n') + '\n');
    return dir;
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** A BiDi error response, with the command that failed. */
export class BidiError extends Error {
    constructor(method, response) {
        super(`${method}: ${response.error}: ${response.message}`);
        this.error = response.error;
    }
}

/**
 * Starts Firefox headless with WebDriver BiDi and opens a session.
 * @param {object} o  executable, snap, startTimeoutMs (60 s), log (stderr lines; default ignored)
 * @returns {Promise<Firefox>}
 */
export async function launchFirefox({ executable, snap = false, startTimeoutMs = 60000, log = () => {} }) {
    const profile = profileDir(snap);
    const port = await freePort();
    const child = spawn(executable, ['--headless', '--no-remote', '--profile', profile, `--remote-debugging-port=${port}`, 'about:blank'], {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, MOZ_HEADLESS: '1', MOZ_CRASHREPORTER_DISABLE: '1' },
    });
    const browser = new Firefox(child, profile);
    try {
        const url = await new Promise((resolve, reject) => {
            let buffer = '';
            const timer = setTimeout(() => reject(new Error(`Firefox did not start WebDriver BiDi within ${startTimeoutMs / 1000} s`)), startTimeoutMs);
            const onData = (chunk) => {
                buffer += chunk;
                let newline;
                while ((newline = buffer.indexOf('\n')) >= 0) {
                    const line = buffer.slice(0, newline);
                    buffer = buffer.slice(newline + 1);
                    log(line);
                    const match = line.match(/WebDriver BiDi listening on (ws:\/\/\S+)/);
                    if (match) { clearTimeout(timer); resolve(match[1]); }
                }
            };
            child.stdout.setEncoding('utf8').on('data', onData);
            child.stderr.setEncoding('utf8').on('data', onData);
            child.on('error', (error) => { clearTimeout(timer); reject(error); });
            child.on('exit', (code, signal) => { clearTimeout(timer); reject(new Error(`Firefox exited before WebDriver BiDi started (${signal ?? `exit ${code}`})`)); });
        });
        await browser.connect(`${url.replace(/\/$/, '')}/session`);
        const { capabilities } = await browser.send('session.new', { capabilities: { alwaysMatch: { acceptInsecureCerts: false, unhandledPromptBehavior: { default: 'dismiss' } } } });
        browser.capabilities = capabilities;
        return browser;
    } catch (error) {
        await browser.close();
        throw error;
    }
}

export class Firefox {
    constructor(child, profile) {
        this.child = child;
        this.profile = profile;
        this.exited = new Promise((resolve) => child.once('exit', resolve));
        this.socket = null;
        this.nextId = 0;
        this.pending = new Map();
        this.listeners = new Set();
        this.capabilities = null;
    }

    connect(url) {
        return new Promise((resolve, reject) => {
            const socket = new WebSocket(url);
            socket.onopen = () => { this.socket = socket; resolve(); };
            socket.onerror = () => reject(new Error(`cannot connect to ${url}`));
            socket.onclose = () => {
                for (const { reject: fail, method } of this.pending.values()) fail(new Error(`${method}: the BiDi connection closed`));
                this.pending.clear();
            };
            socket.onmessage = (event) => {
                const message = JSON.parse(event.data);
                if (message.id !== undefined && this.pending.has(message.id)) {
                    const { resolve: done, reject: fail, method } = this.pending.get(message.id);
                    this.pending.delete(message.id);
                    if (message.type === 'error') fail(new BidiError(method, message));
                    else done(message.result);
                } else if (message.type === 'event') {
                    for (const listener of this.listeners) listener(message);
                }
            };
        });
    }

    /** Sends a command; resolves with its result, rejects with a BidiError. */
    send(method, params = {}, timeoutMs = 30000) {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return Promise.reject(new Error(`${method}: not connected`));
        const id = ++this.nextId;
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => { this.pending.delete(id); reject(new Error(`${method}: no answer within ${timeoutMs / 1000} s`)); }, timeoutMs);
            this.pending.set(id, {
                method,
                resolve: (value) => { clearTimeout(timer); resolve(value); },
                reject: (error) => { clearTimeout(timer); reject(error); },
            });
            this.socket.send(JSON.stringify({ id, method, params }));
        });
    }

    /** Calls listener({method, params}) for every event; returns the unsubscribe function. */
    onEvent(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    /**
     * Ends the session and Firefox: browser.close first (a confined snap Firefox may refuse
     * signals from the caller), then SIGTERM and SIGKILL. Removes the profile. Never throws.
     */
    async close() {
        const running = () => this.child.exitCode === null && this.child.signalCode === null;
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            await this.send('browser.close', {}, 5000).catch(() => {});
            try { this.socket.close(); } catch { /* already closed */ }
        }
        for (const signal of [null, 'SIGTERM', 'SIGKILL']) {
            if (!running()) break;
            if (signal) { try { this.child.kill(signal); } catch { /* not ours to signal */ } }
            await Promise.race([this.exited, delay(5000)]);
        }
        if (running()) process.emitWarning(`Firefox (pid ${this.child.pid}) did not exit; profile ${this.profile} kept`);
        else {
            for (let attempt = 0; attempt < 5; attempt++) {
                try { fs.rmSync(this.profile, { recursive: true, force: true }); break; } catch { await delay(200); }
            }
        }
        this.child.stdout?.destroy();
        this.child.stderr?.destroy();
    }
}
