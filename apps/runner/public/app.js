// public/app.js
import { LiteGraph } from "../../build/litegraph.full.js";

import { WebSocketClient } from './connection.js';
import { selectGraphView } from './graph-view-state.js';

/* =================== File Explorer =================== */
class FileExplorer {
  constructor(elementId, onFileSelect) {
    this.element = document.getElementById(elementId);
    this.onFileSelect = onFileSelect;
    this.currentPath = "/";
    this.loadFiles();
  }

  loadFiles() {
    this.element.textContent = 'Loading workflows…';
    fetch(`/api/list_files?path=${encodeURIComponent(this.currentPath)}`)
      .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
      .then(files => this.renderFiles(files))
      .catch(err => { this.element.textContent = `Could not load workflows: ${err.message}`; });
  }

  renderFiles(files) {
    this.element.innerHTML = "";
    if (!files.length) this.element.textContent = 'No JSON workflows found.';
    // Add parent folder navigation if not at root.
    if (this.currentPath !== "/") {
      const li = document.createElement("li");
      li.className = "list-group-item list-group-item-action";
      li.textContent = ".. (parent folder)";
      li.style.cursor = "pointer";
      li.onclick = () => {
        let parts = this.currentPath.split("/");
        parts.pop(); // remove empty string
        parts.pop(); // remove current folder
        this.currentPath = parts.length ? parts.join("/") + "/" : "/";
        this.loadFiles();
      };
      this.element.appendChild(li);
    }
    // Render each file/folder.
    files.forEach(file => {
      const li = document.createElement("li");
      li.className = "list-group-item list-group-item-action";
      li.textContent = file;
      li.style.cursor = "pointer";
      li.onclick = () => {
        if (file.endsWith("/")) {
          // Folder: navigate into it.
          this.currentPath += file;
          this.loadFiles();
        } else {
          // File: send open_graph request.
          this.onFileSelect(file);
        }
      };
      this.element.appendChild(li);
    });
  }
}

/* =================== Tab Manager =================== */
class TabManager {
  constructor(elementId, onLastTabClosed) {
    this.element = document.getElementById(elementId);
    this.tabs = Object.create(null);
    this.onLastTabClosed = onLastTabClosed;
  }

  addTab(tabId, title, state, onClickCallback) {
    if (this.tabs[tabId]) return; // Prevent duplicate tabs.

    const li = document.createElement("li");
    li.className = "nav-item d-flex align-items-center";
    const a = document.createElement("a");
    a.className = "nav-link";
    a.href = "#";
    a.append(document.createTextNode(title + ' '));
    const badge = document.createElement('span');
    badge.className = 'badge bg-secondary';
    badge.textContent = state;
    a.append(badge);
    a.onclick = (e) => {
      e.preventDefault();
      this.activateTab(tabId);
      if (onClickCallback) onClickCallback();
    };

    // Close button to remove the tab.
    const closeBtn = document.createElement("button");
    closeBtn.className = "btn-close ms-2";
    closeBtn.onclick = (e) => {
      e.stopPropagation();
      this.removeTab(tabId);
    };

    li.appendChild(a);
    li.appendChild(closeBtn);
    this.element.appendChild(li);
    this.tabs[tabId] = { li, a };
  }

  updateTabState(tabId, state) {
    if (this.tabs[tabId]) {
      this.tabs[tabId].a.querySelector('span').textContent = state;
    }
  }

  removeTab(tabId) {
    if (this.tabs[tabId]) {
      this.element.removeChild(this.tabs[tabId].li);
      delete this.tabs[tabId];
    }
    if (currentGraphId === tabId) {
      const nextId = Object.keys(this.tabs)[0];
      if (nextId && graphsStore[nextId]) {
        currentGraphId = selectGraphView(graphViewer, graphsStore, currentGraphId, nextId);
        this.activateTab(nextId);
      } else {
        this.onLastTabClosed?.();
      }
    }
    refreshControls();
  }

  activateTab(tabId) {
    Object.values(this.tabs).forEach(tab => tab.a.classList.remove("active"));
    if (this.tabs[tabId]) this.tabs[tabId].a.classList.add("active");
  }
}

/* =================== Graph Viewer =================== */
class GraphViewer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.graph = null;
    this.editor = null;
  }

  loadGraph(serializedGraph) {
    this.clearCanvas();
    this.graph = new LiteGraph.LGraph();
    try {
      this.graph.configure(serializedGraph);
    } catch (err) {
      console.error("Graph configuration error:", err);
    }
    this.editor = new LiteGraph.LGraphCanvas("#" + this.canvas.id, this.graph);
    this.editor.read_only = true;
  }

  updateGraph(serializedGraph) {
    if (this.graph) {
      try {
        this.graph.configure(serializedGraph);
        if (this.editor) this.editor.setDirty(true);
      } catch (err) {
        console.error("Error updating graph:", err);
      }
    }
  }

  toggleReadOnly() {
    if (this.editor) {
      this.editor.read_only = !this.editor.read_only;
      return this.editor.read_only ? "Read-Only" : "Editable";
    }
    return "Unknown";
  }

  clearCanvas() {
    if (this.editor) {
      this.editor.stopRendering();
      this.editor.unbindEvents();
      this.editor.setGraph(null);
    }
    this.graph?.clear();
    if (this.canvas.getContext) {
      const ctx = this.canvas.getContext("2d");
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    this.graph = null;
    this.editor = null;
  }
}

/* =================== Graph Controls =================== */
class GraphControls {
  constructor(runBtnId, pauseBtnId, toggleBtnId) {
    this.runBtn = document.getElementById(runBtnId);
    this.pauseBtn = document.getElementById(pauseBtnId);
    this.toggleBtn = document.getElementById(toggleBtnId);
  }

  onRun(callback) {
    this.runBtn.onclick = callback;
  }

  onPause(callback) {
    this.pauseBtn.onclick = callback;
  }

  onToggle(callback) {
    this.toggleBtn.onclick = callback;
  }
}

/* =================== Console Logger =================== */
class ConsoleLogger {
  constructor(elementId) {
    this.element = document.getElementById(elementId);
  }

  log(message) {
    const div = document.createElement("div");
    // Prepend a timestamp to each message.
    const now = new Date().toLocaleTimeString();
    div.textContent = `[${now}] ${message}`;
    this.element.appendChild(div);
    this.element.scrollTop = this.element.scrollHeight;
  }

  clear() {
    this.element.innerHTML = "";
  }
}

/* =================== Active Graphs List =================== */
class ActiveGraphsList {
  constructor(elementId, wsClient) {
    this.element = document.getElementById(elementId);
    this.wsClient = wsClient;
  }

  updateGraphs(graphs) {
    this.graphs = graphs;
    const snapshot = JSON.stringify(graphs);
    if (snapshot === this.lastSnapshot) return;
    this.lastSnapshot = snapshot;
    this.element.innerHTML = "";
    if (!graphs.length) this.element.textContent = 'No loaded workers. Open a workflow to begin.';
    graphs.forEach(({ graphId, status }) => {
      const li = document.createElement("li");
      li.className = "list-group-item d-flex justify-content-between align-items-center";
      li.innerHTML = `
        <span class="graph-label"></span> <span class="badge bg-secondary"></span>
        <div>
          <button class="btn btn-sm btn-success">Start</button>
          <button class="btn btn-sm btn-warning">Stop</button>
          <button class="btn btn-sm btn-danger">Unload</button>
        </div>
      `;
      li.querySelector('.graph-label').textContent = graphId;
      li.querySelector('.badge').textContent = status;
      const [startBtn, stopBtn, unloadBtn] = li.querySelectorAll("button");
      // Send commands: "start" to run, "stop" to pause.
      startBtn.onclick = () => this.wsClient.send("control_graph", { graphId, action: "start" });
      stopBtn.onclick = () => this.wsClient.send("control_graph", { graphId, action: "stop" });
      unloadBtn.onclick = () => this.wsClient.send("unload_graph", { graphId });
      this.element.appendChild(li);
    });
  }
}

/* =================== Global State =================== */
const graphsStore = Object.create(null); // { graphId: { serializedGraph, status } }
let currentGraphId = null;
let connected = false;
let commandPending = false;

function notice(message) {
  document.getElementById('commandStatus').textContent = message;
}
function refreshControls() {
  const ready = connected && !commandPending;
  const loaded = ['running', 'stopped'].includes(graphsStore[currentGraphId]?.status);
  for (const id of ['runBtn', 'pauseBtn', 'applyBtn', 'syncBtn']) document.getElementById(id).disabled = !ready || !loaded;
  document.getElementById('toggleBtn').disabled = !graphViewer.editor;
  document.getElementById('editMode').textContent = graphViewer.editor ? (graphViewer.editor.read_only ? 'Read-only view' : 'Editing local graph') : '';
  document.getElementById('stopAllBtn').disabled = !ready;
  document.querySelectorAll('#graphsList button').forEach(button => { button.disabled = !ready; });
  document.getElementById('filesList').setAttribute('aria-busy', String(commandPending));
  document.getElementById('emptyState').hidden = !!currentGraphId;
}
function connectionState(state, pending) {
  const wasConnected = connected;
  connected = state === 'connected'; commandPending = pending > 0;
  document.getElementById('connectionStatus').textContent = `${state}${pending ? ' — waiting for runner acknowledgment' : ''}`;
  if (connected && !wasConnected) {
    notice('Connected. Refreshing worker status…');
    fileExplorer.loadFiles();
  }
  if (!connected) {
    activeGraphsList.updateGraphs((activeGraphsList.graphs || []).map(worker => ({ ...worker, status: 'unknown' })));
    for (const id of Object.keys(graphsStore)) { graphsStore[id].status = 'unknown'; tabManager.updateTabState(id, 'unknown'); }
  }
  refreshControls();
}

/* =================== Instantiate Components =================== */
const wsClient = new WebSocketClient(`${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}`, handleWebSocketMessage, { onState: connectionState, onError: notice });
const fileExplorer = new FileExplorer("filesList", (file) =>
  wsClient.send("open_graph", { file })
);
const tabManager = new TabManager("tabs", clearCanvas);
const graphViewer = new GraphViewer("graphCanvas");
const graphControls = new GraphControls("runBtn", "pauseBtn", "toggleBtn");
const consoleLogger = new ConsoleLogger("consoleOutput");
const activeGraphsList = new ActiveGraphsList("graphsList", wsClient);

/* Global function to clear the canvas when no tabs are open */
function clearCanvas() {
  currentGraphId = null;
  graphViewer.clearCanvas();
  refreshControls();
}

/* =================== WebSocket Message Handler =================== */
function handleWebSocketMessage(message) {
  switch (message.type) {
    case "active_graphs":
      activeGraphsList.updateGraphs(message.data.graphs);
      if (document.getElementById('commandStatus').textContent === 'Connected. Refreshing worker status…') notice('Connected. Worker status refreshed.');
      for (const [id, stored] of Object.entries(graphsStore)) {
        const worker = message.data.graphs.find(item => item.graphId === id);
        stored.status = worker?.status || (stored.status === 'error' ? 'error' : 'unloaded');
        tabManager.updateTabState(id, stored.status);
      }
      break;
    case "graph_opened": {
      const { graphId, serializedGraph, status } = message.data;
      // Normalize graphId across visualization and execution.
      graphsStore[graphId] = { serializedGraph, status };
      tabManager.addTab(graphId, graphId, status, () => {
        currentGraphId = selectGraphView(graphViewer, graphsStore, currentGraphId, graphId);
        refreshControls();
      });
      tabManager.activateTab(graphId);
      if (currentGraphId === graphId) graphViewer.updateGraph(serializedGraph);
      else currentGraphId = selectGraphView(graphViewer, graphsStore, currentGraphId, graphId);
      break;
    }
    case "graph_status": {
      const { graphId, status } = message.data;
      // Update Active Graphs list with execution state.
      if (graphsStore[graphId]) {
        graphsStore[graphId].status = status;
        tabManager.updateTabState(graphId, status);
        consoleLogger.log(`Graph ${graphId} execution status: ${status}`);
      }
      if (status === 'unloaded') {
        delete graphsStore[graphId];
        tabManager.removeTab(graphId);
        if (currentGraphId === graphId) clearCanvas();
      }
      break;
    }
    case "graph_updated":
    case "graph_sync": {
      const { graphId, serializedGraph } = message.data;
      if (message.type === 'graph_updated' && !message.requestId) {
        notice(`Worker ${graphId} changed in another client. Local view retained; Sync to retrieve it.`);
        break;
      }
      if (graphsStore[graphId]) graphsStore[graphId].serializedGraph = serializedGraph;
      if (currentGraphId === graphId) {
        graphViewer.updateGraph(serializedGraph);
      }
      break;
    }
    case "console": {
      // Display console events with optional graphId filtering.
      let msg = message.data.message;
      if (message.data.graphId) {
        msg = `[${message.data.graphId}] ${msg}`;
      }
      consoleLogger.log(msg);
      break;
    }
    case "error":
      consoleLogger.log("Error: " + message.data.message);
      notice(message.data.message);
      break;
    default:
      console.warn("Unknown message type:", message.type);
  }
  if (message.requestId && message.type !== 'error') notice('Runner acknowledged the command.');
  if (currentGraphId && ['unloaded', 'error'].includes(graphsStore[currentGraphId]?.status)) notice('Worker unavailable. Local view retained; reopen the workflow to load a worker.');
  refreshControls();
}

/* =================== Controls Events =================== */
graphControls.onRun(() => {
  if (!currentGraphId) return;
  wsClient.send("control_graph", { graphId: currentGraphId, action: "start" });
});
graphControls.onPause(() => {
  if (!currentGraphId) return;
  wsClient.send("control_graph", { graphId: currentGraphId, action: "stop" });
});
graphControls.onToggle(() => {
  const mode = graphViewer.toggleReadOnly();
  consoleLogger.log(`Graph canvas is now ${mode}`);
  refreshControls();
});

/* =================== Additional Control Buttons =================== */
// Stop All button: sends a "stop_all_graphs" command.
document.getElementById("stopAllBtn").onclick = () => {
  wsClient.send("stop_all_graphs", {});
  consoleLogger.log("Sent stop_all_graphs command to server.");
};

// Clear Console button: clears the console output area.
document.getElementById("clearConsoleBtn").onclick = () => {
  consoleLogger.clear();
};

/* Optionally, periodically refresh active graphs */
const refreshTimer = setInterval(() => {
  wsClient.fetchActiveGraphs();
}, 5000);

// Edits replace the worker graph in memory; workflow files are not overwritten.
document.getElementById('applyBtn').onclick = () => {
  if (!currentGraphId || !graphViewer.graph) return;
  wsClient.send('update_graph', { graphId: currentGraphId, serializedGraph: graphViewer.graph.serialize() });
};
document.getElementById('syncBtn').onclick = () => {
  if (currentGraphId) wsClient.send('request_sync', { graphId: currentGraphId });
};

refreshControls();
wsClient.connect();
window.addEventListener('pagehide', () => { clearInterval(refreshTimer); wsClient.close(); });
