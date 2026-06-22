/**
 * Visual acceptance tests — Transformations
 */

import { visualSuite, visualTest } from '../visualTest.js';

visualSuite('Transformations', () => {

  // ── Setup shared across transform tests ────────────────────────────────────
  // Grey background, white fill, black stroke, weight 1 — consistent baseline.
  function setup(p) {
    p.createCanvas(200, 200);
    p.background(200);
    p.fill(255);
    p.stroke(0);
    p.strokeWeight(1);
  }

  // ── Individual shape in translate ──────────────────────────────────────────
  visualTest('translate ellipse', async (p, screenshot) => {
    setup(p);
    const record = p.buildShape(() => {
      p.translate(50, 50);
      p.ellipse(50, 50, 80, 50);
    });
    await screenshot(p.getSVG(record));
  });

  // ── Individual shape in rotate ─────────────────────────────────────────────
  visualTest('rotate rect', async (p, screenshot) => {
    setup(p);
    const record = p.buildShape(() => {
      p.translate(100, 100);
      p.rotate(p.QUARTER_PI); // Rotate 45 degrees
      p.rect(-40, -25, 80, 50);
    });
    await screenshot(p.getSVG(record));
  });

  // ── Individual shape in scale ──────────────────────────────────────────────
  visualTest('scale circle', async (p, screenshot) => {
    setup(p);
    const record = p.buildShape(() => {
      p.translate(100, 100);
      p.scale(1.5, 0.7); // Scale X by 1.5, Y by 0.7
      p.circle(0, 0, 80);
    });
    await screenshot(p.getSVG(record));
  });

  // ── Mixture of all transforms in individual shape ──────────────────────────
  visualTest('mixture of transforms', async (p, screenshot) => {
    setup(p);
    const record = p.buildShape(() => {
      p.translate(100, 100);
      p.rotate(p.PI / 6); // 30 degrees
      p.scale(1.2, 0.8);
      p.rect(-30, -30, 60, 60);
    });
    await screenshot(p.getSVG(record));
  });

  // ── Combinations of transforms with multiple shapes ────────────────────────
  visualTest('transforms with multiple shapes', async (p, screenshot) => {
    setup(p);
    const record = p.buildShape(() => {
      // Shape 1: translate and draw rect
      p.translate(60, 60);
      p.rect(0, 0, 50, 50);

      // Shape 2: rotate and scale cumulatively from the previous state, draw circle
      p.rotate(p.QUARTER_PI);
      p.scale(0.8, 1.4);
      p.circle(50, 0, 40);

      // Shape 3: translate again and draw line
      p.translate(0, -40);
      p.line(-30, 0, 30, 0);
    });
    await screenshot(p.getSVG(record));
  });

});
