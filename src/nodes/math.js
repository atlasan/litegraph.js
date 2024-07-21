import { LiteGraph } from '@/litegraph';
import { LGraphStyles } from '../core/styles';

class Converter {
  constructor() {
    this.addInput('in', 0);
    this.addOutput('out', 0);
    this.size = [80, 30];
  }

  onExecute() {
    const v = this.getInputData(0);
    if (v == null) {
      return;
    }

    if (this.outputs) {
      for (let i = 0; i < this.outputs.length; i++) {
        const output = this.outputs[i];
        if (!output.links || !output.links.length) {
          continue;
        }

        var result = null;
        switch (output.name) {
          case 'number':
            result = v.length ? v[0] : parseFloat(v);
            break;
          case 'vec2':
          case 'vec3':
          case 'vec4':
            var result = null;
            var count = 1;
            switch (output.name) {
              case 'vec2':
                count = 2;
                break;
              case 'vec3':
                count = 3;
                break;
              case 'vec4':
                count = 4;
                break;
            }

            var result = new Float32Array(count);
            if (v.length) {
              for (
                let j = 0;
                j < v.length && j < result.length;
                j++
              ) {
                result[j] = v[j];
              }
            } else {
              result[0] = parseFloat(v);
            }
            break;
        }
        this.setOutputData(i, result);
      }
    }
  }

  onGetOutputs() {
    return [
      ['number', 'number'],
      ['vec2', 'vec2'],
      ['vec3', 'vec3'],
      ['vec4', 'vec4'],
    ];
  }

  static title = 'Converter';

  static desc = 'type A to type B';
}
LiteGraph.registerNodeType('math/converter', Converter);

class Bypass {
  constructor() {
    this.addInput('in');
    this.addOutput('out');
    this.size = [80, 30];
  }

  onExecute() {
    const v = this.getInputData(0);
    this.setOutputData(0, v);
  }

  static title = 'Bypass';

  static desc = 'removes the type';
}
LiteGraph.registerNodeType('math/bypass', Bypass);

class ToNumber {
  constructor() {
    this.addInput('in');
    this.addOutput('out');
  }

  onExecute() {
    const v = this.getInputData(0);
    this.setOutputData(0, Number(v));
  }

  static title = 'to Number';

  static desc = 'Cast to number';
}
LiteGraph.registerNodeType('math/to_number', ToNumber);

class MathRange {
  constructor() {
    this.addInput('in', 'number', { locked: true });
    this.addOutput('out', 'number', { locked: true });
    this.addOutput('clamped', 'number', { locked: true });

    this.addProperty('in', 0);
    this.addProperty('in_min', 0);
    this.addProperty('in_max', 1);
    this.addProperty('out_min', 0);
    this.addProperty('out_max', 1);

    this.size = [120, 50];
  }

  getTitle() {
    if (this.flags.collapsed) {
      return (this._last_v || 0).toFixed(2);
    }
    return this.title;
  }

  onExecute() {
    if (this.inputs) {
      for (let i = 0; i < this.inputs.length; i++) {
        const input = this.inputs[i];
        var v = this.getInputData(i);
        if (v === undefined) {
          continue;
        }
        this.properties[input.name] = v;
      }
    }

    var v = this.properties.in;
    if (v === undefined || v === null || v.constructor !== Number) {
      v = 0;
    }

    const { in_min } = this.properties;
    const { in_max } = this.properties;
    const { out_min } = this.properties;
    const { out_max } = this.properties;
    /*
          if( in_min > in_max )
          {
              in_min = in_max;
              in_max = this.properties.in_min;
          }
          if( out_min > out_max )
          {
              out_min = out_max;
              out_max = this.properties.out_min;
          }
          */

    this._last_v = ((v - in_min) / (in_max - in_min)) * (out_max - out_min) + out_min;
    this.setOutputData(0, this._last_v);
    this.setOutputData(1, clamp(this._last_v, out_min, out_max));
  }

  onDrawBackground(ctx) {
    // show the current value
    if (this._last_v) {
      this.outputs[0].label = this._last_v.toFixed(3);
    } else {
      this.outputs[0].label = '?';
    }
  }

  onGetInputs() {
    return [
      ['in_min', 'number'],
      ['in_max', 'number'],
      ['out_min', 'number'],
      ['out_max', 'number'],
    ];
  }

  static title = 'Range';

  static desc = 'Convert a number from one range to another';
}
LiteGraph.registerNodeType('math/range', MathRange);

class MathRand {
  constructor() {
    this.addOutput('value', 'number');
    this.addProperty('min', 0);
    this.addProperty('max', 1);
    this.size = [80, 30];
  }

  onExecute() {
    if (this.inputs) {
      for (let i = 0; i < this.inputs.length; i++) {
        const input = this.inputs[i];
        const v = this.getInputData(i);
        if (v === undefined) {
          continue;
        }
        this.properties[input.name] = v;
      }
    }

    const { min } = this.properties;
    const { max } = this.properties;
    this._last_v = Math.random() * (max - min) + min;
    this.setOutputData(0, this._last_v);
  }

  onDrawBackground(ctx) {
    // show the current value
    this.outputs[0].label = (this._last_v || 0).toFixed(3);
  }

  onGetInputs() {
    return [['min', 'number'], ['max', 'number']];
  }

  static title = 'Rand';

  static desc = 'Random number';
}
LiteGraph.registerNodeType('math/rand', MathRand);

// basic continuous noise
class MathNoise {
  constructor() {
    this.addInput('in', 'number');
    this.addOutput('out', 'number');
    this.addProperty('min', 0);
    this.addProperty('max', 1);
    this.addProperty('smooth', true);
    this.addProperty('seed', 0);
    this.addProperty('octaves', 1);
    this.addProperty('persistence', 0.8);
    this.addProperty('speed', 1);
    this.size = [90, 30];
  }

  static getValue(f, smooth) {
    if (!MathNoise.data) {
      MathNoise.data = new Float32Array(1024);
      for (let i = 0; i < MathNoise.data.length; ++i) {
        MathNoise.data[i] = Math.random();
      }
    }
    f %= 1024;
    if (f < 0) {
      f += 1024;
    }
    const f_min = Math.floor(f);
    var f = f - f_min;
    const r1 = MathNoise.data[f_min];
    const r2 = MathNoise.data[f_min == 1023 ? 0 : f_min + 1];
    if (smooth) {
      f = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
    }
    return r1 * (1 - f) + r2 * f;
  }

  onExecute() {
    let f = this.getInputData(0) || 0;
    const iterations = this.properties.octaves || 1;
    let r = 0;
    let amp = 1;
    const seed = this.properties.seed || 0;
    f += seed;
    const speed = this.properties.speed || 1;
    let total_amp = 0;
    for (let i = 0; i < iterations; ++i) {
      r += MathNoise.getValue(f * (1 + i) * speed, this.properties.smooth) * amp;
      total_amp += amp;
      amp *= this.properties.persistence;
      if (amp < 0.001) break;
    }
    r /= total_amp;
    const { min } = this.properties;
    const { max } = this.properties;
    this._last_v = r * (max - min) + min;
    this.setOutputData(0, this._last_v);
  }

  onDrawBackground(ctx) {
    // show the current value
    this.outputs[0].label = (this._last_v || 0).toFixed(3);
  }

  static title = 'Noise';

  static desc = 'Random number with temporal continuity';

  static data = null;
}
LiteGraph.registerNodeType('math/noise', MathNoise);

// generates spikes every random time
class MathSpikes {
  constructor() {
    this.addOutput('out', 'number');
    this.addProperty('min_time', 1);
    this.addProperty('max_time', 2);
    this.addProperty('duration', 0.2);
    this.size = [90, 30];
    this._remaining_time = 0;
    this._blink_time = 0;
  }

  onExecute() {
    const dt = this.graph.elapsed_time; // in secs

    this._remaining_time -= dt;
    this._blink_time -= dt;

    let v = 0;
    if (this._blink_time > 0) {
      const f = this._blink_time / this.properties.duration;
      v = 1 / ((f * 8 - 4) ** 4 + 1);
    }

    if (this._remaining_time < 0) {
      this._remaining_time = Math.random()
                      * (this.properties.max_time - this.properties.min_time)
                  + this.properties.min_time;
      this._blink_time = this.properties.duration;
      this.boxcolor = '#FFF';
    } else {
      this.boxcolor = '#000';
    }
    this.setOutputData(0, v);
  }

  static title = 'Spikes';

  static desc = 'spike every random time';
}
LiteGraph.registerNodeType('math/spikes', MathSpikes);

class MathClamp {
  constructor() {
    this.addInput('in', 'number');
    this.addOutput('out', 'number');
    this.size = [80, 30];
    this.addProperty('min', 0);
    this.addProperty('max', 1);
  }

  // MathClamp.filter = "shader";

  onExecute() {
    let v = this.getInputData(0);
    if (v == null) {
      return;
    }
    v = Math.max(this.properties.min, v);
    v = Math.min(this.properties.max, v);
    this.setOutputData(0, v);
  }

  getCode(lang) {
    let code = '';
    if (this.isInputConnected(0)) {
      code
                  += `clamp({{0}},${
          this.properties.min
        },${
          this.properties.max
        })`;
    }
    return code;
  }

  static title = 'Clamp';

  static desc = 'Clamp number between min and max';
}
LiteGraph.registerNodeType('math/clamp', MathClamp);

class MathLerp {
  constructor() {
    this.properties = { f: 0.5 };
    this.addInput('A', 'number');
    this.addInput('B', 'number');

    this.addOutput('out', 'number');
  }

  onExecute() {
    let v1 = this.getInputData(0);
    if (v1 == null) {
      v1 = 0;
    }
    let v2 = this.getInputData(1);
    if (v2 == null) {
      v2 = 0;
    }

    let { f } = this.properties;

    const _f = this.getInputData(2);
    if (_f !== undefined) {
      f = _f;
    }

    this.setOutputData(0, v1 * (1 - f) + v2 * f);
  }

  onGetInputs() {
    return [['f', 'number']];
  }

  static title = 'Lerp';

  static desc = 'Linear Interpolation';
}
LiteGraph.registerNodeType('math/lerp', MathLerp);

class MathAbs {
  constructor() {
    this.addInput('in', 'number');
    this.addOutput('out', 'number');
    this.size = [80, 30];
  }

  onExecute() {
    const v = this.getInputData(0);
    if (v == null) {
      return;
    }
    this.setOutputData(0, Math.abs(v));
  }

  static title = 'Abs';

  static desc = 'Absolute';
}
LiteGraph.registerNodeType('math/abs', MathAbs);

class MathFloor {
  constructor() {
    this.addInput('in', 'number');
    this.addOutput('out', 'number');
    this.size = [80, 30];
  }

  onExecute() {
    const v = this.getInputData(0);
    if (v == null) {
      return;
    }
    this.setOutputData(0, Math.floor(v));
  }

  static title = 'Floor';

  static desc = 'Floor number to remove fractional part';
}
LiteGraph.registerNodeType('math/floor', MathFloor);

class MathFrac {
  constructor() {
    this.addInput('in', 'number');
    this.addOutput('out', 'number');
    this.size = [80, 30];
  }

  onExecute() {
    const v = this.getInputData(0);
    if (v == null) {
      return;
    }
    this.setOutputData(0, v % 1);
  }

  static title = 'Frac';

  static desc = 'Returns fractional part';
}
LiteGraph.registerNodeType('math/frac', MathFrac);

class MathSmoothStep {
  constructor() {
    this.addInput('in', 'number');
    this.addOutput('out', 'number');
    this.size = [80, 30];
    this.properties = { A: 0, B: 1 };
  }

  onExecute() {
    let v = this.getInputData(0);
    if (v === undefined) {
      return;
    }

    const edge0 = this.properties.A;
    const edge1 = this.properties.B;

    // Scale, bias and saturate x to 0..1 range
    v = clamp((v - edge0) / (edge1 - edge0), 0.0, 1.0);
    // Evaluate polynomial
    v = v * v * (3 - 2 * v);

    this.setOutputData(0, v);
  }

  static title = 'Smoothstep';

  static desc = 'Smoothstep';
}
LiteGraph.registerNodeType('math/smoothstep', MathSmoothStep);

class MathScale {
  constructor() {
    this.addInput('in', 'number', { label: '' });
    this.addOutput('out', 'number', { label: '' });
    this.size = [80, 30];
    this.addProperty('factor', 1);
  }

  onExecute() {
    const value = this.getInputData(0);
    if (value != null) {
      this.setOutputData(0, value * this.properties.factor);
    }
  }

  static title = 'Scale';

  static desc = 'v * factor';
}
LiteGraph.registerNodeType('math/scale', MathScale);

class Gate {
  constructor() {
    this.addInput('v', 'boolean');
    this.addInput('A');
    this.addInput('B');
    this.addOutput('out');
  }

  onExecute() {
    const v = this.getInputData(0);
    this.setOutputData(0, this.getInputData(v ? 1 : 2));
  }

  static title = 'Gate';

  static desc = 'if v is true, then outputs A, otherwise B';
}
LiteGraph.registerNodeType('math/gate', Gate);

class MathAverageFilter {
  constructor() {
    this.addInput('in', 'number');
    this.addOutput('out', 'number');
    this.size = [80, 30];
    this.addProperty('samples', 10);
    this._values = new Float32Array(10);
    this._current = 0;
  }

  onExecute() {
    let v = this.getInputData(0);
    if (v == null) {
      v = 0;
    }

    const num_samples = this._values.length;

    this._values[this._current % num_samples] = v;
    this._current += 1;
    if (this._current > num_samples) {
      this._current = 0;
    }

    let avr = 0;
    for (let i = 0; i < num_samples; ++i) {
      avr += this._values[i];
    }

    this.setOutputData(0, avr / num_samples);
  }

  // @TODO: CHECK!
  onPropertyChanged(name, value) {
    if (name === 'samples') {
      if (value < 1) {
        value = 1;
      }
      this.properties.samples = Math.round(value);
      const old = this._values;

      this._values = new Float32Array(this.properties.samples);
      if (old.length <= this._values.length) {
        this._values.set(old);
      } else {
        this._values.set(old.subarray(0, this._values.length));
      }
    } else if (name === 'formula') {
      this.code_widget.value = value;
    }
  }

  static title = 'Average';

  static desc = 'Average Filter';
}
LiteGraph.registerNodeType('math/average', MathAverageFilter);

class MathTendTo {
  constructor() {
    this.addInput('in', 'number');
    this.addOutput('out', 'number');
    this.addProperty('factor', 0.1);
    this.size = [80, 30];
    this._value = null;
  }

  onExecute() {
    let v = this.getInputData(0);
    if (v == null) {
      v = 0;
    }
    const f = this.properties.factor;
    if (this._value == null) {
      this._value = v;
    } else {
      this._value = this._value * (1 - f) + v * f;
    }
    this.setOutputData(0, this._value);
  }

  static title = 'TendTo';

  static desc = 'moves the output value always closer to the input';
}
LiteGraph.registerNodeType('math/tendTo', MathTendTo);

class MathOperation {
  constructor() {
    this.addInput('A', 'number,array,object');
    this.addInput('B', 'number');
    this.addOutput('=', 'number');
    this.addProperty('A', 1);
    this.addProperty('B', 1);
    this.addProperty('OP', '+', 'enum', { values: MathOperation.values });
    this._func = MathOperation.funcs[this.properties.OP];
    this._result = []; // only used for arrays
  }

  getTitle() {
    if (this.properties.OP == 'max' || this.properties.OP == 'min') return `${this.properties.OP}(A,B)`;
    return `A ${this.properties.OP} B`;
  }

  setValue(v) {
    if (typeof v === 'string') {
      v = parseFloat(v);
    }
    this.properties.value = v;
  }

  onPropertyChanged(name, value) {
    if (name != 'OP') return;
    this._func = MathOperation.funcs[this.properties.OP];
    if (!this._func) {
      console.warn(`Unknown operation: ${this.properties.OP}`);
      this._func = function (A) { return A; };
    }
  }

  onExecute() {
    let A = this.getInputData(0);
    let B = this.getInputData(1);
    if (A != null) {
      if (A.constructor === Number) this.properties.A = A;
    } else {
      A = this.properties.A;
    }

    if (B != null) {
      this.properties.B = B;
    } else {
      B = this.properties.B;
    }

    const func = MathOperation.funcs[this.properties.OP];

    let result;
    if (A.constructor === Number) {
      result = 0;
      result = func(A, B);
    } else if (A.constructor === Array) {
      result = this._result;
      result.length = A.length;
      for (var i = 0; i < A.length; ++i) result[i] = func(A[i], B);
    } else {
      result = {};
      for (var i in A) result[i] = func(A[i], B);
    }
    this.setOutputData(0, result);
  }

  onDrawBackground(ctx) {
    if (this.flags.collapsed) {
      return;
    }

    ctx.font = '40px Arial';
    ctx.fillStyle = '#666';
    ctx.textAlign = 'center';
    ctx.fillText(
      this.properties.OP,
      this.size[0] * 0.5,
      (this.size[1] + LGraphStyles.NODE_TITLE_HEIGHT) * 0.5,
    );
    ctx.textAlign = 'left';
  }

  static title = 'Operation';

  static desc = 'Easy math operators';

  static values = ['+', '-', '*', '/', '%', '^', 'max', 'min'];

  static funcs = {
    '+': function (A, B) { return A + B; },
    '-': function (A, B) { return A - B; },
    x(A, B) { return A * B; },
    X(A, B) { return A * B; },
    '*': function (A, B) { return A * B; },
    '/': function (A, B) { return A / B; },
    '%': function (A, B) { return A % B; },
    '^': function (A, B) { return A ** B; },
    max(A, B) { return Math.max(A, B); },
    min(A, B) { return Math.min(A, B); },
  };

  static '@OP' = {
    type: 'enum',
    title: 'operation',
    values: MathOperation.values,
  };

  static size = [100, 60];
}
LiteGraph.registerNodeType('math/operation', MathOperation);

LiteGraph.registerSearchboxExtra('math/operation', 'MAX', {
  properties: { OP: 'max' },
  title: 'MAX()',
});

LiteGraph.registerSearchboxExtra('math/operation', 'MIN', {
  properties: { OP: 'min' },
  title: 'MIN()',
});

class MathCompare {
  constructor() {
    this.addInput('A', 'number');
    this.addInput('B', 'number');
    this.addOutput('A==B', 'boolean');
    this.addOutput('A!=B', 'boolean');
    this.addProperty('A', 0);
    this.addProperty('B', 0);
  }

  onExecute() {
    let A = this.getInputData(0);
    let B = this.getInputData(1);
    if (A !== undefined) {
      this.properties.A = A;
    } else {
      A = this.properties.A;
    }

    if (B !== undefined) {
      this.properties.B = B;
    } else {
      B = this.properties.B;
    }

    for (let i = 0, l = this.outputs.length; i < l; ++i) {
      const output = this.outputs[i];
      if (!output.links || !output.links.length) {
        continue;
      }
      var value;
      switch (output.name) {
        case 'A==B':
          value = A == B;
          break;
        case 'A!=B':
          value = A != B;
          break;
        case 'A>B':
          value = A > B;
          break;
        case 'A<B':
          value = A < B;
          break;
        case 'A<=B':
          value = A <= B;
          break;
        case 'A>=B':
          value = A >= B;
          break;
      }
      this.setOutputData(i, value);
    }
  }

  onGetOutputs() {
    return [
      ['A==B', 'boolean'],
      ['A!=B', 'boolean'],
      ['A>B', 'boolean'],
      ['A<B', 'boolean'],
      ['A>=B', 'boolean'],
      ['A<=B', 'boolean'],
    ];
  }

  static title = 'Compare';

  static desc = 'compares between two values';
}
LiteGraph.registerNodeType('math/compare', MathCompare);

LiteGraph.registerSearchboxExtra('math/compare', '==', {
  outputs: [['A==B', 'boolean']],
  title: 'A==B',
});
LiteGraph.registerSearchboxExtra('math/compare', '!=', {
  outputs: [['A!=B', 'boolean']],
  title: 'A!=B',
});
LiteGraph.registerSearchboxExtra('math/compare', '>', {
  outputs: [['A>B', 'boolean']],
  title: 'A>B',
});
LiteGraph.registerSearchboxExtra('math/compare', '<', {
  outputs: [['A<B', 'boolean']],
  title: 'A<B',
});
LiteGraph.registerSearchboxExtra('math/compare', '>=', {
  outputs: [['A>=B', 'boolean']],
  title: 'A>=B',
});
LiteGraph.registerSearchboxExtra('math/compare', '<=', {
  outputs: [['A<=B', 'boolean']],
  title: 'A<=B',
});

class MathCondition {
  constructor() {
    this.addInput('A', 'number');
    this.addInput('B', 'number');
    this.addOutput('true', 'boolean');
    this.addOutput('false', 'boolean');
    this.addProperty('A', 1);
    this.addProperty('B', 1);
    this.addProperty('OP', '>', 'enum', { values: MathCondition.values });
    this.addWidget('combo', 'Cond.', this.properties.OP, { property: 'OP', values: MathCondition.values });

    this.size = [80, 60];
  }

  getTitle() {
    return `A ${this.properties.OP} B`;
  }

  onExecute() {
    let A = this.getInputData(0);
    if (A === undefined) {
      A = this.properties.A;
    } else {
      this.properties.A = A;
    }

    let B = this.getInputData(1);
    if (B === undefined) {
      B = this.properties.B;
    } else {
      this.properties.B = B;
    }

    let result = true;
    switch (this.properties.OP) {
      case '>':
        result = A > B;
        break;
      case '<':
        result = A < B;
        break;
      case '==':
        result = A == B;
        break;
      case '!=':
        result = A != B;
        break;
      case '<=':
        result = A <= B;
        break;
      case '>=':
        result = A >= B;
        break;
      case '||':
        result = A || B;
        break;
      case '&&':
        result = A && B;
        break;
    }

    this.setOutputData(0, result);
    this.setOutputData(1, !result);
  }

  static title = 'Condition';

  static desc = 'evaluates condition between A and B';

  static values = ['>', '<', '==', '!=', '<=', '>=', '||', '&&'];

  static '@OP' = {
    type: 'enum',
    title: 'operation',
    values: MathCondition.values,
  };
}
LiteGraph.registerNodeType('math/condition', MathCondition);

class MathBranch {
  constructor() {
    this.addInput('in', 0);
    this.addInput('cond', 'boolean');
    this.addOutput('true', 0);
    this.addOutput('false', 0);
    this.size = [80, 60];
  }

  onExecute() {
    const V = this.getInputData(0);
    const cond = this.getInputData(1);

    if (cond) {
      this.setOutputData(0, V);
      this.setOutputData(1, null);
    } else {
      this.setOutputData(0, null);
      this.setOutputData(1, V);
    }
  }

  static title = 'Branch';

  static desc = 'If condition is true, outputs IN in true, otherwise in false';
}
LiteGraph.registerNodeType('math/branch', MathBranch);

class MathAccumulate {
  constructor() {
    this.addInput('inc', 'number');
    this.addOutput('total', 'number');
    this.addProperty('increment', 1);
    this.addProperty('value', 0);
  }

  onExecute() {
    if (this.properties.value === null) {
      this.properties.value = 0;
    }

    const inc = this.getInputData(0);
    if (inc !== null) {
      this.properties.value += inc;
    } else {
      this.properties.value += this.properties.increment;
    }
    this.setOutputData(0, this.properties.value);
  }

  static title = 'Accumulate';

  static desc = 'Increments a value every time';
}
LiteGraph.registerNodeType('math/accumulate', MathAccumulate);

class MathTrigonometry {
  constructor() {
    this.addInput('v', 'number');
    this.addOutput('sin', 'number');

    this.addProperty('amplitude', 1);
    this.addProperty('offset', 0);
    this.bgImageUrl = 'assets/images/icon-sin.png';
  }

  // MathTrigonometry.filter = "shader";

  onExecute() {
    let v = this.getInputData(0);
    if (v == null) {
      v = 0;
    }
    let { amplitude } = this.properties;
    let slot = this.findInputSlot('amplitude');
    if (slot != -1) {
      amplitude = this.getInputData(slot);
    }
    let { offset } = this.properties;
    slot = this.findInputSlot('offset');
    if (slot != -1) {
      offset = this.getInputData(slot);
    }

    for (let i = 0, l = this.outputs.length; i < l; ++i) {
      const output = this.outputs[i];
      var value;
      switch (output.name) {
        case 'sin':
          value = Math.sin(v);
          break;
        case 'cos':
          value = Math.cos(v);
          break;
        case 'tan':
          value = Math.tan(v);
          break;
        case 'asin':
          value = Math.asin(v);
          break;
        case 'acos':
          value = Math.acos(v);
          break;
        case 'atan':
          value = Math.atan(v);
          break;
      }
      this.setOutputData(i, amplitude * value + offset);
    }
  }

  onGetInputs() {
    return [['v', 'number'], ['amplitude', 'number'], ['offset', 'number']];
  }

  onGetOutputs() {
    return [
      ['sin', 'number'],
      ['cos', 'number'],
      ['tan', 'number'],
      ['asin', 'number'],
      ['acos', 'number'],
      ['atan', 'number'],
    ];
  }

  static title = 'Trigonometry';

  static desc = 'Sin Cos Tan';
}
LiteGraph.registerNodeType('math/trigonometry', MathTrigonometry);

LiteGraph.registerSearchboxExtra('math/trigonometry', 'SIN()', {
  outputs: [['sin', 'number']],
  title: 'SIN()',
});
LiteGraph.registerSearchboxExtra('math/trigonometry', 'COS()', {
  outputs: [['cos', 'number']],
  title: 'COS()',
});
LiteGraph.registerSearchboxExtra('math/trigonometry', 'TAN()', {
  outputs: [['tan', 'number']],
  title: 'TAN()',
});

// math library for safe math operations without eval
class MathFormula {
  constructor() {
    this.addInput('x', 'number');
    this.addInput('y', 'number');
    this.addOutput('', 'number');
    this.properties = { x: 1.0, y: 1.0, formula: 'x+y' };
    this.code_widget = this.addWidget(
      'text',
      'F(x,y)',
      this.properties.formula,
      (v, canvas, node) => {
        node.properties.formula = v;
      },
    );
    this.addWidget('toggle', 'allow', LiteGraph.allow_scripts, (v) => {
      LiteGraph.allow_scripts = v;
    });
    this._func = null;
  }

  onExecute() {
    if (!LiteGraph.allow_scripts) {
      return;
    }

    let x = this.getInputData(0);
    let y = this.getInputData(1);
    if (x != null) {
      this.properties.x = x;
    } else {
      x = this.properties.x;
    }

    if (y != null) {
      this.properties.y = y;
    } else {
      y = this.properties.y;
    }

    const f = this.properties.formula;

    let value;
    try {
      if (!this._func || this._func_code != this.properties.formula) {
        this._func = new Function(
          'x',
          'y',
          'TIME',
          `return ${this.properties.formula}`,
        );
        this._func_code = this.properties.formula;
      }
      value = this._func(x, y, this.graph.globaltime);
      this.boxcolor = null;
    } catch (err) {
      this.boxcolor = 'red';
    }
    this.setOutputData(0, value);
  }

  getTitle() {
    return this._func_code || 'Formula';
  }

  onDrawBackground() {
    const f = this.properties.formula;
    if (this.outputs && this.outputs.length) {
      this.outputs[0].label = f;
    }
  }

  static title = 'Formula';

  static desc = 'Compute formula';

  static size = [160, 100];
}
LiteGraph.registerNodeType('math/formula', MathFormula);

class Math3DVec2ToXY {
  constructor() {
    this.addInput('vec2', 'vec2');
    this.addOutput('x', 'number');
    this.addOutput('y', 'number');
  }

  onExecute() {
    const v = this.getInputData(0);
    if (v == null) {
      return;
    }

    this.setOutputData(0, v[0]);
    this.setOutputData(1, v[1]);
  }

  static title = 'Vec2->XY';

  static desc = 'vector 2 to components';
}
LiteGraph.registerNodeType('math3d/vec2-to-xy', Math3DVec2ToXY);

class Math3DXYToVec2 {
  constructor() {
    this.addInputs([['x', 'number'], ['y', 'number']]);
    this.addOutput('vec2', 'vec2');
    this.properties = { x: 0, y: 0 };
    this._data = new Float32Array(2);
  }

  onExecute() {
    let x = this.getInputData(0);
    if (x == null) {
      x = this.properties.x;
    }
    let y = this.getInputData(1);
    if (y == null) {
      y = this.properties.y;
    }

    const data = this._data;
    data[0] = x;
    data[1] = y;

    this.setOutputData(0, data);
  }

  static title = 'XY->Vec2';

  static desc = 'components to vector2';
}
LiteGraph.registerNodeType('math3d/xy-to-vec2', Math3DXYToVec2);

class Math3DVec3ToXYZ {
  constructor() {
    this.addInput('vec3', 'vec3');
    this.addOutput('x', 'number');
    this.addOutput('y', 'number');
    this.addOutput('z', 'number');
  }

  onExecute() {
    const v = this.getInputData(0);
    if (v == null) {
      return;
    }

    this.setOutputData(0, v[0]);
    this.setOutputData(1, v[1]);
    this.setOutputData(2, v[2]);
  }

  static title = 'Vec3->XYZ';

  static desc = 'vector 3 to components';
}
LiteGraph.registerNodeType('math3d/vec3-to-xyz', Math3DVec3ToXYZ);

class Math3DXYZToVec3 {
  constructor() {
    this.addInputs([['x', 'number'], ['y', 'number'], ['z', 'number']]);
    this.addOutput('vec3', 'vec3');
    this.properties = { x: 0, y: 0, z: 0 };
    this._data = new Float32Array(3);
  }

  onExecute() {
    let x = this.getInputData(0);
    if (x == null) {
      x = this.properties.x;
    }
    let y = this.getInputData(1);
    if (y == null) {
      y = this.properties.y;
    }
    let z = this.getInputData(2);
    if (z == null) {
      z = this.properties.z;
    }

    const data = this._data;
    data[0] = x;
    data[1] = y;
    data[2] = z;

    this.setOutputData(0, data);
  }

  static title = 'XYZ->Vec3';

  static desc = 'components to vector3';
}
LiteGraph.registerNodeType('math3d/xyz-to-vec3', Math3DXYZToVec3);

class Math3DVec4ToXYZW {
  constructor() {
    this.addInput('vec4', 'vec4');
    this.addOutput('x', 'number');
    this.addOutput('y', 'number');
    this.addOutput('z', 'number');
    this.addOutput('w', 'number');
  }

  onExecute() {
    const v = this.getInputData(0);
    if (v == null) {
      return;
    }

    this.setOutputData(0, v[0]);
    this.setOutputData(1, v[1]);
    this.setOutputData(2, v[2]);
    this.setOutputData(3, v[3]);
  }

  static title = 'Vec4->XYZW';

  static desc = 'vector 4 to components';
}
LiteGraph.registerNodeType('math3d/vec4-to-xyzw', Math3DVec4ToXYZW);

class Math3DXYZWToVec4 {
  constructor() {
    this.addInputs([
      ['x', 'number'],
      ['y', 'number'],
      ['z', 'number'],
      ['w', 'number'],
    ]);
    this.addOutput('vec4', 'vec4');
    this.properties = {
      x: 0, y: 0, z: 0, w: 0,
    };
    this._data = new Float32Array(4);
  }

  onExecute() {
    let x = this.getInputData(0);
    if (x == null) {
      x = this.properties.x;
    }
    let y = this.getInputData(1);
    if (y == null) {
      y = this.properties.y;
    }
    let z = this.getInputData(2);
    if (z == null) {
      z = this.properties.z;
    }
    let w = this.getInputData(3);
    if (w == null) {
      w = this.properties.w;
    }

    const data = this._data;
    data[0] = x;
    data[1] = y;
    data[2] = z;
    data[3] = w;

    this.setOutputData(0, data);
  }

  static title = 'XYZW->Vec4';

  static desc = 'components to vector4';
}
LiteGraph.registerNodeType('math3d/xyzw-to-vec4', Math3DXYZWToVec4);
