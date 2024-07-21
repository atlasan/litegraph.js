import { LiteGraph } from '@/litegraph';

class Selector {
  constructor() {
    this.addInput('sel', 'number');
    this.addInput('A');
    this.addInput('B');
    this.addInput('C');
    this.addInput('D');
    this.addOutput('out');

    this.selected = 0;
  }

  onDrawBackground(ctx) {
    if (this.flags.collapsed) {
      return;
    }
    ctx.fillStyle = '#AFB';
    const y = (this.selected + 1) * LGraphStyles.NODE_SLOT_HEIGHT + 6;
    ctx.beginPath();
    ctx.moveTo(50, y);
    ctx.lineTo(50, y + LGraphStyles.NODE_SLOT_HEIGHT);
    ctx.lineTo(34, y + LGraphStyles.NODE_SLOT_HEIGHT * 0.5);
    ctx.fill();
  }

  onExecute() {
    let sel = this.getInputData(0);
    if (sel == null || sel.constructor !== Number) sel = 0;
    this.selected = sel = Math.round(sel) % (this.inputs.length - 1);
    const v = this.getInputData(sel + 1);
    if (v !== undefined) {
      this.setOutputData(0, v);
    }
  }

  onGetInputs() {
    return [['E', 0], ['F', 0], ['G', 0], ['H', 0]];
  }

  static title = 'Selector';

  static desc = 'selects an output';
}
LiteGraph.registerNodeType('logic/selector', Selector);

class Sequence {
  constructor() {
    this.properties = {
      sequence: 'A,B,C',
    };
    this.addInput('index', 'number');
    this.addInput('seq');
    this.addOutput('out');

    this.index = 0;
    this.values = this.properties.sequence.split(',');
  }

  onPropertyChanged(name, value) {
    if (name == 'sequence') {
      this.values = value.split(',');
    }
  }

  onExecute() {
    const seq = this.getInputData(1);
    if (seq && seq != this.current_sequence) {
      this.values = seq.split(',');
      this.current_sequence = seq;
    }
    let index = this.getInputData(0);
    if (index == null) {
      index = 0;
    }
    this.index = index = Math.round(index) % this.values.length;

    this.setOutputData(0, this.values[index]);
  }

  static title = 'Sequence';

  static desc = 'select one element from a sequence from a string';
}
LiteGraph.registerNodeType('logic/sequence', Sequence);

class logicAnd {
  constructor() {
    this.properties = { };
    this.addInput('a', 'boolean');
    this.addInput('b', 'boolean');
    this.addOutput('out', 'boolean');
  }

  onExecute() {
    var ret = true;
    for (const inX in this.inputs) {
      if (!this.getInputData(inX)) {
        var ret = false;
        break;
      }
    }
    this.setOutputData(0, ret);
  }

  onGetInputs() {
    return [
      ['and', 'boolean'],
    ];
  }

  static title = 'AND';

  static desc = 'Return true if all inputs are true';
}
LiteGraph.registerNodeType('logic/AND', logicAnd);

class logicOr {
  constructor() {
    this.properties = { };
    this.addInput('a', 'boolean');
    this.addInput('b', 'boolean');
    this.addOutput('out', 'boolean');
  }

  onExecute() {
    let ret = false;
    for (const inX in this.inputs) {
      if (this.getInputData(inX)) {
        ret = true;
        break;
      }
    }
    this.setOutputData(0, ret);
  }

  onGetInputs() {
    return [
      ['or', 'boolean'],
    ];
  }
}

logicOr.title = 'OR';
logicOr.desc = 'Return true if at least one input is true';
LiteGraph.registerNodeType('logic/OR', logicOr);

class logicNot {
  constructor() {
    this.properties = { };
    this.addInput('in', 'boolean');
    this.addOutput('out', 'boolean');
  }

  onExecute() {
    const ret = !this.getInputData(0);
    this.setOutputData(0, ret);
  }

  static title = 'NOT';

  static desc = 'Return the logical negation';
}
LiteGraph.registerNodeType('logic/NOT', logicNot);

class logicCompare {
  constructor() {
    this.properties = { };
    this.addInput('a', 'boolean');
    this.addInput('b', 'boolean');
    this.addOutput('out', 'boolean');
  }

  onExecute() {
    let last = null;
    let ret = true;
    for (const inX in this.inputs) {
      if (last === null) last = this.getInputData(inX);
      else
        if (last != this.getInputData(inX)) {
          ret = false;
          break;
        }
    }
    this.setOutputData(0, ret);
  }

  onGetInputs() {
    return [
      ['bool', 'boolean'],
    ];
  }

  static title = 'bool == bool';

  static desc = 'Compare for logical equality';
}
LiteGraph.registerNodeType('logic/CompareBool', logicCompare);

class logicBranch {
  constructor() {
    this.properties = { };
    this.addInput('onTrigger', LiteGraph.ACTION);
    this.addInput('condition', 'boolean');
    this.addOutput('true', LiteGraph.EVENT);
    this.addOutput('false', LiteGraph.EVENT);
    this.mode = LiteGraph.ON_TRIGGER;
  }

  onExecute(param, options) {
    const condtition = this.getInputData(1);
    if (condtition) {
      this.triggerSlot(0);
    } else {
      this.triggerSlot(1);
    }
  }

  static title = 'Branch';

  static desc = 'Branch execution on condition';
}
LiteGraph.registerNodeType('logic/IF', logicBranch);
