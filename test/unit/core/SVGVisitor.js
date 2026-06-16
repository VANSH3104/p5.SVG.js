import { SVGExportAddon } from '../../../src/p5.svgExport.js';

// Setup mock p5.js environment for addon initialization
class MockPrimitiveVisitor {
  constructor() {}
}

const mockP5 = {
  PrimitiveVisitor: MockPrimitiveVisitor,
  registerAddon() {}
};

const fn = {};
SVGExportAddon(mockP5, fn);

function createPInst() {
  const pInst = {
    width: 600,
    height: 600,
    _renderer: {
      states: {
        fillColor: 'red',
        strokeColor: 'black',
        strokeWeight: 1
      },
      drawShape(shape) { return shape; },
      push() {},
      pop() {},
      translate() {},
      rotate() {},
      scale() {},
      background() {},
      clear() {}
    },
    color(...args) {
      return {
        levels: [255, 0, 0, 255],
        toString() {
          return `rgba(${args.join(',') || '255,0,0,255'})`;
        }
      };
    },
    push() {},
    pop() {},
    translate() {},
    rotate() {},
    scale() {},
    background(...args) {
      if (this._renderer && typeof this._renderer.background === 'function') {
        return this._renderer.background.apply(this._renderer, args);
      }
    },
    clear(...args) {
      if (this._renderer && typeof this._renderer.clear === 'function') {
        return this._renderer.clear.apply(this._renderer, args);
      }
    }
  };
  Object.setPrototypeOf(pInst, fn);
  return pInst;
}

function createVisitor(pInst) {
  let visitor;
  const mockRecord = {
    toSVGElement(v) {
      visitor = v;
    }
  };
  pInst.getSVG(mockRecord);
  return visitor;
}

suite('SVGVisitor', function() {
  test('colorToSVG should convert colors to SVG strings correctly', function() {
    const pInst = createPInst();
    const visitor = createVisitor(pInst);

    // Falsy input -> 'none'
    assert.strictEqual(visitor.colorToSVG(null), 'none');
    assert.strictEqual(visitor.colorToSVG(undefined), 'none');

    // String input -> unchanged
    assert.strictEqual(visitor.colorToSVG('blue'), 'blue');
    assert.strictEqual(visitor.colorToSVG('#ff0000'), '#ff0000');

    // Color object with levels/toString
    const colorObj = {
      toString() { return 'rgb(0,255,0)'; }
    };
    assert.strictEqual(visitor.colorToSVG(colorObj), 'rgb(0,255,0)');

    // Transparent rgba -> 'none'
    const transparentColorObj = {
      toString() { return 'rgba(0,0,0,0)'; }
    };
    assert.strictEqual(visitor.colorToSVG(transparentColorObj), 'none');
  });

  test('_createElement should create SVG elements with namespaces and attributes', function() {
    const pInst = createPInst();
    const visitor = createVisitor(pInst);

    const el = visitor._createElement('circle', {
      cx: 10,
      cy: 20,
      r: 30
    });

    assert.strictEqual(el.namespaceURI, 'http://www.w3.org/2000/svg');
    assert.strictEqual(el.tagName.toLowerCase(), 'circle');
    assert.strictEqual(el.getAttribute('cx'), '10');
    assert.strictEqual(el.getAttribute('cy'), '20');
    assert.strictEqual(el.getAttribute('r'), '30');
  });

  test('_applyStyle should apply fill, stroke and stroke-width based on currentState', function() {
    const pInst = createPInst();
    const visitor = createVisitor(pInst);

    const el = visitor._createElement('rect');
    visitor.currentState = {
      fill: 'red',
      stroke: 'blue',
      strokeWeight: 3
    };

    visitor._applyStyle(el);
    assert.strictEqual(el.getAttribute('fill'), 'red');
    assert.strictEqual(el.getAttribute('stroke'), 'blue');
    assert.strictEqual(el.getAttribute('stroke-width'), '3');
  });

  test('_appendShapeElement should wrap with matrix group if transform is not identity', function() {
    const pInst = createPInst();
    const visitor = createVisitor(pInst);

    const circleEl = visitor._createElement('circle', { r: 10 });
    
    // Test with identity transform (no group wrapper)
    visitor.currentState = {
      transform: new DOMMatrix()
    };
    visitor._appendShapeElement(circleEl);
    assert.strictEqual(visitor.svgElement.lastChild, circleEl);

    // Test with translate transform (should create a group <g> wrapper)
    const gCircleEl = visitor._createElement('circle', { r: 20 });
    visitor.currentState = {
      transform: new DOMMatrix().translate(100, 200)
    };
    visitor._appendShapeElement(gCircleEl);

    const lastChild = visitor.svgElement.lastChild;
    assert.strictEqual(lastChild.tagName.toLowerCase(), 'g');
    assert.strictEqual(lastChild.getAttribute('transform'), 'matrix(1 0 0 1 100 200)');
    assert.strictEqual(lastChild.firstChild, gCircleEl);
  });

  test('visitEllipsePrimitive should generate circle or ellipse tags', function() {
    const pInst = createPInst();
    const visitor = createVisitor(pInst);

    visitor.currentState = {
      fill: 'yellow',
      stroke: 'none',
      strokeWeight: 0,
      transform: new DOMMatrix()
    };

    // Width = Height -> Circle
    visitor.visitEllipsePrimitive({
      x: 10,
      y: 20,
      w: 40,
      h: 40
    });

    const circleEl = visitor.svgElement.lastChild;
    assert.strictEqual(circleEl.tagName.toLowerCase(), 'circle');
    assert.strictEqual(circleEl.getAttribute('cx'), '30'); // 10 + 40/2
    assert.strictEqual(circleEl.getAttribute('cy'), '40'); // 20 + 40/2
    assert.strictEqual(circleEl.getAttribute('r'), '20');  // 40/2
    assert.strictEqual(circleEl.getAttribute('fill'), 'yellow');

    // Width != Height -> Ellipse
    visitor.visitEllipsePrimitive({
      x: 10,
      y: 20,
      w: 40,
      h: 80
    });

    const ellipseEl = visitor.svgElement.lastChild;
    assert.strictEqual(ellipseEl.tagName.toLowerCase(), 'ellipse');
    assert.strictEqual(ellipseEl.getAttribute('cx'), '30'); // 10 + 40/2
    assert.strictEqual(ellipseEl.getAttribute('cy'), '60'); // 20 + 80/2
    assert.strictEqual(ellipseEl.getAttribute('rx'), '20'); // 40/2
    assert.strictEqual(ellipseEl.getAttribute('ry'), '40'); // 80/2
  });

  test('addBackground and clear should draw bg rect and clear svg element children', function() {
    const pInst = createPInst();
    const visitor = createVisitor(pInst);

    visitor.addBackground({
      color: 'green'
    });

    assert.strictEqual(visitor.svgElement.children.length, 1);
    const bgRect = visitor.svgElement.firstChild;
    assert.strictEqual(bgRect.tagName.toLowerCase(), 'rect');
    assert.strictEqual(bgRect.getAttribute('fill'), 'green');
    assert.strictEqual(bgRect.getAttribute('width'), '600');
    assert.strictEqual(bgRect.getAttribute('height'), '600');

    // Add another element
    const circle = visitor._createElement('circle');
    visitor.svgElement.appendChild(circle);
    assert.strictEqual(visitor.svgElement.children.length, 2);

    // Clear
    visitor.clear();
    assert.strictEqual(visitor.svgElement.children.length, 0);
  });

  test('buildSVG should return a valid serialized SVG string', function() {
    const pInst = createPInst();
    const visitor = createVisitor(pInst);

    visitor.addBackground({
      color: 'rgba(255,0,0,1)'
    });

    const svgStr = visitor.buildSVG();
    assert.include(svgStr, 'width="600"');
    assert.include(svgStr, 'height="600"');
    assert.include(svgStr, 'viewBox="0 0 600 600"');
    assert.include(svgStr, '<rect');
    assert.include(svgStr, 'fill="rgba(255,0,0,1)"');
  });
});
