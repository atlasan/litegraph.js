import test from 'node:test';
import assert from 'node:assert/strict';
import { isAllowedHost, isAllowedUpgrade } from '../../headless/graphrunner/server/security.js';
import { assertAllowedGraph, DEFAULT_DENIED_TYPES, scriptsAllowed } from '../../headless/graphrunner/nodePolicy.js';

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
  assert.doesNotThrow(() => assertAllowedGraph(graph([{ id: 1, type: 'basic/const' }, { id: 2, type: 'sys/fileRead' }]), known, { env: {} }));
  for (const type of DEFAULT_DENIED_TYPES) {
    assert.throws(() => assertAllowedGraph(graph([{ id: 1, type }]), known, { env: {} }), /not allowed/, type);
  }
  const nested = graph([{ id: 1, type: 'graph/subgraph', subgraph: graph([{ id: 7, type: 'graph/subgraph', subgraph: graph([{ id: 3, type: 'sys/runCommand' }]) }]) }]);
  assert.throws(() => assertAllowedGraph(nested, known, { env: {} }), /sys\/runCommand \(node 1\/7\/3\)/);
  assert.throws(() => assertAllowedGraph(graph([{ id: 1, type: 'nope/missing' }]), known, { env: {} }), /Unknown node type/);
  assert.throws(() => assertAllowedGraph(graph([{ id: 1, type: 'graph/subgraph', subgraph: {} }]), known, { env: {} }), /nodes array/);
  assert.throws(() => assertAllowedGraph(graph([{ id: 1, type: 'sys/fileRead' }]), known, { env: { RUNNER_DENY_TYPES: 'sys/' } }), /not allowed/);
  assert.doesNotThrow(() => assertAllowedGraph(nested, known, { env: { RUNNER_ALLOW_SYS: '1' } }));
  assert.equal(scriptsAllowed({}), false, 'script nodes are off by default');
  assert.equal(scriptsAllowed({ RUNNER_ALLOW_SYS: '1' }), true);
});
