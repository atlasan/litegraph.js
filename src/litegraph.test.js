import {
  afterEach, beforeEach, describe, expect, test, vi,
} from 'vitest';
import { LiteGraph } from '@/litegraph';
import { LGraphNode } from '@/LGraphNode';
import { LGraphStyles } from './core/styles';

describe('register node types', () => {
  let Sum;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();

    // attempt at resetting LiteGraph each time
    LiteGraph.registered_node_types = {};
    LiteGraph.registered_slot_in_types = {};
    LiteGraph.registered_slot_in_types = {};

    Sum = function Sum() {
      this.addInput('a', 'number');
      this.addInput('b', 'number');
      this.addOutput('sum', 'number');
    };
    Sum.prototype.onExecute = function (a, b) {
      this.setOutputData(0, a + b);
    };
  });

  test('normal case', () => {
    LiteGraph.registerNodeType('math/sum', Sum);

    const node = LiteGraph.registered_node_types['math/sum'];
    expect(node).toBeTruthy();
    expect(node.type).toBe('math/sum');
    expect(node.title).toBe('Sum');
    expect(node.category).toBe('math');
    expect(node.prototype.configure).toBe(
      LGraphNode.prototype.configure,
    );
  });

  test('callback triggers', () => {
    const consoleSpy = vi
      .spyOn(console, 'log')
      .mockImplementation(() => {});

    LiteGraph.onNodeTypeRegistered = vi.fn();
    LiteGraph.onNodeTypeReplaced = vi.fn();
    LiteGraph.registerNodeType('math/sum', Sum);
    expect(LiteGraph.onNodeTypeRegistered).toHaveBeenCalled();
    expect(LiteGraph.onNodeTypeReplaced).not.toHaveBeenCalled();
    LiteGraph.registerNodeType('math/sum', Sum);
    expect(LiteGraph.onNodeTypeReplaced).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringMatching('replacing node type'),
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringMatching('math/sum'),
    );
  });

  test('node with title', () => {
    Sum.title = 'The sum title';
    LiteGraph.registerNodeType('math/sum', Sum);
    const node = LiteGraph.registered_node_types['math/sum'];
    expect(node.title).toBe('The sum title');
    expect(node.title).not.toBe(node.name);
  });

  test('handle error simple object', () => {
    expect(() => LiteGraph.registerNodeType('math/sum', { simple: 'type' })).toThrow('Cannot register a simple object');
  });

  test('check shape mapping', () => {
    LiteGraph.registerNodeType('math/sum', Sum);

    const node_type = LiteGraph.registered_node_types['math/sum'];
    expect(new node_type().shape).toBe(undefined);
    node_type.prototype.shape = 'default';
    expect(new node_type().shape).toBe(undefined);
    node_type.prototype.shape = 'box';
    console.log(LGraphStyles.BOX_SHAPE);
    expect(new node_type().shape).toBe(LGraphStyles.BOX_SHAPE);
    node_type.prototype.shape = 'round';
    expect(new node_type().shape).toBe(LGraphStyles.ROUND_SHAPE);
    node_type.prototype.shape = 'circle';
    expect(new node_type().shape).toBe(LGraphStyles.CIRCLE_SHAPE);
    node_type.prototype.shape = 'card';
    expect(new node_type().shape).toBe(LGraphStyles.CARD_SHAPE);
    node_type.prototype.shape = 'custom_shape';
    expect(new node_type().shape).toBe('custom_shape');

    // Check that also works for replaced node types
    vi.spyOn(console, 'log').mockImplementation(() => {});
    function NewCalcSum(a, b) {
      return a + b;
    }
    LiteGraph.registerNodeType('math/sum', NewCalcSum);
    const new_node_type = LiteGraph.registered_node_types['math/sum'];
    new_node_type.prototype.shape = 'box';
    expect(new new_node_type().shape).toBe(LGraphStyles.BOX_SHAPE);
  });

  test('onPropertyChanged warning', () => {
    const consoleSpy = vi
      .spyOn(console, 'warn')
      .mockImplementation(() => {});

    Sum.prototype.onPropertyChange = true;
    LiteGraph.registerNodeType('math/sum', Sum);
    expect(consoleSpy).toBeCalledTimes(1);
    expect(consoleSpy).toBeCalledWith(
      expect.stringContaining('has onPropertyChange method'),
    );
    expect(consoleSpy).toBeCalledWith(expect.stringContaining('math/sum'));
  });

  test('registering supported file extensions', () => {
    expect(LiteGraph.node_types_by_file_extension).toEqual({});

    // Create two node types with calc_times overriding .pdf
    Sum.supported_extensions = ['PDF', 'exe', null];
    function Times() {
      this.addInput('a', 'number');
      this.addInput('b', 'number');
      this.addOutput('times', 'number');
    }
    Times.prototype.onExecute = function (a, b) {
      this.setOutputData(0, a * b);
    };
    Times.supported_extensions = ['pdf', 'jpg'];
    LiteGraph.registerNodeType('math/sum', Sum);
    LiteGraph.registerNodeType('math/times', Times);

    expect(
      Object.keys(LiteGraph.node_types_by_file_extension).length,
    ).toBe(3);
    expect(LiteGraph.node_types_by_file_extension).toHaveProperty('pdf');
    expect(LiteGraph.node_types_by_file_extension).toHaveProperty('exe');
    expect(LiteGraph.node_types_by_file_extension).toHaveProperty('jpg');

    expect(LiteGraph.node_types_by_file_extension.exe).toBe(Sum);
    expect(LiteGraph.node_types_by_file_extension.pdf).toBe(Times);
    expect(LiteGraph.node_types_by_file_extension.jpg).toBe(Times);
  });

  test('register in/out slot types', () => {
    expect(LiteGraph.registered_slot_in_types).toEqual({});
    expect(LiteGraph.registered_slot_out_types).toEqual({});

    // Test slot type registration with first type
    LiteGraph.auto_load_slot_types = true;
    LiteGraph.registerNodeType('math/sum', Sum);
    expect(LiteGraph.registered_slot_in_types).toEqual({
      number: { nodes: ['math/sum'] },
    });
    expect(LiteGraph.registered_slot_out_types).toEqual({
      number: { nodes: ['math/sum'] },
    });

    // Test slot type registration with second type
    function ToInt() {
      this.addInput('string', 'string');
      this.addOutput('number', 'number');
    }
    ToInt.prototype.onExecute = function (str) {
      this.setOutputData(0, Number(str));
    };
    LiteGraph.registerNodeType('basic/to_int', ToInt);
    expect(LiteGraph.registered_slot_in_types).toEqual({
      number: { nodes: ['math/sum'] },
      string: { nodes: ['basic/to_int'] },
    });
    expect(LiteGraph.registered_slot_out_types).toEqual({
      number: { nodes: ['math/sum', 'basic/to_int'] },
    });
  });
});

describe('unregister node types', () => {
  let Sum;

  beforeEach(async () => {
    vi.resetModules();
    Sum = function Sum() {
      this.addInput('a', 'number');
      this.addInput('b', 'number');
      this.addOutput('sum', 'number');
    };
    Sum.prototype.onExecute = function (a, b) {
      this.setOutputData(0, a + b);
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('remove by name', () => {
    LiteGraph.registerNodeType('math/sum', Sum);
    expect(LiteGraph.registered_node_types['math/sum']).toBeTruthy();

    LiteGraph.unregisterNodeType('math/sum');
    expect(LiteGraph.registered_node_types['math/sum']).toBeFalsy();
  });

  test('remove by object', () => {
    LiteGraph.registerNodeType('math/sum', Sum);
    expect(LiteGraph.registered_node_types['math/sum']).toBeTruthy();

    LiteGraph.unregisterNodeType(Sum);
    expect(LiteGraph.registered_node_types['math/sum']).toBeFalsy();
  });

  test('try removing with wrong name', () => {
    expect(() => LiteGraph.unregisterNodeType('missing/type')).toThrow(
      'node type not found: missing/type',
    );
  });

  test('no constructor name', () => {
    function BlankNode() {}
    BlankNode.constructor = {};
    LiteGraph.registerNodeType('blank/node', BlankNode);
    expect(LiteGraph.registered_node_types['blank/node']).toBeTruthy();

    LiteGraph.unregisterNodeType('blank/node');
    expect(LiteGraph.registered_node_types['blank/node']).toBeFalsy();
  });
});
