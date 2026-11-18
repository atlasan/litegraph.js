import { jest } from '@jest/globals';
import { JSDOM } from 'jsdom';
import { LiteGraph } from '../src/litegraph.js';
import { CanvasPointer } from '../src/canvaspointer.js';
import { LGraphCanvas } from '../src/lgraphcanvas.js';

beforeAll(async () => { LiteGraph.initialize(); await LiteGraph.LibraryManager.ready; });

const at = (x, y, extra = {}) => ({ clientX: x, clientY: y, button: 0, ...extra });

describe('CanvasPointer', () => {
    test('a short press without movement is a click', () => {
        const p = new CanvasPointer();
        p.down(at(10, 10), 0);
        p.move(at(12, 11));
        expect(p.up(at(12, 11), 100)).toEqual({ isClick: true, dragged: false, duration: 100 });
    });

    test('movement beyond the drift tolerance is a drag even when fast', () => {
        const p = new CanvasPointer();
        p.down(at(10, 10), 0);
        p.move(at(40, 10));
        p.move(at(11, 10)); // returning does not undo the drag
        expect(p.up(at(11, 10), 50)).toEqual({ isClick: false, dragged: true, duration: 50 });
    });

    test('a long press is not a click', () => {
        const p = new CanvasPointer();
        p.down(at(0, 0), 0);
        expect(p.up(at(0, 0), CanvasPointer.click_time + 1).isClick).toBe(false);
    });

    test('double click needs two nearby clicks within the time window', () => {
        const p = new CanvasPointer();
        p.down(at(100, 100), 0); p.up(at(100, 100), 50);
        expect(p.down(at(103, 102), 200).isDoubleClick).toBe(true);
        p.up(at(103, 102), 230);
        // a third click starts a new sequence
        expect(p.down(at(103, 102), 300).isDoubleClick).toBe(false);
    });

    test('no double click when far apart, too slow, after a drag, or with another button', () => {
        const far = new CanvasPointer();
        far.down(at(0, 0), 0); far.up(at(0, 0), 10);
        expect(far.down(at(50, 0), 100).isDoubleClick).toBe(false);

        const slow = new CanvasPointer();
        slow.down(at(0, 0), 0); slow.up(at(0, 0), 10);
        expect(slow.down(at(0, 0), 10 + CanvasPointer.double_click_time + 1).isDoubleClick).toBe(false);

        const drag = new CanvasPointer();
        drag.down(at(0, 0), 0); drag.move(at(30, 0)); drag.up(at(30, 0), 10);
        expect(drag.down(at(30, 0), 50).isDoubleClick).toBe(false);

        const button = new CanvasPointer();
        button.down(at(0, 0), 0); button.up(at(0, 0), 10);
        expect(button.down(at(0, 0, { button: 2 }), 50).isDoubleClick).toBe(false);
    });

    test('cancel abandons the gesture and the pending double click', () => {
        const p = new CanvasPointer();
        p.down(at(0, 0), 0); p.up(at(0, 0), 10);
        p.down(at(0, 0), 20);
        p.cancel();
        expect(p.isDown).toBe(false);
        expect(p.up(at(0, 0), 30).isClick).toBe(false);
        expect(p.down(at(0, 0), 40).isDoubleClick).toBe(false);
    });
});

describe('LGraphCanvas pointer cancel', () => {
    let dom;
    beforeEach(() => {
        dom = new JSDOM('<main></main>');
        globalThis.window = dom.window;
        globalThis.document = dom.window.document;
        jest.spyOn(console, 'info').mockImplementation(() => {});
        jest.spyOn(console, 'debug').mockImplementation(() => {});
    });
    afterEach(() => {
        dom.window.close();
        delete globalThis.window;
        delete globalThis.document;
        jest.restoreAllMocks();
    });

    function canvasHost() {
        const host = Object.create(LGraphCanvas.prototype);
        host.canvas = document.createElement('canvas');
        host.pointer = new CanvasPointer();
        host._mousemove_callback = jest.fn();
        host._mouseup_callback = jest.fn();
        host._pointercancel_callback = host.processPointerCancel.bind(host);
        host.graph = { afterChange: jest.fn() };
        return host;
    }

    test('cancel releases document listeners, restores canvas move and clears drag state', () => {
        const host = canvasHost();
        document.addEventListener('pointermove', host._mousemove_callback, true);
        document.addEventListener('pointerup', host._mouseup_callback, true);
        document.addEventListener('pointercancel', host._pointercancel_callback, true);
        host._pointer_document = document;
        const dragged = { id: 1 };
        Object.assign(host, {
            pointer_is_down: true, node_dragged: dragged, dragging_canvas: true,
            dragging_rectangle: new Float32Array(4), connecting_node: {}, connecting_slot: 0,
        });
        host.pointer.down(at(0, 0), 0);

        document.dispatchEvent(new dom.window.Event('pointercancel'));

        expect(host.pointer.isDown).toBe(false);
        expect(host.pointer_is_down).toBe(false);
        expect(host.node_dragged).toBeNull();
        expect(host.graph.afterChange).toHaveBeenCalledWith(dragged);
        expect(host.dragging_canvas).toBe(false);
        expect(host.dragging_rectangle).toBeNull();
        expect(host.connecting_node).toBeNull();
        expect(host._pointer_document).toBeNull();

        document.dispatchEvent(new dom.window.Event('pointermove'));
        document.dispatchEvent(new dom.window.Event('pointerup'));
        expect(host._mousemove_callback).not.toHaveBeenCalled();
        expect(host._mouseup_callback).not.toHaveBeenCalled();
        host.canvas.dispatchEvent(new dom.window.Event('pointermove'));
        expect(host._mousemove_callback).toHaveBeenCalledTimes(1);
    });

    test('a secondary pointer cancel leaves the primary gesture alone', () => {
        const host = canvasHost();
        host.pointer_is_down = true;
        host.pointer.down(at(0, 0), 0);
        host.processPointerCancel({ isPrimary: false });
        expect(host.pointer.isDown).toBe(true);
        expect(host.pointer_is_down).toBe(true);
    });
});
