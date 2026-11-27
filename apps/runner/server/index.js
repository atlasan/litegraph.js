import express from 'express';
import http from 'node:http';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { runnerRoot, repositoryRoot } from './config.js';
import { setupWebSocket } from './wsHandler.js';
import { router } from './routes.js';
import { unloadAllGraphs } from './graphManager.js';
import { logger } from '../logger.js';
import { hostGuard } from './security.js';
import { describePolicy } from '../nodePolicy.js';
import { localBuildRoot } from '../../../tools/local-build.mjs';

export function createRunnerServer() {
  const app = express();
  app.use(hostGuard);
  app.use(express.static(path.join(runnerRoot, 'public')));
  app.use('/build', express.static(path.join(localBuildRoot, 'build')));
  for (const directory of ['css', 'src', 'build', 'external', 'vendor']) {
    app.use('/' + directory, express.static(path.join(repositoryRoot, directory)));
  }
  app.use('/editor', express.static(path.join(repositoryRoot, 'apps', 'editor'))); // the editor app (old URL)
  app.use('/api', router);
  const server = http.createServer(app);
  const wss = setupWebSocket(server);
  return { server, async close() {
    await unloadAllGraphs(logger);
    for (const client of wss.clients) client.terminate();
    await new Promise((resolve) => wss.close(resolve));
    if (server.listening) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  } };
}

/** Starts the runner on PORT/HOST (defaults 3000, 127.0.0.1), as `npm run graphrunner` does. */
export function startRunner() {
  let policy;
  try { policy = describePolicy(); } // also validates RUNNER_ALLOW_TYPES before anything listens
  catch (error) { logger.error(error.message); process.exit(1); }
  const runner = createRunnerServer();
  const port = Number(process.env.PORT || 3000);
  const host = process.env.HOST || '127.0.0.1';
  runner.server.listen(port, host, () => {
    logger.info(`Graph runner: http://${host}:${runner.server.address().port}`);
    logger.info(policy);
  });
  let closing = false;
  const shutdown = async () => {
    if (closing) return;
    closing = true;
    try { await runner.close(); }
    catch (error) { logger.error(error.message); process.exitCode = 1; }
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) startRunner();
