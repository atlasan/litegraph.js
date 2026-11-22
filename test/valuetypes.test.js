import { LiteGraph } from '../src/litegraph.js';
import { ValueTypeRegistry } from '../src/valuetypes.js';

beforeAll(() => { LiteGraph.setupPlatform(); });

describe('ValueTypeRegistry', () => {
    test('names and aliases are matched without regard to case', () => {
        const types = new ValueTypeRegistry();
        expect(types.get('INT').name).toBe('int');
        expect(types.get('Integer').name).toBe('int');
        expect(types.get('colour').name).toBe('color');
        expect(types.get('COMBO').name).toBe('enum');
        expect(types.has('nope')).toBe(false);
        expect(types.get('nope')).toBeNull();
    });

    test('a base is merged: own fields win, options are combined', () => {
        const types = new ValueTypeRegistry();
        const int = types.get('int');
        expect(int.widget).toBe('number');
        expect(int.editor).toBe('number');
        expect(int.options).toEqual({ precision: 0, step: 1, round: 1 });
        expect(int.bases).toEqual(['number']);
        types.register('percent', { base: 'int', options: { min: 0, max: 100, unit: '%' }, widget: 'slider' });
        const percent = types.get('percent');
        expect(percent.widget).toBe('slider');
        expect(percent.editor).toBe('number');
        expect(percent.options).toMatchObject({ step: 1, precision: 0, min: 0, max: 100, unit: '%' });
        expect(types.coerce('percent', '250')).toBe(100);
        expect(types.format('percent', 42)).toBe('42 %');
    });

    test('replacing needs replace: true, and the disposer restores the previous definition', () => {
        const types = new ValueTypeRegistry();
        expect(() => types.register('number', { editor: 'slider' })).toThrow(/already registered/);
        const dispose = types.register('number', { ...types.get('number'), editor: 'slider' }, { replace: true });
        expect(types.get('number').editor).toBe('slider');
        expect(types.get('int').editor).toBe('slider'); // inherited
        expect(types.get('FLOAT').editor).toBe('slider'); // aliases still point to it
        dispose();
        expect(types.get('number').editor).toBe('number');
        expect(types.get('int').editor).toBe('number');
    });

    test('a disposed new type is gone, aliases included', () => {
        const types = new ValueTypeRegistry();
        const dispose = types.register('angle', { base: 'number', aliases: ['DEG'] });
        expect(types.get('deg').name).toBe('angle');
        dispose();
        expect(types.has('angle')).toBe(false);
        expect(types.has('deg')).toBe(false);
    });

    test('built-in coercion, validation and formatting', () => {
        const types = new ValueTypeRegistry();
        expect(types.coerce('number', '2*8+1')).toBe(17);
        expect(types.coerce('number', '12', { min: 0, max: 10 })).toBe(10);
        expect(types.validate('number', NaN)).toMatch(/number/i);
        expect(types.coerce('int', '2.6')).toBe(3);
        expect(types.coerce('boolean', 'false')).toBe(false);
        expect(types.coerce('boolean', 'yes')).toBe(true);
        expect(types.coerce('vec3', '1, 2 3')).toEqual([1, 2, 3]);
        expect(types.coerce('vec2', [5])).toEqual([5, 0]);
        expect(types.validate('vec3', [1, 2])).toMatch(/3 numbers/);
        expect(types.format('vec3', [1, 2.123456, 3])).toBe('1, 2.123, 3');
        expect(types.coerce('color', 'F80')).toBe('#ff8800');
        expect(types.coerce('color', [1, 0, 0])).toBe('#ff0000');
        expect(types.coerce('color', 'rebeccapurple')).toBe('rebeccapurple');
        expect(types.coerce('array', '[1,2]')).toEqual([1, 2]);
        expect(() => types.coerce('array', '[1,')).toThrow();
        expect(types.validate('array', { a: 1 })).toMatch(/list/);
        expect(types.validate('enum', 'b', { values: ['a', 'b'] })).toBeNull();
        expect(types.validate('enum', 'z', { values: ['a', 'b'] })).toMatch(/choices/);
        expect(types.validate('enum', 2, { values: { low: 1, high: 2 } })).toBeNull();
        expect(types.format('boolean', true, { on: 'yes' })).toBe('yes');
        expect(types.defaultValue('vec3')).toEqual([0, 0, 0]);
        expect(types.defaultValue('vec3')).not.toBe(types.defaultValue('vec3'));
        expect(types.format('unknown-type', { a: 1 })).toBe('{"a":1}');
        expect(types.coerce('unknown-type', 'x')).toBe('x');
    });

    test('resolveEditor: a registered editor name wins, then the value type editor, then readonly', () => {
        const types = new ValueTypeRegistry();
        const editors = { number: {}, slider: {}, string: {}, json: {}, readonly: {}, boolean: {} };
        expect(types.resolveEditor({ type: 'number', widget: 'slider', min: 0, max: 5 }, 1, editors)).toMatchObject({ editor: 'slider', options: { min: 0, max: 5 } });
        expect(types.resolveEditor({ type: 'INT' }, 1, editors)).toMatchObject({ editor: 'number', type: 'int', options: { step: 1, precision: 0 } });
        expect(types.resolveEditor({}, [1, 2], editors)).toMatchObject({ editor: 'json', type: 'array' });
        expect(types.resolveEditor({}, true, editors)).toMatchObject({ editor: 'boolean' });
        expect(types.resolveEditor({ type: 'mystery' }, Symbol.iterator, editors)).toMatchObject({ editor: 'readonly', type: 'mystery' });
        // the info's own options win over the type's
        expect(types.resolveEditor({ type: 'int', step: 5 }, 1, editors).options.step).toBe(5);
    });

    test('resolveWidgetClass: a registered widget type wins, then the value type widget', () => {
        const types = new ValueTypeRegistry();
        class A {} class B {}
        const widgetTypes = { number: A, int: B };
        expect(types.resolveWidgetClass('int', widgetTypes).cls).toBe(B);
        expect(types.resolveWidgetClass('float', widgetTypes)).toMatchObject({ cls: A, options: { precision: 3 } });
        expect(types.resolveWidgetClass('mystery', widgetTypes)).toBeNull();
    });

    test('LiteGraph.registerValueType and getValueType', () => {
        const dispose = LiteGraph.registerValueType('test-angle', { base: 'number', label: 'Angle' });
        expect(LiteGraph.getValueType('TEST-ANGLE').label).toBe('Angle');
        dispose();
        expect(LiteGraph.getValueType('test-angle')).toBeNull();
    });
});
