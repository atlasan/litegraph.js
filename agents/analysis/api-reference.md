# API Reference Documentation

## Overview

This document provides a comprehensive API reference for LiteGraph.js, covering all major classes, methods, properties, and events. The API is designed to be intuitive while providing extensive customization capabilities.

## Core Classes

### LiteGraph (Global)

The main namespace and entry point for the library.

#### Static Properties

```javascript
// Version information
LiteGraph.VERSION: string                    // Current version

// Node shapes
LiteGraph.BOX_SHAPE: number = 1             // Rectangle shape
LiteGraph.ROUND_SHAPE: number = 2           // Rounded rectangle
LiteGraph.CIRCLE_SHAPE: number = 3          // Circle shape
LiteGraph.CARD_SHAPE: number = 4            // Card shape
LiteGraph.ARROW_SHAPE: number = 5           // Arrow shape

// Connection types
LiteGraph.EVENT: string = "_event_"         // Event connection type
LiteGraph.ACTION: string = "_action_"       // Action connection type

// Canvas constants
LiteGraph.CANVAS_GRID_SIZE: number = 10     // Grid cell size
LiteGraph.NODE_TITLE_HEIGHT: number = 30    // Node title bar height
LiteGraph.NODE_TITLE_TEXT_Y: number = 20    // Title text Y position
LiteGraph.NODE_SLOT_HEIGHT: number = 15     // Slot height
LiteGraph.NODE_WIDGET_HEIGHT: number = 20   // Widget height
LiteGraph.NODE_WIDTH: number = 140          // Default node width
LiteGraph.NODE_MIN_WIDTH: number = 50       // Minimum node width
LiteGraph.NODE_COLLAPSED_RADIUS: number = 10 // Collapsed node radius
LiteGraph.NODE_COLLAPSED_WIDTH: number = 80  // Collapsed node width

// Link rendering modes
LiteGraph.STRAIGHT_LINK: number = 0         // Straight lines
LiteGraph.LINEAR_LINK: number = 1           // Linear interpolation
LiteGraph.SPLINE_LINK: number = 2           // Smooth curves

// Node colors
LiteGraph.node_colors: Object = {
    red: { color: "#322", bgcolor: "#533", groupcolor: "#A88" },
    brown: { color: "#332922", bgcolor: "#593930", groupcolor: "#b06634" },
    green: { color: "#232", bgcolor: "#353", groupcolor: "#8A8" },
    blue: { color: "#223", bgcolor: "#335", groupcolor: "#88A" },
    // ... more colors
}
```

#### Static Methods

```javascript
// Node type management
LiteGraph.registerNodeType(type: string, base_class: Function): void
LiteGraph.createNode(type: string): LGraphNode | null
LiteGraph.getNodeType(type: string): Function | null
LiteGraph.getNodeTypesInCategory(category?: string): Object
LiteGraph.clearRegisteredTypes(): void

// Utility functions
LiteGraph.cloneObject(obj: any, target?: any): any
LiteGraph.distance(a: number[], b: number[]): number
LiteGraph.colorToString(c: number[]): string
LiteGraph.isInsideRectangle(x: number, y: number, left: number, top: number, width: number, height: number): boolean
LiteGraph.growBounding(bounding: number[], x: number, y: number): number[]
LiteGraph.sizeBounding(bounding: number[], size: number[]): void

// Node creation helpers
LiteGraph.wrapFunctionAsNode(name: string, func: Function, param_types?: string[], return_type?: string): Function
LiteGraph.createNodeFromFunction(func: Function, name?: string): Function

// Data type utilities
LiteGraph.compareObjects(a: any, b: any): boolean
LiteGraph.getTime(): number
```

### LGraph

Represents a node graph containing nodes and their connections.

#### Constructor

```javascript
new LGraph(o?: Object)
```

#### Properties

```javascript
// Graph identification
id: number                          // Unique graph ID
title: string                       // Graph title

// Graph state
status: number                      // Execution status
running: boolean                    // Is graph running
iteration: number                   // Current iteration

// Node management
nodes: LGraphNode[]                 // Array of nodes
_nodes_by_id: Object               // Nodes indexed by ID
_nodes_in_order: LGraphNode[]      // Nodes in execution order
_nodes_executable: LGraphNode[]     // Executable nodes only

// Connection management
links: Object                       // Links indexed by ID
last_link_id: number               // Last assigned link ID

// Configuration
config: Object = {
    align_to_grid: false,          // Snap nodes to grid
    links_ontop: false             // Render links on top
}

// Callbacks
onNodeAdded: (node: LGraphNode) => void
onNodeRemoved: (node: LGraphNode) => void
onNodeConnectionChange: (node: LGraphNode) => void
onBeforeStep: () => void
onAfterStep: () => void
```

#### Methods

##### Node Management

```javascript
// Add/remove nodes
add(node: LGraphNode, skip_compute_order?: boolean): void
remove(node: LGraphNode): void
getNodeById(id: number): LGraphNode | null
getNodeByTitle(title: string): LGraphNode | null
getNodesByType(type: string): LGraphNode[]
getNodesByClass(class_type: Function): LGraphNode[]

// Node search
findNodesByTitle(title: string): LGraphNode[]
findNodesByType(type: string): LGraphNode[]
findNodeByTitle(title: string): LGraphNode | null
```

##### Connection Management

```javascript
// Create connections
connect(node_a: LGraphNode, slot_a: number, node_b: LGraphNode, slot_b: number): boolean
disconnect(node: LGraphNode, slot?: number): void

// Link management
addLink(origin_id: number, origin_slot: number, target_id: number, target_slot: number, id?: number): Object
removeLink(link_id: number): boolean
getLinkInfo(link_id: number): Object | null
```

##### Execution Control

```javascript
// Graph execution
start(interval?: number): void
stop(): void
step(num?: number): void
runStep(num?: number, do_not_catch_errors?: boolean): void

// Execution order
computeExecutionOrder(only_onExecute?: boolean, set_level?: boolean): void
```

##### Serialization

```javascript
// Save/load
serialize(): Object
configure(data: Object, keep_old?: boolean): void
toJSON(): string
fromJSON(data: string): void

// Clone
clone(): LGraph
```

##### Utility Methods

```javascript
// Graph analysis
getElapsedTime(): number
getFixedTime(): number
getInputNodes(): LGraphNode[]
getOutputNodes(): LGraphNode[]

// Cleanup
clear(): void
sendActionToCanvas(action: string, params: any[]): void
```

### LGraphNode

Base class for all nodes in the graph.

#### Constructor

```javascript
new LGraphNode(title?: string)
```

#### Properties

```javascript
// Node identification
id: number                          // Unique node ID
type: string                        // Node type
title: string                       // Display title

// Visual properties
pos: number[] = [0, 0]             // Position [x, y]
size: number[] = [0, 0]            // Size [width, height]
color: string                       // Title bar color
bgcolor: string                     // Background color
boxcolor: string                    // Border color
shape: number                       // Node shape (BOX_SHAPE, etc.)

// State
flags: Object = {}                  // Node flags
mode: number = LiteGraph.ALWAYS     // Execution mode
graph: LGraph                       // Parent graph

// Slots
inputs: Object[]                    // Input slots
outputs: Object[]                   // Output slots
connections: Object[]               // Output connections

// Data
properties: Object = {}             // Node properties
properties_info: Object[]           // Property metadata
widgets: Object[]                   // UI widgets
widgets_up: boolean = false         // Widgets above slots
widgets_start_y: number = 4         // Widget start Y position

// Execution
execute_triggered: number = 0       // Execution trigger count
action_triggered: string            // Last triggered action

// Callbacks
onAdded: (graph: LGraph) => void
onRemoved: () => void
onStart: () => void
onStop: () => void
onDrawBackground: (ctx: CanvasRenderingContext2D) => void
onDrawForeground: (ctx: CanvasRenderingContext2D) => void
onMouseDown: (e: MouseEvent, pos: number[], canvas: LGraphCanvas) => boolean
onMouseMove: (e: MouseEvent, pos: number[], canvas: LGraphCanvas) => boolean
onMouseUp: (e: MouseEvent, pos: number[], canvas: LGraphCanvas) => boolean
onMouseEnter: (e: MouseEvent, canvas: LGraphCanvas) => void
onMouseLeave: (e: MouseEvent, canvas: LGraphCanvas) => void
onExecute: () => void
onPropertyChanged: (name: string, value: any, prev_value: any) => boolean
onGetInputs: () => Object[]
onGetOutputs: () => Object[]
```

#### Methods

##### Slot Management

```javascript
// Input slots
addInput(name: string, type?: string, extra_info?: Object): number
addInputs(array: Array): void
removeInput(slot: number): boolean
removeOutput(slot: number): boolean

// Output slots
addOutput(name: string, type?: string, extra_info?: Object): number
addOutputs(array: Array): void

// Slot queries
findInputSlot(name: string): number
findOutputSlot(name: string): number
getInputData(slot: number, default_value?: any): any
setOutputData(slot: number, data: any): void
getInputDataType(slot: number): string | null
getOutputDataType(slot: number): string | null

// Slot information
getInputInfo(slot: number): Object | null
getOutputInfo(slot: number): Object | null
getConnectionPos(is_input: boolean, slot_number: number, out?: number[]): number[]
```

##### Connection Management

```javascript
// Connect/disconnect
connect(slot: number, target_node: LGraphNode, target_slot?: number): boolean
disconnect(slot: number, target_node?: LGraphNode): boolean
disconnectInput(slot: number): boolean
disconnectOutput(slot: number, target_slot?: number): boolean

// Connection queries
isInputConnected(slot: number): boolean
isOutputConnected(slot: number): boolean
getInputNode(slot: number): LGraphNode | null
getInputLink(slot: number): Object | null
```

##### Widget Management

```javascript
// Add widgets
addWidget(type: string, name: string, value: any, callback?: Function, options?: Object): Object
addCustomWidget(custom_widget: Object): Object

// Widget queries
getWidgetValue(name: string): any
setWidgetValue(name: string, value: any): void
getWidget(name: string): Object | null
```

##### Property Management

```javascript
// Properties
addProperty(name: string, default_value: any, type?: string, extra_info?: Object): void
setProperty(name: string, value: any): void
getProperty(name: string): any
getPropertyInfo(name: string): Object | null
```

##### Execution

```javascript
// Trigger execution
trigger(action?: string, param?: any): void
triggerSlot(slot: number, param?: any, link_id?: number): void

// Action handling
actionDo(action: string, param?: any, options?: Object): any
```

##### Serialization

```javascript
// Save/load
serialize(): Object
configure(info: Object): void
clone(): LGraphNode
```

##### Utility Methods

```javascript
// Node information
getTitle(): string
setDirtyCanvas(dirty_foreground?: boolean, dirty_background?: boolean): void
getBounding(out?: number[]): number[]

// Collision detection
isPointInside(x: number, y: number, margin?: number, skip_title?: boolean): boolean
isPointInsideNode(x: number, y: number, margin?: number): boolean

// Resize
setSize(size: number[]): void
computeSize(out?: number[]): number[]
```

### LGraphCanvas

Handles rendering and user interaction with the graph.

#### Constructor

```javascript
new LGraphCanvas(canvas: HTMLCanvasElement, graph?: LGraph, options?: Object)
```

#### Properties

```javascript
// Canvas elements
canvas: HTMLCanvasElement           // Main canvas
bgcanvas: HTMLCanvasElement         // Background canvas
ctx: CanvasRenderingContext2D      // Main context
bgctx: CanvasRenderingContext2D    // Background context

// Graph reference
graph: LGraph                       // Associated graph

// Rendering state
dirty_canvas: boolean = true        // Needs redraw
dirty_bgcanvas: boolean = true      // Background needs redraw
dirty_area: number[] | null         // Dirty rectangle

// View transformation
ds: Object = {                      // Display state
    scale: 1,                       // Zoom level
    offset: [0, 0]                  // Pan offset
}

// Interaction state
node_dragged: LGraphNode | null     // Currently dragged node
node_over: LGraphNode | null        // Node under mouse
node_capturing_input: LGraphNode | null // Node capturing input
connecting_node: LGraphNode | null  // Node being connected
connecting_output: number | null    // Output slot being connected
connecting_pos: number[] | null     // Connection position

// Selection
selected_nodes: Object = {}         // Selected nodes
selected_group: Object | null       // Selected group

// Configuration
options: Object = {
    skip_render: false,             // Skip rendering
    skip_events: false,             // Skip event handling
    new_connection_color: "#AAF",   // New connection color
    default_connection_color: "#AAA", // Default connection color
    highlight_color: "#AAF",        // Highlight color
    node_title_color: "#999",       // Node title color
    default_link_color: "#AAA",     // Default link color
    max_zoom: 10,                   // Maximum zoom
    min_zoom: 0.1                   // Minimum zoom
}

// Rendering options
render_shadows: boolean = true      // Render drop shadows
render_canvas_border: boolean = true // Render canvas border
render_connections_shadows: boolean = false // Render connection shadows
render_connections_border: boolean = true   // Render connection borders
render_curved_connections: boolean = false  // Use curved connections
render_connection_arrows: boolean = false   // Show connection arrows
render_collapsed_slots: boolean = true      // Show slots on collapsed nodes
render_execution_order: boolean = false     // Show execution order
render_title_colored: boolean = true        // Colored node titles
use_gradients: boolean = false      // Use gradients in rendering

// Callbacks
onNodeSelected: (node: LGraphNode) => void
onNodeDeselected: (node: LGraphNode) => void
onShowNodePanel: (node: LGraphNode) => void
onNodeDblClicked: (node: LGraphNode) => void
onSelectionChange: (nodes: Object) => void
onConnectingChange: (node: LGraphNode, slot: number) => void
onBeforeChange: (graph: LGraph) => void
onAfterChange: (graph: LGraph) => void
```

#### Methods

##### Rendering Control

```javascript
// Main rendering
render(force_canvas?: boolean, force_bgcanvas?: boolean): void
draw(force_foreground?: boolean, force_background?: boolean): void

// Dirty management
setDirty(foreground?: boolean, background?: boolean): void
setDirtyArea(x: number, y: number, w: number, h: number): void

// Background rendering
drawBackCanvas(): void
drawFrontCanvas(): void
```

##### View Control

```javascript
// Zoom and pan
setZoom(value: number, zooming_center?: number[]): void
changeZoom(value: number, zooming_center?: number[]): void
ds.changeScale(value: number, zooming_center?: number[]): void
resetTransform(): void

// View utilities
convertEventToCanvasOffset(e: MouseEvent): number[]
convertCanvasToOffset(pos: number[], out?: number[]): number[]
convertOffsetToCanvas(pos: number[], out?: number[]): number[]
getCanvasWindow(): number[]
```

##### Node Interaction

```javascript
// Node queries
getNodeOnPos(x: number, y: number, nodes_list?: LGraphNode[]): LGraphNode | null
getNodesInArea(x: number, y: number, w: number, h: number, result?: LGraphNode[]): LGraphNode[]
getGroupOnPos(x: number, y: number): Object | null

// Selection
selectNode(node: LGraphNode, add_to_current_selection?: boolean): void
selectNodes(nodes: LGraphNode[]): void
deselectNode(node: LGraphNode): void
deselectAllNodes(): void
deleteSelectedNodes(): void

// Node operations
centerOnNode(node: LGraphNode): void
adjustNodesSize(nodes: LGraphNode[]): void
```

##### Event Handling

```javascript
// Mouse events
processMouseDown(e: MouseEvent): void
processMouseMove(e: MouseEvent): void
processMouseUp(e: MouseEvent): void
processMouseWheel(e: WheelEvent): boolean

// Keyboard events
processKey(e: KeyboardEvent): boolean

// Touch events (mobile)
processTouchStart(e: TouchEvent): void
processTouchMove(e: TouchEvent): void
processTouchEnd(e: TouchEvent): void
```

##### Connection Management

```javascript
// Connection rendering
renderLink(ctx: CanvasRenderingContext2D, a: number[], b: number[], link?: Object, skip_border?: boolean, flow?: boolean, color?: string, start_dir?: string, end_dir?: string, num_sublines?: number): void

// Connection interaction
checkPanels(): boolean
closeAllPanels(): void
```

## Widget Types

### Built-in Widgets

```javascript
// Widget type constants
LiteGraph.WIDGET_BUTTON = "button"
LiteGraph.WIDGET_TOGGLE = "toggle"
LiteGraph.WIDGET_NUMBER = "number"
LiteGraph.WIDGET_SLIDER = "slider"
LiteGraph.WIDGET_COMBO = "combo"
LiteGraph.WIDGET_TEXT = "text"
LiteGraph.WIDGET_TEXTAREA = "textarea"
LiteGraph.WIDGET_COLOR = "color"
LiteGraph.WIDGET_FILE = "file"

// Widget creation
node.addWidget("button", "Click Me", null, function() {
    console.log("Button clicked!");
});

node.addWidget("slider", "Value", 0.5, function(value) {
    console.log("Slider value:", value);
}, { min: 0, max: 1, step: 0.01 });

node.addWidget("combo", "Option", "A", function(value) {
    console.log("Selected:", value);
}, { values: ["A", "B", "C"] });
```

### Custom Widget Creation

```javascript
// Custom widget definition
function createCustomWidget(node, name, value, callback, options) {
    const widget = {
        name: name,
        value: value,
        type: "custom",
        options: options || {},
        
        draw: function(ctx, node, width, y, height) {
            // Custom drawing code
            ctx.fillStyle = "#333";
            ctx.fillRect(0, y, width, height);
            
            ctx.fillStyle = "#FFF";
            ctx.font = "12px Arial";
            ctx.fillText(this.name + ": " + this.value, 10, y + 15);
        },
        
        mouse: function(event, pos, node) {
            // Handle mouse interaction
            if (event.type === "mousedown") {
                // Handle click
                if (callback) {
                    callback(this.value, this, node);
                }
                return true; // Event handled
            }
            return false;
        },
        
        computeSize: function(width) {
            return [width, 25]; // Return [width, height]
        }
    };
    
    return widget;
}
```

## Events and Callbacks

### Graph Events

```javascript
// Graph lifecycle
graph.onNodeAdded = function(node) {
    console.log("Node added:", node.title);
};

graph.onNodeRemoved = function(node) {
    console.log("Node removed:", node.title);
};

graph.onNodeConnectionChange = function(node) {
    console.log("Node connections changed:", node.title);
};

// Execution events
graph.onBeforeStep = function() {
    console.log("Before step execution");
};

graph.onAfterStep = function() {
    console.log("After step execution");
};
```

### Node Events

```javascript
// Node lifecycle
node.onAdded = function(graph) {
    console.log("Node added to graph");
};

node.onRemoved = function() {
    console.log("Node removed from graph");
};

// Execution events
node.onExecute = function() {
    // Main execution logic
    const input = this.getInputData(0);
    const result = input * 2;
    this.setOutputData(0, result);
};

// Property events
node.onPropertyChanged = function(name, value, prev_value) {
    console.log(`Property ${name} changed from ${prev_value} to ${value}`);
    return true; // Allow change
};

// Drawing events
node.onDrawBackground = function(ctx) {
    // Custom background drawing
    ctx.fillStyle = "rgba(255, 0, 0, 0.1)";
    ctx.fillRect(0, 0, this.size[0], this.size[1]);
};

node.onDrawForeground = function(ctx) {
    // Custom foreground drawing
    ctx.strokeStyle = "#FF0000";
    ctx.strokeRect(0, 0, this.size[0], this.size[1]);
};

// Mouse events
node.onMouseDown = function(e, pos, canvas) {
    console.log("Mouse down on node");
    return false; // Don't consume event
};

node.onMouseMove = function(e, pos, canvas) {
    // Handle mouse move
    return false;
};

node.onMouseUp = function(e, pos, canvas) {
    // Handle mouse up
    return false;
};
```

### Canvas Events

```javascript
// Selection events
canvas.onNodeSelected = function(node) {
    console.log("Node selected:", node.title);
};

canvas.onNodeDeselected = function(node) {
    console.log("Node deselected:", node.title);
};

canvas.onSelectionChange = function(nodes) {
    console.log("Selection changed:", Object.keys(nodes).length, "nodes");
};

// Interaction events
canvas.onNodeDblClicked = function(node) {
    console.log("Node double-clicked:", node.title);
};

canvas.onShowNodePanel = function(node) {
    // Show custom node panel
    showNodeProperties(node);
};

// Connection events
canvas.onConnectingChange = function(node, slot) {
    console.log("Connection state changed");
};
```

This API reference provides the foundation for building custom nodes, extending functionality, and integrating LiteGraph.js into applications.