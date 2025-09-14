# Editor Functionality Analysis

## Overview

LiteGraph.js provides a comprehensive visual node editor with rich interaction capabilities, context menus, property panels, and extensible UI components. The editor is designed for both desktop and mobile environments with responsive design patterns.

## Core Editor Components

### 1. Main Editor Interface

```javascript
// Editor initialization
class LiteGraphEditor {
    constructor(container_id, options) {
        this.options = options || {};
        
        // Create main components
        this.createInterface();
        this.createCanvas();
        this.createPanels();
        this.bindEvents();
    }
    
    createInterface() {
        // Main container
        this.root = document.createElement("div");
        this.root.className = "litegraph litegraph-editor";
        
        // Toolbar
        this.toolbar = this.createToolbar();
        
        // Canvas container
        this.canvas_container = document.createElement("div");
        this.canvas_container.className = "graphcanvas-container";
        
        // Side panels
        this.createSidePanels();
    }
}
```

### 2. Toolbar System

```javascript
createToolbar() {
    const toolbar = document.createElement("div");
    toolbar.className = "toolbar";
    
    // File operations
    this.addToolbarButton(toolbar, "New", "fa-file", () => this.newGraph());
    this.addToolbarButton(toolbar, "Load", "fa-folder-open", () => this.loadGraph());
    this.addToolbarButton(toolbar, "Save", "fa-save", () => this.saveGraph());
    
    // Edit operations
    this.addToolbarSeparator(toolbar);
    this.addToolbarButton(toolbar, "Undo", "fa-undo", () => this.undo());
    this.addToolbarButton(toolbar, "Redo", "fa-redo", () => this.redo());
    
    // View operations
    this.addToolbarSeparator(toolbar);
    this.addToolbarButton(toolbar, "Zoom In", "fa-search-plus", () => this.zoomIn());
    this.addToolbarButton(toolbar, "Zoom Out", "fa-search-minus", () => this.zoomOut());
    this.addToolbarButton(toolbar, "Fit", "fa-expand", () => this.fitToContent());
    
    // Play controls
    this.addToolbarSeparator(toolbar);
    this.play_button = this.addToolbarButton(toolbar, "Play", "fa-play", () => this.togglePlay());
    this.addToolbarButton(toolbar, "Step", "fa-step-forward", () => this.step());
    
    return toolbar;
}
```

### 3. Context Menu System

```javascript
// Context menu configuration
LiteGraph.ContextMenu = class {
    constructor(values, options) {
        this.options = options || {};
        this.values = values;
        
        this.createMenu();
        this.bindEvents();
    }
    
    createMenu() {
        this.root = document.createElement("div");
        this.root.className = "litegraph-contextmenu litecontextmenu";
        
        for (const item of this.values) {
            this.addMenuItem(item);
        }
    }
    
    addMenuItem(item) {
        if (item === null) {
            // Separator
            const separator = document.createElement("div");
            separator.className = "separator";
            this.root.appendChild(separator);
            return;
        }
        
        const element = document.createElement("div");
        element.className = "item";
        
        if (item.disabled) {
            element.className += " disabled";
        }
        
        if (item.submenu) {
            element.className += " has-submenu";
            element.innerHTML = `<span class="icon">${item.icon || ''}</span><span class="name">${item.content}</span><span class="arrow">▶</span>`;
        } else {
            element.innerHTML = `<span class="icon">${item.icon || ''}</span><span class="name">${item.content}</span>`;
        }
        
        if (item.callback && !item.disabled) {
            element.addEventListener("click", (e) => {
                item.callback.call(this, item, this.options, e);
                this.close();
            });
        }
        
        this.root.appendChild(element);
    }
};
```

#### Node Context Menu

```javascript
// Node-specific context menu
getNodeMenuOptions(node) {
    const options = [
        {
            content: "Clone",
            icon: "📋",
            callback: () => this.cloneNode(node)
        },
        {
            content: "Remove",
            icon: "🗑️",
            callback: () => this.removeNode(node)
        },
        null, // Separator
        {
            content: "Properties",
            icon: "⚙️",
            callback: () => this.showNodeProperties(node)
        }
    ];
    
    // Add node-specific options
    if (node.getMenuOptions) {
        const nodeOptions = node.getMenuOptions();
        if (nodeOptions && nodeOptions.length) {
            options.push(null); // Separator
            options.push(...nodeOptions);
        }
    }
    
    return options;
}
```

#### Canvas Context Menu

```javascript
// Canvas context menu for adding nodes
getCanvasMenuOptions(e) {
    const nodeTypes = LiteGraph.getNodeTypesInCategory();
    const options = [];
    
    // Add node categories
    const categories = {};
    for (const nodeType in nodeTypes) {
        const category = nodeTypes[nodeType].category || "basic";
        if (!categories[category]) {
            categories[category] = [];
        }
        categories[category].push({
            content: nodeTypes[nodeType].title || nodeType,
            callback: () => {
                const node = LiteGraph.createNode(nodeType);
                if (node) {
                    node.pos = this.convertEventToCanvasOffset(e);
                    this.graph.add(node);
                }
            }
        });
    }
    
    // Create category submenus
    for (const category in categories) {
        options.push({
            content: category,
            submenu: {
                options: categories[category]
            }
        });
    }
    
    return options;
}
```

### 4. Property Panel System

```javascript
// Property panel for node configuration
class PropertyPanel {
    constructor(container) {
        this.container = container;
        this.current_node = null;
        
        this.createInterface();
    }
    
    createInterface() {
        this.root = document.createElement("div");
        this.root.className = "property-panel";
        
        // Header
        this.header = document.createElement("div");
        this.header.className = "panel-header";
        this.header.innerHTML = "<h3>Properties</h3>";
        
        // Content
        this.content = document.createElement("div");
        this.content.className = "panel-content";
        
        this.root.appendChild(this.header);
        this.root.appendChild(this.content);
        this.container.appendChild(this.root);
    }
    
    showNodeProperties(node) {
        this.current_node = node;
        this.content.innerHTML = "";
        
        if (!node) {
            this.content.innerHTML = "<p>No node selected</p>";
            return;
        }
        
        // Node title
        this.addProperty("Title", node.title, "string", (value) => {
            node.title = value;
        });
        
        // Node properties
        if (node.properties) {
            for (const key in node.properties) {
                this.addNodeProperty(node, key);
            }
        }
        
        // Node widgets
        if (node.widgets) {
            for (const widget of node.widgets) {
                this.addWidgetProperty(node, widget);
            }
        }
    }
    
    addProperty(name, value, type, callback) {
        const row = document.createElement("div");
        row.className = "property-row";
        
        const label = document.createElement("label");
        label.textContent = name;
        
        const input = this.createInput(type, value, callback);
        
        row.appendChild(label);
        row.appendChild(input);
        this.content.appendChild(row);
    }
    
    createInput(type, value, callback) {
        let input;
        
        switch (type) {
            case "string":
                input = document.createElement("input");
                input.type = "text";
                input.value = value || "";
                input.addEventListener("change", (e) => callback(e.target.value));
                break;
                
            case "number":
                input = document.createElement("input");
                input.type = "number";
                input.value = value || 0;
                input.addEventListener("change", (e) => callback(parseFloat(e.target.value)));
                break;
                
            case "boolean":
                input = document.createElement("input");
                input.type = "checkbox";
                input.checked = !!value;
                input.addEventListener("change", (e) => callback(e.target.checked));
                break;
                
            case "combo":
                input = document.createElement("select");
                // Add options based on configuration
                input.addEventListener("change", (e) => callback(e.target.value));
                break;
        }
        
        return input;
    }
}
```

### 5. Node Library Panel

```javascript
// Node library for drag-and-drop node creation
class NodeLibrary {
    constructor(container) {
        this.container = container;
        this.createInterface();
        this.populateNodes();
    }
    
    createInterface() {
        this.root = document.createElement("div");
        this.root.className = "node-library";
        
        // Search box
        this.search = document.createElement("input");
        this.search.type = "text";
        this.search.placeholder = "Search nodes...";
        this.search.addEventListener("input", (e) => this.filterNodes(e.target.value));
        
        // Categories
        this.categories = document.createElement("div");
        this.categories.className = "categories";
        
        this.root.appendChild(this.search);
        this.root.appendChild(this.categories);
        this.container.appendChild(this.root);
    }
    
    populateNodes() {
        const nodeTypes = LiteGraph.getNodeTypesInCategory();
        const categories = {};
        
        // Group by category
        for (const nodeType in nodeTypes) {
            const info = nodeTypes[nodeType];
            const category = info.category || "basic";
            
            if (!categories[category]) {
                categories[category] = [];
            }
            
            categories[category].push({
                type: nodeType,
                title: info.title || nodeType,
                description: info.description || ""
            });
        }
        
        // Create category sections
        for (const category in categories) {
            this.createCategory(category, categories[category]);
        }
    }
    
    createCategory(name, nodes) {
        const section = document.createElement("div");
        section.className = "category";
        
        const header = document.createElement("div");
        header.className = "category-header";
        header.textContent = name;
        header.addEventListener("click", () => {
            section.classList.toggle("collapsed");
        });
        
        const content = document.createElement("div");
        content.className = "category-content";
        
        for (const node of nodes) {
            const item = this.createNodeItem(node);
            content.appendChild(item);
        }
        
        section.appendChild(header);
        section.appendChild(content);
        this.categories.appendChild(section);
    }
    
    createNodeItem(nodeInfo) {
        const item = document.createElement("div");
        item.className = "node-item";
        item.draggable = true;
        
        item.innerHTML = `
            <div class="node-title">${nodeInfo.title}</div>
            <div class="node-description">${nodeInfo.description}</div>
        `;
        
        // Drag and drop functionality
        item.addEventListener("dragstart", (e) => {
            e.dataTransfer.setData("text/plain", nodeInfo.type);
        });
        
        // Double-click to add
        item.addEventListener("dblclick", () => {
            const node = LiteGraph.createNode(nodeInfo.type);
            if (node) {
                // Add at center of canvas
                const canvas = this.getCanvas();
                const center = canvas.getCanvasCenter();
                node.pos = [center[0] - node.size[0]/2, center[1] - node.size[1]/2];
                canvas.graph.add(node);
            }
        });
        
        return item;
    }
}
```

## Interaction Handling

### 1. Mouse Interaction

```javascript
// Mouse event handling in LGraphCanvas
processMouseDown(e) {
    const canvasPos = this.convertEventToCanvasOffset(e);
    const node = this.getNodeOnPos(canvasPos[0], canvasPos[1]);
    
    if (e.which === 1) { // Left click
        if (node) {
            this.processNodeMouseDown(node, e, canvasPos);
        } else {
            this.processCanvasMouseDown(e, canvasPos);
        }
    } else if (e.which === 3) { // Right click
        this.processContextMenu(e, node);
    }
}

processNodeMouseDown(node, e, canvasPos) {
    // Check for widget interaction
    const widget = this.getWidgetAtPosition(node, canvasPos);
    if (widget) {
        this.processWidgetMouseDown(widget, e);
        return;
    }
    
    // Check for slot interaction
    const slot = this.getSlotAtPosition(node, canvasPos);
    if (slot) {
        this.processSlotMouseDown(node, slot, e);
        return;
    }
    
    // Node selection and dragging
    this.selectNode(node, e.shiftKey);
    this.node_dragged = node;
    this.drag_start_pos = [canvasPos[0] - node.pos[0], canvasPos[1] - node.pos[1]];
}
```

### 2. Keyboard Shortcuts

```javascript
// Keyboard shortcut system
processKey(e) {
    if (e.type === "keydown") {
        switch (e.code) {
            case "Delete":
            case "Backspace":
                this.deleteSelectedNodes();
                break;
                
            case "KeyA":
                if (e.ctrlKey) {
                    this.selectAllNodes();
                    e.preventDefault();
                }
                break;
                
            case "KeyC":
                if (e.ctrlKey) {
                    this.copySelectedNodes();
                    e.preventDefault();
                }
                break;
                
            case "KeyV":
                if (e.ctrlKey) {
                    this.pasteNodes();
                    e.preventDefault();
                }
                break;
                
            case "KeyZ":
                if (e.ctrlKey) {
                    if (e.shiftKey) {
                        this.redo();
                    } else {
                        this.undo();
                    }
                    e.preventDefault();
                }
                break;
                
            case "Space":
                this.showSearchBox();
                e.preventDefault();
                break;
        }
    }
}
```

### 3. Touch and Mobile Support

```javascript
// Touch event handling for mobile devices
processTouchStart(e) {
    if (e.touches.length === 1) {
        // Single touch - treat as mouse
        const touch = e.touches[0];
        this.processMouseDown({
            clientX: touch.clientX,
            clientY: touch.clientY,
            which: 1
        });
    } else if (e.touches.length === 2) {
        // Two finger - zoom/pan
        this.touch_zoom_start = this.getTouchDistance(e.touches[0], e.touches[1]);
        this.touch_center_start = this.getTouchCenter(e.touches[0], e.touches[1]);
    }
}

processTouchMove(e) {
    e.preventDefault();
    
    if (e.touches.length === 1) {
        // Single touch - drag
        const touch = e.touches[0];
        this.processMouseMove({
            clientX: touch.clientX,
            clientY: touch.clientY
        });
    } else if (e.touches.length === 2) {
        // Two finger - zoom and pan
        const currentDistance = this.getTouchDistance(e.touches[0], e.touches[1]);
        const currentCenter = this.getTouchCenter(e.touches[0], e.touches[1]);
        
        // Zoom
        const zoomFactor = currentDistance / this.touch_zoom_start;
        this.setZoom(this.ds.scale * zoomFactor, currentCenter);
        
        // Pan
        const deltaX = currentCenter[0] - this.touch_center_start[0];
        const deltaY = currentCenter[1] - this.touch_center_start[1];
        this.ds.offset[0] += deltaX;
        this.ds.offset[1] += deltaY;
        
        this.setDirty(true, true);
    }
}
```

## Search and Quick Add

### 1. Node Search Dialog

```javascript
// Quick node search and add
class NodeSearchDialog {
    constructor(canvas, position) {
        this.canvas = canvas;
        this.position = position;
        this.createDialog();
        this.populateResults();
    }
    
    createDialog() {
        this.dialog = document.createElement("div");
        this.dialog.className = "node-search-dialog";
        
        this.input = document.createElement("input");
        this.input.type = "text";
        this.input.placeholder = "Search nodes...";
        this.input.addEventListener("input", (e) => this.search(e.target.value));
        this.input.addEventListener("keydown", (e) => this.handleKeyDown(e));
        
        this.results = document.createElement("div");
        this.results.className = "search-results";
        
        this.dialog.appendChild(this.input);
        this.dialog.appendChild(this.results);
        
        document.body.appendChild(this.dialog);
        this.input.focus();
    }
    
    search(query) {
        this.results.innerHTML = "";
        
        if (!query) {
            this.populateResults();
            return;
        }
        
        const nodeTypes = LiteGraph.getNodeTypesInCategory();
        const matches = [];
        
        for (const nodeType in nodeTypes) {
            const info = nodeTypes[nodeType];
            const title = info.title || nodeType;
            
            if (title.toLowerCase().includes(query.toLowerCase()) ||
                nodeType.toLowerCase().includes(query.toLowerCase())) {
                matches.push({ type: nodeType, info: info, title: title });
            }
        }
        
        // Sort by relevance
        matches.sort((a, b) => {
            const aExact = a.title.toLowerCase().startsWith(query.toLowerCase());
            const bExact = b.title.toLowerCase().startsWith(query.toLowerCase());
            if (aExact && !bExact) return -1;
            if (!aExact && bExact) return 1;
            return a.title.localeCompare(b.title);
        });
        
        for (const match of matches.slice(0, 10)) {
            this.addResult(match);
        }
    }
    
    addResult(nodeInfo) {
        const item = document.createElement("div");
        item.className = "search-result";
        item.innerHTML = `
            <div class="result-title">${nodeInfo.title}</div>
            <div class="result-type">${nodeInfo.type}</div>
        `;
        
        item.addEventListener("click", () => {
            this.selectResult(nodeInfo);
        });
        
        this.results.appendChild(item);
    }
    
    selectResult(nodeInfo) {
        const node = LiteGraph.createNode(nodeInfo.type);
        if (node) {
            node.pos = [this.position[0], this.position[1]];
            this.canvas.graph.add(node);
        }
        this.close();
    }
}
```

## Undo/Redo System

```javascript
// Command pattern for undo/redo
class UndoManager {
    constructor() {
        this.history = [];
        this.current_index = -1;
        this.max_history = 50;
    }
    
    addCommand(command) {
        // Remove any commands after current index
        this.history = this.history.slice(0, this.current_index + 1);
        
        // Add new command
        this.history.push(command);
        this.current_index++;
        
        // Limit history size
        if (this.history.length > this.max_history) {
            this.history.shift();
            this.current_index--;
        }
    }
    
    undo() {
        if (this.current_index >= 0) {
            const command = this.history[this.current_index];
            command.undo();
            this.current_index--;
        }
    }
    
    redo() {
        if (this.current_index < this.history.length - 1) {
            this.current_index++;
            const command = this.history[this.current_index];
            command.execute();
        }
    }
}

// Example commands
class AddNodeCommand {
    constructor(graph, node) {
        this.graph = graph;
        this.node = node;
    }
    
    execute() {
        this.graph.add(this.node);
    }
    
    undo() {
        this.graph.remove(this.node);
    }
}

class RemoveNodeCommand {
    constructor(graph, node) {
        this.graph = graph;
        this.node = node;
        this.connections = this.saveConnections(node);
    }
    
    execute() {
        this.graph.remove(this.node);
    }
    
    undo() {
        this.graph.add(this.node);
        this.restoreConnections(this.connections);
    }
}
```

This comprehensive editor system provides a rich, interactive environment for creating and editing node graphs with professional-grade features and extensibility.