import { SVGExportAddon } from '../../../src/p5.svgExport.js';

// Setup mock p5.js environment for addon initialization
class MockPrimitiveVisitor {}

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

suite('TransformStack', function() {
  test('should initialize with an identity matrix', function() {
    const pInst = createPInst();
    pInst.buildShape(() => {
      const tStack = pInst._activeRecorder.tStack;
      assert.isDefined(tStack);
      assert.instanceOf(tStack.current, DOMMatrix);
      
      const m = tStack.current;
      assert.strictEqual(m.a, 1);
      assert.strictEqual(m.b, 0);
      assert.strictEqual(m.c, 0);
      assert.strictEqual(m.d, 1);
      assert.strictEqual(m.e, 0);
      assert.strictEqual(m.f, 0);
    });
  });

  test('push should clone the current matrix', function() {
    const pInst = createPInst();
    pInst.buildShape(() => {
      const tStack = pInst._activeRecorder.tStack;
      tStack.translate(50, 100);
      
      tStack.push();
      assert.strictEqual(tStack.stack.length, 2);
      
      const m = tStack.current;
      assert.strictEqual(m.e, 50);
      assert.strictEqual(m.f, 100);
      
      // Modifying current should not affect parent in stack
      tStack.translate(20, 30);
      assert.strictEqual(tStack.current.e, 70);
      assert.strictEqual(tStack.stack[0].e, 50);
    });
  });

  test('pop should restore the previous matrix and not pop past root', function() {
    const pInst = createPInst();
    pInst.buildShape(() => {
      const tStack = pInst._activeRecorder.tStack;
      tStack.translate(10, 20);
      
      tStack.push();
      tStack.translate(100, 200);
      assert.strictEqual(tStack.current.e, 110);
      
      tStack.pop();
      assert.strictEqual(tStack.current.e, 10);
      assert.strictEqual(tStack.stack.length, 1);
      
      // Pop when stack size is 1 should be a no-op
      tStack.pop();
      assert.strictEqual(tStack.current.e, 10);
      assert.strictEqual(tStack.stack.length, 1);
    });
  });

  test('translate should translate the matrix self', function() {
    const pInst = createPInst();
    pInst.buildShape(() => {
      const tStack = pInst._activeRecorder.tStack;
      tStack.translate(15, 25);
      assert.strictEqual(tStack.current.e, 15);
      assert.strictEqual(tStack.current.f, 25);
    });
  });

  test('rotate should rotate the matrix self in degrees internally', function() {
    const pInst = createPInst();
    pInst.buildShape(() => {
      const tStack = pInst._activeRecorder.tStack;
      // rotate is passed radians, converts to degrees inside rotateSelf
      // PI / 2 rad = 90 degrees
      tStack.rotate(Math.PI / 2);
      
      assert.closeTo(tStack.current.a, 0, 0.0001);
      assert.closeTo(tStack.current.b, 1, 0.0001);
      assert.closeTo(tStack.current.c, -1, 0.0001);
      assert.closeTo(tStack.current.d, 0, 0.0001);
    });
  });

  test('scale should scale with one or two arguments', function() {
    const pInst = createPInst();
    pInst.buildShape(() => {
      const tStack = pInst._activeRecorder.tStack;
      
      // Scale with one argument (uniform scaling)
      tStack.scale(2);
      assert.strictEqual(tStack.current.a, 2);
      assert.strictEqual(tStack.current.d, 2);
      
      tStack.push();
      // Scale with two arguments (non-uniform scaling)
      tStack.scale(3, 4);
      // Cumulative: 2 * 3 = 6, 2 * 4 = 8
      assert.strictEqual(tStack.current.a, 6);
      assert.strictEqual(tStack.current.d, 8);
    });
  });
});
