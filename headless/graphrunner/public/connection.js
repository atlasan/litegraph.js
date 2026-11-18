/** A reconnecting transport; commands are acknowledged, never silently replayed. */
export class WebSocketClient {
  constructor(url, onMessage, { onState = () => {}, onError = () => {}, Socket = globalThis.WebSocket, reconnectDelay = 3000, timeout = 15000 } = {}) {
    Object.assign(this, { url, onMessage, onState, onError, Socket, reconnectDelay, timeout });
    this.pending = new Map();
    this.sequence = 0;
    this.prefix = Math.random().toString(36).slice(2);
    this.state = 'connecting';
  }
  notify() { this.onState(this.state, this.pending.size); }
  connect() {
    if (this.closed) return;
    this.state = 'connecting'; this.notify();
    const ws = this.ws = new this.Socket(this.url);
    ws.onopen = () => {
      if (this.ws !== ws || this.closed) return;
      this.state = 'connected'; this.notify(); this.fetchActiveGraphs();
    };
    ws.onmessage = event => {
      if (this.ws !== ws || this.closed) return;
      try {
        const message = JSON.parse(event.data);
        const pending = this.pending.get(message.requestId);
        if (pending) { clearTimeout(pending.timer); this.pending.delete(message.requestId); this.notify(); }
        this.onMessage(message);
      } catch (error) { this.onError(`Invalid runner response: ${error.message}`); }
    };
    ws.onclose = () => {
      if (this.ws !== ws || this.closed) return;
      if (this.pending.size) this.onError('Connection lost before acknowledgment. Command outcome is unknown; check runner state after reconnecting.');
      this.clearPending(); this.state = 'reconnecting'; this.notify();
      this.reconnectTimer = setTimeout(() => this.connect(), this.reconnectDelay);
    };
    ws.onerror = () => this.onError('Cannot reach the runner. Waiting for reconnection.');
  }
  send(type, data = {}) {
    if (this.state !== 'connected') { this.onError('Runner is disconnected; command was not sent.'); return false; }
    const poll = type === 'get_active_graphs';
    if (!poll && this.pending.size) { this.onError('Wait for the current command to finish.'); return false; }
    const requestId = poll ? undefined : `${this.prefix}-${++this.sequence}`;
    if (requestId) {
      const timer = setTimeout(() => {
        this.pending.delete(requestId); this.notify();
        this.onError('Runner acknowledgment timed out. Command outcome is unknown; sync before applying further edits.');
        this.fetchActiveGraphs();
      }, this.timeout);
      this.pending.set(requestId, { timer, type }); this.notify();
    }
    try { this.ws.send(JSON.stringify({ type, data, requestId })); return true; }
    catch (error) { if (requestId) { clearTimeout(this.pending.get(requestId)?.timer); this.pending.delete(requestId); this.notify(); } this.onError(error.message); return false; }
  }
  fetchActiveGraphs() { if (this.state === 'connected') this.send('get_active_graphs'); }
  clearPending() { for (const item of this.pending.values()) clearTimeout(item.timer); this.pending.clear(); }
  close() { this.closed = true; clearTimeout(this.reconnectTimer); this.clearPending(); this.ws?.close(); this.state = 'disconnected'; this.notify(); }
}
