import { LiteGraph } from '@/litegraph';
import { Editor } from './litegraph-editor';

let webgl_canvas = null;

LiteGraph.node_images_path = '../nodes_data/';

const editor = new Editor('main', { miniwindow: false });
window.graphcanvas = editor.graphcanvas;
window.graph = editor.graph;
updateEditorHiPPICanvas();
window.addEventListener('resize', () => {
  editor.graphcanvas.resize();
  updateEditorHiPPICanvas();
});
// window.addEventListener("keydown", editor.graphcanvas.processKey.bind(editor.graphcanvas) );
window.onbeforeunload = function () {
  const data = JSON.stringify(graph.serialize());
  localStorage.setItem('litegraphg demo backup', data);
};

function updateEditorHiPPICanvas() {
  const ratio = window.devicePixelRatio;
  if (ratio == 1) { return; }
  const rect = editor.canvas.parentNode.getBoundingClientRect();
  const { width, height } = rect;
  editor.canvas.width = width * ratio;
  editor.canvas.height = height * ratio;
  editor.canvas.style.width = `${width}px`;
  editor.canvas.style.height = `${height}px`;
  editor.canvas.getContext('2d').scale(ratio, ratio);
  return editor.canvas;
}

// enable scripting
LiteGraph.allow_scripts = true;

// test
// editor.graphcanvas.viewport = [200,200,400,400];

// create scene selector
const elem = document.createElement('span');
elem.id = 'LGEditorTopBarSelector';
elem.className = 'selector';
elem.innerHTML = '';
elem.innerHTML += "Demo <select><option>Empty</option></select> <button class='btn' id='save'>Save</button><button class='btn' id='load'>Load</button><button class='btn' id='download'>Download</button> | <button class='btn' id='webgl'>WebGL</button> <button class='btn' id='multiview'>Multiview</button>";
editor.tools.appendChild(elem);
const select = elem.querySelector('select');
select.addEventListener('change', function (e) {
  const option = this.options[this.selectedIndex];
  const { url } = option.dataset;

  if (url) graph.load(url);
  else if (option.callback) option.callback();
  else graph.clear();
});

elem.querySelector('#save').addEventListener('click', () => {
  console.log('saved');
  localStorage.setItem('graphdemo_save', JSON.stringify(graph.serialize()));
});

elem.querySelector('#load').addEventListener('click', () => {
  const data = localStorage.getItem('graphdemo_save');
  if (data) graph.configure(JSON.parse(data));
  console.log('loaded');
});

elem.querySelector('#download').addEventListener('click', () => {
  const data = JSON.stringify(graph.serialize());
  const file = new Blob([data]);
  const url = URL.createObjectURL(file);
  const element = document.createElement('a');
  element.setAttribute('href', url);
  element.setAttribute('download', 'graph.JSON');
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
  setTimeout(() => { URL.revokeObjectURL(url); }, 1000 * 60); // wait one minute to revoke url
});

elem.querySelector('#webgl').addEventListener('click', enableWebGL);
elem.querySelector('#multiview').addEventListener('click', () => { editor.addMultiview(); });

function addDemo(name, url) {
  const option = document.createElement('option');
  if (url.constructor === String) option.dataset.url = url;
  else option.callback = url;
  option.innerHTML = name;
  select.appendChild(option);
}

// some examples
addDemo('Features', './assets/examples/features.json');
addDemo('Benchmark', './assets/examples/benchmark.json');
addDemo('Subgraph', './assets/examples/subgraph.json');
addDemo('Audio', './assets/examples/audio.json');
addDemo('Audio Delay', './assets/examples/audio_delay.json');
addDemo('Audio Reverb', './assets/examples/audio_reverb.json');
addDemo('MIDI Generation', './assets/examples/midi_generation.json');
addDemo('Copy Paste', './assets/examples/copypaste.json');
addDemo('autobackup', () => {
  const data = localStorage.getItem('litegraphg demo backup');
  if (!data) return;
  const graph_data = JSON.parse(data);
  graph.configure(graph_data);
});

// allows to use the WebGL nodes like textures
function enableWebGL() {
  if (webgl_canvas) {
    webgl_canvas.style.display = (webgl_canvas.style.display == 'none' ? 'block' : 'none');
    return;
  }

  const libs = [];
  const modlibs = [
    '../libs/gl-matrix-min.js',
    '../libs/litegl.js',
    '../nodes/gltextures.js',
    '../nodes/glfx.js',
    '../nodes/glshaders.js',
    '../nodes/geometry.js',
  ];

  function fetchJS() {
    modlibs.forEach((lib) => {
      import(lib);
    });
  }

  fetchJS();

  function on_ready() {
    console.log(this.src);
    if (!window.GL) return;
    webgl_canvas = document.createElement('canvas');
    webgl_canvas.width = 400;
    webgl_canvas.height = 300;
    webgl_canvas.style.position = 'absolute';
    webgl_canvas.style.top = '0px';
    webgl_canvas.style.right = '0px';
    webgl_canvas.style.border = '1px solid #AAA';

    webgl_canvas.addEventListener('click', () => {
      const rect = webgl_canvas.parentNode.getBoundingClientRect();
      if (webgl_canvas.width != rect.width) {
        webgl_canvas.width = rect.width;
        webgl_canvas.height = rect.height;
      } else {
        webgl_canvas.width = 400;
        webgl_canvas.height = 300;
      }
    });

    const parent = document.querySelector('.editor-area');
    parent.appendChild(webgl_canvas);
    const gl = GL.create({ canvas: webgl_canvas });
    if (!gl) return;

    editor.graph.onBeforeStep = ondraw;

    console.log('webgl ready');
    function ondraw() {
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    }
  }
}

// Tests
// CopyPasteWithConnectionToUnselectedOutputTest();
// demo();
