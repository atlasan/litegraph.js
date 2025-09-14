# LiteGraph Callback System Documentation

## Overview

LiteGraph implements a sophisticated callback handler system that provides extensive customization and extension capabilities. This system allows developers to hook into virtually every aspect of the library's operation through a priority-based event system.

## Architecture

### Core Components

1. **CallbackHandler Class** (`src/callbackhandler.js`)
   - Central event management system
   - Priority-based execution ordering
   - Dynamic registration/unregistration
   - Event propagation control

2. **Integration Points**
   - `LGraphNode` - Node-level events
   - `LGraphCanvas` - Canvas and UI events
   - `LGraph` - Graph-level events
   - `LGraphGroup` - Group-level events

### Event Flow Architecture

```
Event Trigger → CallbackHandler → Priority Sort → Execute Chain → Return Result
                     ↓
              [Handler 1 (Priority: 10)]
                     ↓
              [Handler 2 (Priority: 5)]
                     ↓
              [Default Handler (Priority: 0)]
                     ↓
              [Handler 3 (Priority: -5)]
```

## Callback Registration API

### Basic Registration

```javascript
// Register a callback handler
const handlerId = node.registerCallbackHandler("onExecute", function(oCbInfo, ...args) {
    // oCbInfo contains execution chain information
    // args are the original event parameters
    
    console.log("Node executing:", this.title);
    
    // Return value can control event propagation
    return true; // Continue chain
    // return false; // Stop chain
    // return null; // No effect on chain
}, options);
```

### Registration Options

```javascript
const options = {
    priority: 10,        // Higher priority executes first (default: 0)
    is_default: false,   // Mark as default library handler (default: false)
    call_once: true      // Execute only once then auto-remove (default: false)
};
```

### Unregistration

```javascript
// Unregister using the returned handler ID
node.unregisterCallbackHandler("onExecute", handlerId);
```

## Complete Event Reference

### Node Events (LGraphNode)

#### Lifecycle Events
- `onNodeCreated` - When node is created
- `onConfigure` - When node configuration is loaded
- `onSerialize` - When node is being serialized
- `onPropertyChanged` - When node property changes
- `onConnectionsChange` - When node connections change
- `onInputAdded` - When input slot is added
- `onOutputAdded` - When output slot is added
- `onInputRemoved` - When input slot is removed
- `onOutputRemoved` - When output slot is removed

#### Execution Events
- `onExecute` - During node execution
- `onAfterExecuteNode` - After node execution completes
- `onAction` - When node receives an action
- `onAfterActionedNode` - After action processing

#### Interaction Events
- `onMouseDown` - Mouse button pressed on node
- `onMouseMove` - Mouse moved over node
- `onMouseUp` - Mouse button released on node
- `onMouseEnter` - Mouse enters node area
- `onMouseLeave` - Mouse leaves node area
- `onDblClick` - Double-click on node
- `onKeyDown` - Key pressed while node selected
- `onKeyUp` - Key released while node selected

#### Connection Events
- `onBeforeConnectInput` - Before input connection is made
- `onConnectInput` - When input is connected
- `onConnectOutput` - When output is connected
- `onNodeConnectionChange` - When any connection changes

#### UI Events
- `onDrawBackground` - Custom background drawing
- `onDrawForeground` - Custom foreground drawing
- `onDrawTitle` - Custom title drawing
- `onDrawTitleBar` - Custom title bar drawing
- `onDrawTitleBox` - Custom title box drawing
- `onDrawTitleText` - Custom title text drawing
- `onDrawCollapsed` - Custom collapsed state drawing
- `onBounding` - Custom bounding box calculation
- `onResize` - When node is resized
- `onSelected` - When node is selected
- `onDeselected` - When node is deselected

#### Widget Events
- `onWidgetChanged` - When widget value changes

#### Slot Events
- `onInputClick` - Input slot clicked
- `onInputDblClick` - Input slot double-clicked
- `onOutputClick` - Output slot clicked
- `onOutputDblClick` - Output slot double-clicked

#### Menu Events
- `getMenuOptions` - Get context menu options
- `getExtraMenuOptions` - Get additional menu options
- `getSlotMenuOptions` - Get slot-specific menu options
- `onGetInputs` - Get available input types
- `onGetOutputs` - Get available output types
- `onMenuNodeInputs` - Handle input menu selection
- `onMenuNodeOutputs` - Handle output menu selection
- `onNodeInputAdd` - When input is added via menu
- `onNodeOutputAdd` - When output is added via menu

#### Data Events
- `onDropFile` - File dropped on node
- `onDropData` - Data dropped on node
- `onDropItem` - Item dropped on node
- `onGetPropertyInfo` - Get property information

### Canvas Events (LGraphCanvas)

#### Rendering Events
- `onRender` - Main render cycle
- `onDrawForeground` - Foreground rendering
- `onDrawBackground` - Background rendering
- `onDrawOverlay` - Overlay rendering
- `onRenderBackground` - Background render phase
- `onDrawLinkTooltip` - Link tooltip rendering

#### Interaction Events
- `onMouseDown` - Mouse button pressed on canvas
- `onMouseMove` - Mouse moved over canvas
- `onMouseUp` - Mouse button released on canvas
- `onClear` - Canvas cleared
- `onSelectionChange` - Selection changed
- `onNodeSelected` - Node selected
- `onNodeDeselected` - Node deselected
- `onNodeDblClicked` - Node double-clicked
- `onNodeMoved` - Node moved

#### UI Events
- `onShowNodePanel` - Show node properties panel
- `onSearchBoxSelection` - Search box selection made

#### Menu Events
- `getMenuOptions` - Get canvas context menu options
- `getExtraMenuOptions` - Get additional canvas menu options
- `onGetNodeMenuOptions` - Get node-specific menu options

#### Drop Events
- `onDropItem` - Item dropped on canvas
- `onDropFile` - File dropped on canvas

### Graph Events (LGraph)

#### Node Management
- `onNodeTypeRegistered` - When node type is registered
- `onNodeTypeReplaced` - When node type is replaced
- `onNodeConnectionChange` - When node connections change
- `onNodeTrace` - Node execution tracing

## Advanced Usage Patterns

### Priority-Based Execution

```javascript
// High priority handler (executes first)
canvas.registerCallbackHandler("onRender", function(oCbInfo) {
    // Pre-processing logic
    console.log("Pre-render setup");
}, { priority: 10 });

// Default priority handler
canvas.registerCallbackHandler("onRender", function(oCbInfo) {
    // Main rendering logic
    console.log("Main render");
}, { priority: 0 });

// Low priority handler (executes last)
canvas.registerCallbackHandler("onRender", function(oCbInfo) {
    // Post-processing logic
    console.log("Post-render cleanup");
}, { priority: -10 });
```

### Event Chain Control

```javascript
node.registerCallbackHandler("onExecute", function(oCbInfo) {
    if (this.properties.disabled) {
        // Stop execution chain
        return false;
    }
    // Continue chain
    return true;
});
```

### Temporary Handlers

```javascript
// Handler that removes itself after first execution
node.registerCallbackHandler("onPropertyChanged", function(oCbInfo, property, value) {
    console.log("Property changed once:", property, value);
    // Handler automatically removed after this execution
}, { call_once: true });
```

### Extension Development Pattern

```javascript
function registerMyExtension() {
    // Store handler IDs for cleanup
    const handlerIds = [];
    
    // Register multiple event handlers
    handlerIds.push(
        LiteGraph.LGraphCanvas.prototype.registerCallbackHandler("onNodeSelected", function(oCbInfo, node) {
            console.log("Extension: Node selected", node.title);
        })
    );
    
    handlerIds.push(
        LiteGraph.LGraphNode.prototype.registerCallbackHandler("onExecute", function(oCbInfo) {
            // Extension logic
        })
    );
    
    // Return cleanup function
    return function cleanup() {
        handlerIds.forEach(id => {
            // Cleanup handlers when extension is disabled
        });
    };
}
```

## Debugging and Development

### Debug Information

The `oCbInfo` parameter provides execution chain information:

```javascript
node.registerCallbackHandler("onExecute", function(oCbInfo, ...args) {
    console.log("Callback Info:", {
        eventName: oCbInfo.eventName,
        handlerId: oCbInfo.handlerId,
        priority: oCbInfo.priority,
        chainPosition: oCbInfo.chainPosition
    });
});
```

### Performance Considerations

1. **High-Frequency Events**: Be careful with `onRender`, `onMouseMove`
2. **Handler Cleanup**: Always unregister handlers when not needed
3. **Priority Usage**: Use appropriate priorities to avoid conflicts
4. **Return Values**: Use return values to control event propagation

### Common Patterns

```javascript
// Conditional execution
node.registerCallbackHandler("onExecute", function(oCbInfo) {
    if (!this.properties.enabled) return;
    // Execute logic
});

// Data validation
node.registerCallbackHandler("onPropertyChanged", function(oCbInfo, property, value) {
    if (property === "important_value" && value < 0) {
        this.properties[property] = 0; // Clamp value
        return false; // Stop further processing
    }
});

// Custom rendering
node.registerCallbackHandler("onDrawForeground", function(oCbInfo, ctx) {
    if (this.properties.showCustomIndicator) {
        ctx.fillStyle = "red";
        ctx.fillRect(this.pos[0], this.pos[1], 10, 10);
    }
});
```

## Integration with Extensions

The callback system is the foundation for the extension system. Extensions should:

1. **Register handlers** during initialization
2. **Store handler IDs** for cleanup
3. **Use appropriate priorities** to avoid conflicts
4. **Provide cleanup functions** for proper unloading

## Best Practices

1. **Always store handler IDs** for proper cleanup
2. **Use meaningful priorities** (0 for normal, ±10 for special cases)
3. **Handle errors gracefully** in callback functions
4. **Minimize work in high-frequency events**
5. **Use `call_once` for initialization handlers**
6. **Document custom events** when creating new callback points
7. **Test event chain behavior** when multiple handlers are registered

## Future Enhancements

- **Event namespacing** for better organization
- **Async callback support** for modern workflows
- **Event batching** for performance optimization
- **Handler dependencies** for complex execution orders
- **Event debugging tools** for development assistance

This callback system represents one of LiteGraph's most powerful features for customization and extension development, enabling deep integration with the library's core functionality.