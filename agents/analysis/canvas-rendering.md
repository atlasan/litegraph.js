# Canvas Rendering System Analysis

## Overview

LiteGraph.js uses a sophisticated HTML5 Canvas-based rendering system that provides high-performance 2D graphics with extensive customization options. The rendering engine is designed for real-time interaction with complex node graphs containing hundreds of nodes.

## Rendering Architecture

### Dual Canvas System

LiteGraph employs a dual-canvas approach for optimal performance:

```javascript
class LGraphCanvas {
    canvas: HTMLCanvasElement;     // Foreground canvas (nodes, UI)
    bgcanvas: HTMLCanvasElement;   // Background canvas (grid, static elements)
    ctx: CanvasRenderingContext2D; // Foreground context
    bgctx: CanvasRenderingContext2D; // Background context
}
```

**Benefits**:
- **Performance**: Static background elements don't need constant redrawing
- **Layering**: Separate rendering passes for different visual elements
- **Optimization**: Selective updates based on what changed

### Rendering Pipeline

The canvas rendering follows a structured pipeline orchestrated by the main `draw()` method:

#### Main Draw Method
```javascript
draw(force_canvas, force_bgcanvas) {
    // FPS counting and timing
    // Compute visible area
    // Conditionally render background and foreground
}
```

#### Background Rendering (`drawBackCanvas()`)
1. **Grid Drawing**: Renders the background grid pattern with scale-dependent visibility
2. **Background Image**: Optional tiled background image with pattern creation
3. **Group Rendering**: Renders node groups if present and not in live mode
4. **Connection Rendering**: Draws all node connections/links with shadows
5. **Canvas Border**: Optional border rendering around the entire canvas

#### Foreground Rendering (`drawFrontCanvas()`)
1. **Canvas Setup**: Clears canvas and applies background canvas as base
2. **Viewport Clipping**: Applies dirty area clipping for performance
3. **Visible Node Computation**: Uses `computeVisibleNodes()` to determine renderable nodes
4. **Node Rendering Loop**: For each visible node:
   - Apply node transformation (translate to node position)
   - Call `drawNode()` with node-specific rendering
   - Restore transformation context
5. **Execution Order**: Optional debug rendering of node execution order
6. **Active Connections**: Renders the connection being dragged by mouse
7. **Debug Information**: Optional info panel and overlays

## Visual Components

### 1. Grid System

```javascript
// Grid rendering configuration
CONST CANVAS_GRID_SIZE = 10;  // Grid cell size

// Grid drawing
drawGrid(ctx) {
    const gridSize = LiteGraph.CANVAS_GRID_SIZE * this.ds.scale;
    
    // Skip grid if too small when zoomed out
    if (gridSize < 2) return;
    
    // Draw grid lines
    ctx.strokeStyle = this.grid_color || "#333";
    ctx.lineWidth = 1;
    
    // Vertical lines
    for (let x = startX; x < endX; x += gridSize) {
        ctx.moveTo(x, startY);
        ctx.lineTo(x, endY);
    }
    
    // Horizontal lines
    for (let y = startY; y < endY; y += gridSize) {
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
    }
    
    ctx.stroke();
}
```

### 2. Node Rendering

#### Node Rendering Components (`drawNode()`)

##### Node Structure and Context
- **Current Node Tracking**: Sets `this.current_node` for context
- **Quality Detection**: Uses `low_quality` flag based on zoom scale (<0.6)
- **Alpha Blending**: Applies `editor_alpha` for transparency effects
- **Shadow Rendering**: Conditional shadow rendering based on quality and settings

##### Node Shapes and Styles
- **Shape Detection**: Uses `node._shape` or defaults to `LiteGraph.BOX_SHAPE`
- **Size Calculation**: Dynamic size calculation with `temp_vec2`
- **Horizontal Layout**: Support for horizontal node orientation
- **Color System**: 
  - `node.color` or `node.constructor.color` for foreground
  - `node.bgcolor` or `node.constructor.bgcolor` for background
  - Fallback to `LiteGraph.NODE_DEFAULT_COLOR/BGCOLOR`

##### Rendering States
- **Live Mode**: Simplified rendering with only `onDrawForeground` callback
- **Collapsed State**: Special rendering via `onDrawCollapsed` callback
- **Custom Drawing**: Node-specific rendering through callback handlers

##### Title Bar and Content Rendering
- **Shadow Effects**: Configurable shadow with offset and blur
- **Clipping Support**: Mask-based clipping for complex shapes
- **Widget Integration**: Embedded widget rendering within nodes

```javascript
// Node rendering components
drawNode(node, ctx) {
    1. // Node background/shape
    this.drawNodeShape(node, ctx);
    
    2. // Title bar
    this.drawNodeTitle(node, ctx);
    
    3. // Input slots (left side)
    this.drawNodeInputs(node, ctx);
    
    4. // Output slots (right side)
    this.drawNodeOutputs(node, ctx);
    
    5. // Widgets (interactive elements)
    this.drawNodeWidgets(node, ctx);
    
    6. // Execution order (if enabled)
    if (this.render_execution_order) {
        this.drawExecutionOrder(node, ctx);
    }
}
```

#### Node Shapes and Styles
```javascript
// Node shape options
LiteGraph.BOX_SHAPE = 1;      // Rectangle (default)
LiteGraph.ROUND_SHAPE = 2;    // Rounded rectangle
LiteGraph.CIRCLE_SHAPE = 3;   // Circle
LiteGraph.CARD_SHAPE = 4;     // Card-like shape
LiteGraph.ARROW_SHAPE = 5;    // Arrow shape

// Node colors
static node_colors = {
    red: { color: "#322", bgcolor: "#533", groupcolor: "#A88" },
    brown: { color: "#332922", bgcolor: "#593930", groupcolor: "#b06634" },
    green: { color: "#232", bgcolor: "#353", groupcolor: "#8A8" },
    blue: { color: "#223", bgcolor: "#335", groupcolor: "#88A" },
    pale_blue: { color: "#2a363b", bgcolor: "#3f5159", groupcolor: "#3f789e" },
    cyan: { color: "#233", bgcolor: "#355", groupcolor: "#8AA" },
    purple: { color: "#323", bgcolor: "#535", groupcolor: "#a8a" },
    yellow: { color: "#432", bgcolor: "#653", groupcolor: "#b8a" },
    black: { color: "#222", bgcolor: "#000", groupcolor: "#444" }
};
```

#### Title Bar Rendering
```javascript
drawNodeTitle(node, ctx) {
    const title = node.getTitle();
    const titleHeight = LiteGraph.NODE_TITLE_HEIGHT;
    
    // Background
    if (this.use_gradients) {
        // Gradient title bar
        const gradient = ctx.createLinearGradient(0, 0, 0, titleHeight);
        gradient.addColorStop(0, node.color || "#999");
        gradient.addColorStop(1, node.bgcolor || "#666");
        ctx.fillStyle = gradient;
    } else {
        // Solid color
        ctx.fillStyle = node.color || "#999";
    }
    
    ctx.fillRect(0, 0, node.size[0], titleHeight);
    
    // Title text
    ctx.fillStyle = this.render_title_colored ? "#FFF" : "#222";
    ctx.font = this.title_text_font;
    ctx.fillText(title, LiteGraph.NODE_TITLE_TEXT_Y, titleHeight * 0.7);
}
```

### 3. Connection Rendering

LiteGraph supports multiple connection rendering modes:

```javascript
// Connection rendering modes
LiteGraph.STRAIGHT_LINK = 0;  // Direct straight lines
LiteGraph.LINEAR_LINK = 1;    // Linear interpolation
LiteGraph.SPLINE_LINK = 2;    // Smooth curves (default)

// Connection rendering
drawConnections(ctx) {
    for (const link of this.graph.links) {
        this.renderLink(ctx, link);
    }
}

renderLink(ctx, link) {
    const startPos = this.getConnectionPos(link.origin_id, link.origin_slot, true);
    const endPos = this.getConnectionPos(link.target_id, link.target_slot, false);
    
    // Connection color based on data type
    ctx.strokeStyle = this.getConnectionColor(link.type);
    ctx.lineWidth = this.connections_width;
    
    switch (this.links_render_mode) {
        case LiteGraph.SPLINE_LINK:
            this.drawSplineLink(ctx, startPos, endPos);
            break;
        case LiteGraph.LINEAR_LINK:
            this.drawLinearLink(ctx, startPos, endPos);
            break;
        case LiteGraph.STRAIGHT_LINK:
            this.drawStraightLink(ctx, startPos, endPos);
            break;
    }
}
```

#### Spline Connection Algorithm
```javascript
drawSplineLink(ctx, start, end) {
    const dist = Math.abs(start[0] - end[0]);
    const cp1x = start[0] + dist * 0.25;
    const cp2x = end[0] - dist * 0.25;
    
    ctx.beginPath();
    ctx.moveTo(start[0], start[1]);
    ctx.bezierCurveTo(cp1x, start[1], cp2x, end[1], end[0], end[1]);
    ctx.stroke();
    
    // Optional: Draw connection arrows
    if (this.render_connection_arrows) {
        this.drawConnectionArrow(ctx, end, cp2x - end[0]);
    }
}
```

### 4. Widget Rendering

Widgets provide interactive UI elements within nodes:

```javascript
// Widget rendering dispatch
drawNodeWidgets(node, posY, ctx, activeWidget) {
    if (!node.widgets || !node.widgets.length) return;
    
    const margin = 15;
    let y = posY + LiteGraph.NODE_WIDGET_HEIGHT + 2;
    
    for (const widget of node.widgets) {
        const widgetY = y;
        y += LiteGraph.NODE_WIDGET_HEIGHT + 4;
        
        // Call widget-specific drawing
        if (widget.draw) {
            widget.draw(ctx, node, node.size[0] - margin, widgetY, LiteGraph.NODE_WIDGET_HEIGHT);
        } else {
            this.drawWidget(ctx, widget, node, widgetY);
        }
    }
}

// Built-in widget renderers
drawWidget(ctx, widget, node, y) {
    switch (widget.type) {
        case "button":
            this.drawButtonWidget(ctx, widget, node, y);
            break;
        case "toggle":
            this.drawToggleWidget(ctx, widget, node, y);
            break;
        case "slider":
            this.drawSliderWidget(ctx, widget, node, y);
            break;
        case "number":
            this.drawNumberWidget(ctx, widget, node, y);
            break;
        case "combo":
            this.drawComboWidget(ctx, widget, node, y);
            break;
    }
}
```

#### Slider Widget Example
```javascript
drawSliderWidget(ctx, widget, node, y) {
    const width = node.size[0] - 30;
    const height = LiteGraph.NODE_WIDGET_HEIGHT;
    
    // Background
    ctx.fillStyle = "#222";
    ctx.fillRect(15, y, width, height);
    
    // Slider track
    ctx.fillStyle = "#333";
    ctx.fillRect(17, y + 2, width - 4, height - 4);
    
    // Slider handle
    const range = widget.options.max - widget.options.min;
    const normalized = (widget.value - widget.options.min) / range;
    const handleX = 17 + (width - 4) * normalized;
    
    ctx.fillStyle = widget.marker ? "#89A" : "#678";
    ctx.fillRect(handleX - 4, y, 8, height);
    
    // Value text
    ctx.fillStyle = "#AAA";
    ctx.font = "10px Arial";
    ctx.fillText(widget.value.toFixed(2), handleX + 10, y + 12);
}
```

## Performance Optimizations

### Viewport Culling (`computeVisibleNodes()`)
- Uses `LiteGraph.overlapBounding()` to test node visibility against `visible_area`
- Skips nodes without draw callbacks in live mode
- Maintains `visible_nodes` array for efficient reuse
- Reduces rendering overhead for large graphs

### Dirty Region Tracking
- `dirty_canvas` and `dirty_bgcanvas` flags control selective rendering
- `dirty_area` defines specific regions needing updates
- `always_render_background` option for dynamic backgrounds
- Viewport clipping with `ctx.clip()` for partial updates

### Level of Detail (LOD) and Quality Management
- `low_quality` flag when scale < 0.6 disables expensive effects
- `low_quality_rendering_counter` tracks performance over time
- Dynamic quality adjustment based on FPS (target: 45 FPS)
- `zoom_modify_alpha` adjusts transparency based on zoom level
- Shadow and effect disabling at low quality levels

### Dual Canvas System Benefits
- Background canvas caching reduces redraw frequency
- Foreground canvas handles dynamic elements (nodes, selections)
- `ctx.drawImage(this.bgcanvas, 0, 0)` for efficient background compositing
- Separate dirty flags allow independent update cycles

### 1. Dirty Region Tracking

```javascript
// Only redraw changed areas
setDirty(foreground, background) {
    if (foreground) {
        this.dirty_canvas = true;
    }
    if (background) {
        this.dirty_bgcanvas = true;
    }
    
    // Schedule redraw
    if (!this.render_timer) {
        this.render_timer = requestAnimationFrame(() => {
            this.render();
            this.render_timer = null;
        });
    }
}
```

### 2. Viewport Culling

```javascript
// Skip rendering nodes outside viewport
isNodeInViewport(node) {
    const margin = 50; // Extra margin for partially visible nodes
    const viewport = this.getViewport();
    
    return !(node.pos[0] + node.size[0] < viewport[0] - margin ||
             node.pos[1] + node.size[1] < viewport[1] - margin ||
             node.pos[0] > viewport[2] + margin ||
             node.pos[1] > viewport[3] + margin);
}
```

### 3. Level of Detail (LOD)

```javascript
// Simplified rendering when zoomed out
getLevelOfDetail() {
    const scale = this.ds.scale;
    
    if (scale < 0.3) return 0;      // Minimal detail
    if (scale < 0.6) return 1;      // Reduced detail
    return 2;                       // Full detail
}

drawNodeLOD(node, ctx, lod) {
    switch (lod) {
        case 0: // Minimal - just boxes
            ctx.fillStyle = node.bgcolor;
            ctx.fillRect(node.pos[0], node.pos[1], node.size[0], node.size[1]);
            break;
            
        case 1: // Reduced - no widgets
            this.drawNodeShape(node, ctx);
            this.drawNodeTitle(node, ctx);
            break;
            
        case 2: // Full detail
            this.drawNode(node, ctx);
            break;
    }
}
```

### 4. Canvas Caching

```javascript
// Cache static elements
cacheStaticElements() {
    if (!this.static_cache_canvas) {
        this.static_cache_canvas = document.createElement('canvas');
        this.static_cache_ctx = this.static_cache_canvas.getContext('2d');
    }
    
    // Render static elements to cache
    this.static_cache_ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.drawGrid(this.static_cache_ctx);
    this.drawGroups(this.static_cache_ctx);
    
    this.static_cache_dirty = false;
}
```

## Rendering Configuration

### Visual Quality Options

```javascript
// High-quality rendering options
highquality_render: boolean = true;     // Enable anti-aliasing
render_shadows: boolean = true;         // Node drop shadows
render_connections_shadows: boolean = false; // Connection shadows (expensive)
render_connections_border: boolean = true;   // Connection borders
use_gradients: boolean = false;         // Title bar gradients
```

### Performance Options

```javascript
// Performance tuning
max_zoom: number = 10;                  // Maximum zoom level
min_zoom: number = 0.1;                 // Minimum zoom level
set_canvas_dirty_on_mouse_event: boolean = true; // Redraw on mouse move
always_render_background: boolean = false;       // Force background redraw
pause_rendering: boolean = false;               // Stop all rendering
```

### Debug and Development Options

```javascript
// Debug visualization
render_execution_order: boolean = false;  // Show node execution order
render_collapsed_slots: boolean = true;   // Show slots on collapsed nodes
show_info: boolean = false;              // Show performance info
render_canvas_border: boolean = false;   // Canvas boundary
```

## Custom Rendering

### Node Custom Drawing

```javascript
class CustomNode extends LGraphNode {
    onDrawBackground(ctx) {
        // Custom background rendering
        ctx.fillStyle = "linear-gradient(to bottom, #ff0000, #00ff00)";
        ctx.fillRect(0, 0, this.size[0], this.size[1]);
    }
    
    onDrawForeground(ctx) {
        // Custom foreground rendering
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.strokeRect(2, 2, this.size[0] - 4, this.size[1] - 4);
    }
}
```

### Canvas Custom Rendering

```javascript
// Override canvas rendering methods
class CustomCanvas extends LGraphCanvas {
    onRenderBackground(canvas, ctx) {
        // Custom background rendering
        const gradient = ctx.createRadialGradient(
            canvas.width/2, canvas.height/2, 0,
            canvas.width/2, canvas.height/2, Math.max(canvas.width, canvas.height)
        );
        gradient.addColorStop(0, "#1a1a2e");
        gradient.addColorStop(1, "#16213e");
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
}
```

This comprehensive rendering system provides the visual foundation for LiteGraph.js, balancing performance with rich visual feedback and customization options.