import { vi } from 'vitest';
import { SVGExportAddon } from '../../../src/p5.svgExport.js';

suite('Addon Integration', function() {
  test('should register addon functions on fn (p5.prototype)', function() {
    const fn = {};
    const mockP5 = {
      PrimitiveVisitor: class {},
      registerAddon: vi.fn()
    };
    
    SVGExportAddon(mockP5, fn);
    
    assert.typeOf(fn.buildShape, 'function');
    assert.typeOf(fn.getSVG, 'function');
    assert.typeOf(fn.saveSVG, 'function');
    assert.typeOf(fn.saveAsSVG, 'function');
    assert.typeOf(fn._svgCaptureAdapters, 'function');
    assert.typeOf(fn._svgCaptureState, 'function');
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
      color() { return { toString() { return 'red'; } }; }
    };
    Object.setPrototypeOf(pInst, fn);

    // Mock record
    const mockRecord = {
      toSVGElement(visitor) {
        visitor.addBackground({ color: 'red' });
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
