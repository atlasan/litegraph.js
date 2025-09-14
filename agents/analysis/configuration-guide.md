# LiteGraph Configuration Guide

## Overview

LiteGraph.js provides an extensive configuration system that allows fine-tuning of graph behavior, visual rendering, debugging, performance, and security settings. This guide documents all configuration options and provides examples for common use cases.

## Core Configuration System

### LiteGraph.graphDefaultConfig

The primary configuration object that controls global graph behavior:

```javascript
LiteGraph.graphDefaultConfig = {
    // Execution Configuration
    execution_mode: LiteGraph.EXECUTION_MODE.ON_TRIGGER,
    flow_type: LiteGraph.FLOW_TYPE.FORWARD,
    max_execution_time: 1000, // milliseconds
    max_iterations: 1000,
    
    // Visual Configuration
    align_to_grid: true,
    links_ontop: false,
    show_info: true,
    show_fps: false,
    
    // Debug Configuration
    debug_level: 1, // 0=none, 1=errors, 2=warnings, 3=info, 4=debug, 5=verbose
    catch_exceptions: true,
    throw_errors: false,
    
    // Performance Configuration
    use_uuids: false,
    skip_render_if_not_visible: true,
    autoresize: true
};
```

### Canvas Configuration Options

Canvas-specific settings from `lgraphcanvas.js`:

```javascript
// Canvas rendering options
const canvasConfig = {
    // Grid and Background
    background_image: null,
    render_canvas_border: true,
    render_connections_shadows: false,
    render_connections_border: true,
    render_curved_connections: false,
    render_connection_arrows: false,
    
    // Node Rendering
    render_only_selected: false,
    live_mode: false,
    show_info: false,
    allow_dragcanvas: true,
    allow_dragnodes: true,
    allow_interaction: true,
    
    // Performance
    skip_render: false,
    always_render_background: false,
    render_shadows: true,
    render_canvas_border: true
};
```

## Configuration Categories

### 1. Graph Behavior Configuration

#### Execution Modes
```javascript
// Configure how the graph executes
LiteGraph.graphDefaultConfig.execution_mode = LiteGraph.EXECUTION_MODE.ON_TRIGGER;
// Options: NEVER, ALWAYS, ON_TRIGGER, ON_REQUEST

// Set execution flow direction
LiteGraph.graphDefaultConfig.flow_type = LiteGraph.FLOW_TYPE.FORWARD;
// Options: FORWARD, BACKWARD, BIDIRECTIONAL
```

#### Error Handling
```javascript
// Exception handling configuration
LiteGraph.graphDefaultConfig.catch_exceptions = true;
LiteGraph.graphDefaultConfig.throw_errors = false;
LiteGraph.graphDefaultConfig.max_execution_time = 1000; // ms timeout
```

### 2. Visual Rendering Configuration

#### Grid and Alignment
```javascript
// Grid alignment settings
LiteGraph.graphDefaultConfig.align_to_grid = true;
canvas.align_to_grid = 10; // Grid size in pixels

// Background configuration
canvas.background_image = "data:image/png;base64,..."; // Custom background
canvas.render_canvas_border = true;
```

#### Connection Rendering
```javascript
// Link appearance
canvas.render_curved_connections = false; // Straight vs curved links
canvas.render_connection_arrows = false; // Show direction arrows
canvas.render_connections_border = true; // Link borders
canvas.render_connections_shadows = false; // Drop shadows
```

#### Node Appearance
```javascript
// Node rendering options
canvas.render_shadows = true; // Node drop shadows
canvas.show_info = false; // Show node info panels
canvas.render_only_selected = false; // Render only selected nodes
```

### 3. Debug System Configuration

#### Debug Levels
```javascript
// Set global debug level
LiteGraph.debug_level = 3;
// Levels: -1=none, 0=errors, 1=warnings, 2=info, 3=debug, 4=verbose

// Module-specific debugging
LiteGraph.debug = true; // Enable debug output
LiteGraph.verbose = false; // Verbose logging
```

#### Debug Output Control
```javascript
// Configure debug output
function configureDebug() {
    // Enable debug for specific modules
    LiteGraph.debug_level = 2;
    
    // Custom debug handler
    LiteGraph.onDebugMessage = function(level, message, data) {
        console.log(`[${level}] ${message}`, data);
    };
}
```

### 4. Performance Configuration

#### Execution Optimization
```javascript
// Performance settings
LiteGraph.graphDefaultConfig.max_iterations = 1000;
LiteGraph.graphDefaultConfig.max_execution_time = 1000;
LiteGraph.graphDefaultConfig.skip_render_if_not_visible = true;
```

#### Rendering Performance
```javascript
// Canvas performance options
canvas.skip_render = false; // Skip rendering entirely
canvas.always_render_background = false; // Conditional background rendering
canvas.live_mode = false; // Continuous rendering mode
```

### 5. Security Settings

#### Script Execution Safety
```javascript
// Security configuration
LiteGraph.allow_scripts = false; // Disable script execution
LiteGraph.sanitize_html = true; // Sanitize HTML content
LiteGraph.validate_inputs = true; // Input validation
```

## Environment-Specific Configuration

### Browser Configuration
```javascript
// Browser-specific settings
if (typeof window !== "undefined") {
    LiteGraph.graphDefaultConfig.use_web_workers = true;
    LiteGraph.graphDefaultConfig.enable_webgl = true;
    LiteGraph.graphDefaultConfig.high_dpi_support = true;
}
```

### Node.js Configuration
```javascript
// Server-side configuration
if (typeof global !== "undefined") {
    LiteGraph.graphDefaultConfig.headless_mode = true;
    LiteGraph.graphDefaultConfig.canvas_polyfill = "node-canvas";
    LiteGraph.graphDefaultConfig.disable_ui = true;
}
```

## Runtime vs Compile-Time Configuration

### Compile-Time Configuration
Set during library initialization, affects core behavior:

```javascript
// Must be set before creating graphs
LiteGraph.graphDefaultConfig.execution_mode = LiteGraph.EXECUTION_MODE.ALWAYS;
LiteGraph.graphDefaultConfig.use_uuids = true;
```

### Runtime Configuration
Can be changed during execution:

```javascript
// Can be modified at any time
graph.execution_mode = LiteGraph.EXECUTION_MODE.ON_TRIGGER;
canvas.render_shadows = false;
LiteGraph.debug_level = 4;
```

## Configuration Examples

### High-Performance Setup
```javascript
// Optimize for performance
LiteGraph.graphDefaultConfig.skip_render_if_not_visible = true;
LiteGraph.graphDefaultConfig.max_execution_time = 16; // 60fps
canvas.render_shadows = false;
canvas.render_connections_shadows = false;
canvas.always_render_background = false;
```

### Debug Development Setup
```javascript
// Enable comprehensive debugging
LiteGraph.debug_level = 4;
LiteGraph.graphDefaultConfig.catch_exceptions = false; // Let errors bubble up
LiteGraph.graphDefaultConfig.throw_errors = true;
canvas.show_info = true;
```

### Production Setup
```javascript
// Production-ready configuration
LiteGraph.debug_level = 0; // No debug output
LiteGraph.graphDefaultConfig.catch_exceptions = true;
LiteGraph.graphDefaultConfig.throw_errors = false;
LiteGraph.allow_scripts = false; // Security
```

### Headless Server Setup
```javascript
// Server-side configuration
LiteGraph.graphDefaultConfig.headless_mode = true;
LiteGraph.graphDefaultConfig.disable_ui = true;
LiteGraph.graphDefaultConfig.execution_mode = LiteGraph.EXECUTION_MODE.ALWAYS;
```

## Configuration Validation

### Validation Functions
```javascript
// Validate configuration
function validateConfig(config) {
    const errors = [];
    
    if (config.max_execution_time < 1) {
        errors.push("max_execution_time must be positive");
    }
    
    if (config.debug_level < -1 || config.debug_level > 5) {
        errors.push("debug_level must be between -1 and 5");
    }
    
    return errors;
}

// Apply validated configuration
function applyConfig(config) {
    const errors = validateConfig(config);
    if (errors.length > 0) {
        throw new Error("Configuration errors: " + errors.join(", "));
    }
    
    Object.assign(LiteGraph.graphDefaultConfig, config);
}
```

## Extension Configuration

### Extension-Specific Options
```javascript
// Configure extensions
LiteGraph.extensions = {
    audio: {
        enabled: true,
        sample_rate: 44100,
        buffer_size: 1024
    },
    webgl: {
        enabled: true,
        antialias: true,
        alpha: false
    },
    midi: {
        enabled: true,
        auto_connect: false
    }
};
```

### Dynamic Extension Configuration
```javascript
// Runtime extension configuration
function configureExtension(name, options) {
    if (!LiteGraph.extensions[name]) {
        LiteGraph.extensions[name] = {};
    }
    Object.assign(LiteGraph.extensions[name], options);
    
    // Notify extension of configuration change
    if (LiteGraph.onExtensionConfigured) {
        LiteGraph.onExtensionConfigured(name, options);
    }
}
```

## Best Practices

### 1. Configuration Management
- Set configuration before creating graphs
- Validate configuration values
- Use environment-specific configurations
- Document custom configuration options

### 2. Performance Optimization
- Disable unnecessary visual features in production
- Use appropriate debug levels
- Configure execution limits
- Enable rendering optimizations

### 3. Security Considerations
- Disable script execution in untrusted environments
- Validate all input data
- Use appropriate error handling
- Sanitize HTML content

### 4. Development vs Production
- Use different configurations for development and production
- Enable debugging during development
- Optimize performance for production
- Implement proper error handling

This comprehensive configuration guide enables developers to fully customize LiteGraph.js behavior for their specific use cases while maintaining optimal performance and security.