import { GL } from '@libs/litegl';
import { LiteGraph } from '@/litegraph';
import { LGraphTexture } from './gltextures';
import { LGraphStyles } from '../core/styles';

const global = typeof (window) !== 'undefined' ? window : typeof (self) !== 'undefined' ? self : globalThis;
if (typeof GL !== 'undefined') {
  const SHADERNODES_COLOR = '#345';

  const LGShaders = LiteGraph.Shaders = {};

  const GLSL_types = LGShaders.GLSL_types = ['float', 'vec2', 'vec3', 'vec4', 'mat3', 'mat4', 'sampler2D', 'samplerCube'];
  const GLSL_types_const = LGShaders.GLSL_types_const = ['float', 'vec2', 'vec3', 'vec4'];

  const GLSL_functions_desc = {
    radians: 'T radians(T degrees)',
    degrees: 'T degrees(T radians)',
    sin: 'T sin(T angle)',
    cos: 'T cos(T angle)',
    tan: 'T tan(T angle)',
    asin: 'T asin(T x)',
    acos: 'T acos(T x)',
    atan: 'T atan(T x)',
    atan2: 'T atan(T x,T y)',
    pow: 'T pow(T x,T y)',
    exp: 'T exp(T x)',
    log: 'T log(T x)',
    exp2: 'T exp2(T x)',
    log2: 'T log2(T x)',
    sqrt: 'T sqrt(T x)',
    inversesqrt: 'T inversesqrt(T x)',
    abs: 'T abs(T x)',
    sign: 'T sign(T x)',
    floor: 'T floor(T x)',
    round: 'T round(T x)',
    ceil: 'T ceil(T x)',
    fract: 'T fract(T x)',
    mod: 'T mod(T x,T y)', // "T mod(T x,float y)"
    min: 'T min(T x,T y)',
    max: 'T max(T x,T y)',
    clamp: 'T clamp(T x,T minVal = 0.0,T maxVal = 1.0)',
    mix: 'T mix(T x,T y,T a)', // "T mix(T x,T y,float a)"
    step: 'T step(T edge, T edge2, T x)', // "T step(float edge, T x)"
    smoothstep: 'T smoothstep(T edge, T edge2, T x)', // "T smoothstep(float edge, T x)"
    length: 'float length(T x)',
    distance: 'float distance(T p0, T p1)',
    normalize: 'T normalize(T x)',
    dot: 'float dot(T x,T y)',
    cross: 'vec3 cross(vec3 x,vec3 y)',
    reflect: 'vec3 reflect(vec3 V,vec3 N)',
    refract: 'vec3 refract(vec3 V,vec3 N, float IOR)',
  };

  // parse them
  const GLSL_functions = {};
  const GLSL_functions_name = [];
  parseGLSLDescriptions();

  LGShaders.ALL_TYPES = 'float,vec2,vec3,vec4';

  function parseGLSLDescriptions() {
    GLSL_functions_name.length = 0;

    for (const i in GLSL_functions_desc) {
      const op = GLSL_functions_desc[i];
      const index = op.indexOf(' ');
      const return_type = op.substr(0, index);
      const index2 = op.indexOf('(', index);
      const func_name = op.substr(index, index2 - index).trim();
      const params = op.substr(index2 + 1, op.length - index2 - 2).split(',');
      for (const j in params) {
        const p = params[j].split(' ').filter((a) => a);
        params[j] = { type: p[0].trim(), name: p[1].trim() };
        if (p[2] == '=') { params[j].value = p[3].trim(); }
      }
      GLSL_functions[i] = { return_type, func: func_name, params };
      GLSL_functions_name.push(func_name);
      // console.log( GLSL_functions[i] );
    }
  }

  // common actions to all shader node classes
  function registerShaderNode(type, node_ctor) {
    // static attributes
    node_ctor.color = SHADERNODES_COLOR;
    node_ctor.filter = 'shader';

    // common methods
    node_ctor.prototype.clearDestination = function () { this.shader_destination = {}; };
    node_ctor.prototype.propagateDestination = function propagateDestination(dest_name) {
      this.shader_destination[dest_name] = true;
      if (this.inputs) {
        for (let i = 0; i < this.inputs.length; ++i) {
          const origin_node = this.getInputNode(i);
          if (origin_node) { origin_node.propagateDestination(dest_name); }
        }
      }
    };
    if (!node_ctor.prototype.onPropertyChanged) {
      node_ctor.prototype.onPropertyChanged = function () {
        if (this.graph) { this.graph._version++; }
      };
    }

    /*
        if(!node_ctor.prototype.onGetCode)
            node_ctor.prototype.onGetCode = function()
            {
                //check destination to avoid lonely nodes
                if(!this.shader_destination)
                    return;
                //grab inputs with types
                var inputs = [];
                if(this.inputs)
                for(var i = 0; i < this.inputs.length; ++i)
                    inputs.push({ type: this.getInputData(i), name: getInputLinkID(this,i) });
                var outputs = [];
                if(this.outputs)
                for(var i = 0; i < this.outputs.length; ++i)
                    outputs.push({ name: getOutputLinkID(this,i) });
                //pass to code func
                var results = this.extractCode(inputs);
                //grab output, pass to next
                if(results)
                for(var i = 0; i < results.length; ++i)
                {
                    var r = results[i];
                    if(!r)
                        continue;
                    this.setOutputData(i,r.value);
                }
            }
        */

    LiteGraph.registerNodeType(`shader::${type}`, node_ctor);
  }

  function getShaderNodeVarName(node, name) {
    return `VAR_${name || 'TEMP'}_${node.id}`;
  }

  function getInputLinkID(node, slot) {
    if (!node.inputs) { return null; }
    const link = node.getInputLink(slot);
    if (!link) { return null; }
    const origin_node = node.graph.getNodeById(link.origin_id);
    if (!origin_node) { return null; }
    if (origin_node.getOutputVarName) { return origin_node.getOutputVarName(link.origin_slot); }
    // generate
    return `link_${origin_node.id}_${link.origin_slot}`;
  }

  function getOutputLinkID(node, slot) {
    if (!node.isOutputConnected(slot)) { return null; }
    return `link_${node.id}_${slot}`;
  }

  LGShaders.registerShaderNode = registerShaderNode;
  LGShaders.getInputLinkID = getInputLinkID;
  LGShaders.getOutputLinkID = getOutputLinkID;
  LGShaders.getShaderNodeVarName = getShaderNodeVarName;
  LGShaders.parseGLSLDescriptions = parseGLSLDescriptions;

  // given a const number, it transform it to a string that matches a type
  const valueToGLSL = LiteGraph.valueToGLSL = function valueToGLSL(v, type, precision) {
    let n = 5; // num decimals
    if (precision != null) { n = precision; }
    if (!type) {
      if (v.constructor === Number) { type = 'float'; } else if (v.length) {
        switch (v.length) {
          case 2: type = 'vec2'; break;
          case 3: type = 'vec3'; break;
          case 4: type = 'vec4'; break;
          case 9: type = 'mat3'; break;
          case 16: type = 'mat4'; break;
          default:
            throw ('unknown type for glsl value size');
        }
      } else { throw (`unknown type for glsl value: ${v.constructor}`); }
    }
    switch (type) {
      case 'float': return v.toFixed(n);
      case 'vec2': return `vec2(${v[0].toFixed(n)},${v[1].toFixed(n)})`;
      case 'color3':
      case 'vec3': return `vec3(${v[0].toFixed(n)},${v[1].toFixed(n)},${v[2].toFixed(n)})`;
      case 'color4':
      case 'vec4': return `vec4(${v[0].toFixed(n)},${v[1].toFixed(n)},${v[2].toFixed(n)},${v[3].toFixed(n)})`;
      case 'mat3': return 'mat3(1.0,0.0,0.0,0.0,1.0,0.0,0.0,0.0,1.0)'; // not fully supported yet
      case 'mat4': return 'mat4(1.0,0.0,0.0,0.0,0.0,1.0,0.0,0.0,0.0,0.0,0.0,1.0,0.0,0.0,0.0,0.0,1.0)'; // not fully supported yet
      default:
        throw ('unknown glsl type in valueToGLSL:', type);
    }
  };

  // makes sure that a var is of a type, and if not, it converts it
  const varToTypeGLSL = LiteGraph.varToTypeGLSL = function varToTypeGLSL(v, input_type, output_type) {
    if (input_type == output_type) { return v; }
    if (v == null) {
      switch (output_type) {
        case 'float': return '0.0';
        case 'vec2': return 'vec2(0.0)';
        case 'vec3': return 'vec3(0.0)';
        case 'vec4': return 'vec4(0.0,0.0,0.0,1.0)';
        default: // null
          return null;
      }
    }

    if (!output_type) { throw ('error: no output type specified'); }
    if (output_type == 'float') {
      switch (input_type) {
        // case "float":
        case 'vec2':
        case 'vec3':
        case 'vec4':
          return `${v}.x`;
        default: // null
          return '0.0';
      }
    } else if (output_type == 'vec2') {
      switch (input_type) {
        case 'float':
          return `vec2(${v})`;
          // case "vec2":
        case 'vec3':
        case 'vec4':
          return `${v}.xy`;
        default: // null
          return 'vec2(0.0)';
      }
    } else if (output_type == 'vec3') {
      switch (input_type) {
        case 'float':
          return `vec3(${v})`;
        case 'vec2':
          return `vec3(${v},0.0)`;
          // case "vec3":
        case 'vec4':
          return `${v}.xyz`;
        default: // null
          return 'vec3(0.0)';
      }
    } else if (output_type == 'vec4') {
      switch (input_type) {
        case 'float':
          return `vec4(${v})`;
        case 'vec2':
          return `vec4(${v},0.0,1.0)`;
        case 'vec3':
          return `vec4(${v},1.0)`;
        default: // null
          return 'vec4(0.0,0.0,0.0,1.0)';
      }
    }
    throw ('type cannot be converted');
  };

  // used to plug incompatible stuff
  const convertVarToGLSLType = LiteGraph.convertVarToGLSLType = function convertVarToGLSLType(varname, type, target_type) {
    if (type == target_type) { return varname; }
    if (type == 'float') { return `${target_type}(${varname})`; }
    if (target_type == 'vec2') // works for vec2,vec3 and vec4
    { return `vec2(${varname}.xy)`; }
    if (target_type == 'vec3') // works for vec2,vec3 and vec4
    {
      if (type == 'vec2') { return `vec3(${varname},0.0)`; }
      if (type == 'vec4') { return `vec4(${varname}.xyz)`; }
    }
    if (target_type == 'vec4') {
      if (type == 'vec2') { return `vec4(${varname},0.0,0.0)`; }
      if (target_type == 'vec3') { return `vec4(${varname},1.0)`; }
    }
    return null;
  };

  // used to host a shader body **************************************
  class LGShaderContext {
    constructor() {
      // to store the code template
      this.vs_template = '';
      this.fs_template = '';

      // required so nodes now where to fetch the input data
      this.buffer_names = {
        uvs: 'v_coord',
      };

      this.extra = {}; // to store custom info from the nodes (like if this shader supports a feature, etc)

      this._functions = {};
      this._uniforms = {};
      this._codeparts = {};
      this._uniform_value = null;
    }

    clear() {
      this._uniforms = {};
      this._functions = {};
      this._codeparts = {};
      this._uniform_value = null;

      this.extra = {};
    }

    addUniform(name, type, value) {
      this._uniforms[name] = type;
      if (value != null) {
        if (!this._uniform_value) { this._uniform_value = {}; }
        this._uniform_value[name] = value;
      }
    }

    addFunction(name, code) {
      this._functions[name] = code;
    }

    addCode(hook, code, destinations) {
      destinations = destinations || { '': '' };
      for (const i in destinations) {
        const h = i ? `${i}_${hook}` : hook;
        if (!this._codeparts[h]) { this._codeparts[h] = `${code}\n`; } else { this._codeparts[h] += `${code}\n`; }
      }
    }

    // the system works by grabbing code fragments from every node and concatenating them in blocks depending on where must they be attached
    computeCodeBlocks(graph, extra_uniforms) {
      // prepare context
      this.clear();

      // grab output nodes
      let vertexout = graph.findNodesByType('shader::output/vertex');
      vertexout = vertexout && vertexout.length ? vertexout[0] : null;
      let fragmentout = graph.findNodesByType('shader::output/fragcolor');
      fragmentout = fragmentout && fragmentout.length ? fragmentout[0] : null;
      if (!fragmentout) // ??
      { return null; }

      // propagate back destinations
      graph.sendEventToAllNodes('clearDestination');
      if (vertexout) { vertexout.propagateDestination('vs'); }
      if (fragmentout) { fragmentout.propagateDestination('fs'); }

      // gets code from graph
      graph.sendEventToAllNodes('onGetCode', this);

      let uniforms = '';
      for (var i in this._uniforms) { uniforms += `uniform ${this._uniforms[i]} ${i};\n`; }
      if (extra_uniforms) {
        for (var i in extra_uniforms) { uniforms += `uniform ${extra_uniforms[i]} ${i};\n`; }
      }

      let functions = '';
      for (var i in this._functions) { functions += `//${i}\n${this._functions[i]}\n`; }

      const blocks = this._codeparts;
      blocks.uniforms = uniforms;
      blocks.functions = functions;
      return blocks;
    }

    // replaces blocks using the vs and fs template and returns the final codes
    computeShaderCode(graph) {
      const blocks = this.computeCodeBlocks(graph);
      const vs_code = GL.Shader.replaceCodeUsingContext(this.vs_template, blocks);
      const fs_code = GL.Shader.replaceCodeUsingContext(this.fs_template, blocks);
      return {
        vs_code,
        fs_code,
      };
    }

    // generates the shader code from the template and the
    computeShader(graph, shader) {
      const finalcode = this.computeShaderCode(graph);
      console.log(finalcode.vs_code, finalcode.fs_code);

      if (!LiteGraph.catch_exceptions) {
        this._shader_error = true;
        if (shader) { shader.updateShader(finalcode.vs_code, finalcode.fs_code); } else { shader = new GL.Shader(finalcode.vs_code, finalcode.fs_code); }
        this._shader_error = false;
        return shader;
      }

      try {
        if (shader) { shader.updateShader(finalcode.vs_code, finalcode.fs_code); } else { shader = new GL.Shader(finalcode.vs_code, finalcode.fs_code); }
        this._shader_error = false;
        return shader;
      } catch (err) {
        if (!this._shader_error) {
          console.error(err);
          if (err.indexOf('Fragment shader') != -1) { console.log(finalcode.fs_code.split('\n').map((v, i) => `${i}.- ${v}`).join('\n')); } else { console.log(finalcode.vs_code); }
        }
        this._shader_error = true;
        return null;
      }
    }

    getShader(graph) {
      // if graph not changed?
      if (this._shader && this._shader._version == graph._version) { return this._shader; }

      // compile shader
      const shader = this.computeShader(graph, this._shader);
      if (!shader) { return null; }

      this._shader = shader;
      shader._version = graph._version;
      return shader;
    }

    // some shader nodes could require to fill the box with some uniforms
    fillUniforms(uniforms, param) {
      if (!this._uniform_value) { return; }

      for (const i in this._uniform_value) {
        const v = this._uniform_value[i];
        if (v == null) { continue; }
        if (v.constructor === Function) { uniforms[i] = v.call(this, param); } else if (v.constructor === GL.Texture) {
          // todo...
        } else { uniforms[i] = v; }
      }
    }
  }

  LiteGraph.ShaderContext = LiteGraph.Shaders.Context = LGShaderContext;

  // applies a shader graph to texture, it can be uses as an example
  class LGraphShaderGraph {
    constructor() {
      // before inputs
      this.subgraph = new LGraph();
      this.subgraph._subgraph_node = this;
      this.subgraph._is_subgraph = true;
      this.subgraph.filter = 'shader';

      this.addInput('in', 'texture');
      this.addOutput('out', 'texture');
      this.properties = {
        width: 0, height: 0, alpha: false, precision: typeof (LGraphTexture) !== 'undefined' ? LGraphTexture.DEFAULT : 2,
      };

      const inputNode = this.subgraph.findNodesByType('shader::input/uniform')[0];
      inputNode.pos = [200, 300];

      const sampler = LiteGraph.createNode('shader::texture/sampler2D');
      sampler.pos = [400, 300];
      this.subgraph.add(sampler);

      const outnode = LiteGraph.createNode('shader::output/fragcolor');
      outnode.pos = [600, 300];
      this.subgraph.add(outnode);

      inputNode.connect(0, sampler);
      sampler.connect(0, outnode);

      this.size = [180, 60];
      this.redraw_on_mouse = true; // force redraw

      this._uniforms = {};
      this._shader = null;
      this._context = new LGShaderContext();
      this._context.vs_template = `#define VERTEX\n${GL.Shader.SCREEN_VERTEX_SHADER}`;
      this._context.fs_template = LGraphShaderGraph.template;
    }

    onSerialize(o) {
      o.subgraph = this.subgraph.serialize();
    }

    onConfigure(o) {
      this.subgraph.configure(o.subgraph);
    }

    onExecute() {
      if (!this.isOutputConnected(0)) { return; }

      // read input texture
      let intex = this.getInputData(0);
      if (intex && intex.constructor != GL.Texture) { intex = null; }

      let w = this.properties.width | 0;
      let h = this.properties.height | 0;
      if (w == 0) {
        w = intex ? intex.width : gl.viewport_data[2];
      } // 0 means default
      if (h == 0) {
        h = intex ? intex.height : gl.viewport_data[3];
      } // 0 means default

      const type = LGraphTexture.getTextureType(this.properties.precision, intex);

      let texture = this._texture;
      if (!texture || texture.width != w || texture.height != h || texture.type != type) {
        texture = this._texture = new GL.Texture(w, h, {
          type,
          format: this.alpha ? gl.RGBA : gl.RGB,
          filter: gl.LINEAR,
        });
      }

      const shader = this.getShader(this.subgraph);
      if (!shader) { return; }

      const uniforms = this._uniforms;
      this._context.fillUniforms(uniforms);

      let tex_slot = 0;
      if (this.inputs) {
        for (let i = 0; i < this.inputs.length; ++i) {
          const input = this.inputs[i];
          let data = this.getInputData(i);
          if (input.type == 'texture') {
            if (!data) { data = GL.Texture.getWhiteTexture(); }
            data = data.bind(tex_slot++);
          }

          if (data != null) { uniforms[`u_${input.name}`] = data; }
        }
      }

      const mesh = GL.Mesh.getScreenQuad();

      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.BLEND);

      texture.drawTo(() => {
        shader.uniforms(uniforms);
        shader.draw(mesh);
      });

      // use subgraph output
      this.setOutputData(0, texture);
    }

    // add input node inside subgraph
    onInputAdded(slot_info) {
      const subnode = LiteGraph.createNode('shader::input/uniform');
      subnode.setProperty('name', slot_info.name);
      subnode.setProperty('type', slot_info.type);
      this.subgraph.add(subnode);
    }

    // remove all
    onInputRemoved(slot, slot_info) {
      const nodes = this.subgraph.findNodesByType('shader::input/uniform');
      for (let i = 0; i < nodes.length; ++i) {
        const node = nodes[i];
        if (node.properties.name == slot_info.name) { this.subgraph.remove(node); }
      }
    }

    computeSize() {
      const num_inputs = this.inputs ? this.inputs.length : 0;
      const num_outputs = this.outputs ? this.outputs.length : 0;
      return [200, Math.max(num_inputs, num_outputs) * LGraphStyles.NODE_SLOT_HEIGHT + LGraphStyles.NODE_TITLE_HEIGHT + 10];
    }

    getShader() {
      const shader = this._context.getShader(this.subgraph);
      if (!shader) { this.boxcolor = 'red'; } else { this.boxcolor = null; }
      return shader;
    }

    onDrawBackground(ctx, graphcanvas, canvas, pos) {
      if (this.flags.collapsed) { return; }

      // allows to preview the node if the canvas is a webgl canvas
      const tex = this.getOutputData(0);
      const inputs_y = this.inputs ? this.inputs.length * LGraphStyles.NODE_SLOT_HEIGHT : 0;
      if (tex && ctx == tex.gl && this.size[1] > inputs_y + LGraphStyles.NODE_TITLE_HEIGHT) {
        ctx.drawImage(tex, 10, y, this.size[0] - 20, this.size[1] - inputs_y - LGraphStyles.NODE_TITLE_HEIGHT);
      }

      var y = this.size[1] - LGraphStyles.NODE_TITLE_HEIGHT + 0.5;

      // button
      const over = LiteGraph.isInsideRectangle(pos[0], pos[1], this.pos[0], this.pos[1] + y, this.size[0], LGraphStyles.NODE_TITLE_HEIGHT);
      ctx.fillStyle = over ? '#555' : '#222';
      ctx.beginPath();
      if (this._shape == LGraphStyles.BOX_SHAPE) { ctx.rect(0, y, this.size[0] + 1, LGraphStyles.NODE_TITLE_HEIGHT); } else { ctx.roundRect(0, y, this.size[0] + 1, LGraphStyles.NODE_TITLE_HEIGHT, 0, 8); }
      ctx.fill();

      // button
      ctx.textAlign = 'center';
      ctx.font = '24px Arial';
      ctx.fillStyle = over ? '#DDD' : '#999';
      ctx.fillText('+', this.size[0] * 0.5, y + 24);
    }

    onMouseDown(e, localpos, graphcanvas) {
      const y = this.size[1] - LGraphStyles.NODE_TITLE_HEIGHT + 0.5;
      if (localpos[1] > y) {
        graphcanvas.showSubgraphPropertiesDialog(this);
      }
    }

    onDrawSubgraphBackground(graphcanvas) {
      // TODO
    }

    getExtraMenuOptions(graphcanvas) {
      const that = this;
      const options = [{
        content: 'Print Code',
        callback() {
          const code = that._context.computeShaderCode();
          console.log(code.vs_code, code.fs_code);
        },
      }];

      return options;
    }

    static title = 'ShaderGraph';

    static desc = 'Builds a shader using a graph';

    static title_color = SHADERNODES_COLOR;

    static widgets_info = {
      precision: { widget: 'combo', values: LGraphTexture.MODE_VALUES },
    };

    static input_node_type = 'input/uniform';

    static output_node_type = 'output/fragcolor';

    static template = '\n\
      #define FRAGMENT\n\
      precision highp float;\n\
      varying vec2 v_coord;\n\
      {{varying}}\n\
      {{uniforms}}\n\
      {{functions}}\n\
      {{fs_functions}}\n\
      void main() {\n\n\
      vec2 uv = v_coord;\n\
      vec4 fragcolor = vec4(0.0);\n\
      vec4 fragcolor1 = vec4(0.0);\n\
      {{fs_code}}\n\
      gl_FragColor = fragcolor;\n\
      }\n\
    ';
  }
  LiteGraph.registerNodeType('texture/shaderGraph', LGraphShaderGraph);

  function shaderNodeFromFunction(classname, params, return_type, code) {
    // TODO
  }

  // applies a shader graph to a code
  class LGraphShaderUniform {
    constructor() {
      this.addOutput('out', '');
      this.properties = { name: '', type: '' };
    }

    getTitle() {
      if (this.properties.name && this.flags.collapsed) { return `${this.properties.type} ${this.properties.name}`; }
      return 'Uniform';
    }

    onPropertyChanged(name, value) {
      this.outputs[0].name = `${this.properties.type} ${this.properties.name}`;
    }

    onGetCode(context) {
      if (!this.shader_destination) { return; }

      let { type } = this.properties;
      if (!type) {
        if (!context.onGetPropertyInfo) { return; }
        const info = context.onGetPropertyInfo(this.property.name);
        if (!info) { return; }
        type = info.type;
      }
      if (type == 'number') { type = 'float'; } else if (type == 'texture') { type = 'sampler2D'; }
      if (LGShaders.GLSL_types.indexOf(type) == -1) { return; }

      context.addUniform(`u_${this.properties.name}`, type);
      this.setOutputData(0, type);
    }

    getOutputVarName(slot) {
      return `u_${this.properties.name}`;
    }

    static title = 'Uniform';

    static desc = 'Input data for the shader';
  }
  registerShaderNode('input/uniform', LGraphShaderUniform);

  class LGraphShaderAttribute {
    constructor() {
      this.addOutput('out', 'vec2');
      this.properties = { name: 'coord', type: 'vec2' };
    }

    getTitle() {
      return `att. ${this.properties.name}`;
    }

    onGetCode(context) {
      if (!this.shader_destination) { return; }

      let { type } = this.properties;
      if (!type || LGShaders.GLSL_types.indexOf(type) == -1) { return; }
      if (type == 'number') { type = 'float'; }
      if (this.properties.name != 'coord') {
        context.addCode('varying', ` varying ${type} v_${this.properties.name};`);
        // if( !context.varyings[ this.properties.name ] )
        // context.addCode( "vs_code", "v_" + this.properties.name + " = " + input_name + ";" );
      }
      this.setOutputData(0, type);
    }

    getOutputVarName(slot) {
      return `v_${this.properties.name}`;
    }

    static title = 'Attribute';

    static desc = 'Input data from mesh attribute';
  }
  registerShaderNode('input/attribute', LGraphShaderAttribute);

  class LGraphShaderSampler2D {
    constructor() {
      this.addInput('tex', 'sampler2D');
      this.addInput('uv', 'vec2');
      this.addOutput('rgba', 'vec4');
      this.addOutput('rgb', 'vec3');
    }

    onGetCode(context) {
      if (!this.shader_destination) { return; }

      const texname = getInputLinkID(this, 0);
      const varname = getShaderNodeVarName(this);
      let code = `vec4 ${varname} = vec4(0.0);\n`;
      if (texname) {
        const uvname = getInputLinkID(this, 1) || context.buffer_names.uvs;
        code += `${varname} = texture2D(${texname},${uvname});\n`;
      }

      const link0 = getOutputLinkID(this, 0);
      if (link0) { code += `vec4 ${getOutputLinkID(this, 0)} = ${varname};\n`; }

      const link1 = getOutputLinkID(this, 1);
      if (link1) { code += `vec3 ${getOutputLinkID(this, 1)} = ${varname}.xyz;\n`; }

      context.addCode('code', code, this.shader_destination);
      this.setOutputData(0, 'vec4');
      this.setOutputData(1, 'vec3');
    }

    static title = 'Sampler2D';

    static desc = 'Reads a pixel from a texture';
  }
  registerShaderNode('texture/sampler2D', LGraphShaderSampler2D);

  class LGraphShaderConstant {
    constructor() {
      this.addOutput('', 'float');

      this.properties = {
        type: 'float',
        value: 0,
      };

      this.addWidget('combo', 'type', 'float', null, { values: GLSL_types_const, property: 'type' });
      this.updateWidgets();
    }

    getTitle() {
      if (this.flags.collapsed) { return valueToGLSL(this.properties.value, this.properties.type, 2); }
      return 'Const';
    }

    onPropertyChanged(name, value) {
      const that = this;
      if (name == 'type') {
        if (this.outputs[0].type != value) {
          this.disconnectOutput(0);
          this.outputs[0].type = value;
        }
        this.widgets.length = 1; // remove extra widgets
        this.updateWidgets();
      }
      if (name == 'value') {
        if (!value.length) { this.widgets[1].value = value; } else {
          this.widgets[1].value = value[1];
          if (value.length > 2) { this.widgets[2].value = value[2]; }
          if (value.length > 3) { this.widgets[3].value = value[3]; }
        }
      }
    }

    updateWidgets(old_value) {
      const that = this;
      var old_value = this.properties.value;
      const options = { step: 0.01 };
      switch (this.properties.type) {
        case 'float':
          this.properties.value = 0;
          this.addWidget('number', 'v', 0, { step: 0.01, property: 'value' });
          break;
        case 'vec2':
          this.properties.value = old_value && old_value.length == 2 ? [old_value[0], old_value[1]] : [0, 0, 0];
          this.addWidget('number', 'x', this.properties.value[0], (v) => { that.properties.value[0] = v; }, options);
          this.addWidget('number', 'y', this.properties.value[1], (v) => { that.properties.value[1] = v; }, options);
          break;
        case 'vec3':
          this.properties.value = old_value && old_value.length == 3 ? [old_value[0], old_value[1], old_value[2]] : [0, 0, 0];
          this.addWidget('number', 'x', this.properties.value[0], (v) => { that.properties.value[0] = v; }, options);
          this.addWidget('number', 'y', this.properties.value[1], (v) => { that.properties.value[1] = v; }, options);
          this.addWidget('number', 'z', this.properties.value[2], (v) => { that.properties.value[2] = v; }, options);
          break;
        case 'vec4':
          this.properties.value = old_value && old_value.length == 4 ? [old_value[0], old_value[1], old_value[2], old_value[3]] : [0, 0, 0, 0];
          this.addWidget('number', 'x', this.properties.value[0], (v) => { that.properties.value[0] = v; }, options);
          this.addWidget('number', 'y', this.properties.value[1], (v) => { that.properties.value[1] = v; }, options);
          this.addWidget('number', 'z', this.properties.value[2], (v) => { that.properties.value[2] = v; }, options);
          this.addWidget('number', 'w', this.properties.value[3], (v) => { that.properties.value[3] = v; }, options);
          break;
        default:
          console.error('unknown type for constant');
      }
    }

    onGetCode(context) {
      if (!this.shader_destination) { return; }

      const value = valueToGLSL(this.properties.value, this.properties.type);
      const link_name = getOutputLinkID(this, 0);
      if (!link_name) // not connected
      { return; }

      const code = `    ${this.properties.type} ${link_name} = ${value};`;
      context.addCode('code', code, this.shader_destination);

      this.setOutputData(0, this.properties.type);
    }

    static title = 'const';
  }
  registerShaderNode('const/const', LGraphShaderConstant);

  class LGraphShaderVec2 {
    constructor() {
      this.addInput('xy', 'vec2');
      this.addInput('x', 'float');
      this.addInput('y', 'float');
      this.addOutput('xy', 'vec2');
      this.addOutput('x', 'float');
      this.addOutput('y', 'float');

      this.properties = { x: 0, y: 0 };
    }

    onPropertyChanged() {
      if (this.graph) { this.graph._version++; }
    }

    onGetCode(context) {
      if (!this.shader_destination) { return; }

      const props = this.properties;

      const varname = getShaderNodeVarName(this);
      let code = `    vec2 ${varname} = ${valueToGLSL([props.x, props.y])};\n`;

      for (var i = 0; i < LGraphShaderVec2.varmodes.length; ++i) {
        var varmode = LGraphShaderVec2.varmodes[i];
        const inlink = getInputLinkID(this, i);
        if (!inlink) { continue; }
        code += `    ${varname}.${varmode} = ${inlink};\n`;
      }

      for (var i = 0; i < LGraphShaderVec2.varmodes.length; ++i) {
        var varmode = LGraphShaderVec2.varmodes[i];
        const outlink = getOutputLinkID(this, i);
        if (!outlink) { continue; }
        const type = GLSL_types_const[varmode.length - 1];
        code += `    ${type} ${outlink} = ${varname}.${varmode};\n`;
        this.setOutputData(i, type);
      }

      context.addCode('code', code, this.shader_destination);
    }

    static title = 'vec2';

    static varmodes = ['xy', 'x', 'y'];
  }
  registerShaderNode('const/vec2', LGraphShaderVec2);

  class LGraphShaderVec3 {
    constructor() {
      this.addInput('xyz', 'vec3');
      this.addInput('x', 'float');
      this.addInput('y', 'float');
      this.addInput('z', 'float');
      this.addInput('xy', 'vec2');
      this.addInput('xz', 'vec2');
      this.addInput('yz', 'vec2');
      this.addOutput('xyz', 'vec3');
      this.addOutput('x', 'float');
      this.addOutput('y', 'float');
      this.addOutput('z', 'float');
      this.addOutput('xy', 'vec2');
      this.addOutput('xz', 'vec2');
      this.addOutput('yz', 'vec2');

      this.properties = { x: 0, y: 0, z: 0 };
    }

    onPropertyChanged() {
      if (this.graph) { this.graph._version++; }
    }

    onGetCode(context) {
      if (!this.shader_destination) { return; }

      const props = this.properties;

      const varname = getShaderNodeVarName(this);
      let code = `vec3 ${varname} = ${valueToGLSL([props.x, props.y, props.z])};\n`;

      for (var i = 0; i < LGraphShaderVec3.varmodes.length; ++i) {
        var varmode = LGraphShaderVec3.varmodes[i];
        const inlink = getInputLinkID(this, i);
        if (!inlink) { continue; }
        code += `    ${varname}.${varmode} = ${inlink};\n`;
      }

      for (var i = 0; i < LGraphShaderVec3.varmodes.length; ++i) {
        var varmode = LGraphShaderVec3.varmodes[i];
        const outlink = getOutputLinkID(this, i);
        if (!outlink) { continue; }
        const type = GLSL_types_const[varmode.length - 1];
        code += `    ${type} ${outlink} = ${varname}.${varmode};\n`;
        this.setOutputData(i, type);
      }

      context.addCode('code', code, this.shader_destination);
    }

    static title = 'vec3';

    static varmodes = ['xyz', 'x', 'y', 'z', 'xy', 'xz', 'yz'];
  }
  registerShaderNode('const/vec3', LGraphShaderVec3);

  class LGraphShaderVec4 {
    constructor() {
      this.addInput('xyzw', 'vec4');
      this.addInput('xyz', 'vec3');
      this.addInput('x', 'float');
      this.addInput('y', 'float');
      this.addInput('z', 'float');
      this.addInput('w', 'float');
      this.addInput('xy', 'vec2');
      this.addInput('yz', 'vec2');
      this.addInput('zw', 'vec2');
      this.addOutput('xyzw', 'vec4');
      this.addOutput('xyz', 'vec3');
      this.addOutput('x', 'float');
      this.addOutput('y', 'float');
      this.addOutput('z', 'float');
      this.addOutput('xy', 'vec2');
      this.addOutput('yz', 'vec2');
      this.addOutput('zw', 'vec2');

      this.properties = {
        x: 0, y: 0, z: 0, w: 0,
      };
    }

    onPropertyChanged() {
      if (this.graph) { this.graph._version++; }
    }

    onGetCode(context) {
      if (!this.shader_destination) { return; }

      const props = this.properties;

      const varname = getShaderNodeVarName(this);
      let code = `vec4 ${varname} = ${valueToGLSL([props.x, props.y, props.z, props.w])};\n`;

      for (var i = 0; i < LGraphShaderVec4.varmodes.length; ++i) {
        var varmode = LGraphShaderVec4.varmodes[i];
        const inlink = getInputLinkID(this, i);
        if (!inlink) { continue; }
        code += `    ${varname}.${varmode} = ${inlink};\n`;
      }

      for (var i = 0; i < LGraphShaderVec4.varmodes.length; ++i) {
        var varmode = LGraphShaderVec4.varmodes[i];
        const outlink = getOutputLinkID(this, i);
        if (!outlink) { continue; }
        const type = GLSL_types_const[varmode.length - 1];
        code += `    ${type} ${outlink} = ${varname}.${varmode};\n`;
        this.setOutputData(i, type);
      }
      context.addCode('code', code, this.shader_destination);
    }

    static title = 'vec4';

    static varmodes = ['xyzw', 'xyz', 'x', 'y', 'z', 'w', 'xy', 'yz', 'zw'];
  }
  registerShaderNode('const/vec4', LGraphShaderVec4);

  class LGraphShaderFragColor {
    constructor() {
      this.addInput('color', LGShaders.ALL_TYPES);
      this.block_delete = true;
    }

    onGetCode(context) {
      const link_name = getInputLinkID(this, 0);
      if (!link_name) { return; }
      const type = this.getInputData(0);
      const code = varToTypeGLSL(link_name, type, 'vec4');
      context.addCode('fs_code', `fragcolor = ${code};`);
    }

    static title = 'FragColor';

    static desc = 'Pixel final color';
  }
  registerShaderNode('output/fragcolor', LGraphShaderFragColor);

  /*
    function LGraphShaderDiscard()
    {
        this.addInput("v","T");
        this.addInput("min","T");
        this.properties = { min_value: 0.0 };
        this.addWidget("number","min",0,{ step: 0.01, property: "min_value" });
    }

    LGraphShaderDiscard.title = "Discard";

    LGraphShaderDiscard.prototype.onGetCode = function( context )
    {
        if(!this.isOutputConnected(0))
            return;

        var inlink = getInputLinkID(this,0);
        var inlink1 = getInputLinkID(this,1);

        if(!inlink && !inlink1) //not connected
            return;
        context.addCode("code", return_type + " " + outlink + " = ( (" + inlink + " - "+minv+") / ("+ maxv+" - "+minv+") ) * ("+ maxv2+" - "+minv2+") + " + minv2 + ";", this.shader_destination );
        this.setOutputData( 0, return_type );
    }

    registerShaderNode( "output/discard", LGraphShaderDiscard );
    */

  class LGraphShaderOperation {
    constructor() {
      this.addInput('A', LGShaders.ALL_TYPES);
      this.addInput('B', LGShaders.ALL_TYPES);
      this.addOutput('out', '');
      this.properties = {
        operation: '*',
      };
      this.addWidget('combo', 'op.', this.properties.operation, { property: 'operation', values: LGraphShaderOperation.operations });
    }

    getTitle() {
      if (this.flags.collapsed) { return `A${this.properties.operation}B`; }
      return 'Operation';
    }

    onGetCode(context) {
      if (!this.shader_destination) { return; }

      if (!this.isOutputConnected(0)) { return; }

      const inlinks = [];
      for (var i = 0; i < 3; ++i) { inlinks.push({ name: getInputLinkID(this, i), type: this.getInputData(i) || 'float' }); }

      const outlink = getOutputLinkID(this, 0);
      if (!outlink) // not connected
      { return; }

      // func_desc
      const base_type = inlinks[0].type;
      const return_type = base_type;
      const op = this.properties.operation;

      const params = [];
      for (var i = 0; i < 2; ++i) {
        let param_code = inlinks[i].name;
        if (param_code == null) // not plugged
        {
          param_code = p.value != null ? p.value : '(1.0)';
          inlinks[i].type = 'float';
        }

        // convert
        if (inlinks[i].type != base_type) {
          if (inlinks[i].type == 'float' && (op == '*' || op == '/')) {
            // I find hard to create the opposite condition now, so I prefeer an else
          } else { param_code = convertVarToGLSLType(param_code, inlinks[i].type, base_type); }
        }
        params.push(param_code);
      }

      context.addCode('code', `${return_type} ${outlink} = ${params[0]}${op}${params[1]};`, this.shader_destination);
      this.setOutputData(0, return_type);
    }

    static title = 'Operation';

    static operations = ['+', '-', '*', '/'];
  }
  registerShaderNode('math/operation', LGraphShaderOperation);

  class LGraphShaderFunc {
    constructor() {
      this.addInput('A', LGShaders.ALL_TYPES);
      this.addInput('B', LGShaders.ALL_TYPES);
      this.addOutput('out', '');
      this.properties = {
        func: 'floor',
      };
      this._current = 'floor';
      this.addWidget('combo', 'func', this.properties.func, { property: 'func', values: GLSL_functions_name });
    }

    onPropertyChanged(name, value) {
      if (this.graph) { this.graph._version++; }

      if (name == 'func') {
        const func_desc = GLSL_functions[value];
        if (!func_desc) { return; }

        // remove extra inputs
        for (var i = func_desc.params.length; i < this.inputs.length; ++i) { this.removeInput(i); }

        // add and update inputs
        for (var i = 0; i < func_desc.params.length; ++i) {
          const p = func_desc.params[i];
          if (this.inputs[i]) { this.inputs[i].name = p.name + (p.value ? ` (${p.value})` : ''); } else { this.addInput(p.name, LGShaders.ALL_TYPES); }
        }
      }
    }

    getTitle() {
      if (this.flags.collapsed) { return this.properties.func; }
      return 'Func';
    }

    onGetCode(context) {
      if (!this.shader_destination) { return; }

      if (!this.isOutputConnected(0)) { return; }

      const inlinks = [];
      for (var i = 0; i < 3; ++i) { inlinks.push({ name: getInputLinkID(this, i), type: this.getInputData(i) || 'float' }); }

      const outlink = getOutputLinkID(this, 0);
      if (!outlink) // not connected
      { return; }

      const func_desc = GLSL_functions[this.properties.func];
      if (!func_desc) { return; }

      // func_desc
      const base_type = inlinks[0].type;
      let { return_type } = func_desc;
      if (return_type == 'T') { return_type = base_type; }

      const params = [];
      for (var i = 0; i < func_desc.params.length; ++i) {
        const p = func_desc.params[i];
        let param_code = inlinks[i].name;
        if (param_code == null) // not plugged
        {
          param_code = p.value != null ? p.value : '(1.0)';
          inlinks[i].type = 'float';
        }
        if ((p.type == 'T' && inlinks[i].type != base_type)
                  || (p.type != 'T' && inlinks[i].type != base_type)) { param_code = convertVarToGLSLType(param_code, inlinks[i].type, base_type); }
        params.push(param_code);
      }

      context.addFunction('round', 'float round(float v){ return floor(v+0.5); }\nvec2 round(vec2 v){ return floor(v+vec2(0.5));}\nvec3 round(vec3 v){ return floor(v+vec3(0.5));}\nvec4 round(vec4 v){ return floor(v+vec4(0.5)); }\n');
      context.addCode('code', `${return_type} ${outlink} = ${func_desc.func}(${params.join(',')});`, this.shader_destination);

      this.setOutputData(0, return_type);
    }

    static title = 'Func';
  }
  registerShaderNode('math/func', LGraphShaderFunc);

  class LGraphShaderSnippet {
    constructor() {
      this.addInput('A', LGShaders.ALL_TYPES);
      this.addInput('B', LGShaders.ALL_TYPES);
      this.addOutput('C', 'vec4');
      this.properties = {
        code: 'C = A+B',
        type: 'vec4',
      };
      this.addWidget('text', 'code', this.properties.code, { property: 'code' });
      this.addWidget('combo', 'type', this.properties.type, { values: ['float', 'vec2', 'vec3', 'vec4'], property: 'type' });
    }

    onPropertyChanged(name, value) {
      if (this.graph) { this.graph._version++; }

      if (name == 'type' && this.outputs[0].type != value) {
        this.disconnectOutput(0);
        this.outputs[0].type = value;
      }
    }

    getTitle() {
      if (this.flags.collapsed) { return this.properties.code; }
      return 'Snippet';
    }

    onGetCode(context) {
      if (!this.shader_destination || !this.isOutputConnected(0)) { return; }

      let inlinkA = getInputLinkID(this, 0);
      if (!inlinkA) { inlinkA = '1.0'; }
      let inlinkB = getInputLinkID(this, 1);
      if (!inlinkB) { inlinkB = '1.0'; }
      const outlink = getOutputLinkID(this, 0);
      if (!outlink) // not connected
      { return; }

      const inA_type = this.getInputData(0) || 'float';
      const inB_type = this.getInputData(1) || 'float';
      const return_type = this.properties.type;

      // cannot resolve input
      if (inA_type == 'T' || inB_type == 'T') {
        return null;
      }

      const funcname = `funcSnippet${this.id}`;

      let func_code = `\n${return_type} ${funcname}( ${inA_type} A, ${inB_type} B) {\n`;
      func_code += `    ${return_type} C = ${return_type}(0.0);\n`;
      func_code += `    ${this.properties.code};\n`;
      func_code += '    return C;\n}\n';

      context.addCode('functions', func_code, this.shader_destination);
      context.addCode('code', `${return_type} ${outlink} = ${funcname}(${inlinkA},${inlinkB});`, this.shader_destination);

      this.setOutputData(0, return_type);
    }

    static title = 'Snippet';
  }
  registerShaderNode('utils/snippet', LGraphShaderSnippet);

  class LGraphShaderRand {
    constructor() {
      this.addOutput('out', 'float');
    }

    onGetCode(context) {
      if (!this.shader_destination || !this.isOutputConnected(0)) { return; }

      const outlink = getOutputLinkID(this, 0);

      context.addUniform(`u_rand${this.id}`, 'float', () => Math.random());
      context.addCode('code', `float ${outlink} = u_rand${this.id};`, this.shader_destination);
      this.setOutputData(0, 'float');
    }

    static title = 'Rand';
  }
  registerShaderNode('input/rand', LGraphShaderRand);

  // noise
  // https://gist.github.com/patriciogonzalezvivo/670c22f3966e662d2f83
  class LGraphShaderNoise {
    constructor() {
      this.addInput('out', LGShaders.ALL_TYPES);
      this.addInput('scale', 'float');
      this.addOutput('out', 'float');
      this.properties = {
        type: 'noise',
        scale: 1,
      };
      this.addWidget('combo', 'type', this.properties.type, { property: 'type', values: LGraphShaderNoise.NOISE_TYPES });
      this.addWidget('number', 'scale', this.properties.scale, { property: 'scale' });
    }

    onGetCode(context) {
      if (!this.shader_destination || !this.isOutputConnected(0)) { return; }

      let inlink = getInputLinkID(this, 0);
      const outlink = getOutputLinkID(this, 0);

      let intype = this.getInputData(0);
      if (!inlink) {
        intype = 'vec2';
        inlink = context.buffer_names.uvs;
      }

      context.addFunction('noise', LGraphShaderNoise.shader_functions);
      context.addUniform(`u_noise_scale${this.id}`, 'float', this.properties.scale);
      if (intype == 'float') { context.addCode('code', `float ${outlink} = snoise( vec2(${inlink}) * u_noise_scale${this.id});`, this.shader_destination); } else if (intype == 'vec2' || intype == 'vec3') { context.addCode('code', `float ${outlink} = snoise(${inlink} * u_noise_scale${this.id});`, this.shader_destination); } else if (intype == 'vec4') { context.addCode('code', `float ${outlink} = snoise(${inlink}.xyz * u_noise_scale${this.id});`, this.shader_destination); }
      this.setOutputData(0, 'float');
    }

    static title = 'noise';

    static NOISE_TYPES = ['noise', 'rand'];

    shader_functions = '\n\
      vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }\n\
      \n\
      float snoise(vec2 v){\n\
        const vec4 C = vec4(0.211324865405187, 0.366025403784439,-0.577350269189626, 0.024390243902439);\n\
        vec2 i  = floor(v + dot(v, C.yy) );\n\
        vec2 x0 = v -   i + dot(i, C.xx);\n\
        vec2 i1;\n\
        i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);\n\
        vec4 x12 = x0.xyxy + C.xxzz;\n\
        x12.xy -= i1;\n\
        i = mod(i, 289.0);\n\
        vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))\n\
        + i.x + vec3(0.0, i1.x, 1.0 ));\n\
        vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)), 0.0);\n\
        m = m*m ;\n\
        m = m*m ;\n\
        vec3 x = 2.0 * fract(p * C.www) - 1.0;\n\
        vec3 h = abs(x) - 0.5;\n\
        vec3 ox = floor(x + 0.5);\n\
        vec3 a0 = x - ox;\n\
        m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );\n\
        vec3 g;\n\
        g.x  = a0.x  * x0.x  + h.x  * x0.y;\n\
        g.yz = a0.yz * x12.xz + h.yz * x12.yw;\n\
        return 130.0 * dot(m, g);\n\
      }\n\
      vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}\n\
      vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}\n\
      \n\
      float snoise(vec3 v){ \n\
        const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;\n\
        const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);\n\
      \n\
      // First corner\n\
        vec3 i  = floor(v + dot(v, C.yyy) );\n\
        vec3 x0 =   v - i + dot(i, C.xxx) ;\n\
      \n\
      // Other corners\n\
        vec3 g = step(x0.yzx, x0.xyz);\n\
        vec3 l = 1.0 - g;\n\
        vec3 i1 = min( g.xyz, l.zxy );\n\
        vec3 i2 = max( g.xyz, l.zxy );\n\
      \n\
        //  x0 = x0 - 0. + 0.0 * C \n\
        vec3 x1 = x0 - i1 + 1.0 * C.xxx;\n\
        vec3 x2 = x0 - i2 + 2.0 * C.xxx;\n\
        vec3 x3 = x0 - 1. + 3.0 * C.xxx;\n\
      \n\
      // Permutations\n\
        i = mod(i, 289.0 ); \n\
        vec4 p = permute( permute( permute( \n\
                  i.z + vec4(0.0, i1.z, i2.z, 1.0 ))\n\
                + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) \n\
                + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));\n\
      \n\
      // Gradients\n\
      // ( N*N points uniformly over a square, mapped onto an octahedron.)\n\
        float n_ = 1.0/7.0; // N=7\n\
        vec3  ns = n_ * D.wyz - D.xzx;\n\
      \n\
        vec4 j = p - 49.0 * floor(p * ns.z *ns.z);  //  mod(p,N*N)\n\
      \n\
        vec4 x_ = floor(j * ns.z);\n\
        vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)\n\
      \n\
        vec4 x = x_ *ns.x + ns.yyyy;\n\
        vec4 y = y_ *ns.x + ns.yyyy;\n\
        vec4 h = 1.0 - abs(x) - abs(y);\n\
      \n\
        vec4 b0 = vec4( x.xy, y.xy );\n\
        vec4 b1 = vec4( x.zw, y.zw );\n\
      \n\
        vec4 s0 = floor(b0)*2.0 + 1.0;\n\
        vec4 s1 = floor(b1)*2.0 + 1.0;\n\
        vec4 sh = -step(h, vec4(0.0));\n\
      \n\
        vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;\n\
        vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;\n\
      \n\
        vec3 p0 = vec3(a0.xy,h.x);\n\
        vec3 p1 = vec3(a0.zw,h.y);\n\
        vec3 p2 = vec3(a1.xy,h.z);\n\
        vec3 p3 = vec3(a1.zw,h.w);\n\
      \n\
      //Normalise gradients\n\
        vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));\n\
        p0 *= norm.x;\n\
        p1 *= norm.y;\n\
        p2 *= norm.z;\n\
        p3 *= norm.w;\n\
      \n\
      // Mix final noise value\n\
        vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);\n\
        m = m * m;\n\
        return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),dot(p2,x2), dot(p3,x3) ) );\n\
      }\n\
      \n\
      vec3 hash3( vec2 p ){\n\
          vec3 q = vec3( dot(p,vec2(127.1,311.7)), \n\
                        dot(p,vec2(269.5,183.3)), \n\
                        dot(p,vec2(419.2,371.9)) );\n\
          return fract(sin(q)*43758.5453);\n\
      }\n\
      vec4 hash4( vec3 p ){\n\
          vec4 q = vec4( dot(p,vec3(127.1,311.7,257.3)), \n\
                        dot(p,vec3(269.5,183.3,335.1)), \n\
                        dot(p,vec3(314.5,235.1,467.3)), \n\
                        dot(p,vec3(419.2,371.9,114.9)) );\n\
          return fract(sin(q)*43758.5453);\n\
      }\n\
      \n\
      float iqnoise( in vec2 x, float u, float v ){\n\
          vec2 p = floor(x);\n\
          vec2 f = fract(x);\n\
          \n\
          float k = 1.0+63.0*pow(1.0-v,4.0);\n\
          \n\
          float va = 0.0;\n\
          float wt = 0.0;\n\
          for( int j=-2; j<=2; j++ )\n\
          for( int i=-2; i<=2; i++ )\n\
          {\n\
              vec2 g = vec2( float(i),float(j) );\n\
              vec3 o = hash3( p + g )*vec3(u,u,1.0);\n\
              vec2 r = g - f + o.xy;\n\
              float d = dot(r,r);\n\
              float ww = pow( 1.0-smoothstep(0.0,1.414,sqrt(d)), k );\n\
              va += o.z*ww;\n\
              wt += ww;\n\
          }\n\
          \n\
          return va/wt;\n\
      }\n\
      ';
  }
  registerShaderNode('math/noise', LGraphShaderNoise);

  class LGraphShaderTime {
    constructor() {
      this.addOutput('out', 'float');
    }

    onGetCode(context) {
      if (!this.shader_destination || !this.isOutputConnected(0)) { return; }

      const outlink = getOutputLinkID(this, 0);

      context.addUniform(`u_time${this.id}`, 'float', () => getTime() * 0.001);
      context.addCode('code', `float ${outlink} = u_time${this.id};`, this.shader_destination);
      this.setOutputData(0, 'float');
    }

    static title = 'Time';
  }
  registerShaderNode('input/time', LGraphShaderTime);

  class LGraphShaderDither {
    constructor() {
      this.addInput('in', 'T');
      this.addOutput('out', 'float');
    }

    onGetCode(context) {
      if (!this.shader_destination || !this.isOutputConnected(0)) { return; }

      let inlink = getInputLinkID(this, 0);
      const return_type = 'float';
      const outlink = getOutputLinkID(this, 0);
      const intype = this.getInputData(0);
      inlink = varToTypeGLSL(inlink, intype, 'float');
      context.addFunction('dither8x8', LGraphShaderDither.dither_func);
      context.addCode('code', `${return_type} ${outlink} = dither8x8(${inlink});`, this.shader_destination);
      this.setOutputData(0, return_type);
    }

    static title = 'Dither';

    static dither_values = [0.515625, 0.140625, 0.640625, 0.046875, 0.546875, 0.171875, 0.671875, 0.765625, 0.265625, 0.890625, 0.390625, 0.796875, 0.296875, 0.921875, 0.421875, 0.203125, 0.703125, 0.078125, 0.578125, 0.234375, 0.734375, 0.109375, 0.609375, 0.953125, 0.453125, 0.828125, 0.328125, 0.984375, 0.484375, 0.859375, 0.359375, 0.0625, 0.5625, 0.1875, 0.6875, 0.03125, 0.53125, 0.15625, 0.65625, 0.8125, 0.3125, 0.9375, 0.4375, 0.78125, 0.28125, 0.90625, 0.40625, 0.25, 0.75, 0.125, 0.625, 0.21875, 0.71875, 0.09375, 0.59375, 1.0001, 0.5, 0.875, 0.375, 0.96875, 0.46875, 0.84375, 0.34375];

    static dither_func = `\n\
      float dither8x8(float brightness) {\n\
        vec2 position = vec2(0.0);\n\
        #ifdef FRAGMENT\n\
          position = gl_FragCoord.xy;\n\
        #endif\n\
        int x = int(mod(position.x, 8.0));\n\
        int y = int(mod(position.y, 8.0));\n\
        int index = x + y * 8;\n\
        float limit = 0.0;\n\
        if (x < 8) {\n\
          if(index==0) limit = 0.015625;\n\
          ${LGraphShaderDither.dither_values.map((v, i) => `else if(index== ${i + 1}) limit = ${v};`).join('\n')}\n\
        }\n\
        return brightness < limit ? 0.0 : 1.0;\n\
      }\n`;
  }
  registerShaderNode('math/dither', LGraphShaderDither);

  class LGraphShaderRemap {
    constructor() {
      this.addInput('', LGShaders.ALL_TYPES);
      this.addOutput('', '');
      this.properties = {
        min_value: 0,
        max_value: 1,
        min_value2: 0,
        max_value2: 1,
      };
      this.addWidget('number', 'min', 0, { step: 0.1, property: 'min_value' });
      this.addWidget('number', 'max', 1, { step: 0.1, property: 'max_value' });
      this.addWidget('number', 'min2', 0, { step: 0.1, property: 'min_value2' });
      this.addWidget('number', 'max2', 1, { step: 0.1, property: 'max_value2' });
    }

    onPropertyChanged() {
      if (this.graph) { this.graph._version++; }
    }

    onConnectionsChange() {
      const return_type = this.getInputDataType(0);
      this.outputs[0].type = return_type || 'T';
    }

    onGetCode(context) {
      if (!this.shader_destination || !this.isOutputConnected(0)) { return; }

      const inlink = getInputLinkID(this, 0);
      const outlink = getOutputLinkID(this, 0);
      if (!inlink && !outlink) // not connected
      { return; }

      const return_type = this.getInputDataType(0);
      this.outputs[0].type = return_type;
      if (return_type == 'T') {
        console.warn('node type is T and cannot be resolved');
        return;
      }

      if (!inlink) {
        context.addCode('code', `    ${return_type} ${outlink} = ${return_type}(0.0);\n`);
        return;
      }

      const minv = valueToGLSL(this.properties.min_value);
      const maxv = valueToGLSL(this.properties.max_value);
      const minv2 = valueToGLSL(this.properties.min_value2);
      const maxv2 = valueToGLSL(this.properties.max_value2);

      context.addCode('code', `${return_type} ${outlink} = ( (${inlink} - ${minv}) / (${maxv} - ${minv}) ) * (${maxv2} - ${minv2}) + ${minv2};`, this.shader_destination);
      this.setOutputData(0, return_type);
    }

    static title = 'Remap';
  }
  registerShaderNode('math/remap', LGraphShaderRemap);
}
