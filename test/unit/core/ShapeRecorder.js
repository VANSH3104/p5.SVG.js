import { SVGExportAddon } from '../../../src/p5.svgExport.js';

// Setup mock p5.js environment for addon initialization
class MockPrimitiveVisitor {}

const mockP5 = {
  PrimitiveVisitor: MockPrimitiveVisitor,
  registerAddon() {}
};

const fn = {};
SVGExportAddon(mockP5, fn);

class MockShape {
  constructor(name) {
    this.name = name;
  }
  accept(visitor) {}
}

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

suite('ShapeRecorder', function() {
  test('should record basic hierarchy and nodes correctly', function() {
    const pInst = createPInst();

    let shape;
    const record = pInst.buildShape(() => {
      // Record background
      pInst.background(255, 200, 100);
      
      // Record a shape
      shape = new MockShape('ellipse1');
      pInst._renderer.drawShape(shape);
      
      // Record clear
      pInst.clear();
    });

    assert.strictEqual(record.type, 'scope');
    assert.strictEqual(record.children.length, 3);

    const bgNode = record.children[0];
    assert.strictEqual(bgNode.type, 'background');
    assert.isDefined(bgNode.color);

    const shapeNode = record.children[1];
    assert.strictEqual(shapeNode.type, 'shape');
    assert.strictEqual(shapeNode.shape, shape);
    assert.strictEqual(shapeNode.state.fill, 'red');

    const clearNode = record.children[2];
    assert.strictEqual(clearNode.type, 'clear');
  });

  test('should intercept push and pop to build nested ScopeNode hierarchy', function() {
    const pInst = createPInst();

    const record = pInst.buildShape(() => {
      pInst.push();
      
      const shape1 = new MockShape('shape1');
      pInst._renderer.drawShape(shape1);
      
      pInst.push();
      const shape2 = new MockShape('shape2');
      pInst._renderer.drawShape(shape2);
      pInst.pop();

      pInst.pop();
    });

    // Root scope
    assert.strictEqual(record.type, 'scope');
    assert.strictEqual(record.children.length, 1);

    // First push ScopeNode
    const scope1 = record.children[0];
    assert.strictEqual(scope1.type, 'scope');
    assert.strictEqual(scope1.children.length, 2);

    const shapeNode1 = scope1.children[0];
    assert.strictEqual(shapeNode1.type, 'shape');
    assert.strictEqual(shapeNode1.shape.name, 'shape1');

    // Second push ScopeNode
    const scope2 = scope1.children[1];
    assert.strictEqual(scope2.type, 'scope');
    assert.strictEqual(scope2.children.length, 1);

    const shapeNode2 = scope2.children[0];
    assert.strictEqual(shapeNode2.type, 'shape');
    assert.strictEqual(shapeNode2.shape.name, 'shape2');
  });

  test('should track matrix transforms in ShapeNode state without nested transform nodes', function() {
    const pInst = createPInst();

    const record = pInst.buildShape(() => {
      pInst.translate(100, 200);
      
      pInst.push();
      pInst.rotate(Math.PI / 2); // 90 deg
      const shape = new MockShape('rotated_shape');
      pInst._renderer.drawShape(shape);
      pInst.pop();
    });

    assert.strictEqual(record.type, 'scope');
    assert.strictEqual(record.children.length, 1); // Only the push ScopeNode is added to children

    const childScope = record.children[0];
    assert.strictEqual(childScope.type, 'scope');
    assert.strictEqual(childScope.children.length, 1);

    const shapeNode = childScope.children[0];
    assert.strictEqual(shapeNode.type, 'shape');
    assert.strictEqual(shapeNode.shape.name, 'rotated_shape');

    // Verify matrix in state has accumulated both translate and rotate
    const m = shapeNode.state.transform;
    assert.instanceOf(m, DOMMatrix);
    assert.strictEqual(m.e, 100);
    assert.strictEqual(m.f, 200);
    assert.closeTo(m.a, 0, 0.0001);
    assert.closeTo(m.b, 1, 0.0001);
    assert.closeTo(m.c, -1, 0.0001);
    assert.closeTo(m.d, 0, 0.0001);
  });

  test('should cleanup intercepted methods on stop', function() {
    const pInst = createPInst();

    // Preserve original references for verification
    const origDrawShape = pInst._renderer.drawShape;
    const origPush = pInst.push;
    const origPop = pInst.pop;
    const origTranslate = pInst.translate;

    pInst.buildShape(() => {
      // During buildShape, methods should be wrapped
      assert.notStrictEqual(pInst._renderer.drawShape, origDrawShape);
      assert.notStrictEqual(pInst.push, origPush);
      assert.notStrictEqual(pInst.pop, origPop);
      assert.notStrictEqual(pInst.translate, origTranslate);
    });

    // After buildShape finishes, functions should be restored
    assert.strictEqual(pInst._renderer.drawShape, origDrawShape);
    assert.strictEqual(pInst.push, origPush);
    assert.strictEqual(pInst.pop, origPop);
    assert.strictEqual(pInst.translate, origTranslate);
  });

  test('should cleanup intercepted methods on endRecord', function() {
    const pInst = createPInst();

    // Preserve original references for verification
    const origDrawShape = pInst._renderer.drawShape;
    const origPush = pInst.push;
    const origPop = pInst.pop;
    const origTranslate = pInst.translate;

    pInst.beginRecord();
    // During recording, methods should be wrapped
    assert.notStrictEqual(pInst._renderer.drawShape, origDrawShape);
    assert.notStrictEqual(pInst.push, origPush);
    assert.notStrictEqual(pInst.pop, origPop);
    assert.notStrictEqual(pInst.translate, origTranslate);

    pInst.endRecord();

    // After endRecord, functions should be restored
    assert.strictEqual(pInst._renderer.drawShape, origDrawShape);
    assert.strictEqual(pInst.push, origPush);
    assert.strictEqual(pInst.pop, origPop);
    assert.strictEqual(pInst.translate, origTranslate);
  });

  test('should record reusable shapes nested via pInst.shape()', function() {
    const pInst = createPInst();
    
    // Add missing p5 methods required by CanvasReplay.applyState
    pInst.applyMatrix = () => {};
    pInst.fill = () => {};
    pInst.stroke = () => {};
    pInst.noFill = () => {};
    pInst.noStroke = () => {};
    pInst.strokeWeight = () => {};

    // Mock colors that have _getRGBA
    const mockColor = {
      _getRGBA() { return [255, 0, 0, 255]; }
    };
    pInst._renderer.states.fillColor = mockColor;
    pInst._renderer.states.strokeColor = mockColor;
    
    // Build first reusable shape
    const shapeA = new MockShape('shapeA');
    const reusable = pInst.buildShape(() => {
      pInst._renderer.drawShape(shapeA);
    });

    // Verify first buildShape recorded correctly
    assert.strictEqual(reusable.type, 'scope');
    assert.strictEqual(reusable.children.length, 1);
    assert.strictEqual(reusable.children[0].type, 'shape');
    assert.strictEqual(reusable.children[0].shape.name, 'shapeA');

    // Build outer shape that reuses the first shape via pInst.shape()
    const parentRecord = pInst.buildShape(() => {
      pInst.shape(reusable);
    });

    // Verify outer record contains nested scope representing the replayed shape
    assert.strictEqual(parentRecord.type, 'scope');
    assert.strictEqual(parentRecord.children.length, 1);
    
    const nestedScope = parentRecord.children[0];
    assert.strictEqual(nestedScope.type, 'scope');
    assert.strictEqual(nestedScope.children.length, 1);
    
    const replayedShapeNode = nestedScope.children[0];
    assert.strictEqual(replayedShapeNode.type, 'shape');
    assert.strictEqual(replayedShapeNode.shape.name, 'shapeA');
  });

  test('should handle buildShape called without a callback function', function() {
    const pInst = createPInst();

    // Call without arguments
    let record;
    assert.doesNotThrow(() => {
      record = pInst.buildShape();
    });

    assert.strictEqual(record.type, 'scope');
    assert.strictEqual(record.children.length, 0);
  });
});
