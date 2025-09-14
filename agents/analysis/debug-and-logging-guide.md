# Debug and Logging System Guide

## Overview

LiteGraph.js features a sophisticated multi-level debug and logging system that provides comprehensive debugging capabilities for development, troubleshooting, and performance analysis. This system supports configurable debug levels, module-specific logging, and runtime debug control.

## Debug System Architecture

### Core Debug Configuration

```javascript
// Global debug settings
LiteGraph.debug = true;           // Enable/disable debug output
LiteGraph.debug_level = 2;        // Set debug verbosity level
LiteGraph.verbose = false;        // Enable verbose logging
LiteGraph.catch_exceptions = true; // Catch and log exceptions
```

### Debug Levels

The debug system supports 7 levels of logging verbosity:

| Level | Name | Description | Use Case |
|-------|------|-------------|----------|
| -1 | NONE | No debug output | Production (silent) |
| 0 | ERROR | Critical errors only | Production (minimal) |
| 1 | WARN | Warnings and errors | Production (standard) |
| 2 | INFO | Informational messages | Development (standard) |
| 3 | DEBUG | Debug information | Development (detailed) |
| 4 | VERBOSE | Verbose debugging | Development (comprehensive) |
| 5 | TRACE | Full execution tracing | Development (maximum) |

## Debug Methods and Functions

### Core Logging Functions

```javascript
// Basic logging methods
LiteGraph.log(message, ...args);           // General logging
LiteGraph.warn(message, ...args);          // Warning messages
LiteGraph.error(message, ...args);         // Error messages
LiteGraph.debug(message, ...args);         // Debug messages
LiteGraph.verbose(message, ...args);       // Verbose messages

// Conditional logging based on debug level
LiteGraph.log_debug(level, message, ...args);    // Log if level <= debug_level
LiteGraph.log_verbose(message, ...args);         // Log if verbose enabled
```

### Module-Specific Logging

```javascript
// LGraph module logging
LGraph.prototype.log = function(message, level = 1) {
    if (LiteGraph.debug_level >= level) {
        console.log(`[LGraph:${this.title || 'unnamed'}] ${message}`);
    }
};

// LGraphNode module logging
LGraphNode.prototype.log = function(message, level = 1) {
    if (LiteGraph.debug_level >= level) {
        console.log(`[${this.type}:${this.title || this.id}] ${message}`);
    }
};

// LGraphCanvas module logging
LGraphCanvas.prototype.log = function(message, level = 1) {
    if (LiteGraph.debug_level >= level) {
        console.log(`[Canvas] ${message}`);
    }
};
```

## Debug Configuration Examples

### Development Configuration

```javascript
// Comprehensive development debugging
function setupDevelopmentDebug() {
    LiteGraph.debug = true;
    LiteGraph.debug_level = 3;        // Show debug messages
    LiteGraph.verbose = true;         // Enable verbose output
    LiteGraph.catch_exceptions = false; // Let errors bubble up
    
    // Custom debug handler
    LiteGraph.onDebugMessage = function(level, module, message, data) {
        const timestamp = new Date().toISOString();
        const levelName = ['ERROR', 'WARN', 'INFO', 'DEBUG', 'VERBOSE'][level] || 'TRACE';
        console.log(`[${timestamp}] [${levelName}] [${module}] ${message}`, data || '');
    };
}
```

### Production Configuration

```javascript
// Minimal production logging
function setupProductionDebug() {
    LiteGraph.debug = true;
    LiteGraph.debug_level = 1;        // Only warnings and errors
    LiteGraph.verbose = false;        // No verbose output
    LiteGraph.catch_exceptions = true; // Catch and log exceptions
    
    // Production error handler
    LiteGraph.onError = function(error, context) {
        // Send to error reporting service
        console.error('LiteGraph Error:', error, context);
        // reportError(error, context);
    };
}
```

### Performance Debugging

```javascript
// Performance-focused debugging
function setupPerformanceDebug() {
    LiteGraph.debug = true;
    LiteGraph.debug_level = 2;
    
    // Performance timing
    LiteGraph.performance_debug = true;
    
    // Custom performance logger
    LiteGraph.onPerformanceLog = function(operation, duration, details) {
        if (duration > 16) { // Log operations taking >16ms (60fps threshold)
            console.warn(`[PERF] ${operation} took ${duration}ms`, details);
        }
    };
}
```

## Module-Specific Debugging

### Graph Execution Debugging

```javascript
// Debug graph execution
LGraph.prototype.runStep = function(num, do_not_catch_errors) {
    if (LiteGraph.debug_level >= 3) {
        this.log(`Executing step ${num}, nodes: ${this._nodes.length}`, 3);
    }
    
    const start_time = performance.now();
    
    // ... execution logic ...
    
    if (LiteGraph.debug_level >= 4) {
        const duration = performance.now() - start_time;
        this.log(`Step ${num} completed in ${duration.toFixed(2)}ms`, 4);
    }
};
```

### Node Processing Debugging

```javascript
// Debug node execution
LGraphNode.prototype.onExecute = function() {
    if (LiteGraph.debug_level >= 4) {
        this.log(`Executing node: inputs=${this.inputs?.length || 0}, outputs=${this.outputs?.length || 0}`, 4);
    }
    
    // ... node logic ...
    
    if (LiteGraph.debug_level >= 5) {
        this.log(`Node execution complete`, 5);
    }
};
```

### Canvas Rendering Debugging

```javascript
// Debug canvas rendering
LGraphCanvas.prototype.draw = function(force_canvas, force_bgcanvas) {
    if (LiteGraph.debug_level >= 4) {
        this.log(`Rendering frame: force_canvas=${force_canvas}, force_bgcanvas=${force_bgcanvas}`, 4);
    }
    
    const start_time = performance.now();
    
    // ... rendering logic ...
    
    if (LiteGraph.debug_level >= 3) {
        const duration = performance.now() - start_time;
        if (duration > 16) {
            this.log(`Slow render: ${duration.toFixed(2)}ms`, 3);
        }
    }
};
```

## Error Handling and Logging

### Exception Handling

```javascript
// Global exception handler
LiteGraph.onError = function(error, context) {
    const errorInfo = {
        message: error.message,
        stack: error.stack,
        context: context,
        timestamp: Date.now(),
        debug_level: LiteGraph.debug_level
    };
    
    if (LiteGraph.debug_level >= 0) {
        console.error('[LiteGraph Error]', errorInfo);
    }
    
    // Custom error handling
    if (LiteGraph.onCustomError) {
        LiteGraph.onCustomError(errorInfo);
    }
};

// Safe execution wrapper
LiteGraph.safeCall = function(fn, context, ...args) {
    try {
        return fn.apply(context, args);
    } catch (error) {
        LiteGraph.onError(error, {
            function: fn.name,
            context: context?.constructor?.name,
            arguments: args
        });
        return null;
    }
};
```

### Validation and Warnings

```javascript
// Input validation with logging
LGraphNode.prototype.validateInputs = function() {
    if (!this.inputs) return true;
    
    for (let i = 0; i < this.inputs.length; i++) {
        const input = this.inputs[i];
        const value = this.getInputData(i);
        
        if (input.required && (value === undefined || value === null)) {
            this.log(`Required input '${input.name}' is missing`, 1);
            return false;
        }
        
        if (input.type && value !== undefined && typeof value !== input.type) {
            this.log(`Input '${input.name}' type mismatch: expected ${input.type}, got ${typeof value}`, 2);
        }
    }
    
    return true;
};
```

## Performance Debugging

### Execution Timing

```javascript
// Performance monitoring
LiteGraph.PerformanceMonitor = {
    timers: new Map(),
    
    start: function(operation) {
        this.timers.set(operation, performance.now());
    },
    
    end: function(operation, threshold = 0) {
        const start = this.timers.get(operation);
        if (!start) return;
        
        const duration = performance.now() - start;
        this.timers.delete(operation);
        
        if (duration > threshold && LiteGraph.debug_level >= 2) {
            console.log(`[PERF] ${operation}: ${duration.toFixed(2)}ms`);
        }
        
        return duration;
    }
};

// Usage in code
LiteGraph.PerformanceMonitor.start('graph_execution');
// ... graph execution ...
LiteGraph.PerformanceMonitor.end('graph_execution', 10); // Log if >10ms
```

### Memory Usage Monitoring

```javascript
// Memory usage debugging
LiteGraph.MemoryMonitor = {
    logMemoryUsage: function(context) {
        if (LiteGraph.debug_level >= 3 && performance.memory) {
            const memory = performance.memory;
            console.log(`[MEMORY] ${context}:`, {
                used: Math.round(memory.usedJSHeapSize / 1024 / 1024) + 'MB',
                total: Math.round(memory.totalJSHeapSize / 1024 / 1024) + 'MB',
                limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024) + 'MB'
            });
        }
    }
};
```

## Custom Debug Handlers

### Debug Message Filtering

```javascript
// Custom debug message handler with filtering
LiteGraph.setupCustomDebug = function(options = {}) {
    const {
        modules = [],           // Filter by module names
        keywords = [],          // Filter by keywords
        minLevel = 0,          // Minimum debug level
        maxLevel = 5,          // Maximum debug level
        timestamp = true,       // Include timestamps
        colors = true          // Use console colors
    } = options;
    
    LiteGraph.onDebugMessage = function(level, module, message, data) {
        // Level filtering
        if (level < minLevel || level > maxLevel) return;
        
        // Module filtering
        if (modules.length > 0 && !modules.includes(module)) return;
        
        // Keyword filtering
        if (keywords.length > 0 && !keywords.some(k => message.includes(k))) return;
        
        // Format message
        let output = '';
        
        if (timestamp) {
            output += `[${new Date().toISOString()}] `;
        }
        
        const levelNames = ['ERROR', 'WARN', 'INFO', 'DEBUG', 'VERBOSE', 'TRACE'];
        const levelName = levelNames[level] || 'UNKNOWN';
        
        if (colors) {
            const colors = {
                ERROR: '\x1b[31m',   // Red
                WARN: '\x1b[33m',    // Yellow
                INFO: '\x1b[36m',    // Cyan
                DEBUG: '\x1b[32m',   // Green
                VERBOSE: '\x1b[35m', // Magenta
                TRACE: '\x1b[37m'    // White
            };
            output += `${colors[levelName]}[${levelName}]\x1b[0m `;
        } else {
            output += `[${levelName}] `;
        }
        
        output += `[${module}] ${message}`;
        
        console.log(output, data || '');
    };
};
```

## Debug Tools and Utilities

### Graph State Inspector

```javascript
// Debug utility for inspecting graph state
LiteGraph.debugInspectGraph = function(graph) {
    if (LiteGraph.debug_level < 2) return;
    
    console.group('Graph State Inspection');
    console.log('Title:', graph.title);
    console.log('Status:', graph.status);
    console.log('Nodes:', graph._nodes.length);
    console.log('Links:', Object.keys(graph.links).length);
    console.log('Groups:', graph._groups.length);
    console.log('Execution Mode:', graph.execution_mode);
    
    // Node details
    console.group('Nodes');
    graph._nodes.forEach((node, index) => {
        console.log(`${index}: ${node.type} (${node.title || 'untitled'})`);
    });
    console.groupEnd();
    
    console.groupEnd();
};
```

### Node Connection Debugger

```javascript
// Debug node connections
LiteGraph.debugNodeConnections = function(node) {
    if (LiteGraph.debug_level < 3) return;
    
    console.group(`Node Connections: ${node.type}`);
    
    if (node.inputs) {
        console.group('Inputs');
        node.inputs.forEach((input, index) => {
            const link = node.getInputLink(index);
            console.log(`${index}: ${input.name} (${input.type}) - Link: ${link ? link.id : 'none'}`);
        });
        console.groupEnd();
    }
    
    if (node.outputs) {
        console.group('Outputs');
        node.outputs.forEach((output, index) => {
            const links = node.getOutputLinks(index);
            console.log(`${index}: ${output.name} (${output.type}) - Links: ${links ? links.length : 0}`);
        });
        console.groupEnd();
    }
    
    console.groupEnd();
};
```

## Best Practices

### 1. Debug Level Management
- Use appropriate debug levels for different environments
- Set debug level 0-1 for production
- Use debug level 2-3 for development
- Use debug level 4-5 for deep debugging

### 2. Performance Considerations
- Avoid expensive operations in debug code
- Use conditional logging based on debug level
- Consider performance impact of logging
- Use performance monitoring for optimization

### 3. Error Handling
- Always catch and log exceptions appropriately
- Provide context information with errors
- Use structured error logging
- Implement custom error handlers for production

### 4. Module-Specific Debugging
- Use module-specific debug methods
- Include relevant context in debug messages
- Filter debug output by module when needed
- Maintain consistent debug message formats

### 5. Custom Debug Integration
- Implement custom debug handlers for specific needs
- Use debug message filtering for focused debugging
- Integrate with external logging systems
- Provide debug configuration options

This comprehensive debug and logging system enables developers to effectively troubleshoot, optimize, and maintain LiteGraph.js applications across all environments and use cases.