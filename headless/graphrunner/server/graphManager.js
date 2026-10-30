import { Worker } from 'node:worker_threads';
import { resolveWorkflow } from './config.js';

const runners = new Map();
let nextRequestId = 0;
let consolePipeCallback = null;
let statusCallback = null;
const timeoutMs = 10000;

function publish(entry, status) {
  entry.status = status;
  statusCallback?.(entry.graphId, status);
}

function request(entry, action, data = {}) {
  return new Promise((resolve, reject) => {
    const requestId = ++nextRequestId;
    const timer = setTimeout(() => {
      entry.pending.delete(requestId);
      reject(new Error(`Worker command timed out: ${action}`));
    }, timeoutMs);
    entry.pending.set(requestId, { resolve, reject, timer });
    try {
      entry.worker.postMessage({ requestId, action, ...data });
    } catch (error) {
      clearTimeout(timer);
      entry.pending.delete(requestId);
      reject(error);
    }
  });
}

function rejectPending(entry, error) {
  for (const pending of entry.pending.values()) {
    clearTimeout(pending.timer);
    pending.reject(error);
  }
  entry.pending.clear();
}

async function getEntry(graphId) {
  const entry = runners.get(graphId);
  if (!entry || entry.unloading) throw new Error('Graph is not loaded');
  await entry.ready;
  return entry;
}

async function attempt(operation, logger) {
  try { return await operation(); }
  catch (error) {
    logger?.error(error.message);
    return { error: error.message };
  }
}

export async function openGraph(file, logger) {
  return attempt(async () => {
    const { graphId, filePath } = resolveWorkflow(file);
    let entry = runners.get(graphId);
    if (entry?.unloading) throw new Error('Graph is unloading');
    if (!entry) {
      const worker = new Worker(new URL('../graphRunners/graphRunner.js', import.meta.url), { workerData: filePath });
      entry = { graphId, worker, status: 'loading', pending: new Map() };
      runners.set(graphId, entry);
      worker.on('message', (message) => {
        if (runners.get(graphId) !== entry) return;
        if (message.event === 'console') consolePipeCallback?.(graphId, message.level, message.message);
        if (message.status && !entry.unloading) publish(entry, message.status);
        const pending = entry.pending.get(message.requestId);
        if (pending) {
          clearTimeout(pending.timer);
          entry.pending.delete(message.requestId);
          if (message.error) pending.reject(new Error(message.error));
          else pending.resolve({ graphId, ...message });
        }
      });
      worker.on('error', (error) => {
        rejectPending(entry, error);
        if (!entry.unloading) publish(entry, 'error');
        logger?.error(`Worker ${graphId}: ${error.message}`);
      });
      worker.on('exit', (code) => {
        rejectPending(entry, new Error(`Worker exited (${code})`));
        if (runners.get(graphId) === entry) {
          runners.delete(graphId);
          publish(entry, entry.unloading ? 'unloaded' : 'error');
        }
      });
      entry.ready = request(entry, 'status');
    }
    try {
      await entry.ready;
      return await request(entry, 'sync');
    } catch (error) {
      await entry.worker.terminate();
      if (runners.get(graphId) === entry) runners.delete(graphId);
      throw error;
    }
  }, logger);
}

export const loadGraph = openGraph;

export async function controlGraph(graphId, action, logger) {
  return attempt(async () => {
    if (!['start', 'stop', 'status', 'clear'].includes(action)) throw new Error('Unsupported graph action');
    return request(await getEntry(graphId), action);
  }, logger);
}

export async function updateGraph(graphId, serializedGraph, logger) {
  return attempt(async () => request(await getEntry(graphId), 'update', { serializedGraph }), logger);
}

export async function requestSync(graphId, logger) {
  return attempt(async () => request(await getEntry(graphId), 'sync'), logger);
}

export async function unloadGraph(graphId, logger) {
  return attempt(async () => {
    const entry = await getEntry(graphId);
    entry.unloading = true;
    try { await request(entry, 'clear'); }
    finally { await entry.worker.terminate(); }
    return { graphId, status: 'unloaded' };
  }, logger);
}

export function getCurrentProcesses() { return Array.from(runners.keys()); }
export function getGraphStatus(graphId) { return runners.get(graphId)?.status || 'unloaded'; }
export function isGraphRunning(graphId) { return getGraphStatus(graphId) === 'running'; }
export async function stopAllGraphs(logger) {
  return Promise.all(getCurrentProcesses().map((id) => controlGraph(id, 'stop', logger)));
}
export async function unloadAllGraphs(logger) {
  return Promise.all(getCurrentProcesses().map((id) => unloadGraph(id, logger)));
}
export function setConsolePipeCallback(callback) { consolePipeCallback = callback; }
export function setStatusCallback(callback) { statusCallback = callback; }
