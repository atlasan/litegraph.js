// Terminal output: colours that switch off cleanly, symbols with an ASCII fallback, a small table.

/**
 * Whether to colour output. Order: --color/--no-color, NO_COLOR (non-empty: off), FORCE_COLOR
 * (0 off, anything else on), TERM=dumb (off), else colour only on a TTY.
 */
export function useColor({ option = null, env = process.env, isTTY = Boolean(process.stdout.isTTY) } = {}) {
  if (option !== null) return option;
  if (env.NO_COLOR) return false; // no-color.org: any non-empty value
  if (env.FORCE_COLOR !== undefined && env.FORCE_COLOR !== '') return env.FORCE_COLOR !== '0' && env.FORCE_COLOR !== 'false';
  if (env.TERM === 'dumb') return false;
  return isTTY;
}

/**
 * Unicode symbols, except on Windows consoles that may lack them (the classic conhost); Windows
 * Terminal (WT_SESSION) and VS Code (TERM_PROGRAM) get Unicode.
 */
export function useUnicode({ env = process.env, platform = process.platform } = {}) {
  if (env.LG_ASCII) return false;
  if (platform !== 'win32') return env.TERM !== 'linux';
  return Boolean(env.WT_SESSION || env.TERM_PROGRAM || env.ConEmuANSI === 'ON');
}

const CODES = { bold: [1, 22], dim: [2, 22], red: [31, 39], green: [32, 39], yellow: [33, 39], blue: [34, 39], magenta: [35, 39], cyan: [36, 39], gray: [90, 39] };

/** A painter: `t.green('ok')`; identity functions when colour is off. */
export function painter(enabled) {
  const paint = {};
  for (const [name, [open, close]] of Object.entries(CODES)) {
    paint[name] = enabled ? (text) => `\x1b[${open}m${text}\x1b[${close}m` : (text) => String(text);
  }
  return paint;
}

export function symbols(unicode) {
  return unicode
    ? { ok: '✔', fail: '✖', warn: '▲', dot: '●', off: '○', arrow: '→', line: '─' }
    : { ok: '+', fail: 'x', warn: '!', dot: '*', off: 'o', arrow: '->', line: '-' };
}

/** Removes ANSI colour codes (for width calculations and tests). */
export function stripAnsi(text) {
  return String(text).replace(/\x1b\[[0-9;]*m/g, '');
}

/** Left-aligned columns, widths measured without colour codes. */
export function table(rows, gap = 2) {
  const widths = [];
  for (const row of rows) row.forEach((cell, i) => { widths[i] = Math.max(widths[i] ?? 0, stripAnsi(cell).length); });
  return rows.map((row) => row.map((cell, i) => i === row.length - 1 ? cell : cell + ' '.repeat(widths[i] - stripAnsi(cell).length + gap)).join('').trimEnd()).join('\n');
}

/** A terminal context: paint, symbols and print helpers bound to one stream. */
export function terminal({ color, unicode, out = process.stdout, err = process.stderr }) {
  const t = painter(color);
  const s = symbols(unicode);
  return {
    t, s, color, unicode,
    print: (text = '') => out.write(text + '\n'),
    ok: (text) => out.write(`${t.green(s.ok)} ${text}\n`),
    warn: (text) => err.write(`${t.yellow(s.warn)} ${text}\n`),
    fail: (text) => err.write(`${t.red(s.fail)} ${text}\n`),
  };
}
