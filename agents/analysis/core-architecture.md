# Core Architecture Analysis

## Overview

LiteGraph.js is built around a clean, object-oriented architecture with four primary classes that work together to provide a complete node-based visual programming environment.

## Core Classes

### 1. LiteGraph (litegraph.js)

**Purpose**: Central registry and utility hub for the entire system.

**Key Responsibilities**:
- Node type registration and management
- Global configuration and constants
- Utility functions for data formatting and type conversion
- Event system coordination
- Plugin and extension management

**Key Methods**:
```javascript
// Node registration
LiteGraph.registerNodeType(type, base_class)
LiteGraph.createNode(type)
LiteGraph.getNodeType(type)
LiteGraph.getNodeTypesInCategory(category)

// Utility functions
LiteGraph.cloneObject(obj)
LiteGraph.isValidConnection(type_a, type_b)
LiteGraph.formatNumber(num, precision)

// Function wrapping
LiteGraph.wrapFunctionAsNode(name, func, param_types, return_type)
```

**Configuration Constants**:
- `NODE_SLOT_HEIGHT = 15` - Height of input/output slots
- `NODE_WIDGET_HEIGHT = 20` - Height of widgets
- `NODE_WIDTH = 140` - Default node width
- `CANVAS_GRID_SIZE = 10` - Grid snap size
- `MAX_NUMBER_OF_NODES = 1000` - Performance limit

### 2. LGraph (lgraph.js)

**Purpose**: Container and execution engine for the node graph.

**Key Responsibilities**:
- Node lifecycle management (add, remove, configure)
- Graph execution and data flow coordination
- Serialization and deserialization
- Global variables and context management
- Performance monitoring and optimization

**Core Properties**:
```javascript
class LGraph {
    list_of_graphnodes = []     // All nodes in the graph
    _nodes_by_id = {}           // Fast node lookup by ID
    _nodes_in_order = []        // Execution order cache
    links = {}                  // All connections in the graph
    globaltime = 0              // Current execution time
    runningtime = 0             // Total execution time
    iteration = 0               // Execution cycle count
    config = {}                 // Graph configuration
    vars = {}                   // Global variables
    status = LGraph.STATUS_STOPPED
}
```

**Execution Flow**:
1. **start()** - Begins graph execution loop
2. **runStep()** - Executes one iteration
3. **computeExecutionOrder()** - Determines node execution sequence
4. **Node execution** - Calls onExecute() on each node in order
5. **Link propagation** - Transfers data between connected nodes

**Serialization**:
```javascript
// Save graph state
const data = graph.serialize()

// Load graph state
graph.configure(data)
```

### 3. LGraphNode (lgraphnode.js)

**Purpose**: Base class for all nodes in the system.

**Key Responsibilities**:
- Input/output slot management
- Property and widget handling
- Execution lifecycle (onExecute, onAction, etc.)
- Connection validation and data transfer
- Serialization of node state

**Core Structure**:
```javascript
class LGraphNode {
    inputs = []          // Input slots [{name, type, link}]
    outputs = []         // Output slots [{name, type, links[]}]
    properties = {}      // Node configuration properties
    widgets = []         // UI widgets for interaction
    size = [140, 60]     // Node dimensions [width, height]
    pos = [10, 10]       // Position [x, y]
    id = -1              // Unique identifier
    type = null          // Node type string
    title = ""           // Display name
    flags = {}           // Node state flags
}
```

**Lifecycle Methods**:
- `constructor()` - Initialize node structure
- `onExecute()` - Main execution logic (called every frame)
- `onAction(action, param)` - Handle triggered actions
- `onPropertyChanged(name, value)` - React to property changes
- `onConnectionsChange()` - Handle connection updates
- `onAdded()` - Called when added to graph
- `onRemoved()` - Called when removed from graph

**Data Flow Methods**:
```javascript
// Input handling
const value = this.getInputData(slot_index)
const isConnected = this.isInputConnected(slot_index)

// Output handling
this.setOutputData(slot_index, value)
this.triggerSlot(slot_index, param)

// Dynamic slots
this.addInput(name, type)
this.addOutput(name, type)
this.removeInput(slot_index)
this.removeOutput(slot_index)
```

### 4. LGraphCanvas (lgraphcanvas.js)

**Purpose**: Rendering engine and user interaction handler.

**Key Responsibilities**:
- Canvas rendering and visual presentation
- Mouse and keyboard event handling
- Node selection and manipulation
- Connection creation and editing
- Context menus and UI overlays
- Zoom, pan, and navigation

**Rendering Pipeline**:
1. **Background rendering** - Grid, background image
2. **Group rendering** - Node group backgrounds
3. **Connection rendering** - Links between nodes
4. **Node rendering** - Node boxes, titles, slots
5. **Widget rendering** - Interactive UI elements
6. **Overlay rendering** - Selection boxes, tooltips

**Interaction Features**:
```javascript
// Canvas navigation
allow_dragcanvas = true      // Enable panning
allow_dragnodes = true       // Enable node dragging
allow_interaction = true     // Enable widget interaction
allow_searchbox = true       // Enable node search

// Visual options
highquality_render = true    // Anti-aliasing
render_shadows = true        // Drop shadows
render_connections_border = true
render_connection_arrows = false
use_gradients = false        // Title bar gradients
```

**Event Handling**:
- Mouse events (click, drag, wheel)
- Keyboard shortcuts
- Touch events for mobile
- Context menu triggers
- File drop handling

## Data Flow Architecture

### Connection System

Connections (links) transfer data between nodes using a typed system:

```javascript
// Link structure
const link = {
    id: unique_id,
    origin_id: source_node_id,
    origin_slot: output_slot_index,
    target_id: target_node_id,
    target_slot: input_slot_index,
    type: data_type
}
```

### Type System

LiteGraph uses a flexible type system:
- **Primitive types**: `number`, `string`, `boolean`
- **Structured types**: `vec2`, `vec3`, `vec4`, `color`
- **Complex types**: `texture`, `geometry`, `audio`
- **Generic types**: `*` (accepts any), `0` (auto-detect)

### Execution Model

**Pull-based Execution**: Nodes request data from their inputs when needed.

```javascript
onExecute() {
    // Pull data from inputs
    const a = this.getInputData(0);
    const b = this.getInputData(1);
    
    // Process data
    const result = a + b;
    
    // Push to outputs
    this.setOutputData(0, result);
}
```

**Event-driven Actions**: Nodes can trigger actions on other nodes.

```javascript
// Trigger an action
this.triggerSlot(0, "start", {data: value});

// Handle action in target node
onAction(action, param) {
    if (action === "start") {
        this.process(param.data);
    }
}
```

## Memory Management

### Object Pooling
LiteGraph implements object pooling for performance:
- Link objects are reused
- Temporary vectors are pooled
- Canvas contexts are cached

### Garbage Collection
- Automatic cleanup of disconnected links
- Node removal clears all references
- Event listeners are properly unbound

## Performance Optimizations

### Rendering Optimizations
- **Dirty regions**: Only redraw changed areas
- **Culling**: Skip rendering of off-screen nodes
- **Level of detail**: Simplified rendering when zoomed out
- **Background caching**: Static background elements cached

### Execution Optimizations
- **Execution order caching**: Pre-computed node execution sequence
- **Conditional execution**: Skip nodes with no connected outputs
- **Batch processing**: Group similar operations

### Memory Optimizations
- **Sparse arrays**: Efficient storage for large graphs
- **Reference counting**: Automatic cleanup of unused objects
- **String interning**: Shared string constants

## Extension Points

The architecture provides multiple extension points:

1. **Custom Node Types**: Inherit from LGraphNode
2. **Custom Widgets**: Implement widget interface
3. **Rendering Hooks**: Override canvas drawing methods
4. **Event Handlers**: Custom interaction behaviors
5. **Serialization**: Custom data formats

This modular architecture makes LiteGraph.js highly extensible while maintaining performance and ease of use.