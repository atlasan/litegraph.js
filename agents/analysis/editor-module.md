# LiteGraph Editor Module Analysis

## Overview

The editor module provides a complete web-based visual interface for creating, editing, and managing LiteGraph workflows. It includes a comprehensive set of UI components, examples, and editor functionality built on top of the core LiteGraph library.

## Module Structure

### Directory Organization
```
editor/
├── demodata/           # Sample media files for demonstrations
│   ├── audio.wav       # Audio sample
│   ├── impulse.wav     # Audio impulse response
│   └── video.webm      # Video sample
├── examples/           # Comprehensive example workflows
│   ├── ancestors/      # Ancestor execution examples
│   ├── audio*.json     # Audio processing workflows
│   ├── conditionals/   # Conditional logic examples
│   ├── features/       # Feature demonstration workflows
│   ├── functions/      # Function node examples
│   ├── graphics/       # Graphics and rendering examples
│   ├── tests/          # Testing workflows
│   ├── three/          # Three.js integration examples
│   └── websocket/      # WebSocket communication examples
├── imgs/               # UI icons and graphics
├── js/                 # JavaScript modules and libraries
│   ├── code.js         # Main editor initialization
│   ├── defaults*.js    # Configuration presets
│   ├── demos.js        # Demo management
│   ├── libs/           # Third-party libraries
│   └── web_console.js  # Web-based console
├── index.html          # Main editor interface
├── editor_*.html       # Specialized editor variants
├── style.css           # Editor-specific styling
└── favicon.svg         # Editor icon
```

## Core Components

### 1. Main Editor Interface (index.html)
```html
<!-- Comprehensive module loading -->
<script type="module" src="../src/litegraph.js"></script>
<script type="module" src="../src/litegraph-editor.js"></script>
<script type="module" src="js/defaults.js"></script>

<!-- Node type libraries -->
<script type="module" src="../src/nodes/base.js"></script>
<script type="module" src="../src/nodes/logic.js"></script>
<script type="module" src="../src/nodes/events.js"></script>
<!-- ... additional node types ... -->
```

**Key Features:**
- Modular architecture with ES6 modules
- Comprehensive node type loading
- Third-party library integration
- Responsive design support

### 2. Editor Initialization (code.js)
```javascript
import { LiteGraph } from "../../src/litegraph.js";
import { Editor } from "../../src/litegraph-editor.js";

// Initialize editor with configuration
var editor = new Editor("main", {miniwindow: false});
window.graphcanvas = editor.graphcanvas;
window.graph = editor.graph;

// High-DPI canvas support
function updateEditorHiPPICanvas() {
    const ratio = window.devicePixelRatio;
    if(ratio == 1) return;
    
    const rect = editor.canvas.parentNode.getBoundingClientRect();
    const { width, height } = rect;
    editor.canvas.width = width * ratio;
    editor.canvas.height = height * ratio;
    editor.canvas.style.width = width + "px";
    editor.canvas.style.height = height + "px";
    editor.canvas.getContext("2d").scale(ratio, ratio);
}
```

**Key Features:**
- High-DPI display support
- Responsive canvas resizing
- Global object exposure for debugging
- Automatic backup to localStorage

### Architecture

### Core Components

1. **Editor Class** (`litegraph-editor.js`): Main editor wrapper
2. **Canvas Integration** (`code.js`): Canvas setup and event handling
3. **Demo System** (`demos.js`): Example graphs and test cases
4. **Configuration** (`defaults.js`): Global settings and feature flags
5. **UI Framework**: HTML/CSS interface with toolbar and panels

## Main Entry Point (`index.html`)

### HTML Structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <title>LiteGraph</title>
    <link rel="icon" href="./favicon.svg"/>
    <link rel="stylesheet" type="text/css" href="../css/litegraph.css">
    <link rel="stylesheet" type="text/css" href="../css/litegraph-editor.css">
    <link rel="stylesheet" type="text/css" href="style.css">
</head>
<body>
    <div id="main"></div>
    <!-- Scripts loaded here -->
</body>
</html>
```

### Module Loading Strategy

**Core Libraries**:
- ES6 modules for LiteGraph core
- Third-party libraries loaded as classic scripts
- Node libraries loaded modularly

**Loading Order**:
1. External libraries (gl-matrix, audiosynth, midi-parser)
2. Core LiteGraph modules
3. Node type libraries (base, math, logic, etc.)
4. Editor-specific modules (demos, code)

## Editor Initialization (`code.js`)

### Core Setup

```javascript
import { LiteGraph } from "../../src/litegraph.js";
import { Editor } from "../../src/litegraph-editor.js";

LiteGraph.log_info("LiteGraph included");
LiteGraph.initialize();

LiteGraph.node_images_path = "../nodes_data/";

var editor = new Editor("main", {miniwindow: false});
window.graphcanvas = editor.graphcanvas;
window.graph = editor.graph;
```

### High-DPI Canvas Support

```javascript
function updateEditorHiPPICanvas() {
    const ratio = window.devicePixelRatio;
    if(ratio == 1) return;
    
    const rect = editor.canvas.parentNode.getBoundingClientRect();
    const { width, height } = rect;
    
    editor.canvas.width = width * ratio;
    editor.canvas.height = height * ratio;
    editor.canvas.style.width = width + "px";
    editor.canvas.style.height = height + "px";
    editor.canvas.getContext("2d").scale(ratio, ratio);
    
    return editor.canvas;
}
```

### Event Handling

**Window Events**:
- `resize`: Canvas resizing and HiDPI updates
- `beforeunload`: Auto-save to localStorage
- `load`: UI initialization and demo setup

**Auto-save Implementation**:
```javascript
window.onbeforeunload = function(){
    var data = JSON.stringify(graph.serialize());
    localStorage.setItem("litegraphg demo backup", data);
}
```

## User Interface Components

### Toolbar System

**Demo Selector**:
```javascript
var elem = document.createElement("span");
elem.id = "LGEditorTopBarSelector";
elem.className = "selector";
elem.innerHTML = "Demo <select><option>Empty</option></select> " +
                "<button class='btn' id='save'>Save</button>" +
                "<button class='btn' id='load'>Load</button>" +
                "<button class='btn' id='download'>Download</button> | " +
                "<button class='btn' id='webgl'>WebGL</button> " +
                "<button class='btn' id='multiview'>Multiview</button>";
```

**Button Functions**:
- **Save**: Store graph to localStorage
- **Load**: Restore graph from localStorage
- **Download**: Export graph as JSON file
- **WebGL**: Enable WebGL rendering context
- **Multiview**: Multiple canvas view mode

### File Operations

**Save to LocalStorage**:
```javascript
elem.querySelector("#save").addEventListener("click", function(){
    localStorage.setItem("graphdemo_save", JSON.stringify(graph.serialize()));
});
```

**Load from LocalStorage**:
```javascript
elem.querySelector("#load").addEventListener("click", function(){
    var data = localStorage.getItem("graphdemo_save");
    if(data) graph.configure(JSON.parse(data));
});
```

**Download as File**:
```javascript
elem.querySelector("#download").addEventListener("click", function(){
    var data = JSON.stringify(graph.serialize());
    var file = new Blob([data]);
    var url = URL.createObjectURL(file);
    var element = document.createElement("a");
    element.setAttribute('href', url);
    element.setAttribute('download', "graph.JSON");
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
});
```

## Demo System (`demos.js`)

### Demo Categories

1. **Basic Functionality Demos**
2. **Feature Testing Nodes**
3. **Performance Benchmarks**
4. **Copy/Paste Testing**
5. **Widget Demonstrations**

### Example Demo: Multi-Connection

```javascript
function multiConnection() {
    var node_button = LiteGraph.createNode("widget/button");
    node_button.pos = [100,400];
    graph.add(node_button);

    var node_console = LiteGraph.createNode("basic/console");
    node_console.pos = [400,400];
    graph.add(node_console);
    node_button.connect(0, node_console);

    var node_const_A = LiteGraph.createNode("basic/const");
    node_const_A.pos = [200,200];
    graph.add(node_const_A);
    node_const_A.setValue(4.5);

    var node_math = LiteGraph.createNode("math/operation");
    node_math.pos = [400,200];
    graph.add(node_math);

    node_const_A.connect(0, node_math, 0);
    // ... additional connections
}
```

### Test Nodes

**Widgets Test Node**:
```javascript
function TestWidgetsNode() {
    this.addInput("in", "number");
    this.addOutput("out", "number");
    this.addWidget("number", "Slider", 0.5, "slider_value", { min: 0, max: 1 });
    this.addWidget("toggle", "Toggle", true, "toggle_value");
    this.addWidget("text", "Text", "hello", "text_value");
    this.addWidget("combo", "Combo", "red", "combo_value", { values: ["red", "green", "blue"] });
}
```

**Custom Shapes Node**:
```javascript
function TestSpecialNode() {
    this.shape = LiteGraph.ROUND_SHAPE;
    this.addInput("in", "number");
    this.addOutput("out", "number");
}

TestSpecialNode.title_mode = LiteGraph.TRANSPARENT_TITLE;
TestSpecialNode.slot_start_y = 20;

TestSpecialNode.prototype.onDrawBackground = function(ctx) {
    ctx.fillStyle = "#AFE";
    ctx.beginPath();
    ctx.roundRect(2, 2, this.size[0] - 4, this.size[1] - 4, 8);
    ctx.fill();
};
```

## Configuration System (`defaults.js`)

### Core Settings

**Debug and Logging**:
```javascript
LiteGraph.debug = true;
LiteGraph.logging_set_level(-1); // -1 none, 0 error, 5 debug
LiteGraph.catch_exceptions = true;
LiteGraph.throw_errors = true;
```

**Security Settings**:
```javascript
LiteGraph.allow_scripts = true; // Enable Formula node code evaluation
```

### UI Behavior Configuration

**Search and Navigation**:
```javascript
LiteGraph.searchbox_extras = {};
LiteGraph.auto_sort_node_types = true;
LiteGraph.search_filter_enabled = true;
LiteGraph.search_show_all_on_open = true;
LiteGraph.search_hide_on_mouse_leave = true;
```

**Visual Feedback**:
```javascript
LiteGraph.node_box_coloured_when_on = true;
LiteGraph.node_box_coloured_by_mode = true;
LiteGraph.show_node_tooltip = true;
LiteGraph.show_node_tooltip_use_descr_property = true;
```

**Interaction Behavior**:
```javascript
LiteGraph.dialog_close_on_mouse_leave = true;
LiteGraph.dialog_close_on_mouse_leave_delay = 500;
LiteGraph.shift_click_do_break_link_from = false;
LiteGraph.click_do_break_link_to = false;
```

### Advanced Features

**Node Manipulation**:
```javascript
LiteGraph.alt_drag_do_clone_nodes = true;
LiteGraph.middle_click_slot_add_default_node = true;
LiteGraph.release_link_on_empty_shows_menu = true;
LiteGraph.ctrl_shift_v_paste_connect_unselected_outputs = true;
```

**Event Processing**:
```javascript
LiteGraph.do_add_triggers_slots = false;
LiteGraph.allow_multi_output_for_events = false;
LiteGraph.refreshAncestorsOnTriggers = false;
LiteGraph.refreshAncestorsOnActions = false;
LiteGraph.use_deferred_actions = true;
```

**History and Undo**:
```javascript
LiteGraph.actionHistory_enabled = false;
LiteGraph.actionHistoryMaxSave = 40;
```

**Property Binding**:
```javascript
LiteGraph.properties_allow_input_binding = false;
LiteGraph.properties_allow_output_binding = false;
```

## WebGL Integration

### WebGL Context Setup

```javascript
function enableWebGL() {
    if (gl) return;
    
    webgl_canvas = document.createElement("canvas");
    webgl_canvas.width = 400;
    webgl_canvas.height = 300;
    webgl_canvas.style.border = "1px solid #AAA";
    
    var container = document.createElement("div");
    container.style.width = "100%";
    container.appendChild(webgl_canvas);
    
    try {
        gl = webgl_canvas.getContext("webgl") || webgl_canvas.getContext("experimental-webgl");
        if (!gl) throw "WebGL not supported";
        
        // WebGL setup code
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.enable(gl.DEPTH_TEST);
        
    } catch (e) {
        console.error("WebGL initialization failed:", e);
    }
}
```

## Performance Considerations

### Canvas Optimization

1. **High-DPI Support**: Automatic pixel ratio detection and scaling
2. **Resize Handling**: Efficient canvas resizing without content loss
3. **Event Throttling**: Optimized event handling for smooth interaction

### Memory Management

1. **Auto-save**: Periodic graph serialization to prevent data loss
2. **Cleanup**: Proper event listener removal and resource cleanup
3. **Demo Loading**: Efficient demo switching without memory leaks

## Integration Points

### Node Library Loading

The editor automatically loads all available node libraries:

```javascript
// Core node types
"../src/nodes/base.js"        // Basic utility nodes
"../src/nodes/logic.js"       // Logic operations
"../src/nodes/events.js"      // Event handling
"../src/nodes/math.js"        // Mathematical operations
"../src/nodes/math3d.js"      // 3D mathematics
"../src/nodes/strings.js"     // String manipulation
"../src/nodes/interface.js"   // UI widgets
"../src/nodes/geometry.js"    // Geometric operations
"../src/nodes/graphics.js"    // Graphics and rendering
"../src/nodes/input.js"       // Input handling
"../src/nodes/midi.js"        // MIDI support
"../src/nodes/audio.js"       // Audio processing
"../src/nodes/network.js"     // Network operations
"../src/nodes/objects.js"     // Object manipulation
"../src/nodes/html.js"        // HTML integration
"../src/nodes/others.js"      // Miscellaneous nodes
```

### Extension System Integration

The editor supports the extension system through:

1. **Callback Registration**: Extensions can hook into editor events
2. **Menu Integration**: Extensions can add menu items and panels
3. **Keyboard Shortcuts**: Extensions can register custom key handlers
4. **Canvas Events**: Extensions can respond to canvas interactions

## Development Workflow

### Local Development

1. **File Serving**: Use local HTTP server for module loading
2. **Live Reload**: Manual refresh for changes (no hot reload)
3. **Debug Mode**: Enable via `LiteGraph.debug = true`
4. **Console Logging**: Comprehensive logging system with levels

### Customization Points

1. **Styling**: Modify CSS files for visual customization
2. **Node Libraries**: Add/remove node type imports
3. **Demo Content**: Modify `demos.js` for custom examples
4. **Configuration**: Adjust `defaults.js` for behavior changes
5. **UI Layout**: Modify HTML structure and toolbar content

## Future Enhancements

### Planned Features

1. **Plugin System**: Dynamic loading of editor plugins
2. **Theme Support**: Multiple visual themes
3. **Layout Management**: Dockable panels and windows
4. **Project Management**: Multi-graph project support
5. **Collaboration**: Real-time collaborative editing
6. **Export Formats**: Multiple export options (PNG, SVG, etc.)
7. **Undo/Redo**: Complete action history system
8. **Search Enhancement**: Advanced node search and filtering

The editor module provides a comprehensive foundation for building sophisticated node-based applications with rich user interfaces and extensive customization options.