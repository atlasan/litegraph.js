import { LiteGraph } from '@/litegraph';
import { LGraphStyles } from '../core/styles';

const global = typeof (window) !== 'undefined' ? window : typeof (self) !== 'undefined' ? self : globalThis;

export const LGAudio = {
  getAudioContext() {
    if (!this._audio_context) {
      window.AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!window.AudioContext) {
        console.error('AudioContext not supported by browser');
        return null;
      }
      this._audio_context = new AudioContext();
      this._audio_context.onmessage = function (msg) {
        console.log('msg', msg);
      };
      this._audio_context.onended = function (msg) {
        console.log('ended', msg);
      };
      this._audio_context.oncomplete = function (msg) {
        console.log('complete', msg);
      };
    }

    // in case it crashes
    // if(this._audio_context.state == "suspended")
    //    this._audio_context.resume();
    return this._audio_context;
  },

  connect(audionodeA, audionodeB) {
    if(typeof(audionodeA)=="undefined" || typeof(audionodeB)=="undefined" || !audionodeA || !audionodeB){
      return;
    }
    try {
      audionodeA.connect(audionodeB);
    } catch (err) {
      console.warn('LGraphAudio:', err);
    }
  },

  disconnect(audionodeA, audionodeB) {
    try {
      audionodeA.disconnect(audionodeB);
    } catch (err) {
      console.warn('LGraphAudio:', err);
    }
  },

  changeAllAudiosConnections(node, connect) {
    if (node.inputs) {
      for (var i = 0; i < node.inputs.length; ++i) {
        const input = node.inputs[i];
        var link_info = node.graph.links[input.link];
        if (!link_info) {
          continue;
        }

        const origin_node = node.graph.getNodeById(link_info.origin_id);
        var origin_audionode = null;
        if (origin_node.getAudioNodeInOutputSlot) {
          origin_audionode = origin_node.getAudioNodeInOutputSlot(
            link_info.origin_slot,
          );
        } else {
          origin_audionode = origin_node.audionode;
        }

        var target_audionode = null;
        if (node.getAudioNodeInInputSlot) {
          target_audionode = node.getAudioNodeInInputSlot(i);
        } else {
          target_audionode = node.audionode;
        }

        if (connect) {
          LGAudio.connect(origin_audionode, target_audionode);
        } else {
          LGAudio.disconnect(origin_audionode, target_audionode);
        }
      }
    }

    if (node.outputs) {
      for (var i = 0; i < node.outputs.length; ++i) {
        const output = node.outputs[i];
        for (let j = 0; j < output.links.length; ++j) {
          var link_info = node.graph.links[output.links[j]];
          if (!link_info) {
            continue;
          }

          var origin_audionode = null;
          if (node.getAudioNodeInOutputSlot) {
            origin_audionode = node.getAudioNodeInOutputSlot(i);
          } else {
            origin_audionode = node.audionode;
          }

          const target_node = node.graph.getNodeById(
            link_info.target_id,
          );
          var target_audionode = null;
          if (target_node.getAudioNodeInInputSlot) {
            target_audionode = target_node.getAudioNodeInInputSlot(
              link_info.target_slot,
            );
          } else {
            target_audionode = target_node.audionode;
          }

          if (connect) {
            LGAudio.connect(origin_audionode, target_audionode);
          } else {
            LGAudio.disconnect(origin_audionode, target_audionode);
          }
        }
      }
    }
  },

  // used by many nodes
  onConnectionsChange(
    connection,
    slot,
    connected,
    link_info,
    output,
  ) {
    // only process the outputs events
    if (connection != LiteGraph.OUTPUT) {
      return;
    }

    let target_node = null;
    if (link_info) {
      target_node = this.graph.getNodeById(link_info.target_id);
    }

    if (!target_node) {
      return;
    }

    // get origin audionode
    let local_audionode = null;
    if (this.getAudioNodeInOutputSlot) {
      local_audionode = this.getAudioNodeInOutputSlot(slot);
    } else {
      local_audionode = this.audionode;
    }

    // get target audionode
    let target_audionode = null;
    if (target_node.getAudioNodeInInputSlot) {
      target_audionode = target_node.getAudioNodeInInputSlot(
        link_info.target_slot,
      );
    } else {
      target_audionode = target_node.audionode;
    }

    // do the connection/disconnection
    if (connected) {
      console.debug("[audio]", "[onConnectionsChange]", "will connect", local_audionode, "to", target_audionode, "arguments", ...arguments);
      LGAudio.connect(local_audionode, target_audionode);
    } else {
      console.debug("[audio]", "[onConnectionsChange]", "will discconnect", local_audionode, "from", target_audionode, "arguments", ...arguments);
      LGAudio.disconnect(local_audionode, target_audionode);
    }
  },

  // this function helps creating wrappers to existing classes
  createAudioNodeWrapper(class_object) {
    const old_func = class_object.prototype.onPropertyChanged;

    class_object.prototype.onPropertyChanged = function (name, value) {
      if (old_func) {
        old_func.call(this, name, value);
      }

      if (!this.audionode) {
        return;
      }

      if (this.audionode[name] === undefined) {
        return;
      }

      if (this.audionode[name].value !== undefined) {
        this.audionode[name].value = value;
      } else {
        this.audionode[name] = value;
      }
    };

    class_object.prototype.onConnectionsChange = LGAudio.onConnectionsChange;
  },

  // contains the samples decoded of the loaded audios in AudioBuffer format
  cached_audios: {},

  loadSound(url, on_complete, on_error) {
    if (LGAudio.cached_audios[url] && url.indexOf('blob:') == -1) {
      if (on_complete) {
        on_complete(LGAudio.cached_audios[url]);
      }
      return;
    }

    if (LGAudio.onProcessAudioURL) {
      url = LGAudio.onProcessAudioURL(url);
    }

    // load new sample
    const request = new XMLHttpRequest();
    request.open('GET', url, true);
    request.responseType = 'arraybuffer';

    const context = LGAudio.getAudioContext();

    // Decode asynchronously
    request.onload = function () {
      console.log('AudioSource loaded');
      context.decodeAudioData(
        request.response,
        (buffer) => {
          console.log('AudioSource decoded');
          LGAudio.cached_audios[url] = buffer;
          if (on_complete) {
            on_complete(buffer);
          }
        },
        onError,
      );
    };
    request.send();

    function onError(err) {
      console.log('Audio loading sample error:', err);
      if (on_error) {
        on_error(err);
      }
    }

    return request;
  },
};

class LGAudioSource {
  constructor() {
    this.properties = {
      src: '',
      gain: 0.5,
      loop: true,
      autoplay: true,
      playbackRate: 1,
    };

    this._loading_audio = false;
    this._audiobuffer = null; // points to AudioBuffer with the audio samples decoded
    this._audionodes = [];
    this._last_sourcenode = null; // the last AudioBufferSourceNode (there could be more if there are several sounds playing)

    this.addOutput('out', 'audio');
    this.addInput('gain', 'number');

    // init context
    const context = LGAudio.getAudioContext();

    // create gain node to control volume
    this.audionode = context.createGain();
    this.audionode.graphnode = this;
    this.audionode.gain.value = this.properties.gain;

    // debug
    if (this.properties.src) {
      this.loadSound(this.properties.src);
    }
  }

  onAdded(graph) {
    if (graph.status === LiteGraph.LGraph.STATUS_RUNNING) {
      this.onStart();
    }
  }

  onStart() {
    if (!this._audiobuffer) {
      return;
    }

    if (this.properties.autoplay) {
      this.playBuffer(this._audiobuffer);
    }
  }

  onStop() {
    this.stopAllSounds();
  }

  onPause() {
    this.pauseAllSounds();
  }

  onUnpause() {
    this.unpauseAllSounds();
    // this.onStart();
  }

  onRemoved() {
    this.stopAllSounds();
    if (this._dropped_url) {
      URL.revokeObjectURL(this._url);
    }
  }

  stopAllSounds() {
    // iterate and stop
    for (let i = 0; i < this._audionodes.length; ++i) {
      if (this._audionodes[i].started) {
        this._audionodes[i].started = false;
        this._audionodes[i].stop();
      }
      // this._audionodes[i].disconnect( this.audionode );
    }
    this._audionodes.length = 0;
  }

  pauseAllSounds() {
    LGAudio.getAudioContext().suspend();
  }

  unpauseAllSounds() {
    LGAudio.getAudioContext().resume();
  }

  onExecute() {
    if (this.inputs) {
      for (var i = 0; i < this.inputs.length; ++i) {
        const input = this.inputs[i];
        if (input.link == null) {
          continue;
        }
        const v = this.getInputData(i);
        if (v === undefined) {
          continue;
        }
        if (input.name == 'gain') { this.audionode.gain.value = v; } else if (input.name == 'src') {
          this.setProperty('src', v);
        } else if (input.name == 'playbackRate') {
          this.properties.playbackRate = v;
          for (let j = 0; j < this._audionodes.length; ++j) {
            this._audionodes[j].playbackRate.value = v;
          }
        }
      }
    }

    if (this.outputs) {
      for (var i = 0; i < this.outputs.length; ++i) {
        const output = this.outputs[i];
        if (output.name == 'buffer' && this._audiobuffer) {
          this.setOutputData(i, this._audiobuffer);
        }
      }
    }
  }

  onAction(event) {
    if (this._audiobuffer) {
      if (event == 'Play') {
        this.playBuffer(this._audiobuffer);
      } else if (event == 'Stop') {
        this.stopAllSounds();
      }
    }
  }

  onPropertyChanged(name, value) {
    if (name == 'src') {
      this.loadSound(value);
    } else if (name == 'gain') {
      this.audionode.gain.value = value;
    } else if (name == 'playbackRate') {
      for (let j = 0; j < this._audionodes.length; ++j) {
        this._audionodes[j].playbackRate.value = value;
      }
    }
  }

  playBuffer(buffer) {
    const that = this;
    const context = LGAudio.getAudioContext();

    // create a new audionode (this is mandatory, AudioAPI doesnt like to reuse old ones)
    const audionode = context.createBufferSource(); // create a AudioBufferSourceNode
    this._last_sourcenode = audionode;
    audionode.graphnode = this;
    audionode.buffer = buffer;
    audionode.loop = this.properties.loop;
    audionode.playbackRate.value = this.properties.playbackRate;
    this._audionodes.push(audionode);
    audionode.connect(this.audionode); // connect to gain

    this._audionodes.push(audionode);

    this.trigger('start');

    audionode.onended = function () {
      // console.log("ended!");
      that.trigger('ended');
      // remove
      const index = that._audionodes.indexOf(audionode);
      if (index != -1) {
        that._audionodes.splice(index, 1);
      }
    };

    if (!audionode.started) {
      audionode.started = true;
      audionode.start();
    }
    return audionode;
  }

  loadSound(url) {
    const that = this;

    // kill previous load
    if (this._request) {
      this._request.abort();
      this._request = null;
    }

    this._audiobuffer = null; // points to the audiobuffer once the audio is loaded
    this._loading_audio = false;

    if (!url) {
      return;
    }

    this._request = LGAudio.loadSound(url, inner.bind(this));

    this._loading_audio = true;
    this.boxcolor = '#AA4';

    function inner(buffer) {
      this.boxcolor = LGraphStyles.NODE_DEFAULT_BOXCOLOR;
      that._audiobuffer = buffer;
      that._loading_audio = false;
      // if is playing, then play it
      if (that.graph && that.graph.status === LiteGraph.LGraph.STATUS_RUNNING) {
        that.onStart();
      } // this controls the autoplay already
    }
  }

  onGetInputs() {
    return [
      ['playbackRate', 'number'],
      ['src', 'string'],
      ['Play', LiteGraph.ACTION],
      ['Stop', LiteGraph.ACTION],
    ];
  }

  onGetOutputs() {
    return [['buffer', 'audiobuffer'], ['start', LiteGraph.EVENT], ['ended', LiteGraph.EVENT]];
  }

  onDropFile(file) {
    if (this._dropped_url) {
      URL.revokeObjectURL(this._dropped_url);
    }
    const url = URL.createObjectURL(file);
    this.properties.src = url;
    this.loadSound(url);
    this._dropped_url = url;
  }

  // Helps connect/disconnect AudioNodes when new connections are made in the node
  onConnectionsChange = LGAudio.onConnectionsChange;

  static title = 'Source';

  static desc = 'Plays an audio file';

  static '@src' = { widget: 'resource' };

  static supported_extensions = ['wav', 'ogg', 'mp3'];
}
LiteGraph.registerNodeType('audio/source', LGAudioSource);

class LGAudioMediaSource {
  constructor() {
    this.properties = {
      gain: 0.5,
    };

    this._audionodes = [];
    this._media_stream = null;

    this.addOutput('out', 'audio');
    this.addInput('gain', 'number');

    // create gain node to control volume
    const context = LGAudio.getAudioContext();
    this.audionode = context.createGain();
    this.audionode.graphnode = this;
    this.audionode.gain.value = this.properties.gain;
  }

  onAdded(graph) {
    if (graph.status === LiteGraph.LGraph.STATUS_RUNNING) {
      this.onStart();
    }
  }

  onStart() {
    if (this._media_stream == null && !this._waiting_confirmation) {
      this.openStream();
    }
  }

  onStop() {
    this.audionode.gain.value = 0;
  }

  onPause() {
    this.audionode.gain.value = 0;
  }

  onUnpause() {
    this.audionode.gain.value = this.properties.gain;
  }

  onRemoved() {
    this.audionode.gain.value = 0;
    if (this.audiosource_node) {
      this.audiosource_node.disconnect(this.audionode);
      this.audiosource_node = null;
    }
    if (this._media_stream) {
      const tracks = this._media_stream.getTracks();
      if (tracks.length) {
        tracks[0].stop();
      }
    }
  }

  openStream() {
    if (!navigator.mediaDevices) {
      console.log(
        'getUserMedia() is not supported in your browser, use chrome and enable WebRTC from about://flags',
      );
      return;
    }

    this._waiting_confirmation = true;

    // Not showing vendor prefixes.
    navigator.mediaDevices
      .getUserMedia({ audio: true, video: false })
      .then(this.streamReady.bind(this))
      .catch(onFailSoHard);

    const that = this;
    function onFailSoHard(err) {
      console.log('Media rejected', err);
      that._media_stream = false;
      that.boxcolor = 'red';
    }
  }

  streamReady(localMediaStream) {
    this._media_stream = localMediaStream;
    // this._waiting_confirmation = false;

    // init context
    if (this.audiosource_node) {
      this.audiosource_node.disconnect(this.audionode);
    }
    const context = LGAudio.getAudioContext();
    this.audiosource_node = context.createMediaStreamSource(
      localMediaStream,
    );
    this.audiosource_node.graphnode = this;
    this.audiosource_node.connect(this.audionode);
    this.boxcolor = 'white';
  }

  onExecute() {
    if (this._media_stream == null && !this._waiting_confirmation) {
      this.openStream();
    }

    if (this.inputs) {
      for (let i = 0; i < this.inputs.length; ++i) {
        const input = this.inputs[i];
        if (input.link == null) {
          continue;
        }
        const v = this.getInputData(i);
        if (v === undefined) {
          continue;
        }
        if (input.name == 'gain') {
          this.audionode.gain.value = this.properties.gain = v;
        }
      }
    }
  }

  onAction(event) {
    if (event == 'Play') {
      this.audionode.gain.value = this.properties.gain;
    } else if (event == 'Stop') {
      this.audionode.gain.value = 0;
    }
  }

  onPropertyChanged(name, value) {
    if (name == 'gain') {
      this.audionode.gain.value = value;
    }
  }

  onGetInputs() {
    return [
      ['playbackRate', 'number'],
      ['Play', LiteGraph.ACTION],
      ['Stop', LiteGraph.ACTION],
    ];
  }

  // Helps connect/disconnect AudioNodes when new connections are made in the node
  onConnectionsChange = LGAudio.onConnectionsChange;

  static title = 'MediaSource';

  static desc = 'Plays microphone';
}
LiteGraph.registerNodeType('audio/media_source', LGAudioMediaSource);

class LGAudioAnalyser {
  constructor() {
    this.properties = {
      fftSize: 2048,
      minDecibels: -100,
      maxDecibels: -10,
      smoothingTimeConstant: 0.5,
    };

    const context = LGAudio.getAudioContext();

    this.audionode = context.createAnalyser();
    this.audionode.graphnode = this;
    this.audionode.fftSize = this.properties.fftSize;
    this.audionode.minDecibels = this.properties.minDecibels;
    this.audionode.maxDecibels = this.properties.maxDecibels;
    this.audionode.smoothingTimeConstant = this.properties.smoothingTimeConstant;

    this.addInput('in', 'audio');
    this.addOutput('freqs', 'array');
    this.addOutput('samples', 'array');

    this._freq_bin = null;
    this._time_bin = null;
  }

  onPropertyChanged(name, value) {
    this.audionode[name] = value;
  }

  onExecute() {
    if (this.isOutputConnected(0)) {
      // send FFT
      var bufferLength = this.audionode.frequencyBinCount;
      if (!this._freq_bin || this._freq_bin.length != bufferLength) {
        this._freq_bin = new Uint8Array(bufferLength);
      }
      this.audionode.getByteFrequencyData(this._freq_bin);
      this.setOutputData(0, this._freq_bin);
    }

    // send analyzer
    if (this.isOutputConnected(1)) {
      // send Samples
      var bufferLength = this.audionode.frequencyBinCount;
      if (!this._time_bin || this._time_bin.length != bufferLength) {
        this._time_bin = new Uint8Array(bufferLength);
      }
      this.audionode.getByteTimeDomainData(this._time_bin);
      this.setOutputData(1, this._time_bin);
    }

    // properties
    for (let i = 1; i < this.inputs.length; ++i) {
      const input = this.inputs[i];
      if (input.link == null) {
        continue;
      }
      const v = this.getInputData(i);
      if (v !== undefined) {
        this.audionode[input.name].value = v;
      }
    }

    // time domain
    // this.audionode.getFloatTimeDomainData( dataArray );
  }

  onGetInputs() {
    return [
      ['minDecibels', 'number'],
      ['maxDecibels', 'number'],
      ['smoothingTimeConstant', 'number'],
    ];
  }

  onGetOutputs() {
    return [['freqs', 'array'], ['samples', 'array']];
  }

  static title = 'Analyser';

  static desc = 'Audio Analyser';
}
LiteGraph.registerNodeType('audio/analyser', LGAudioAnalyser);

class LGAudioGain {
  constructor() {
    // default
    this.properties = {
      gain: 1,
    };

    this.audionode = LGAudio.getAudioContext().createGain();
    this.addInput('in', 'audio');
    this.addInput('gain', 'number');
    this.addOutput('out', 'audio');
  }

  onExecute() {
    if (!this.inputs || !this.inputs.length) {
      return;
    }

    for (let i = 1; i < this.inputs.length; ++i) {
      const input = this.inputs[i];
      const v = this.getInputData(i);
      if (v !== undefined) {
        this.audionode[input.name].value = v;
      }
    }
  }

  static title = 'Gain';

  static desc = 'Audio gain';
}
LGAudio.createAudioNodeWrapper(LGAudioGain);
LiteGraph.registerNodeType('audio/gain', LGAudioGain);

class LGAudioConvolver {
  constructor() {
    // default
    this.properties = {
      impulse_src: '',
      normalize: true,
    };

    this.audionode = LGAudio.getAudioContext().createConvolver();
    this.addInput('in', 'audio');
    this.addOutput('out', 'audio');
  }

  onRemove() {
    if (this._dropped_url) {
      URL.revokeObjectURL(this._dropped_url);
    }
  }

  onPropertyChanged(name, value) {
    if (name == 'impulse_src') {
      this.loadImpulse(value);
    } else if (name == 'normalize') {
      this.audionode.normalize = value;
    }
  }

  onDropFile(file) {
    if (this._dropped_url) {
      URL.revokeObjectURL(this._dropped_url);
    }
    this._dropped_url = URL.createObjectURL(file);
    this.properties.impulse_src = this._dropped_url;
    this.loadImpulse(this._dropped_url);
  }

  loadImpulse(url) {
    const that = this;

    // kill previous load
    if (this._request) {
      this._request.abort();
      this._request = null;
    }

    this._impulse_buffer = null;
    this._loading_impulse = false;

    if (!url) {
      return;
    }

    // load new sample
    this._request = LGAudio.loadSound(url, inner);
    this._loading_impulse = true;

    // Decode asynchronously
    function inner(buffer) {
      that._impulse_buffer = buffer;
      that.audionode.buffer = buffer;
      console.log('Impulse signal set');
      that._loading_impulse = false;
    }
  }

  static title = 'Convolver';

  static desc = 'Convolves the signal (used for reverb)';
}
LGAudio.createAudioNodeWrapper(LGAudioConvolver);
LiteGraph.registerNodeType('audio/convolver', LGAudioConvolver);

class LGAudioDynamicsCompressor {
  constructor() {
    // default
    this.properties = {
      threshold: -50,
      knee: 40,
      ratio: 12,
      reduction: -20,
      attack: 0,
      release: 0.25,
    };

    this.audionode = LGAudio.getAudioContext().createDynamicsCompressor();
    this.addInput('in', 'audio');
    this.addOutput('out', 'audio');
  }

  onExecute() {
    if (!this.inputs || !this.inputs.length) {
      return;
    }
    for (let i = 1; i < this.inputs.length; ++i) {
      const input = this.inputs[i];
      if (input.link == null) {
        continue;
      }
      const v = this.getInputData(i);
      if (v !== undefined) {
        this.audionode[input.name].value = v;
      }
    }
  }

  onGetInputs() {
    return [
      ['threshold', 'number'],
      ['knee', 'number'],
      ['ratio', 'number'],
      ['reduction', 'number'],
      ['attack', 'number'],
      ['release', 'number'],
    ];
  }

  static title = 'DynamicsCompressor';

  static desc = 'Dynamics Compressor';
}
LGAudio.createAudioNodeWrapper(LGAudioDynamicsCompressor);
LiteGraph.registerNodeType('audio/dynamicsCompressor', LGAudioDynamicsCompressor);

/*
class LGAudioWaveShaper {
  constructor() {
    //default
    this.properties = {};

    this.audionode = LGAudio.getAudioContext().createWaveShaper();
    this.addInput("in", "audio");
    this.addInput("shape", "waveshape");
    this.addOutput("out", "audio");
  }

  onExecute() {
    if (!this.inputs || !this.inputs.length) {
      return;
    }
    var v = this.getInputData(1);
    if (v === undefined) {
      return;
    }
    this.audionode.curve = v;
  }

  setWaveShape(shape) {
    this.audionode.curve = shape;
  }
}
LGAudio.createAudioNodeWrapper(LGAudioWaveShaper);

  @TODO:
  Disabled till I dont find a way to do a wave shape
  LGAudioWaveShaper.title = "WaveShaper";
  LGAudioWaveShaper.desc = "Distortion using wave shape";
  LiteGraph.registerNodeType("audio/waveShaper", LGAudioWaveShaper);
*/

class LGAudioMixer {
  constructor() {
    // default
    this.properties = {
      gain1: 0.5,
      gain2: 0.5,
    };

    this.audionode = LGAudio.getAudioContext().createGain();

    this.audionode1 = LGAudio.getAudioContext().createGain();
    this.audionode1.gain.value = this.properties.gain1;
    this.audionode2 = LGAudio.getAudioContext().createGain();
    this.audionode2.gain.value = this.properties.gain2;

    this.audionode1.connect(this.audionode);
    this.audionode2.connect(this.audionode);

    this.addInput('in1', 'audio');
    this.addInput('in1 gain', 'number');
    this.addInput('in2', 'audio');
    this.addInput('in2 gain', 'number');

    this.addOutput('out', 'audio');
  }

  getAudioNodeInInputSlot(slot) {
    if (slot == 0) {
      return this.audionode1;
    } if (slot == 2) {
      return this.audionode2;
    }
  }

  onPropertyChanged(name, value) {
    if (name == 'gain1') {
      this.audionode1.gain.value = value;
    } else if (name == 'gain2') {
      this.audionode2.gain.value = value;
    }
  }

  onExecute() {
    if (!this.inputs || !this.inputs.length) {
      return;
    }

    for (let i = 1; i < this.inputs.length; ++i) {
      const input = this.inputs[i];

      if (input.link == null || input.type == 'audio') {
        continue;
      }

      const v = this.getInputData(i);
      if (v === undefined) {
        continue;
      }

      if (i == 1) {
        this.audionode1.gain.value = v;
      } else if (i == 3) {
        this.audionode2.gain.value = v;
      }
    }
  }

  static title = 'Mixer';

  static desc = 'Audio mixer';
}

LGAudio.createAudioNodeWrapper(LGAudioMixer);
LiteGraph.registerNodeType('audio/mixer', LGAudioMixer);

class LGAudioADSR {
  constructor() {
    // default
    this.properties = {
      A: 0.1,
      D: 0.1,
      S: 0.1,
      R: 0.1,
    };

    this.audionode = LGAudio.getAudioContext().createGain();
    this.audionode.gain.value = 0;
    this.addInput('in', 'audio');
    this.addInput('gate', 'boolean');
    this.addOutput('out', 'audio');
    this.gate = false;
  }

  onExecute() {
    const audioContext = LGAudio.getAudioContext();
    const now = audioContext.currentTime;
    const node = this.audionode;
    const { gain } = node;
    const current_gate = this.getInputData(1);

    const A = this.getInputOrProperty('A');
    const D = this.getInputOrProperty('D');
    const S = this.getInputOrProperty('S');
    const R = this.getInputOrProperty('R');

    if (!this.gate && current_gate) {
      gain.cancelScheduledValues(0);
      gain.setValueAtTime(0, now);
      gain.linearRampToValueAtTime(1, now + A);
      gain.linearRampToValueAtTime(S, now + A + D);
    } else if (this.gate && !current_gate) {
      gain.cancelScheduledValues(0);
      gain.setValueAtTime(gain.value, now);
      gain.linearRampToValueAtTime(0, now + R);
    }

    this.gate = current_gate;
  }

  onGetInputs() {
    return [
      ['A', 'number'],
      ['D', 'number'],
      ['S', 'number'],
      ['R', 'number'],
    ];
  }

  static title = 'ADSR';

  static desc = 'Audio envelope';
}

LGAudio.createAudioNodeWrapper(LGAudioADSR);
LiteGraph.registerNodeType('audio/adsr', LGAudioADSR);

class LGAudioDelay {
  constructor() {
    // default
    this.properties = {
      delayTime: 0.5,
    };

    this.audionode = LGAudio.getAudioContext().createDelay(10);
    this.audionode.delayTime.value = this.properties.delayTime;
    this.addInput('in', 'audio');
    this.addInput('time', 'number');
    this.addOutput('out', 'audio');
  }

  onExecute() {
    const v = this.getInputData(1);
    if (v !== undefined) {
      this.audionode.delayTime.value = v;
    }
  }

  static title = 'Delay';

  static desc = 'Audio delay';
}

LGAudio.createAudioNodeWrapper(LGAudioDelay);
LiteGraph.registerNodeType('audio/delay', LGAudioDelay);

class LGAudioBiquadFilter {
  constructor() {
    // default
    this.properties = {
      frequency: 350,
      detune: 0,
      Q: 1,
    };
    this.addProperty('type', 'lowpass', 'enum', {
      values: [
        'lowpass',
        'highpass',
        'bandpass',
        'lowshelf',
        'highshelf',
        'peaking',
        'notch',
        'allpass',
      ],
    });

    // create node
    this.audionode = LGAudio.getAudioContext().createBiquadFilter();

    // slots
    this.addInput('in', 'audio');
    this.addOutput('out', 'audio');
  }

  onExecute() {
    if (!this.inputs || !this.inputs.length) {
      return;
    }

    for (let i = 1; i < this.inputs.length; ++i) {
      const input = this.inputs[i];
      if (input.link == null) {
        continue;
      }
      const v = this.getInputData(i);
      if (v !== undefined) {
        this.audionode[input.name].value = v;
      }
    }
  }

  onGetInputs() {
    return [['frequency', 'number'], ['detune', 'number'], ['Q', 'number']];
  }

  static title = 'BiquadFilter';

  static desc = 'Audio Biquad filter';
}
LGAudio.createAudioNodeWrapper(LGAudioBiquadFilter);
LiteGraph.registerNodeType('audio/biquadfilter', LGAudioBiquadFilter);

class LGAudioOscillatorNode {
  constructor() {
    // default
    this.properties = {
      frequency: 440,
      detune: 0,
      type: 'sine',
    };
    this.addProperty('type', 'sine', 'enum', {
      values: ['sine', 'square', 'sawtooth', 'triangle', 'custom'],
    });

    // create node
    this.audionode = LGAudio.getAudioContext().createOscillator();

    // slots
    this.addOutput('out', 'audio');
  }

  onStart() {
    if (!this.audionode.started) {
      this.audionode.started = true;
      try {
        this.audionode.start();
      } catch (err) {
        console.log(err);
      }
    }
  }

  onStop() {
    if (this.audionode.started) {
      this.audionode.started = false;
      this.audionode.stop();
    }
  }

  onPause() {
    this.onStop();
  }

  onUnpause() {
    this.onStart();
  }

  onExecute() {
    if (!this.inputs || !this.inputs.length) {
      return;
    }

    for (let i = 0; i < this.inputs.length; ++i) {
      const input = this.inputs[i];
      if (input.link == null) {
        continue;
      }
      const v = this.getInputData(i);
      if (v !== undefined) {
        this.audionode[input.name].value = v;
      }
    }
  }

  onGetInputs() {
    return [
      ['frequency', 'number'],
      ['detune', 'number'],
      ['type', 'string'],
    ];
  }

  static title = 'Oscillator';

  static desc = 'Oscillator';
}

LGAudio.createAudioNodeWrapper(LGAudioOscillatorNode);
LiteGraph.registerNodeType('audio/oscillator', LGAudioOscillatorNode);

class LGAudioVisualization {
  constructor() {
    this.properties = {
      continuous: true,
      mark: -1,
    };

    this.addInput('data', 'array');
    this.addInput('mark', 'number');
    this.size = [300, 200];
    this._last_buffer = null;
  }

  onExecute() {
    this._last_buffer = this.getInputData(0);
    const v = this.getInputData(1);
    if (v !== undefined) {
      this.properties.mark = v;
    }
    this.setDirtyCanvas(true, false);
  }

  onDrawForeground(ctx) {
    if (!this._last_buffer) {
      return;
    }

    const buffer = this._last_buffer;

    // delta represents how many samples we advance per pixel
    const delta = buffer.length / this.size[0];
    const h = this.size[1];

    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, this.size[0], this.size[1]);
    ctx.strokeStyle = 'white';
    ctx.beginPath();
    var x = 0;

    if (this.properties.continuous) {
      ctx.moveTo(x, h);
      for (var i = 0; i < buffer.length; i += delta) {
        ctx.lineTo(x, h - (buffer[i | 0] / 255) * h);
        x++;
      }
    } else {
      for (var i = 0; i < buffer.length; i += delta) {
        ctx.moveTo(x + 0.5, h);
        ctx.lineTo(x + 0.5, h - (buffer[i | 0] / 255) * h);
        x++;
      }
    }
    ctx.stroke();

    if (this.properties.mark >= 0) {
      const samplerate = LGAudio.getAudioContext().sampleRate;
      const binfreq = samplerate / buffer.length;
      var x = (2 * (this.properties.mark / binfreq)) / delta;
      if (x >= this.size[0]) {
        x = this.size[0] - 1;
      }
      ctx.strokeStyle = 'red';
      ctx.beginPath();
      ctx.moveTo(x, h);
      ctx.lineTo(x, 0);
      ctx.stroke();
    }
  }

  static title = 'Visualization';

  static desc = 'Audio Visualization';
}
LiteGraph.registerNodeType('audio/visualization', LGAudioVisualization);

class LGAudioBandSignal {
  constructor() {
    // default
    this.properties = {
      band: 440,
      amplitude: 1,
    };

    this.addInput('freqs', 'array');
    this.addOutput('signal', 'number');
  }

  onExecute() {
    this._freqs = this.getInputData(0);
    if (!this._freqs) {
      return;
    }

    let { band } = this.properties;
    var v = this.getInputData(1);
    if (v !== undefined) {
      band = v;
    }

    const samplerate = LGAudio.getAudioContext().sampleRate;
    const binfreq = samplerate / this._freqs.length;
    const index = 2 * (band / binfreq);
    var v = 0;
    if (index < 0) {
      v = this._freqs[0];
    }
    if (index >= this._freqs.length) {
      v = this._freqs[this._freqs.length - 1];
    } else {
      const pos = index | 0;
      const v0 = this._freqs[pos];
      const v1 = this._freqs[pos + 1];
      const f = index - pos;
      v = v0 * (1 - f) + v1 * f;
    }

    this.setOutputData(0, (v / 255) * this.properties.amplitude);
  }

  onGetInputs() {
    return [['band', 'number']];
  }

  static title = 'Signal';

  static desc = 'extract the signal of some frequency';
}
LiteGraph.registerNodeType('audio/signal', LGAudioBandSignal);

class LGAudioScript {
  constructor() {
    if (!LGAudioScript.default_code) {
      const code = LGAudioScript.default_function.toString();
      const index = code.indexOf('{') + 1;
      const index2 = code.lastIndexOf('}');
      LGAudioScript.default_code = code.substr(index, index2 - index);
    }

    // default
    this.properties = {
      code: LGAudioScript.default_code,
    };

    // create node
    const ctx = LGAudio.getAudioContext();
    if (ctx.createScriptProcessor) {
      this.audionode = ctx.createScriptProcessor(4096, 1, 1);
    }
    // buffer size, input channels, output channels
    else {
      console.warn('ScriptProcessorNode deprecated');
      this.audionode = ctx.createGain(); // bypass audio
    }

    this.processCode();
    if (!LGAudioScript._bypass_function) {
      LGAudioScript._bypass_function = this.audionode.onaudioprocess;
    }

    // slots
    this.addInput('in', 'audio');
    this.addOutput('out', 'audio');
  }

  onAdded(graph) {
    if (graph.status == LiteGraph.LGraph.STATUS_RUNNING) {
      this.audionode.onaudioprocess = this._callback;
    }
  }

  onStart() {
    this.audionode.onaudioprocess = this._callback;
  }

  onStop() {
    this.audionode.onaudioprocess = LGAudioScript._bypass_function;
  }

  onPause() {
    this.audionode.onaudioprocess = LGAudioScript._bypass_function;
  }

  onUnpause() {
    this.audionode.onaudioprocess = this._callback;
  }

  onExecute() {
    // nothing! because we need an onExecute to receive onStart... fix that
  }

  onRemoved() {
    this.audionode.onaudioprocess = LGAudioScript._bypass_function;
  }

  processCode() {
    try {
      const func = new Function('properties', this.properties.code);
      this._script = new func(this.properties);
      this._old_code = this.properties.code;
      this._callback = this._script.onaudioprocess;
    } catch (err) {
      console.error('Error in onaudioprocess code', err);
      this._callback = LGAudioScript._bypass_function;
      this.audionode.onaudioprocess = this._callback;
    }
  }

  onPropertyChanged(name, value) {
    if (name == 'code') {
      this.properties.code = value;
      this.processCode();
      if (this.graph && this.graph.status == LiteGraph.LGraph.STATUS_RUNNING) {
        this.audionode.onaudioprocess = this._callback;
      }
    }
  }

  static default_function() {
    this.onaudioprocess = function (audioProcessingEvent) {
      // The input buffer is the song we loaded earlier
      const { inputBuffer } = audioProcessingEvent;

      // The output buffer contains the samples that will be modified and played
      const { outputBuffer } = audioProcessingEvent;

      // Loop through the output channels (in this case there is only one)
      for (
        let channel = 0;
        channel < outputBuffer.numberOfChannels;
        channel++
      ) {
        const inputData = inputBuffer.getChannelData(channel);
        const outputData = outputBuffer.getChannelData(channel);

        // Loop through the 4096 samples
        for (let sample = 0; sample < inputBuffer.length; sample++) {
          // make output equal to the same as the input
          outputData[sample] = inputData[sample];
        }
      }
    };
  }

  static title = 'Script';

  static desc = 'apply script to signal';

  static '@code' = { widget: 'code', type: 'code' };
}
LGAudio.createAudioNodeWrapper(LGAudioScript);
LiteGraph.registerNodeType('audio/script', LGAudioScript);

class LGAudioDestination {
  constructor() {
    this.audionode = LGAudio.getAudioContext().destination;
    this.addInput('in', 'audio');
  }

  static title = 'Destination';

  static desc = 'Audio output';
}
LiteGraph.registerNodeType('audio/destination', LGAudioDestination);

global.LGAudio = LGAudio;
