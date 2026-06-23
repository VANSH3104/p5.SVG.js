import { vi } from 'vitest';
import { SVGExportAddon } from '../../../src/p5.svgExport.js';

function createMockColor(r = 255, g = 0, b = 0, a = 255, hexString = '#ff0000') {
  return {
    _getRGBA(mode) {
      return [r, g, b, a];
    },
    toString(format) {
      if (format === '#rrggbb') {
        return hexString;
      }
      return `rgba(${r},${g},${b},${a / 255})`;
    }
  };
}

suite('Addon Integration', function() {
  test('should register addon functions on fn (p5.prototype)', function() {
    const fn = {};
    const mockP5 = {
      PrimitiveVisitor: class {},
      registerAddon: vi.fn()
    };
    
    SVGExportAddon(mockP5, fn);
    
    assert.typeOf(fn.buildShape, 'function');
    assert.typeOf(fn.beginRecord, 'function');
    assert.typeOf(fn.endRecord, 'function');
    assert.typeOf(fn.getSVG, 'function');
    assert.typeOf(fn.saveSVG, 'function');
    assert.typeOf(fn.saveAsSVG, 'function');
    assert.typeOf(fn._svgCaptureAdapters, 'function');
    assert.typeOf(fn._svgCaptureState, 'function');
  });

  test('should record shapes using beginRecord and endRecord', function() {
    const fn = {};
    const mockP5 = {
      PrimitiveVisitor: class {},
      registerAddon() {}
    };
    SVGExportAddon(mockP5, fn);

    const pInst = {
      width: 600,
      height: 600,
      _renderer: {
        states: {
          fillColor: createMockColor(255, 0, 0, 255, '#ff0000'),
          strokeColor: createMockColor(0, 0, 0, 255, '#000000'),
          strokeWeight: 1
        },
        drawShape(shape) { return shape; },
        push() {},
        pop() {}
      },
      color(...args) { return createMockColor(255, 0, 0, 255, '#ff0000'); },
      push() {},
      pop() {}
    };
    Object.setPrototypeOf(pInst, fn);

    // Call beginRecord
    pInst.beginRecord();
    assert.isNotNull(pInst._activeRecorder);

    // Simulate drawing
    const shape = { accept() {} };
    pInst._renderer.drawShape(shape);

    // Call endRecord
    const record = pInst.endRecord();
    assert.isNull(pInst._activeRecorder);
    assert.strictEqual(record.type, 'scope');
    assert.strictEqual(record.children.length, 1);
    assert.strictEqual(record.children[0].type, 'shape');
  });

  test('should warn on mismatched or nested beginRecord / endRecord', function() {
    const fn = {};
    const mockP5 = {
      PrimitiveVisitor: class {},
      registerAddon() {}
    };
    SVGExportAddon(mockP5, fn);

    const pInst = {
      width: 600,
      height: 600,
      _renderer: {
        states: {
          fillColor: createMockColor(255, 0, 0, 255, '#ff0000'),
          strokeColor: createMockColor(0, 0, 0, 255, '#000000'),
          strokeWeight: 1
        },
        drawShape(shape) { return shape; },
        push() {},
        pop() {}
      },
      color(...args) { return createMockColor(255, 0, 0, 255, '#ff0000'); },
      push() {},
      pop() {}
    };
    Object.setPrototypeOf(pInst, fn);

    // Mock console.warn
    const originalWarn = console.warn;
    const warnings = [];
    console.warn = (msg) => { warnings.push(msg); };

    try {
      // 1. endRecord without beginRecord
      const record1 = pInst.endRecord();
      assert.isNull(record1);
      assert.strictEqual(warnings.length, 1);
      assert.include(warnings[0], 'endRecord() called without a matching beginRecord()');

      // 2. nested beginRecord calls
      pInst.beginRecord();
      pInst.beginRecord();
      assert.strictEqual(warnings.length, 2);
      assert.include(warnings[1], 'beginRecord() called while already recording');

      pInst.endRecord();
    } finally {
      console.warn = originalWarn;
    }
  });

  test('saveSVG should trigger download in browser environment', function() {
    const fn = {};
    const mockP5 = {
      PrimitiveVisitor: class {},
      registerAddon() {}
    };
    SVGExportAddon(mockP5, fn);

    const pInst = {
      width: 600,
      height: 600,
      color() { return createMockColor(255, 0, 0, 255, '#ff0000'); }
    };
    Object.setPrototypeOf(pInst, fn);

    // Mock record
    const mockRecord = {
      toSVGElement(visitor) {
        visitor.addBackground({ color: createMockColor(255, 0, 0, 255, '#ff0000') });
      }
    };

    // Spy on DOM methods
    let elementCreated = false;
    let clicked = false;
    const originalCreateElement = document.createElement;
    document.createElement = function(tagName) {
      const el = originalCreateElement.call(document, tagName);
      if (tagName === 'a') {
        elementCreated = true;
        el.click = () => { clicked = true; };
      }
      return el;
    };

    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;
    let createdUrl = '';
    URL.createObjectURL = (blob) => {
      createdUrl = 'blob:test';
      return createdUrl;
    };
    URL.revokeObjectURL = () => {};

    try {
      pInst.saveSVG(mockRecord, 'test-drawing.svg');
      assert.isTrue(elementCreated);
      assert.isTrue(clicked);
      assert.strictEqual(createdUrl, 'blob:test');
    } finally {
      document.createElement = originalCreateElement;
      URL.createObjectURL = originalCreateObjectURL;
      URL.revokeObjectURL = originalRevokeObjectURL;
    }
  });
});
