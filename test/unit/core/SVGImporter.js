import { SVGImportAddon } from '../../../src/p5.svgImport.js';

class MockVector {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
}

class MockShape {
  constructor() {
    this.commands = [];
  }
  beginShape() {
    this.commands.push({ name: 'beginShape' });
  }
  endShape() {
    this.commands.push({ name: 'endShape' });
  }
  beginContour() {
    this.commands.push({ name: 'beginContour' });
  }
  endContour(mode) {
    this.commands.push({ name: 'endContour', mode });
  }
  vertex(v) {
    this.commands.push({ name: 'vertex', x: v.x, y: v.y });
  }
  bezierOrder(order) {
    this.commands.push({ name: 'bezierOrder', order });
  }
  bezierVertex(v) {
    this.commands.push({ name: 'bezierVertex', x: v.x, y: v.y });
  }
  rectPrimitive(x, y, w, h, tl, tr, br, bl) {
    this.commands.push({ name: 'rectPrimitive', x, y, w, h, tl, tr, br, bl });
  }
}

const mockP5 = {
  Shape: MockShape,
  Vector: MockVector,
  CLOSE: 'CLOSE',
  registerAddon() {}
};

function createPInst() {
  const pInst = {
    CLOSE: 'CLOSE',
    color(c) {
      return {
        levels: [0, 0, 0, 255],
        toString(format) {
          return 'rgba(0,0,0,1)';
        },
        setAlpha() {}
      };
    },
    alpha() { return 255; }
  };
  const fn = {};
  SVGImportAddon(mockP5, fn);
  Object.setPrototypeOf(pInst, fn);
  return pInst;
}

suite('SVGImporter Refactoring', function() {
  test('should parse legacy SVG path data directly into DrawingCommands', function() {
    const pInst = createPInst();
    // Instantiate SVGImporter by parsing a minimal SVG using mock context
    const svgText = `
      <svg xmlns="http://www.w3.org/2000/svg">
        <path d="M 10 20 L 30 40 Z" />
      </svg>
    `;
    const record = pInst.createSVG(svgText);
    assert.isNotNull(record);
    assert.strictEqual(record.children.length, 1);

    const pathNode = record.children[0];
    assert.strictEqual(pathNode.type, 'shape');

    const shape = pathNode.shape;
    assert.deepEqual(shape.commands, [
      { name: 'beginShape' },
      { name: 'vertex', x: 10, y: 20 },
      { name: 'vertex', x: 30, y: 40 },
      { name: 'endContour', mode: 'CLOSE' },
      { name: 'endShape' }
    ]);
  });

  test('should correctly handle implicit commands during path parsing', function() {
    const pInst = createPInst();
    // Coordinate pairs after M are treated as implicit L
    const svgText = `
      <svg xmlns="http://www.w3.org/2000/svg">
        <path d="M 10 20 30 40 50 60" />
      </svg>
    `;
    const record = pInst.createSVG(svgText);
    const shape = record.children[0].shape;
    assert.deepEqual(shape.commands, [
      { name: 'beginShape' },
      { name: 'vertex', x: 10, y: 20 },
      { name: 'vertex', x: 30, y: 40 },
      { name: 'vertex', x: 50, y: 60 },
      { name: 'endShape' }
    ]);
  });

  test('should handle arc flags, scientific notation, and comma/whitespace separators', function() {
    const pInst = createPInst();
    const svgText = `
      <svg xmlns="http://www.w3.org/2000/svg">
        <path d="M1e1,2.0e1 A 5,5 0 0,1 15,25" />
      </svg>
    `;
    const record = pInst.createSVG(svgText);
    const shape = record.children[0].shape;
    
    // The path contains:
    // M 10,20
    // A 5, 5 (xAxisRotation=0, largeArcFlag=0, sweepFlag=1) to 15, 25
    // Let's assert we start at 10, 20 and end at 15, 25
    assert.strictEqual(shape.commands[0].name, 'beginShape');
    assert.deepEqual(shape.commands[1], { name: 'vertex', x: 10, y: 20 });
    
    // The final segment of the bezier curves should end at 15, 25
    const lastBezier = shape.commands.filter(c => c.name === 'bezierVertex').pop();
    assert.isDefined(lastBezier);
    assert.closeTo(lastBezier.x, 15, 0.001);
    assert.closeTo(lastBezier.y, 25, 0.001);
  });
});
