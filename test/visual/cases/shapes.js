/**
 * Visual acceptance tests — SVG Shape export
 */

import { visualSuite, visualTest } from '../visualTest.js';

visualSuite('SVG Shapes', () => {

  // ── Setup shared across all shape tests ────────────────────────────────────
  // Grey background, white fill, black stroke, weight 1 — consistent baseline.
  function setup(p) {
    p.createCanvas(200, 200);
    p.background(200);
    p.fill(255);
    p.stroke(0);
    p.strokeWeight(1);
  }

  // ── Individual Shapes ──────────────────────────────────────────────────────

  // ── circle
  visualTest('circle', async (p, screenshot) => {
    setup(p);
    const record = p.buildShape(() => {
      p.circle(100, 110, 120);
    });
    await screenshot(p.getSVG(record));
  });

  // ── ellipse
  visualTest('ellipse', async (p, screenshot) => {
    setup(p);
    const record = p.buildShape(() => {
      p.ellipse(90, 105, 140, 80);
    });
    await screenshot(p.getSVG(record));
  });

  // ── rect
  visualTest('rect', async (p, screenshot) => {
    setup(p);
    const record = p.buildShape(() => {
      p.rect(40, 50, 120, 80);
    });
    await screenshot(p.getSVG(record));
  });

  // ── square
  visualTest('square', async (p, screenshot) => {
    setup(p);
    const record = p.buildShape(() => {
      p.square(45, 45, 110);
    });
    await screenshot(p.getSVG(record));
  });

  // ── line
  visualTest('line', async (p, screenshot) => {
    setup(p);
    const record = p.buildShape(() => {
      p.line(30, 40, 170, 160);
    });
    await screenshot(p.getSVG(record));
  });

  // ── point
  visualTest('point', async (p, screenshot) => {
    setup(p);
    const record = p.buildShape(() => {
      p.point(105, 95);
    });
    await screenshot(p.getSVG(record));
  });

  // ── triangle
  visualTest('triangle', async (p, screenshot) => {
    setup(p);
    const record = p.buildShape(() => {
      p.triangle(105, 40, 45, 160, 155, 160);
    });
    await screenshot(p.getSVG(record));
  });

  // ── quad
  visualTest('quad', async (p, screenshot) => {
    setup(p);
    const record = p.buildShape(() => {
      p.quad(35, 35, 165, 55, 145, 165, 55, 145);
    });
    await screenshot(p.getSVG(record));
  });

  // ── arc
  visualTest('arc', async (p, screenshot) => {
    setup(p);
    const record = p.buildShape(() => {
      p.arc(95, 95, 130, 130, 0, p.PI + p.HALF_PI);
    });
    await screenshot(p.getSVG(record));
  });

  // ── Multiple Shapes ────────────────────────────────────────────────────────

  visualTest('multiple shapes', async (p, screenshot) => {
    setup(p);
    const record = p.buildShape(() => {
      p.circle(60, 60, 50);
      p.rect(110, 40, 60, 50);
      p.triangle(50, 160, 100, 110, 150, 160);
    });
    await screenshot(p.getSVG(record));
  });

  // ── Overlapping Shapes ──────────────────────────────────────────────────────

  visualTest('overlapping shapes', async (p, screenshot) => {
    setup(p);
    const record = p.buildShape(() => {
      p.rect(40, 40, 100, 100);
      p.circle(110, 110, 80);
      p.line(20, 50, 180, 150);
    });
    await screenshot(p.getSVG(record));
  });

  // ── Custom Paths and Tessellations ─────────────────────────────────────────

  visualTest('custom path - vertices', async (p, screenshot) => {
    setup(p);
    const record = p.buildShape(() => {
      p.beginShape();
      p.vertex(30, 20);
      p.vertex(85, 20);
      p.vertex(85, 75);
      p.vertex(30, 75);
      p.endShape(p.CLOSE);
    });
    await screenshot(p.getSVG(record));
  });

  visualTest('custom path - bezier curve', async (p, screenshot) => {
    setup(p);
    const record = p.buildShape(() => {
      p.bezierOrder(3);
      p.beginShape();
      p.vertex(30, 20);
      p.bezierVertex(80, 0);
      p.bezierVertex(80, 75);
      p.bezierVertex(30, 75);
      p.bezierVertex(50, 80);
      p.bezierVertex(60, 25);
      p.bezierVertex(30, 20);
      p.endShape();
    });
    await screenshot(p.getSVG(record));
  });

  visualTest('custom path - curves', async (p, screenshot) => {
    setup(p);
    const record = p.buildShape(() => {
      p.beginShape();
      p.splineVertex(40, 40);
      p.splineVertex(40, 40);
      p.splineVertex(80, 60);
      p.splineVertex(120, 100);
      p.splineVertex(160, 40);
      p.splineVertex(160, 40);
      p.endShape();
    });
    await screenshot(p.getSVG(record));
  });

  visualTest('triangle fan', async (p, screenshot) => {
    setup(p);
    const record = p.buildShape(() => {
      p.beginShape(p.TRIANGLE_FAN);
      p.vertex(100, 100);
      p.vertex(100, 40);
      p.vertex(150, 60);
      p.vertex(160, 110);
      p.vertex(130, 150);
      p.vertex(80, 140);
      p.vertex(50, 90);
      p.endShape();
    });
    await screenshot(p.getSVG(record));
  });

  visualTest('triangle strip', async (p, screenshot) => {
    setup(p);
    const record = p.buildShape(() => {
      p.beginShape(p.TRIANGLE_STRIP);
      p.vertex(30, 75);
      p.vertex(40, 20);
      p.vertex(50, 75);
      p.vertex(60, 20);
      p.vertex(70, 75);
      p.vertex(80, 20);
      p.vertex(90, 75);
      p.endShape();
    });
    await screenshot(p.getSVG(record));
  });

  visualTest('quad strip', async (p, screenshot) => {
    setup(p);
    const record = p.buildShape(() => {
      p.beginShape(p.QUAD_STRIP);
      p.vertex(30, 80);
      p.vertex(30, 20);
      p.vertex(70, 80);
      p.vertex(70, 20);
      p.vertex(110, 80);
      p.vertex(110, 20);
      p.vertex(150, 80);
      p.vertex(150, 20);
      p.endShape();
    });
    await screenshot(p.getSVG(record));
  });

  // ── Reusable / Nested Shapes
  visualTest('reusable shape', async (p, screenshot) => {
    // Custom larger canvas to accommodate multiple/larger replayed shapes
    p.createCanvas(400, 400);
    p.background(220);
    p.fill(255);
    p.stroke(0);
    p.strokeWeight(1);

    // Build reusable sub-shape
    const leaf = p.buildShape(() => {
      p.fill(0, 200, 100);
      p.noStroke();
      p.ellipse(0, 0, 30, 60);
    });

    // Build parent shape that reuses the sub-shape
    const flower = p.buildShape(() => {
      p.background(200);
      p.push();
      p.translate(100, 100);
      
      // Draw outer details
      p.fill(255, 150, 0);
      p.circle(0, 0, 40);

      // Replay leaf multiple times with rotation and scale
      for (let i = 0; i < 4; i++) {
        p.push();
        p.rotate(p.TWO_PI * i / 4);
        p.translate(0, -40);
        p.scale(0.8 + i * 0.1);
        p.shape(leaf);
        p.pop();
      }
      p.pop();
    });

    // 1. Test Replay directly on the canvas
    p.background(255);
    
    // Draw flower
    p.shape(flower);

    // Capture the replayed canvas directly
    await screenshot();

    // 2. Test SVG export of the flower shape directly
    await screenshot(p.getSVG(flower));
  });

});
