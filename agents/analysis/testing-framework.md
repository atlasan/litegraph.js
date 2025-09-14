# Testing Framework Documentation

## Overview

LiteGraph.js uses Jest as its primary testing framework with ES6 module support. The testing setup provides basic node type registration testing only. **Note**: This is a minimal testing implementation covering approximately 5% of the codebase functionality.

## Test Configuration

### Framework: Jest
- **Version Detection**: Dynamic Jest version logging
- **Module System**: ES6 modules with `import`/`export`
- **Test Runner**: `@jest/globals` for Jest utilities
- **File Structure**: Single test file `test/litegraph.test.js`

### Test Setup

```javascript
import { jest } from "@jest/globals";
import { LiteGraph } from "../src/litegraph.js";
import { LGraphNode } from "../src/lgraphnode.js";
```

## Current Test Coverage

**Coverage Level**: Minimal (15 test cases total)
**Focus Area**: Node registration/unregistration only
**Missing Areas**: Graph execution, canvas rendering, extensions, build system, headless execution

### 1. Node Type Registration Tests

**Test Suite**: `"register node types"`

#### Test Cases:

**Normal Case Registration**:
```javascript
test("normal case", () => {
    LiteGraph.registerNodeType("math/sum", Sum);
    
    let node = LiteGraph.registered_node_types["math/sum"];
    expect(node).toBeTruthy();
    expect(node.type).toBe("math/sum");
    expect(node.title).toBe("Sum");
    expect(node.category).toBe("math");
    expect(node.prototype.configure).toBe(LGraphNode.prototype.configure);
});
```

**Callback Triggers**:
- Tests `LiteGraph.onNodeTypeRegistered` callback execution
- Tests `LiteGraph.onNodeTypeReplaced` callback on re-registration
- Verifies console logging for node type replacement

**Custom Node Titles**:
```javascript
test("node with title", () => {
    Sum.title = "The sum title";
    LiteGraph.registerNodeType("math/sum", Sum);
    let node = LiteGraph.registered_node_types["math/sum"];
    expect(node.title).toBe("The sum title");
    expect(node.title).not.toBe(node.name);
});
```

**Error Handling**:
- Tests rejection of simple objects (non-constructor functions)
- Validates proper error messages

**Shape Mapping**:
- Tests node shape inheritance and mapping
- Verifies `LiteGraph.BOX_SHAPE` constant mapping

### 2. Node Type Unregistration Tests

**Test Suite**: `"unregister node types"`
- Tests removal of registered node types
- Validates cleanup of type registry

## Test Utilities

### Mock Node Implementation

```javascript
Sum = function Sum() {
    this.addInput("a", "number");
    this.addInput("b", "number");
    this.addOutput("sum", "number");
};
Sum.prototype.onExecute = function (a, b) {
    this.setOutputData(0, a + b);
};
```

### Test Isolation

**beforeEach Setup**:
```javascript
beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    
    // Reset LiteGraph state
    LiteGraph.registered_node_types = {};
    LiteGraph.registered_slot_in_types = {};
    LiteGraph.registered_slot_out_types = {};
    
    // Recreate test node
    Sum = function Sum() { /* ... */ };
});
```

### Spy and Mock Usage

```javascript
const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
LiteGraph.onNodeTypeRegistered = jest.fn();
LiteGraph.onNodeTypeReplaced = jest.fn();
```

## Testing Limitations

### What's Missing

**Major Testing Gaps** (not implemented):
- Graph execution and lifecycle testing
- Canvas rendering and interaction testing  
- Extension system testing
- Headless execution testing
- Performance and benchmark testing
- Integration testing across components
- Build system validation testing
- Cross-platform compatibility testing

**Infrastructure Gaps** (not implemented):
- Test coverage reporting
- Continuous integration setup
- Performance regression detection
- Cross-browser testing
- Automated test execution in build process

### Current Test File Structure

```
test/
└── litegraph.test.js    # Single test file (247 lines)
    ├── Node registration tests (8 test cases)
    └── Node unregistration tests (7 test cases)
```

**Note**: For comprehensive testing enhancements and implementation roadmap, see `agents/improvements/testing-framework-enhancements.md`.

## Summary

The current testing framework provides a minimal foundation with Jest setup and basic node registration testing. This covers less than 5% of the codebase functionality and lacks the comprehensive testing infrastructure needed for a production-ready library.