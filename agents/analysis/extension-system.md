# Extension System and Plugin Architecture

## Overview

LiteGraph.js features a flexible extension system that allows developers to enhance the core functionality through plugins. The extension system is built around a callback handler mechanism that enables extensions to hook into various events and user interactions.

## Extension Architecture

### Core Components

1. **Callback Handler System**: Central event management system
2. **Extension Registration**: Automatic registration on canvas construction
3. **Event Hooks**: Multiple interaction points for extensions
4. **Modular Design**: Self-contained extension modules

### Extension Structure

All extensions follow a consistent pattern:

```javascript
export let registerExtension_[name] = function(graphcanvas) {
    let ext = "extension_name";
    let debug = false;
    
    // Register event handlers
    graphcanvas.registerCallbackHandler("eventName", function(oCbInfo, ...args) {
        // Extension logic
    });
};

// Auto-registration
if(typeof(graphcanvas)!=="undefined"){
    registerExtension_[name](graphcanvas);
}

LiteGraph.registerCallbackHandler("on_lgraphcanvas_construct", function(oCbInfo, graphcanvas){
    registerExtension_[name](graphcanvas);
});
```

## Available Extensions

### 1. AutoConnect Extension (`autoconnect.js`)

**Purpose**: Automatically connects selected nodes to a target node

**Features**:
- Press 'A' key to activate connection mode
- Click on target node to auto-connect all selected nodes
- Uses graph's `autoConnectNodes()` method
- Single-use event registration with `call_once: true`

**Key Implementation**:
```javascript
// Activates on 'A' key (keyCode 65)
case 65: // a
    // Collect selected nodes
    let aNodesFrom = [];
    for(let iO in graphcanvas.selected_nodes){
        aNodesFrom.push(graphcanvas.selected_nodes[iO]);
    }
    
    // Register one-time mouse handler
    graphcanvas.registerCallbackHandler("onMouseDown", function(md_oCbInfo, e){
        let node_to = graphcanvas.graph.getNodeOnPos(e.canvasX, e.canvasY, graphcanvas.visible_nodes, 5);
        if(node_to){
            for(let node_from of aNodesFrom){
                graphcanvas.graph.autoConnectNodes(node_from, node_to);
            }
        }
    }, { call_once: true });
```

### 2. Keyboard Helper Extension (`keyboard_helper.js`)

**Purpose**: Enhanced keyboard navigation and node manipulation

**Features**:
- Arrow key navigation for selected nodes
- Shift+Right Arrow: Show search box for new connected nodes
- Ctrl+Right Arrow: Show connection menu
- Ctrl+Up Arrow: Select sibling nodes (connected inputs)
- Grid-aligned movement with `LiteGraph.CANVAS_GRID_SIZE`

**Key Implementation**:
```javascript
case 39: // ArrowRight
    if(keyEvent.shiftKey || keyEvent.ctrlKey){
        // Position calculation for search/connection dialogs
        const gloCoord = graphcanvas.convertOffsetToEditorArea(nodeX.pos);
        keyEvent.clientX = gloCoord[0] + nodeX.size[0] + 33;
        keyEvent.clientY = gloCoord[1];
        
        if(keyEvent.shiftKey){
            graphcanvas.showSearchBox(keyEvent, {
                node_from: nodeX, 
                slot_from: nodeX.outputs[0], 
                type_filter_in: nodeX.outputs[0].type
            });
        }
    } else {
        // Move nodes right
        for(let iN=0; iN<aNodesFrom.length; iN++){
            aNodesFrom[iN].alignToGrid();
            aNodesFrom[iN].pos[0] += LiteGraph.CANVAS_GRID_SIZE;
        }
    }
```

### 3. Renamer Extension (`renamer.js`)

**Purpose**: Quick renaming of nodes and groups

**Features**:
- F2 key activation
- Rename selected nodes (single or multiple)
- Rename groups when no nodes selected
- Uses canvas prompt system

**Key Implementation**:
```javascript
case 113: // F2
    let nSel = Object.keys(graphcanvas.selected_nodes).length;
    
    if(nSel){
        // Rename selected nodes
        let actT = nSel == 1 
            ? graphcanvas.selected_nodes[Object.keys(graphcanvas.selected_nodes)[0]].title
            : "titleForMany";
        
        var fCB = function(tIn){
            for(let iN in graphcanvas.selected_nodes){
                graphcanvas.selected_nodes[iN].title = tIn;
            }
        }
        
        graphcanvas.prompt("Title", actT, fCB, keyEvent);
    } else {
        // Check for group under mouse
        const groupOver = graphcanvas.graph.getGroupOnPos(mouseCoord[0], mouseCoord[1]);
        if(groupOver){
            var fCB = function(tIn){ groupOver.title = tIn; }
            graphcanvas.prompt("Title", groupOver.title, fCB, keyEvent);
        }
    }
```

### 4. Options Panel Extension (`options_panel.js`)

**Purpose**: Runtime configuration panel for canvas options

**Features**:
- Dynamic options panel creation
- Live canvas option modification
- Configurable option sets via `LiteGraph.availableCanvasOptions`
- Integration with canvas menu system

**Available Options**:
- Rendering options (gradients, shadows, borders)
- Interaction controls (drag, resize, search)
- Display settings (info, execution order, tooltips)
- Performance settings (pause rendering, background clearing)

## Callback Handler System

### Event Types

Extensions can hook into numerous events:

**Input Events**:
- `onKeyDown` / `onKeyUp`
- `onMouseDown` / `onMouseMove` / `onMouseUp`
- `onMouseEnter` / `onMouseLeave`

**Canvas Events**:
- `onRender` / `onDrawForeground` / `onDrawBackground`
- `onClear` / `onSelectionChange`
- `onDropItem` / `onDropFile`

**Node Events**:
- `onNodeCreated` / `onNodeSelected` / `onNodeDeselected`
- `onNodeMoved` / `onPropertyChanged`
- `onConnectionsChange`

### Registration Pattern

```javascript
graphcanvas.registerCallbackHandler("eventName", function(oCbInfo, ...eventArgs) {
    // oCbInfo contains event execution chain information
    // eventArgs are the original event parameters
    
    // Extension logic here
    
    // Return value can influence event propagation
    return result;
}, options);
```

**Options**:
- `call_once: true` - Handler executes only once then removes itself
- Priority and execution order controls

## Extension Development Guidelines

### Best Practices

1. **Consistent Naming**: Use `registerExtension_[name]` pattern
2. **Debug Support**: Include debug flags and logging
3. **Event Cleanup**: Use `call_once` for temporary handlers
4. **Error Handling**: Check for required objects/methods
5. **Performance**: Minimize heavy operations in frequent events

### Extension Template

```javascript
import { LiteGraph } from "../litegraph.js";

export let registerExtension_myextension = function(graphcanvas){
    let ext = "my_extension";
    let debug = false;
    
    // Main event handler
    graphcanvas.registerCallbackHandler("onKeyDown", function(oCbInfo, keyEvent){
        if(debug) console.info(ext, "*** onKeyDown handler ***", ...arguments);
        
        // Skip repeated events
        if(keyEvent.repeat) return;
        
        switch(keyEvent.keyCode){
            case 123: // F12 or custom key
                // Extension logic
                break;
            default:
                if(debug) console.debug(ext, "ignore key", keyEvent.keyCode);
                break;
        }
    });
};

// Auto-registration
if(typeof(graphcanvas)!=="undefined"){
    registerExtension_myextension(graphcanvas);
}

LiteGraph.registerCallbackHandler("on_lgraphcanvas_construct", function(oCbInfo, graphcanvas){
    registerExtension_myextension(graphcanvas);
});
```

### Integration Points

1. **Canvas Menu**: Add options via `getMenuOptions` callback
2. **Node Context**: Extend node menus via `getExtraMenuOptions`
3. **Search Integration**: Hook into `onSearchBoxSelection`
4. **Property Panels**: Extend via `onShowNodePanel`

## Future Development

The extension system is marked as WIP (Work In Progress) with plans for:

1. **Enhanced Event System**: More granular event hooks
2. **ComfyUI-style Extensions**: Following ComfyUI's extension patterns
3. **Better Documentation**: Comprehensive extension API docs
4. **Extension Manager**: Runtime loading/unloading of extensions
5. **Extension Registry**: Centralized extension discovery

## Extension Loading

Extensions are automatically loaded when:
1. Canvas is constructed (`on_lgraphcanvas_construct` event)
2. Extension is imported and `graphcanvas` is available
3. Manual registration via `registerExtension_[name](graphcanvas)`

This dual registration ensures extensions work in both direct inclusion and dynamic loading scenarios.

## Debugging Extensions

All extensions include debug flags:
```javascript
let debug = false; // Set to true for detailed logging
if(debug) console.info(ext, "debug message", ...arguments);
```

Enable debugging by setting the debug flag to `true` in individual extensions or globally via:
```javascript
graphcanvas.cb_handler.debug = true; // Debug callback handler itself
```