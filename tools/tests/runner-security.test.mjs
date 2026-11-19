import test from 'node:test';
import assert from 'node:assert/strict';
import { isAllowedHost, isAllowedUpgrade, upgradeRefusal } from '../../headless/graphrunner/server/security.js';
import { assertAllowedGraph, DEFAULT_DENIED_TYPES, scriptsAllowed, graphPolicyNotes, describePolicy } from '../../headless/graphrunner/nodePolicy.js';

const env = { HOST: '127.0.0.1' };

test('runner accepts only its own Host and same-origin WebSocket upgrades', () => {
  assert.equal(isAllowedHost('127.0.0.1:3000', env), true);
  assert.equal(isAllowedHost('localhost:3000', env), true);
  assert.equal(isAllowedHost('[::1]:3000', env), true);
  assert.equal(isAllowedHost('evil.example:3000', env), false, 'DNS rebinding host');
  assert.equal(isAllowedHost(undefined, env), false);
  assert.equal(isAllowedHost('lan-box:3000', { ...env, RUNNER_ALLOWED_HOSTS: 'lan-box' }), true);
  assert.equal(isAllowedHost('[fe80::1]:3000', { HOST: 'fe80::1' }), true, 'IPv6 HOST without brackets');
  assert.equal(isAllowedHost('[fd00::5]:3000', { RUNNER_ALLOWED_HOSTS: 'fd00::5, [fd00::6]' }), true, 'IPv6 extra host');
  assert.equal(isAllowedHost('[fd00::6]:3000', { RUNNER_ALLOWED_HOSTS: 'fd00::5, [fd00::6]' }), true, 'bracketed IPv6 extra host');

  assert.equal(isAllowedUpgrade({ origin: undefined, host: '127.0.0.1:3000' }, env), true, 'non-browser client');
  assert.equal(isAllowedUpgrade({ origin: 'http://127.0.0.1:3000', host: '127.0.0.1:3000' }, env), true);
  assert.equal(isAllowedUpgrade({ origin: 'https://evil.example', host: '127.0.0.1:3000' }, env), false);
  assert.equal(isAllowedUpgrade({ origin: 'http://127.0.0.1:8000', host: '127.0.0.1:3000' }, env), false, 'other local port');
  assert.equal(isAllowedUpgrade({ origin: 'null', host: '127.0.0.1:3000' }, env), false, 'sandboxed/file origin');
  assert.equal(isAllowedUpgrade({ origin: 'http://evil.example:3000', host: 'evil.example:3000' }, env), false, 'rebinding');
  assert.equal(isAllowedUpgrade({ origin: 'http://localhost', host: 'localhost:80' }, env), true, 'default port in Host');
  assert.equal(isAllowedUpgrade({ origin: 'https://localhost', host: 'localhost:80' }, env), false, 'scheme default port differs');
});

test('runner node policy refuses dangerous types at any subgraph depth', () => {
  const known = (type) => type !== 'nope/missing';
  const graph = (nodes) => ({ nodes, links: [] });
  assert.doesNotThrow(() => assertAllowedGraph(graph([{ id: 1, type: 'basic/const' }, { id: 2, type: 'sys/fileExists' }]), known, { env: {} }));
  for (const type of DEFAULT_DENIED_TYPES) {
    assert.throws(() => assertAllowedGraph(graph([{ id: 1, type }]), known, { env: {} }), /not allowed/, type);
  }
  const nested = graph([{ id: 1, type: 'graph/subgraph', subgraph: graph([{ id: 7, type: 'graph/subgraph', subgraph: graph([{ id: 3, type: 'sys/runCommand' }]) }]) }]);
  assert.throws(() => assertAllowedGraph(nested, known, { env: {} }), /sys\/runCommand \(node 1\/7\/3\)/);
  assert.throws(() => assertAllowedGraph(graph([{ id: 1, type: 'nope/missing' }]), known, { env: {} }), /Unknown node type/);
  assert.throws(() => assertAllowedGraph(graph([{ id: 1, type: 'graph/subgraph', subgraph: {} }]), known, { env: {} }), /nodes array/);
  assert.throws(() => assertAllowedGraph(graph([{ id: 1, type: 'sys/fileExists' }]), known, { env: { RUNNER_DENY_TYPES: 'sys/' } }), /not allowed/);
  // default-denied types can be allowed one by one or by prefix
  const reader = graph([{ id: 1, type: 'sys/fileRead' }]);
  const servers = graph([{ id: 1, type: 'nodejs/network/OSC_server' }, { id: 2, type: 'server/network/websocketserver' }]);
  assert.throws(() => assertAllowedGraph(reader, known, { env: {} }), /not allowed in the runner: sys\/fileRead/);
  assert.throws(() => assertAllowedGraph(servers, known, { env: {} }), /not allowed/);
  assert.doesNotThrow(() => assertAllowedGraph(reader, known, { env: { RUNNER_ALLOW_TYPES: 'sys/fileRead' } }));
  assert.throws(() => assertAllowedGraph(servers, known, { env: { RUNNER_ALLOW_TYPES: 'nodejs/network/' } }), /server\/network\/websocketserver/);
  assert.doesNotThrow(() => assertAllowedGraph(servers, known, { env: { RUNNER_ALLOW_TYPES: 'nodejs/network/, server/network/websocketserver' } }));
  assert.throws(() => assertAllowedGraph(reader, known, { env: { RUNNER_ALLOW_TYPES: 'sys/fileRead', RUNNER_DENY_TYPES: 'sys/' } }), /not allowed/, 'deny wins over allow');
  assert.throws(() => assertAllowedGraph(graph([{ id: 1, type: 'sys/runCommand' }]), known, { env: { RUNNER_ALLOW_TYPES: 'sys/fileRead' } }), /not allowed/, 'allow is per type');
  assert.doesNotThrow(() => assertAllowedGraph(nested, known, { env: { RUNNER_ALLOW_SYS: '1' } }));
  assert.equal(scriptsAllowed({}), false, 'script nodes are off by default');
  assert.equal(scriptsAllowed({ RUNNER_ALLOW_SYS: '1' }), true);
  assert.equal(scriptsAllowed({ RUNNER_ALLOW_SCRIPTS: '1' }), true, 'scripts alone');
});

test('every refusal names the setting that allows it', () => {
  const known = () => true;
  const graph = (nodes) => ({ nodes, links: [] });
  // all refused types are listed at once, with a ready-to-use RUNNER_ALLOW_TYPES value
  assert.throws(
    () => assertAllowedGraph(graph([{ id: 1, type: 'sys/fileRead' }, { id: 2, type: 'nodejs/network/UDP_server' }, { id: 3, type: 'sys/fileRead' }]), known, { env: {} }),
    /sys\/fileRead \(node 1, 3\); nodejs\/network\/UDP_server \(node 2\)\. to enable, start the runner with RUNNER_ALLOW_TYPES=sys\/fileRead,nodejs\/network\/UDP_server \(or RUNNER_ALLOW_SYS=1/,
  );
  assert.throws(() => assertAllowedGraph(graph([{ id: 1, type: 'basic/const' }]), known, { env: { RUNNER_DENY_TYPES: 'basic/' } }), /basic\/const is refused by RUNNER_DENY_TYPES/);

  const scripted = graph([{ id: 4, type: 'graph/subgraph', subgraph: graph([{ id: 5, type: 'math/formula' }]) }]);
  assert.match(graphPolicyNotes(scripted, {})[0], /math\/formula \(node 4\/5\).*RUNNER_ALLOW_SCRIPTS=1/);
  assert.deepEqual(graphPolicyNotes(scripted, { RUNNER_ALLOW_SCRIPTS: '1' }), []);
  assert.deepEqual(graphPolicyNotes(graph([{ id: 1, type: 'basic/const' }]), {}), []);

  assert.match(describePolicy({}), /RUNNER_ALLOW_TYPES.*RUNNER_ALLOW_SYS=1.*RUNNER_ALLOW_SCRIPTS=1/);
  assert.match(describePolicy({ RUNNER_ALLOW_TYPES: 'sys/fileRead' }), /Re-allowed by RUNNER_ALLOW_TYPES: sys\/fileRead/);

  assert.match(upgradeRefusal({ origin: 'http://127.0.0.1:8000', host: '127.0.0.1:3000' }, env), /RUNNER_ALLOWED_ORIGINS=http:\/\/127\.0\.0\.1:8000/);
  assert.match(upgradeRefusal({ origin: undefined, host: 'lan-box:3000' }, env), /RUNNER_ALLOWED_HOSTS=lan-box/);
  assert.match(upgradeRefusal({ origin: undefined, host: '[fd00::5]:3000' }, env), /RUNNER_ALLOWED_HOSTS=fd00::5$/);
});

test('RUNNER_ALLOWED_ORIGINS lets chosen pages (e.g. the editor) open the WebSocket', () => {
  const editor = { ...env, RUNNER_ALLOWED_ORIGINS: 'http://127.0.0.1:8000/, http://localhost:8000' };
  assert.equal(isAllowedUpgrade({ origin: 'http://127.0.0.1:8000', host: '127.0.0.1:3000' }, editor), true);
  assert.equal(isAllowedUpgrade({ origin: 'http://localhost:8000', host: '127.0.0.1:3000' }, editor), true);
  assert.equal(isAllowedUpgrade({ origin: 'http://127.0.0.1:8001', host: '127.0.0.1:3000' }, editor), false, 'exact origins only');
  assert.equal(isAllowedUpgrade({ origin: 'http://127.0.0.1:8000', host: 'evil.example:3000' }, editor), false, 'Host check still applies');
});
