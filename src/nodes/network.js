import { SillyClient } from '@libs/sillyclient';
import { LiteGraph } from '@/litegraph';

// event related nodes

class LGWebSocket {
  constructor() {
    this.size = [60, 20];
    this.addInput('send', LiteGraph.ACTION);
    this.addOutput('received', LiteGraph.EVENT);
    this.addInput('in', 0);
    this.addOutput('out', 0);
    this.properties = {
      url: '',
      room: 'lgraph', // allows to filter messages,
      only_send_changes: true,
    };
    this._ws = null;
    this._last_sent_data = [];
    this._last_received_data = [];
  }

  onPropertyChanged(name, value) {
    if (name == 'url') {
      this.connectSocket();
    }
  }

  onExecute() {
    if (!this._ws && this.properties.url) {
      this.connectSocket();
    }

    if (!this._ws || this._ws.readyState != WebSocket.OPEN) {
      return;
    }

    const { room } = this.properties;
    const only_changes = this.properties.only_send_changes;

    for (var i = 1; i < this.inputs.length; ++i) {
      const data = this.getInputData(i);
      if (data == null) {
        continue;
      }
      var json;
      try {
        json = JSON.stringify({
          type: 0,
          room,
          channel: i,
          data,
        });
      } catch (err) {
        continue;
      }
      if (only_changes && this._last_sent_data[i] == json) {
        continue;
      }

      this._last_sent_data[i] = json;
      this._ws.send(json);
    }

    for (var i = 1; i < this.outputs.length; ++i) {
      this.setOutputData(i, this._last_received_data[i]);
    }

    if (this.boxcolor == '#AFA') {
      this.boxcolor = '#6C6';
    }
  }

  connectSocket() {
    const that = this;
    let { url } = this.properties;
    if (url.substr(0, 2) != 'ws') {
      url = `ws://${url}`;
    }
    this._ws = new WebSocket(url);
    this._ws.onopen = function () {
      console.log('ready');
      that.boxcolor = '#6C6';
    };
    this._ws.onmessage = function (e) {
      that.boxcolor = '#AFA';
      const data = JSON.parse(e.data);
      if (data.room && data.room != that.properties.room) {
        return;
      }
      if (data.type == 1) {
        if (
          data.data.object_class
                      && LiteGraph[data.data.object_class]
        ) {
          let obj = null;
          try {
            obj = new LiteGraph[data.data.object_class](data.data);
            that.triggerSlot(0, obj);
          } catch (err) {

          }
        } else {
          that.triggerSlot(0, data.data);
        }
      } else {
        that._last_received_data[data.channel || 0] = data.data;
      }
    };
    this._ws.onerror = function (e) {
      console.log('couldnt connect to websocket');
      that.boxcolor = '#E88';
    };
    this._ws.onclose = function (e) {
      console.log('connection closed');
      that.boxcolor = '#000';
    };
  }

  send(data) {
    if (!this._ws || this._ws.readyState != WebSocket.OPEN) {
      return;
    }
    this._ws.send(JSON.stringify({ type: 1, msg: data }));
  }

  onAction(action, param) {
    if (!this._ws || this._ws.readyState != WebSocket.OPEN) {
      return;
    }
    this._ws.send({
      type: 1,
      room: this.properties.room,
      action,
      data: param,
    });
  }

  onGetInputs() {
    return [['in', 0]];
  }

  onGetOutputs() {
    return [['out', 0]];
  }

  static title = 'WebSocket';

  static desc = 'Send data through a websocket';
}
// @TODO: verify this doesn't even attempt to phone home anywhere and isn't instantiated before a node is created before re-enabling
// LiteGraph.registerNodeType('network/websocket', LGWebSocket);

// It is like a websocket but using the SillyServer.js server that bounces packets back to all clients connected:
// For more information: https://github.com/jagenjo/SillyServer.js
class LGSillyClient {
  constructor() {
    // this.size = [60,20];
    this.room_widget = this.addWidget(
      'text',
      'Room',
      'lgraph',
      this.setRoom.bind(this),
    );
    this.addWidget(
      'button',
      'Reconnect',
      null,
      this.connectSocket.bind(this),
    );

    this.addInput('send', LiteGraph.ACTION);
    this.addOutput('received', LiteGraph.EVENT);
    this.addInput('in', 0);
    this.addOutput('out', 0);
    this.properties = {
      url: 'localhost:55000',
      room: 'lgraph',
      only_send_changes: true,
    };

    this._server = null;
    this._last_sent_data = [];
    this._last_received_data = [];

    if (typeof (SillyClient) === 'undefined') { console.warn('remember to add SillyClient.js to your project: https://tamats.com/projects/sillyserver/src/sillyclient.js'); }
  }

  onPropertyChanged(name, value) {
    if (name == 'room') {
      this.room_widget.value = value;
    }
    this.connectSocket();
  }

  setRoom(room_name) {
    this.properties.room = room_name;
    this.room_widget.value = room_name;
    this.connectSocket();
  }

  // force label names
  onDrawForeground() {
    for (var i = 1; i < this.inputs.length; ++i) {
      var slot = this.inputs[i];
      slot.label = `in_${i}`;
    }
    for (var i = 1; i < this.outputs.length; ++i) {
      var slot = this.outputs[i];
      slot.label = `out_${i}`;
    }
  }

  onExecute() {
    if (!this._server || !this._server.is_connected) {
      return;
    }

    const { only_send_changes } = this.properties;

    for (var i = 1; i < this.inputs.length; ++i) {
      const data = this.getInputData(i);
      const prev_data = this._last_sent_data[i];
      if (data != null) {
        if (only_send_changes) {
          let is_equal = true;
          if (data && data.length && prev_data && prev_data.length == data.length && data.constructor !== String) {
            for (var j = 0; j < data.length; ++j) {
              if (prev_data[j] != data[j]) {
                is_equal = false;
                break;
              }
            }
          } else if (this._last_sent_data[i] != data) { is_equal = false; }
          if (is_equal) { continue; }
        }
        this._server.sendMessage({ type: 0, channel: i, data });
        if (data.length && data.constructor !== String) {
          if (this._last_sent_data[i]) {
            this._last_sent_data[i].length = data.length;
            for (var j = 0; j < data.length; ++j) { this._last_sent_data[i][j] = data[j]; }
          } else // create
            if (data.constructor === Array) { this._last_sent_data[i] = data.concat(); } else { this._last_sent_data[i] = new data.constructor(data); }
        } else { this._last_sent_data[i] = data; } // should be cloned
      }
    }

    for (var i = 1; i < this.outputs.length; ++i) {
      this.setOutputData(i, this._last_received_data[i]);
    }

    if (this.boxcolor == '#AFA') {
      this.boxcolor = '#6C6';
    }
  }

  connectSocket() {
    const that = this;
    if (typeof SillyClient === 'undefined') {
      if (!this._error) {
        console.error(
          'SillyClient node cannot be used, you must include SillyServer.js',
        );
      }
      this._error = true;
      return;
    }

    this._server = new SillyClient();
    this._server.on_ready = function () {
      console.log('ready');
      that.boxcolor = '#6C6';
    };
    this._server.on_message = function (id, msg) {
      let data = null;
      try {
        data = JSON.parse(msg);
      } catch (err) {
        return;
      }

      if (data.type == 1) {
        // EVENT slot
        if (
          data.data.object_class
                      && LiteGraph[data.data.object_class]
        ) {
          let obj = null;
          try {
            obj = new LiteGraph[data.data.object_class](data.data);
            that.triggerSlot(0, obj);
          } catch (err) {
            return;
          }
        } else {
          that.triggerSlot(0, data.data);
        }
      } // for FLOW slots
      else {
        that._last_received_data[data.channel || 0] = data.data;
      }
      that.boxcolor = '#AFA';
    };
    this._server.on_error = function (e) {
      console.log('couldnt connect to websocket');
      that.boxcolor = '#E88';
    };
    this._server.on_close = function (e) {
      console.log('connection closed');
      that.boxcolor = '#000';
    };

    if (this.properties.url && this.properties.room) {
      try {
        this._server.connect(this.properties.url, this.properties.room);
      } catch (err) {
        console.error(`SillyServer error: ${err}`);
        this._server = null;
        return;
      }
      this._final_url = `${this.properties.url}/${this.properties.room}`;
    }
  }

  send(data) {
    if (!this._server || !this._server.is_connected) {
      return;
    }
    this._server.sendMessage({ type: 1, data });
  }

  onAction(action, param) {
    if (!this._server || !this._server.is_connected) {
      return;
    }
    this._server.sendMessage({ type: 1, action, data: param });
  }

  onGetInputs() {
    return [['in', 0]];
  }

  onGetOutputs() {
    return [['out', 0]];
  }

  static title = 'SillyClient';

  static desc = 'Connects to SillyServer to broadcast messages';
}
// @TODO: verify this doesn't even attempt to phone home anywhere and isn't instantiated before a node is created before re-enabling
// LiteGraph.registerNodeType('network/sillyclient', LGSillyClient);

class HTTPRequestNode {
  constructor() {
    const that = this;
    this.addInput('request', LiteGraph.ACTION);
    this.addInput('url', 'string');
    this.addProperty('url', '');
    this.addOutput('ready', LiteGraph.EVENT);
    this.addOutput('data', 'string');
    this.addWidget('button', 'Fetch', null, this.fetch.bind(this));
    this._data = null;
    this._fetching = null;
  }

  fetch() {
    const url = this.getInputData(1) || this.properties.url;
    if (!url) { return; }

    this.boxcolor = '#FF0';
    const that = this;
    this._fetching = fetch(url)
      .then((resp) => {
        if (!resp.ok) {
          this.boxcolor = '#F00';
          that.trigger('error');
        } else {
          this.boxcolor = '#0F0';
          return resp.text();
        }
      })
      .then((data) => {
        that._data = data;
        that._fetching = null;
        that.trigger('ready');
      });
  }

  onAction(evt) {
    if (evt == 'request') { this.fetch(); }
  }

  onExecute() {
    this.setOutputData(1, this._data);
  }

  onGetOutputs() {
    return [['error', LiteGraph.EVENT]];
  }

  static title = 'HTTP Request';

  static desc = 'Fetch data through HTTP';
}
// @TODO: verify this doesn't even attempt to phone home anywhere and isn't instantiated before a node is created before re-enabling
// LiteGraph.registerNodeType('network/httprequest', HTTPRequestNode);
