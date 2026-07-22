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
    assert.typeOf(fn.createShape, 'function');
    assert.isUndefined(fn.beginRecord);
    assert.isUndefined(fn.endRecord);
    assert.typeOf(fn.getSVG, 'function');
    assert.typeOf(fn.shape, 'function');
    assert.typeOf(fn.saveSVG, 'function');
    assert.typeOf(fn._svgCaptureAdapters, 'function');
    assert.typeOf(fn._svgCaptureState, 'function');
  });

  test('should record shapes using createShape, begin and end', function() {
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

    const shapeObj = pInst.createShape();
    assert.isUndefined(shapeObj.recorder);

    // Call begin
    shapeObj.begin();
    assert.isDefined(shapeObj.recorder);
    assert.isTrue(shapeObj.recorder.active);

    // Simulate drawing
    const shape = { accept() {} };
    pInst._renderer.drawShape(shape);

    // Call end
    shapeObj.end();
    assert.isUndefined(shapeObj.recorder);
    assert.strictEqual(shapeObj.data.type, 'scope');
    assert.strictEqual(shapeObj.data.children.length, 1);
    assert.strictEqual(shapeObj.data.children[0].type, 'shape');
  });

  test('should warn on mismatched shape.end()', function() {
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
      const shapeObj = pInst.createShape();
      // 1. end without begin
      shapeObj.end();
      assert.strictEqual(warnings.length, 1);
      assert.include(warnings[0], 'end() called without a matching begin()');
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

  test('should replay recorded shapes via shape()', function() {
    const fn = {};
    const mockP5 = {
      PrimitiveVisitor: class {},
      registerAddon() {}
    };
    SVGExportAddon(mockP5, fn);

    let drawShapeCalled = false;
    let applyMatrixCalled = false;

    const pInst = {
      width: 600,
      height: 600,
      _renderer: {
        states: {
          fillColor: createMockColor(255, 0, 0, 255, '#ff0000'),
          strokeColor: createMockColor(0, 0, 0, 255, '#000000'),
          strokeWeight: 1
        },
        drawShape(shape) {
          drawShapeCalled = true;
          return shape;
        }
      },
      applyMatrix(a, b, c, d, e, f) {
        applyMatrixCalled = true;
      },
      push() {},
      pop() {},
      fill() {},
      stroke() {},
      noFill() {},
      noStroke() {},
      strokeWeight() {}
    };
    Object.setPrototypeOf(pInst, fn);

    const mockRecord = {
      type: 'scope',
      children: [
        {
          type: 'shape',
          shape: { accept() {} },
          state: {
            transform: { a: 1, b: 0, c: 0, d: 1, e: 10, f: 20 },
            fill: createMockColor(255, 0, 0, 255, '#ff0000'),
            stroke: createMockColor(0, 0, 0, 255, '#000000'),
            strokeWeight: 2
          }
        }
      ]
    };

    pInst.shape(mockRecord);

    assert.isTrue(drawShapeCalled, 'drawShape should be called on the renderer');
    assert.isTrue(applyMatrixCalled, 'applyMatrix should be called to set transform');
  });

  test('should record shapes via buildShape helper', function() {
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

    let callbackCalled = false;
    const shapeObj = pInst.buildShape(() => {
      callbackCalled = true;
      const shape = { accept() {} };
      pInst._renderer.drawShape(shape);
    });

    assert.isTrue(callbackCalled);
    assert.strictEqual(shapeObj.data.type, 'scope');
    assert.strictEqual(shapeObj.data.children.length, 1);
    assert.isUndefined(shapeObj.recorder);
  });

  test('buildShape should end recording even if callback throws', function() {
    const fn = {};
    const mockP5 = {
      PrimitiveVisitor: class {},
      registerAddon() {}
    };
    SVGExportAddon(mockP5, fn);

    const popSpy = vi.fn();
    const pInst = {
      width: 600,
      height: 600,
      _renderer: {
        states: {
          fillColor: createMockColor(255, 0, 0, 255, '#ff0000'),
          strokeColor: createMockColor(0, 0, 0, 255, '#000000'),
          strokeWeight: 1
        },
        push() {},
        pop() {}
      },
      color(...args) { return createMockColor(255, 0, 0, 255, '#ff0000'); },
      push() {},
      pop: popSpy
    };
    Object.setPrototypeOf(pInst, fn);

    let errorThrown = false;
    try {
      pInst.buildShape(() => {
        throw new Error('Test Callback Error');
      });
    } catch (e) {
      if (e.message === 'Test Callback Error') {
        errorThrown = true;
      }
    }

    assert.isTrue(errorThrown);
    // Recording should be properly stopped/ended even if it threw, which calls pop()
    assert.strictEqual(popSpy.mock.calls.length, 1, 'pop should have been called to restore state');
  });

  test('should replay recorded images via shape()', function() {
    const fn = {};
    const mockP5 = {
      PrimitiveVisitor: class {},
      registerAddon() {}
    };
    SVGExportAddon(mockP5, fn);

    let imageCalled = false;
    let imageArgs = null;

    const pInst = {
      width: 600,
      height: 600,
      image(img, dx, dy, dw, dh, sx, sy, sw, sh) {
        imageCalled = true;
        imageArgs = [img, dx, dy, dw, dh, sx, sy, sw, sh];
      },
      push() {},
      pop() {},
      fill() {},
      stroke() {},
      noFill() {},
      noStroke() {},
      strokeWeight() {}
    };
    Object.setPrototypeOf(pInst, fn);

    const mockRecord = {
      type: 'scope',
      children: [
        {
          type: 'image',
          img: 'mock-img-src',
          args: [0, 0, 100, 100, 10, 20, 200, 150],
          state: {}
        }
      ]
    };

    pInst.shape(mockRecord);

    assert.isTrue(imageCalled, 'image should be called on the p5 instance');
    assert.deepEqual(imageArgs, [
      'mock-img-src',
      10, 20, 200, 150, // dx, dy, dw, dh
      0, 0, 100, 100    // sx, sy, sw, sh
    ]);
  });
});

