/**
 * Visual acceptance tests — SVG Shape export
 */

import { visualSuite, visualTest } from '../visualTest.js';

visualSuite('SVG Shapes', () => {

  // ── Setup shared across all shape tests ────────────────────────────────────
  // White background, black fill, black stroke, weight 1 — consistent baseline.
  function setup(p) {
    p.createCanvas(200, 200);
    p.background(255);
    p.fill(0);
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
  // visualTest('rect', async (p, screenshot) => {
  //   setup(p);
  //   const record = p.buildShape(() => {
  //     p.rect(40, 50, 120, 80);
  //   });
  //   await screenshot(p.getSVG(record));
  // });

  // ── square
  // visualTest('square', async (p, screenshot) => {
  //   setup(p);
  //   const record = p.buildShape(() => {
  //     p.square(45, 45, 110);
  //   });
  //   await screenshot(p.getSVG(record));
  // });

  // ── line
  // visualTest('line', async (p, screenshot) => {
  //   setup(p);
  //   const record = p.buildShape(() => {
  //     p.line(30, 40, 170, 160);
  //   });
  //   await screenshot(p.getSVG(record));
  // });

  // ── point
  // visualTest('point', async (p, screenshot) => {
  //   setup(p);
  //   const record = p.buildShape(() => {
  //     p.point(105, 95);
  //   });
  //   await screenshot(p.getSVG(record));
  // });

  // ── triangle
  // visualTest('triangle', async (p, screenshot) => {
  //   setup(p);
  //   const record = p.buildShape(() => {
  //     p.triangle(105, 40, 45, 160, 155, 160);
  //   });
  //   await screenshot(p.getSVG(record));
  // });

  // ── quad
  // visualTest('quad', async (p, screenshot) => {
  //   setup(p);
  //   const record = p.buildShape(() => {
  //     p.quad(35, 35, 165, 55, 145, 165, 55, 145);
  //   });
  //   await screenshot(p.getSVG(record));
  // });

  // ── arc
  // visualTest('arc', async (p, screenshot) => {
  //   setup(p);
  //   const record = p.buildShape(() => {
  //     p.arc(95, 95, 130, 130, 0, p.PI + p.HALF_PI);
  //   });
  //   await screenshot(p.getSVG(record));
  // });

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

});
