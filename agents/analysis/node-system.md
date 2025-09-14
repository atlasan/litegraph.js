# Node System Analysis

## Overview

LiteGraph.js features a comprehensive node system with over 100 built-in node types organized into logical categories. The system is designed for extensibility, allowing developers to create custom nodes while providing a rich set of pre-built functionality.

## Node Categories

### 1. Basic Nodes (base.js)

**Purpose**: Fundamental utility nodes for data manipulation and flow control.

#### Core Utility Nodes

**Time Node**
```javascript
class Time {
    // Outputs current graph time in milliseconds and seconds
    outputs: ["in ms", "in sec"]
}
```

**Constant Nodes**
- `ConstantNumber`: Numeric constants with precision control
- `ConstantBoolean`: Boolean true/false values
- `ConstantString`: Text string constants
- `ConstantObject`: JavaScript object literals
- `ConstantArray`: Array data with dynamic sizing

**Data Manipulation**
- `Variable`: Store/retrieve values with different scopes (graph, global, litegraph)
- `Cast`: Type conversion between different data types
- `Watch`: Display input values for debugging
- `WatchAdvanced`: Enhanced value display with formatting

**Array Operations**
```javascript
// Array manipulation nodes
ArrayLength     // Get array.length
ArrayElement    // Access array[index]
SetArray        // Modify array[index] = value
ArrayAppend     // Push element to array
TableElement    // Access 2D array[row][col]
```

**File Operations**
- `ConstantFile`: Load files from URLs with multiple format support
- `DownloadData`: Export data as downloadable files
- `JSONParse`: Parse JSON strings into objects

**Utility Functions**
- `Console`: Output to browser console
- `Alert`: Show browser alert dialogs
- `NodeScript`: Execute custom JavaScript code (max 256 chars)
- `GenericCompare`: Compare values with multiple operators

### 2. Math Nodes (math.js)

**Purpose**: Mathematical operations, calculations, and numeric processing.

#### Basic Operations
```javascript
// Arithmetic nodes
MathOperation   // +, -, *, /, %, ^, max, min
MathCompare     // <, >, ==, !=, <=, >=
MathCondition   // Boolean logic with numeric inputs
MathBranch      // Conditional data routing
```

#### Advanced Math Functions
```javascript
// Specialized math nodes
MathRange       // Convert between numeric ranges
MathClamp       // Constrain values between min/max
MathLerp        // Linear interpolation
MathSmoothStep  // Smooth step function
MathTrigonometry // sin, cos, tan, asin, acos, atan
```

#### Utility Math
```javascript
// Number processing
MathAbs         // Absolute value
MathFloor       // Floor function
MathFrac        // Fractional part
MathScale       // Multiply by factor
Converter       // Type conversion (number, vec2, vec3, vec4)
Bypass          // Pass-through without type checking
```

#### Statistical and Filter Nodes
```javascript
// Data processing
MathRand        // Random number generation
MathNoise       // Perlin-style noise with continuity
MathSpikes      // Spike/impulse generation
MathAverageFilter // Moving average filter
MathTendTo      // Gradual value convergence
MathAccumulate  // Incremental accumulation
```

#### 3D Math (math3d)
```javascript
// Vector operations
Math3DVec2ToXY    // Vector2 to X,Y components
Math3DXYToVec2    // X,Y components to Vector2
Math3DVec3ToXYZ   // Vector3 to X,Y,Z components
Math3DXYZToVec3   // X,Y,Z components to Vector3
Math3DVec4ToXYZW  // Vector4 to X,Y,Z,W components
Math3DXYZWToVec4  // X,Y,Z,W components to Vector4
```

#### Formula Node
```javascript
class MathFormula {
    // Execute custom mathematical expressions
    // Supports variables A, B, C, D, T (time)
    // Example: "A * sin(B + T) + C"
    properties: { formula: "A+B" }
}
```

### 3. Logic Nodes (logic.js)

**Purpose**: Boolean logic, conditional operations, and control flow.

#### Boolean Operations
```javascript
logicAnd        // Logical AND with multiple inputs
logicOr         // Logical OR with multiple inputs
logicNot        // Logical negation
logicCompare    // Boolean equality comparison
```

#### Control Flow
```javascript
logicBranch     // Conditional execution branching
logicFor        // FOR loop iteration
logicForEach    // Iterate over array elements
logicWhile      // WHILE loop with condition
```

#### Data Selection
```javascript
Selector        // Select input based on numeric index
Sequence        // Select from comma-separated string sequence
```

### 4. Interface Nodes (interface.js)

**Purpose**: User interface widgets and interactive controls.

#### Input Widgets
```javascript
// Interactive UI elements
WidgetButton    // Clickable button
WidgetToggle    // On/off switch
WidgetNumber    // Numeric input with validation
WidgetSlider    // Range slider control
WidgetCombo     // Dropdown selection
WidgetText      // Text input field
WidgetKnob      // Rotary knob control
```

#### Display Widgets
```javascript
// Information display
WidgetHSlider   // Horizontal slider display
WidgetProgress  // Progress bar
WidgetPanel     // Information panel
```

### 5. Graphics Nodes (graphics.js)

**Purpose**: Canvas drawing, image processing, and visual effects.

#### Canvas Operations
```javascript
// Drawing primitives
DrawRectangle   // Draw filled/outlined rectangles
DrawCircle      // Draw circles and ellipses
DrawText        // Render text with fonts
DrawImage       // Display images and textures
ClearCanvas     // Clear canvas content
```

#### Image Processing
```javascript
// Image manipulation
ImageResize     // Scale images
ImageCrop       // Crop image regions
ImageBlend      // Blend multiple images
ImageFilter     // Apply visual filters
```

### 6. Audio Nodes (audio.js)

**Purpose**: Web Audio API integration and sound processing.

#### Audio Sources
```javascript
// Sound generation
AudioOscillator // Generate waveforms (sine, square, sawtooth)
AudioNoise      // White/pink noise generation
AudioSample     // Play audio samples
```

#### Audio Processing
```javascript
// Audio effects
AudioGain       // Volume control
AudioFilter     // Frequency filtering
AudioDelay      // Echo/delay effects
AudioReverb     // Reverb effects
```

### 7. Event Nodes (events.js)

**Purpose**: Event handling and timing operations.

#### Timing
```javascript
// Time-based operations
Timer           // Countdown timer
Delay           // Delayed execution
Interval        // Periodic triggers
Sequencer       // Timed sequence playback
```

#### Event Handling
```javascript
// Event processing
EventListener   // DOM event capture
Keyboard        // Keyboard input handling
Mouse           // Mouse interaction
Gamepad         // Gamepad input
```

### 8. Network Nodes (network.js)

**Purpose**: HTTP requests, WebSocket communication, and data fetching.

#### HTTP Operations
```javascript
HTTPRequest     // Make HTTP GET/POST requests
WebSocket       // WebSocket communication
FetchJSON       // Fetch and parse JSON data
```

### 9. String Nodes (strings.js)

**Purpose**: Text processing and string manipulation.

```javascript
// String operations
StringConcat    // Concatenate strings
StringLength    // Get string length
StringSubstring // Extract substrings
StringReplace   // Find and replace text
StringSplit     // Split into array
StringFormat    // Template formatting
```

## Node Architecture

### Base Node Structure

Every node inherits from `LGraphNode` and follows this pattern:

```javascript
class CustomNode {
    static title = "Node Title";        // Display name
    static desc = "Node description";   // Tooltip description
    static category = "category/name";  // Organization category
    
    constructor() {
        // Define inputs
        this.addInput("input_name", "data_type");
        
        // Define outputs
        this.addOutput("output_name", "data_type");
        
        // Define properties
        this.addProperty("property_name", default_value, "type");
        
        // Add widgets
        this.addWidget("widget_type", "label", value, callback);
        
        // Set node size
        this.size = [width, height];
    }
    
    onExecute() {
        // Main execution logic
        const input = this.getInputData(0);
        const result = this.processData(input);
        this.setOutputData(0, result);
    }
}

// Register the node type
LiteGraph.registerNodeType("category/custom_node", CustomNode);
```

### Data Types

LiteGraph supports a rich type system:

#### Primitive Types
- `number` - Numeric values
- `string` - Text strings
- `boolean` - True/false values
- `object` - JavaScript objects
- `array` - JavaScript arrays

#### Specialized Types
- `vec2`, `vec3`, `vec4` - Vector mathematics
- `color` - Color values (RGB/RGBA)
- `texture` - Image/canvas data
- `audio` - Audio buffer data
- `geometry` - 3D mesh data
- `*` - Generic (accepts any type)
- `0` - Auto-detect type

### Widget System

Nodes can include interactive widgets:

```javascript
// Widget types
this.addWidget("button", "Click Me", null, callback);
this.addWidget("toggle", "Enable", true, callback);
this.addWidget("number", "Value", 1.0, callback, {min: 0, max: 10});
this.addWidget("slider", "Amount", 0.5, callback, {min: 0, max: 1});
this.addWidget("combo", "Mode", "option1", callback, {values: ["option1", "option2"]});
this.addWidget("text", "Name", "default", callback);
```

### Property System

Properties store node configuration:

```javascript
// Add properties with validation
this.addProperty("multiplier", 1.0, "number", {min: 0, max: 10});
this.addProperty("mode", "linear", "enum", {values: ["linear", "cubic"]});
this.addProperty("enabled", true, "boolean");

// React to property changes
onPropertyChanged(name, value) {
    if (name === "multiplier") {
        this.updateCalculation();
    }
}
```

### Advanced Features

#### Dynamic Slots
```javascript
// Add/remove slots at runtime
onGetInputs() {
    return [["extra_input", "number"]];
}

onGetOutputs() {
    return [["extra_output", "number"]];
}
```

#### Custom Rendering
```javascript
// Custom node appearance
onDrawBackground(ctx) {
    ctx.fillStyle = "#ff0000";
    ctx.fillRect(0, 0, this.size[0], this.size[1]);
}

onDrawForeground(ctx) {
    ctx.fillStyle = "#ffffff";
    ctx.fillText("Custom Text", 10, 20);
}
```

#### Serialization
```javascript
// Custom serialization
serialize() {
    const data = LGraphNode.prototype.serialize.call(this);
    data.custom_data = this.special_property;
    return data;
}

configure(data) {
    LGraphNode.prototype.configure.call(this, data);
    this.special_property = data.custom_data;
}
```

## Node Registration and Discovery

### Registration
```javascript
// Register node type
LiteGraph.registerNodeType("category/node_name", NodeClass);

// Register with search extras
LiteGraph.registerSearchboxExtra("math/operation", "ADD", {
    properties: { OP: "+" },
    title: "ADD()"
});
```

### Function Wrapping
```javascript
// Automatically create nodes from functions
function multiply(a, b) {
    return a * b;
}

LiteGraph.wrapFunctionAsNode(
    "math/multiply",
    multiply,
    ["number", "number"],  // Input types
    "number"               // Output type
);
```

### Node Discovery
```javascript
// Find available nodes
const nodeTypes = LiteGraph.getNodeTypesInCategory("math");
const nodeClass = LiteGraph.getNodeType("math/operation");
const categories = LiteGraph.getNodeTypesCategories();
```

This comprehensive node system provides the building blocks for creating complex visual programs while maintaining simplicity and extensibility.