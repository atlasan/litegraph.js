# Built-in node runtime and dependency map

> **Updated** 2026-11-01 · **Kind** reference · **Status** living

This is a family-level maintenance map, not a claim that every node has been executed. Registration, construction, readiness, execution, and resource cleanup are separate checks.

## Entry points

[`build.py`](../../../build.py) defines the bundle lists. Core contains graph classes and subgraph support; main adds the standard catalog. The Node entry adds `nodejs_network.js`, `process.js`, and `nodejs_sys.js`. Importing the Node entry does not make the browser-dependent members of the standard catalog usable in Node.

In this Node 22 environment, main registers 248 types and the Node entry 266. The browser tester registers 256 standard types because it loads gl-matrix before the bundle. Eight Math3D registrations are conditional on `glMatrix`; some other Math3D constructors also require matrix/vector globals. Counts depend on initialization context and are not coverage totals or a stable API contract.

`src/nodes/threejs.js` and `src/nodes/jquery.js` declare library requirements but are not in the standard build lists. Source-file existence does not establish packaged availability.

## Standard catalog

| Families / source | Runtime and dependencies | Evidence / limits |
| --- | --- | --- |
| `graph/*`, data nodes in `basic/*`, `events/*` ([base](../../../src/nodes/base.js), [events](../../../src/nodes/events.js), [subgraph](../../../src/subgraph.js)) | Core data/event operations can run in browser or Node. Individual basic nodes use DOM, downloads, alerts, files, fetch, or user scripts. | Connected execution and nested data/event fixtures pass. The entire basic category is not side-effect-free. |
| `math/*`, `string/*`, `logic/*`, `color/*` ([math](../../../src/nodes/math.js), [strings](../../../src/nodes/strings.js), [logic](../../../src/nodes/logic.js)) | Ordinary arithmetic/string/boolean operations need no external libraries. Formula and loop nodes execute user-controlled logic. | Focused core and tester fixtures pass; generic scenarios do not prove every contract. In-page testing cannot terminate a synchronous loop. |
| `math3d/*`, `geometry/*` ([math3d](../../../src/nodes/math3d.js), [geometry](../../../src/nodes/geometry.js)) | Some split/join operations are plain JavaScript; matrix/quaternion paths require gl-matrix globals; some geometry paths use LiteGL. | Tester loads `editor/js/libs/gl-matrix-min.js`. Runner warns when absent. Pure-node runner checks do not validate 3D/GPU behavior. |
| `widget/*`, `graphics/*`, `input/gamepad` ([interface](../../../src/nodes/interface.js), [graphics](../../../src/nodes/graphics.js), [input](../../../src/nodes/input.js)) | Canvas/DOM/image/video/gamepad APIs; webcam paths need media-device permission and devices. | Slider/toggle/text and canvas interactions have browser evidence. Hardware/media paths remain unverified. |
| `texture/*`, `shader::*`, `fx/*` ([textures](../../../src/nodes/gltextures.js), [shaders](../../../src/nodes/glshaders.js), [effects](../../../src/nodes/glfx.js)) | WebGL context, LiteGL, related globals/assets; some paths use camera/video. | Registration/parsing is not rendering or GPU compatibility evidence. |
| `audio/*` ([audio](../../../src/nodes/audio.js)) | Web Audio/AudioContext, assets, and sometimes media-input permissions. Constructors can acquire audio resources. | Device/audio lifecycle and output remain unverified. |
| `midi/*` ([midi](../../../src/nodes/midi.js)) | I/O requires Web MIDI/devices; file/player paths have parser/synth dependencies. Pure event transforms have narrower requirements. | Registration is not a device or playback test. |
| `network/*` ([network](../../../src/nodes/network.js), [Socket.IO](../../../src/nodes/libraries/socketio.js)) | WebSocket, XMLHttpRequest/fetch, WebRTC, Socket.IO and endpoints; host API availability differs. | Named server-side loopback paths below are covered; external services and browser WebRTC remain unverified. |
| `html/*` ([html](../../../src/nodes/html.js)) | DOM; overlay nodes also need an attached graph canvas. | HTML/JSON overlay disposal, reinsertion, visibility and scaling have fixtures/browser evidence. Other DOM actions need node-specific checks. |
| `objects/*`, `libraries/*`, `watch/*`, `litegraph/*` ([objects](../../../src/nodes/objects.js), [libraries](../../../src/nodes/libraries.js), [watch](../../../src/nodes/watch.js), [introspection](../../../src/nodes/litegraph_nodes.js)) | Supplied objects, namespaces, host graph/editor state and dynamic libraries; some paths invoke arbitrary callbacks or manipulate DOM. | Library readiness has tests. Arbitrary supplied objects/modules are not covered. |

## Node-only additions

Source: [network nodes](../../../src/nodes/nodejs_only/nodejs_network.js), [process info](../../../src/nodes/nodejs_only/process.js), [system nodes](../../../src/nodes/nodejs_only/nodejs_sys.js).

| Types | Required modules / platform | Evidence and outstanding work |
| --- | --- | --- |
| `server/process/NodeProcessInfo` | Node `os` | Now awaits `os` before reading it, exposes an object output and refreshes it during execution. Real Node fixture validates output shape. |
| `sys/info` | `os`, native `diskusage`, `node-os-utils` | Native bindings are not built by `npm ci --ignore-scripts`; full system-info operation remains unverified. |
| `sys/processList` | `ps-list` | Declaration inspected; platform-specific enumeration remains unverified. |
| `sys/runCommand`, `sys/processControl` | `child_process` | Invoke commands/processes; no live command-control actions were used for this tranche. |
| `sys/fileRead`, `sys/fileWrite`, `sys/fileDelete`, `sys/fileExists`, `sys/fileList` | `fs` | File-read uses a disposable fixture. That does not establish coverage of all mutations. |
| `sys/log` | `fs`, `chalk` | File/log behavior needs focused fixtures. |
| `sys/serviceManager`, `sys/serviceList` | Windows: `node-windows`; Linux: `node-linux-systemd` | Platform selection precedes dependency loading; binding follows readiness. Controlled adapters verify ordering/failure without controlling services. `node-linux-systemd` is registered but absent from package dependencies. Unsupported platforms reject readiness; macOS is not a supported systemd adapter target. Live adapter APIs/actions remain unverified. |
| `server/network/websocketserver` | `ws` | Loopback connections, stop/restart, cleanup and immediate port reuse after worker acknowledgment pass. |
| `nodejs/network/SocketIO_server` | `socket.io` | Distinct client/server constructor registration covered; broader behavior remains unverified. |
| `nodejs/network/osc_bridge`, `nodejs/network/OSC_server` | `osc-js`; bridge also declares `ws` | Constructor/BridgePlugin availability covered; OSC traffic remains unverified. |
| `nodejs/network/UDP_server` | `dgram` | Loopback reception, configured host binding and socket cleanup covered. |

## Readiness interpretation

Nodes declaring `runtime` reject incompatible environments through `ready` before loading dependencies; fixtures verify this for process-info and service nodes with browser globals. Undeclared legacy browser dependencies can still throw during construction, causing `createNode` to return null or throw under its configured error policy. Awaiting readiness cannot recover a constructor that never returned a node.

Reproduce the actual constructor/execution path before adding runtime support. Supply real APIs rather than stubs that only make readiness green. Next catalog work: per-node capability metadata, constructor-side resource review, and focused fixtures for the unverified rows above. Hardware/native/external-service checks remain distinct from deterministic core and loopback checks.
