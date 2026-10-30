import { WebSocketServer, WebSocket } from 'ws';
import {
  openGraph, controlGraph, updateGraph, requestSync, getCurrentProcesses,
  getGraphStatus, unloadGraph, stopAllGraphs, setConsolePipeCallback, setStatusCallback,
} from './graphManager.js';
import { logger } from '../logger.js';

export function setupWebSocket(server) {
  const wss = new WebSocketServer({ server, maxPayload: 4 * 1024 * 1024 });
  const send = (ws, message) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(message));
  };
  const broadcast = (message) => wss.clients.forEach((ws) => send(ws, message));
  const activeGraphs = () => ({ type: 'active_graphs', data: {
    graphs: getCurrentProcesses().map((graphId) => ({ graphId, status: getGraphStatus(graphId) })),
  } });
  setConsolePipeCallback((graphId, level, message) => broadcast({ type: 'console', data: { graphId, level, message } }));
  setStatusCallback((graphId, status) => {
    broadcast({ type: 'graph_status', data: { graphId, status } });
    broadcast(activeGraphs());
  });
  wss.on('connection', (ws) => {
    send(ws, activeGraphs());
    // Preserve command order for each client, including open -> start -> update.
    let queue = Promise.resolve();
    ws.on('message', (message) => {
      queue = queue.then(async () => {
        const packet = JSON.parse(message.toString());
        if (!packet || typeof packet !== 'object' || typeof packet.type !== 'string') throw new Error('Invalid message');
        const payload = packet.data || {};
        let result;
        let type;
        switch (packet.type) {
          case 'open_graph': result = await openGraph(payload.file, logger); type = 'graph_opened'; break;
          case 'control_graph': result = await controlGraph(payload.graphId, payload.action, logger); type = 'graph_status'; break;
          case 'update_graph': result = await updateGraph(payload.graphId, payload.serializedGraph, logger); type = 'graph_updated'; break;
          case 'request_sync': result = await requestSync(payload.graphId, logger); type = 'graph_sync'; break;
          case 'unload_graph': result = await unloadGraph(payload.graphId, logger); type = 'graph_status'; break;
          case 'stop_all_graphs': {
            const results = await stopAllGraphs(logger);
            const failed = results.find((item) => item.error);
            if (failed) throw new Error(failed.error);
            broadcast(activeGraphs());
            return;
          }
          case 'get_active_graphs': send(ws, activeGraphs()); return;
          default: throw new Error('Unknown event type');
        }
        if (result.error) throw new Error(result.error);
        if (type === 'graph_updated') broadcast({ type, data: result });
        else send(ws, { type, data: result });
      }).catch((error) => send(ws, { type: 'error', data: { message: error.message } }));
    });
  });
  wss.on('close', () => { setConsolePipeCallback(null); setStatusCallback(null); });
  return wss;
}
