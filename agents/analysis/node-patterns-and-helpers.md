# Node Patterns and Helper Functions Analysis

## Overview
This document analyzes common patterns and helper functions used in LiteGraph node development, focusing on data retrieval methods, property-widget connections, and slot management.

## Core Data Retrieval Methods

### getInputOrProperty vs getInputData

#### getInputOrProperty(name)
- **Purpose**: Retrieves input value OR falls back to property value if no connection exists
- **Use Case**: Flexible data access that allows both connected inputs and manual property configuration
- **Implementation**: First checks for connected input data, then falls back to node property
- **Example Usage**:
  ```javascript
  const value = this.getInputOrProperty("threshold"); // Gets connected value or property
  ```

#### getInputData(slot)
- **Purpose**: Retrieves data from a specific input slot connection only
- **Use Case**: Direct access to connected input data without property fallback
- **Implementation**: Returns null if no connection exists
- **Example Usage**:
  ```javascript
  const inputValue = this.getInputData(0); // Gets data from slot 0 or null
  ```

### Key Differences
1. **Fallback Behavior**: `getInputOrProperty` provides property fallback, `getInputData` does not
2. **Parameter Type**: `getInputOrProperty` uses property names, `getInputData` uses slot indices
3. **Flexibility**: `getInputOrProperty` enables hybrid input/property nodes

## Property-Widget Binding Patterns

### Automatic Property Binding
- **Pattern**: Widgets can be automatically bound to node properties
- **Implementation**: Use `{ property: "propertyName" }` in widget options
- **Example**:
  ```javascript
  this.addWidget("number", "Value", 0, { property: "value" });
  ```

### Widget Callback Patterns
1. **Direct Callback Function**:
   ```javascript
   this.addWidget("slider", "Threshold", 0.5, (value) => {
       this.properties.threshold = value;
   });
   ```

2. **Property Name as Callback**:
   ```javascript
   this.addWidget("number", "Count", 10, "count"); // Auto-binds to properties.count
   ```

3. **Property Object Options**:
   ```javascript
   this.addWidget("combo", "Mode", "A", { 
       property: "mode", 
       values: ["A", "B", "C"] 
   });
   ```

### Property-Widget Synchronization
- **doUpdateBindedInputProperties()**: Updates widget values from input connections
- **doUpdateBindedOutputProperties()**: Updates output values from properties
- **Bidirectional Binding**: Properties ↔ Widgets ↔ Inputs/Outputs

## Properties Exposed as Slots

### Input Slot Binding
- **Pattern**: Properties can be exposed as input slots using `param_bind`
- **Implementation**:
  ```javascript
  this.addInput("threshold", "number", { param_bind: true });
  ```
- **Behavior**: Input connection overrides property value

### Output Slot Binding
- **Pattern**: Properties can be exposed as output slots
- **Implementation**:
  ```javascript
  this.addOutput("result", "number", { param_bind: true });
  ```
- **Behavior**: Property value is automatically output

### Dynamic Property-Slot Management
- **Runtime Creation**: Slots can be created dynamically based on object properties
- **Example in objects/property_widget**:
  ```javascript
  // Dynamically creates combo widget with object properties
  this.widg_prop = this.addWidget("combo", "prop.", this.properties.prop, {
      property: "prop", 
      values: [] // Populated from input object
  });
  ```

## Widget Types and Patterns

### Common Widget Types
1. **number**: Numeric input with optional min/max
2. **slider**: Visual slider with range
3. **combo**: Dropdown selection
4. **text**: String input
5. **toggle**: Boolean checkbox
6. **button**: Action trigger

### Widget Positioning
- **widgets_up**: Places widgets above inputs/outputs
- **widgets_start_y**: Custom Y offset for widget positioning

### Widget Customization
- **Custom Draw Function**: Override widget rendering
- **Custom Mouse Handling**: Override widget interaction
- **Custom Sizing**: Override widget dimensions

## Advanced Patterns

### Object Property Inspection
- **Pattern**: Nodes that dynamically adapt to input object properties
- **Implementation**: Analyze input object and create corresponding widgets/slots
- **Example**: `objects/property_widget` creates combo from object keys

### Method Execution Patterns
- **Pattern**: Nodes that can execute methods on input objects
- **Implementation**: Dynamic method discovery and parameter handling
- **Example**: `objects/method_widget` discovers and executes object methods

### Library Integration Patterns
- **Pattern**: Nodes that integrate external libraries
- **Implementation**: Dynamic library loading and global object binding
- **Example**: `libraries/load` and `libraries/register` nodes

## Best Practices

### Data Access
1. Use `getInputOrProperty()` for flexible input/property nodes
2. Use `getInputData()` for strict input-only access
3. Always check for null/undefined values

### Property-Widget Binding
1. Use property binding for automatic synchronization
2. Implement `onPropertyChanged()` for custom property handling
3. Use `param_bind` for property-slot exposure

### Widget Management
1. Store widget references for dynamic updates
2. Use appropriate widget types for data types
3. Implement custom draw/mouse functions for specialized widgets

### Performance Considerations
1. Cache expensive property calculations
2. Use `ON_REQUEST` mode for expensive operations
3. Minimize widget updates in execution loops

## Common Pitfalls

1. **Property Synchronization**: Forgetting to update widgets when properties change
2. **Type Mismatches**: Not handling type conversions between widgets and properties
3. **Memory Leaks**: Not cleaning up widget references
4. **Performance**: Updating widgets too frequently in execution loops

## Integration with External Libraries

### Library Manager Integration
- **Pattern**: Nodes can register and load external libraries
- **Implementation**: Use LibraryManager for dynamic library loading
- **Benefits**: Runtime library management and dependency resolution

### Global Object Binding
- **Pattern**: Libraries exposed as global objects for node access
- **Implementation**: LibraryManager sets global variables
- **Usage**: Nodes access libraries through global references

This analysis provides a comprehensive overview of node patterns and helper functions in the LiteGraph system, enabling developers to create more effective and maintainable nodes.