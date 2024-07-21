import { LiteGraph } from '@/litegraph';
import { LGraphCanvas } from '@/LGraphCanvas';

// Creates an interface to access extra features from a graph (like play, stop, live, etc)
export function Editor(container_id, options) {
  options = options || {};

  // fill container
  let html = "<div class='header'><div class='tools tools-left'></div><div class='tools tools-right'></div></div>";
  html += "<div class='content'><div class='editor-area'><canvas class='graphcanvas' width='1000' height='500' tabindex=10></canvas></div></div>";
  html += "<div class='footer'><div class='tools tools-left'></div><div class='tools tools-right'></div></div>";

  const root = document.createElement('div');
  this.root = root;
  root.className = 'litegraph litegraph-editor';
  root.innerHTML = html;

  this.tools = root.querySelector('.tools');
  this.content = root.querySelector('.content');
  this.footer = root.querySelector('.footer');

  const canvas = this.canvas = root.querySelector('.graphcanvas');

  // create graph
  const graph = (this.graph = new LGraph());
  const graphcanvas = this.graphcanvas = new LGraphCanvas(canvas, graph);
  graphcanvas.background_image = './assets/images/grid.png';
  graph.onAfterExecute = function () {
    graphcanvas.draw(true);
  };

  graphcanvas.onDropItem = this.onDropItem.bind(this);

  const originalOnPlayEvent = graph.onPlayEvent;
  graph.onPlayEvent = (function () {
    if (originalOnPlayEvent) { originalOnPlayEvent(); }
    const button = this.root.querySelector('#playnode_button');
    button.innerHTML = '<img src="./assets/images/icon-stop.png"/> Stop';
  }).bind(this);

  const originalOnStopEvent = graph.onStopEvent;
  graph.onStopEvent = (function () {
    if (originalOnStopEvent) { originalOnStopEvent(); }
    const button = this.root.querySelector('#playnode_button');
    button.innerHTML = '<img src="./assets/images/icon-play.png"/> Play';
  }).bind(this);

  // add stuff
  // this.addToolsButton("loadsession_button","Load","./assets/images/icon-load.png", this.onLoadButton.bind(this), ".tools-left" );
  // this.addToolsButton("savesession_button","Save","./assets/images/icon-save.png", this.onSaveButton.bind(this), ".tools-left" );
  this.addLoadCounter();
  this.addToolsButton(
    'playnode_button',
    'Play',
    './assets/images/icon-play.png',
    this.onPlayButton.bind(this),
    '.tools-right',
  );
  this.addToolsButton(
    'playstepnode_button',
    'Step',
    './assets/images/icon-playstep.png',
    this.onPlayStepButton.bind(this),
    '.tools-right',
  );

  if (!options.skip_livemode) {
    this.addToolsButton(
      'livemode_button',
      'Live',
      './assets/images/icon-record.png',
      this.onLiveButton.bind(this),
      '.tools-right',
    );
  }
  if (!options.skip_maximize) {
    this.addToolsButton(
      'maximize_button',
      '',
      './assets/images/icon-maximize.png',
      this.onFullscreenButton.bind(this),
      '.tools-right',
    );
  }
  if (options.miniwindow) {
    this.addMiniWindow(300, 200);
  }

  // append to DOM
  const parent = document.getElementById(container_id);
  if (parent) {
    parent.appendChild(root);
  }

  graphcanvas.resize();
  // graphcanvas.draw(true,true);
}

Editor.prototype.addLoadCounter = function () {
  const meter = document.createElement('div');
  meter.className = 'headerpanel loadmeter toolbar-widget';

  let html = "<div class='cpuload'><strong>CPU</strong> <div class='bgload'><div class='fgload'></div></div></div>";
  html
        += "<div class='gpuload'><strong>GFX</strong> <div class='bgload'><div class='fgload'></div></div></div>";

  meter.innerHTML = html;
  this.root.querySelector('.header .tools-left').appendChild(meter);
  const self = this;

  setInterval(() => {
    meter.querySelector('.cpuload .fgload').style.width = `${(2 * self.graph.execution_time * 90) || 0}px`;
    if (self.graph.status == LiteGraph.LGraph.STATUS_RUNNING) {
      meter.querySelector('.gpuload .fgload').style.width = `${(self.graphcanvas.render_time * 10 * 90) || 0}px`;
    } else {
      meter.querySelector('.gpuload .fgload').style.width = '4px';
    }
  }, 200);
};

Editor.prototype.addToolsButton = function (id, name, icon_url, callback, container) {
  if (!container) {
    container = '.tools';
  }

  const button = this.createButton(name, icon_url, callback);
  button.id = id;
  this.root.querySelector(container).appendChild(button);
};

Editor.prototype.createButton = function (name, icon_url, callback) {
  const button = document.createElement('button');
  if (icon_url) {
    button.innerHTML = `<img src='${icon_url}'/> `;
  }
  button.classList.add('btn');
  button.innerHTML += name;
  if (callback) { button.addEventListener('click', callback); }
  return button;
};

Editor.prototype.onLoadButton = function () {
  const panel = this.graphcanvas.createPanel('Load session', { closable: true });
  // TO DO

  this.root.appendChild(panel);
};

Editor.prototype.onSaveButton = function () {};

Editor.prototype.onPlayButton = function () {
  const { graph } = this;
  const button = this.root.querySelector('#playnode_button');

  if (graph.status == LiteGraph.LGraph.STATUS_STOPPED) {
    button.innerHTML = "<img src='./assets/images/icon-stop.png'/> Stop";
    graph.start();
  } else {
    button.innerHTML = "<img src='./assets/images/icon-play.png'/> Play";
    graph.stop();
  }
};

Editor.prototype.onPlayStepButton = function () {
  const { graph } = this;
  graph.runStep(1);
  this.graphcanvas.draw(true, true);
};

Editor.prototype.onLiveButton = function () {
  const is_live_mode = !this.graphcanvas.live_mode;
  this.graphcanvas.switchLiveMode(true);
  this.graphcanvas.draw();
  const url = this.graphcanvas.live_mode
    ? 'imgs/gauss_bg_medium.jpg'
    : 'imgs/gauss_bg.jpg';
  const button = this.root.querySelector('#livemode_button');
  button.innerHTML = !is_live_mode
    ? "<img src='./assets/images/icon-record.png'/> Live"
    : "<img src='./assets/images/icon-gear.png'/> Edit";
};

Editor.prototype.onDropItem = function (e) {
  const that = this;
  for (let i = 0; i < e.dataTransfer.files.length; ++i) {
    const file = e.dataTransfer.files[i];
    const ext = LGraphCanvas.getFileExtension(file.name);
    const reader = new FileReader();
    if (ext == 'json') {
      reader.onload = function (event) {
        const data = JSON.parse(event.target.result);
        that.graph.configure(data);
      };
      reader.readAsText(file);
    }
  }
};

Editor.prototype.goFullscreen = function () {
  if (this.root.requestFullscreen) {
    this.root.requestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
  } else if (this.root.mozRequestFullscreen) {
    this.root.requestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
  } else if (this.root.webkitRequestFullscreen) {
    this.root.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
  } else {
    throw 'Fullscreen not supported';
  }

  const self = this;
  setTimeout(() => {
    self.graphcanvas.resize();
  }, 100);
};

Editor.prototype.onFullscreenButton = function () {
  if (
    document.fullscreenElement
        || document.mozRequestFullscreen
        || document.webkitRequestFullscreen
  ) {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.mozCancelFullscreen) {
      document.mozCancelFullscreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    }
  } else {
    this.goFullscreen();
  }
};

Editor.prototype.addMiniWindow = function (w, h) {
  const miniwindow = document.createElement('div');
  miniwindow.className = 'litegraph miniwindow';
  miniwindow.innerHTML = `<canvas class='graphcanvas' width='${
    w
  }' height='${
    h
  }' tabindex=10></canvas>`;
  const canvas = miniwindow.querySelector('canvas');
  const that = this;

  const graphcanvas = new LGraphCanvas(canvas, this.graph);
  graphcanvas.show_info = false;
  graphcanvas.background_image = './assets/images/grid.png';
  graphcanvas.scale = 0.25;
  graphcanvas.allow_dragnodes = false;
  graphcanvas.allow_interaction = false;
  graphcanvas.render_shadows = false;
  graphcanvas.max_zoom = 0.25;
  this.miniwindow_graphcanvas = graphcanvas;
  graphcanvas.onClear = function () {
    graphcanvas.scale = 0.25;
    graphcanvas.allow_dragnodes = false;
    graphcanvas.allow_interaction = false;
  };
  graphcanvas.onRenderBackground = function (canvas, ctx) {
    ctx.strokeStyle = '#567';
    let tl = that.graphcanvas.convertOffsetToCanvas([0, 0]);
    let br = that.graphcanvas.convertOffsetToCanvas([
      that.graphcanvas.canvas.width,
      that.graphcanvas.canvas.height,
    ]);
    tl = this.convertCanvasToOffset(tl);
    br = this.convertCanvasToOffset(br);
    ctx.lineWidth = 1;
    ctx.strokeRect(
      Math.floor(tl[0]) + 0.5,
      Math.floor(tl[1]) + 0.5,
      Math.floor(br[0] - tl[0]),
      Math.floor(br[1] - tl[1]),
    );
  };

  miniwindow.style.position = 'absolute';
  miniwindow.style.top = '4px';
  miniwindow.style.right = '4px';

  const close_button = document.createElement('div');
  close_button.className = 'corner-button';
  close_button.innerHTML = '&#10060;';
  close_button.addEventListener('click', (e) => {
    graphcanvas.setGraph(null);
    miniwindow.parentNode.removeChild(miniwindow);
  });
  miniwindow.appendChild(close_button);

  this.root.querySelector('.content').appendChild(miniwindow);
};

// We're hijacking this method, it's now a *toggle* Multiview
Editor.prototype.addMultiview = function () {
  const { canvas } = this;
  let graphcanvas;

  // Already multiview, we're actually toggling it
  if (this.graphcanvas2) {
    // @BUG: A bug in this section of code is triggered when you *play* the graph
    this.graphcanvas2.setGraph(null, true);
    this.graphcanvas2.viewport = null;
    this.graphcanvas2 = null;
    this.graphcanvas.viewport = null;
    this.graphcanvas.setGraph(null, true);
    this.graphcanvas = null;
    graphcanvas = new LGraphCanvas(canvas, this.graph);
    graphcanvas.background_image = 'imgs/grid.png';
    this.graphcanvas = graphcanvas;
    window.graphcanvas = this.graphcanvas;
    return;
  }
  this.graphcanvas.ctx.fillStyle = 'black';
  this.graphcanvas.ctx.fillRect(0, 0, canvas.width, canvas.height);
  this.graphcanvas.viewport = [0, 0, canvas.width * 0.5 - 2, canvas.height];

  graphcanvas = new LGraphCanvas(canvas, this.graph);
  graphcanvas.background_image = './assets/images/grid.png';
  this.graphcanvas2 = graphcanvas;
  this.graphcanvas2.viewport = [canvas.width * 0.5, 0, canvas.width * 0.5, canvas.height];
};

LiteGraph.Editor = Editor;
