import { describe, test, expect } from 'vitest';

import { SVGExportAddon } from '../src/p5.svgExport.js';

// Setup mock p5.js environment for addon initialization
class MockPrimitiveVisitor {}

const p5 = {
  PrimitiveVisitor: MockPrimitiveVisitor,
  registerAddon() {}
};

const fn = {};
SVGExportAddon(p5, fn);

// Mock shape class that behaves like p5 shapes
class MockShape {
  constructor(name) {
    this.name = name;
  }
  accept(visitor) {
    visitor.currentParent.appendChild(
      visitor._createElement('ellipse', { name: this.name })
    );
  }
}

function createPInst() {
  const pInst = {
    width: 600,
    height: 600,
    _renderer: {
      states: { fillColor: 'red', strokeColor: 'black', strokeWeight: 1 },
      drawShape(shape) { return shape; },
      push() {}, pop() {}, translate() {}, rotate() {}, scale() {}
    },
    push() {},
    pop() {},
    translate() {},
    rotate() {},
    scale() {}
  };
  Object.setPrototypeOf(pInst, fn);
  return pInst;
}

describe('p5.SVG.js Export addon', () => {

  test('GroupNode should be initialized without matrix', () => {
    const pInst = createPInst();
    
    const record = fn.buildShape.call(pInst, () => {});
    expect(record.type).toBe('group');
    expect(record.matrix).toBeUndefined();
    expect(record.children).toEqual([]);
  });

  test('ShapeRecorder should build expected nested hierarchy with push/translate/rotate', () => {
    const pInst = createPInst();

    fn.buildShape.call(pInst, () => {}); // Init active recorder interceptors

    const recorded = fn.buildShape.call(pInst, () => {
      pInst.push();
      pInst.translate(100, 100);
      pInst._renderer.drawShape(new MockShape('circle1'));
      pInst.rotate(0.5);
      pInst._renderer.drawShape(new MockShape('circle2'));
      pInst.pop();
    });

    expect(recorded.type).toBe('group');
    expect(recorded.children.length).toBe(1);

    const group1 = recorded.children[0];
    expect(group1.type).toBe('group');
    expect(group1.children.length).toBe(1);

    const transformTranslate = group1.children[0];
    expect(transformTranslate.type).toBe('transform');
    expect(transformTranslate.matrix).toBeInstanceOf(DOMMatrix);
    expect(transformTranslate.matrix.e).toBe(100);
    expect(transformTranslate.matrix.f).toBe(100);
    expect(transformTranslate.children.length).toBe(2);

    const shape1 = transformTranslate.children[0];
    expect(shape1.type).toBe('shape');
    expect(shape1.shape.name).toBe('circle1');

    const transformRotate = transformTranslate.children[1];
    expect(transformRotate.type).toBe('transform');
    expect(transformRotate.matrix.e).toBe(100);
    expect(transformRotate.matrix.f).toBe(100);
    expect(transformRotate.children.length).toBe(1);

    const shape2 = transformRotate.children[0];
    expect(shape2.type).toBe('shape');
    expect(shape2.shape.name).toBe('circle2');
  });

  test('SVGVisitor should visit nodes and generate correct relative SVG transforms without double-transforming', () => {
    const pInst = createPInst();

    fn.buildShape.call(pInst, () => {});

    const recorded = fn.buildShape.call(pInst, () => {
      pInst.push();
      pInst.translate(100, 100);
      pInst._renderer.drawShape(new MockShape('circle1'));
      pInst.rotate(0.5);
      pInst._renderer.drawShape(new MockShape('circle2'));
      pInst.pop();
    });

    let capturedSVGContent = '';
    const originalCreateElement = document.createElement;
    document.createElement = (tagName) => {
      const el = originalCreateElement.call(document, tagName);
      if (tagName === 'a') {
        Object.defineProperty(el, 'href', {
          set(val) {
            capturedSVGContent = val;
          }
        });
      }
      return el;
    };

    const originalCreateObjectURL = URL.createObjectURL;
    URL.createObjectURL = () => 'mock-url';
    const originalRevokeObjectURL = URL.revokeObjectURL;
    URL.revokeObjectURL = () => {};

    const originalBlob = globalThis.Blob;
    let serializedSVG = '';
    globalThis.Blob = class {
      constructor(parts, options) {
        serializedSVG = parts.join('');
      }
    };

    try {
      fn.saveSVG.call(pInst, recorded, 'test.svg');
    } finally {
      globalThis.Blob = originalBlob;
      document.createElement = originalCreateElement;
      URL.createObjectURL = originalCreateObjectURL;
      URL.revokeObjectURL = originalRevokeObjectURL;
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(serializedSVG, 'image/svg+xml');

    const rootSvg = doc.querySelector('svg');
    expect(rootSvg).not.toBeNull();

    const groups = doc.querySelectorAll('g');
    expect(groups.length).toBe(2);

    const translateGroup = groups[0];
    expect(translateGroup.getAttribute('transform')).toContain('100 100');

    const rotateGroup = groups[1];
    expect(rotateGroup.parentNode).toBe(translateGroup);

    const transformAttr = rotateGroup.getAttribute('transform');
    if (transformAttr) {
      const matrixMatch = transformAttr.match(/matrix\(([^)]+)\)/);
      if (matrixMatch) {
        const parts = matrixMatch[1].trim().split(/\s+/).map(Number);
        // Translation parts are indices 4 and 5 in DOMMatrix/matrix string format
        expect(parts[4]).toBeCloseTo(0);
        expect(parts[5]).toBeCloseTo(0);
      }
    }
  });
});
