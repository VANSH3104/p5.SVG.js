/**
 * Visual acceptance tests — Colors and Strokes
 */

import { visualSuite, visualTest } from '../visualTest.js';

visualSuite('Colors and Strokes', () => {

  // ── Shapes fill with alpha and without alpha ──────────────────────────────
  visualTest('fill with and without alpha', async (p, screenshot) => {
    p.createCanvas(200, 200);
    p.background(255);
    p.noStroke();

    const record = p.buildShape(() => {
      // Solid fill circle
      p.fill('#ff0000'); // Solid red
      p.circle(60, 100, 70);

      // Alpha fill circle
      p.fill(0, 0, 255, 127); // Semi-transparent blue
      p.circle(140, 100, 70);
    });
    await screenshot(p.getSVG(record));
  });

  // ── Test with stroke ───────────────────────────────────────────────────────
  visualTest('stroke variations', async (p, screenshot) => {
    p.createCanvas(200, 200);
    p.background(255);

    const record = p.buildShape(() => {
      // Circle with yellow fill and thick black stroke
      p.fill(255, 255, 0);
      p.stroke(0);
      p.strokeWeight(4);
      p.circle(60, 60, 70);

      // Rect with green fill and blue stroke
      p.fill('#00ff00');
      p.stroke('#0000ff');
      p.strokeWeight(2);
      p.rect(110, 30, 60, 60);

      // Circle with no stroke
      p.fill(255, 0, 255);
      p.noStroke();
      p.circle(100, 150, 70);
    });
    await screenshot(p.getSVG(record));
  });

  // ── Test with strokeWeights ────────────────────────────────────────────────
  visualTest('strokeWeights', async (p, screenshot) => {
    p.createCanvas(200, 200);
    p.background(255);
    p.noFill();

    const record = p.buildShape(() => {
      // Thin stroke line
      p.stroke(0);
      p.strokeWeight(1);
      p.line(20, 40, 180, 40);

      // Medium stroke line
      p.stroke(0);
      p.strokeWeight(5);
      p.line(20, 100, 180, 100);

      // Thick stroke line
      p.stroke(0);
      p.strokeWeight(15);
      p.line(20, 160, 180, 160);
    });
    await screenshot(p.getSVG(record));
  });

  // ── Overlapping shapes fills with alpha ────────────────────────────────────
  visualTest('overlapping shapes alpha', async (p, screenshot) => {
    p.createCanvas(200, 200);
    p.background(255);
    p.noStroke();

    const record = p.buildShape(() => {
      // Circle 1: Red with alpha
      p.fill(255, 0, 0, 150);
      p.circle(80, 80, 90);

      // Circle 2: Green with alpha, overlapping Circle 1
      p.fill(0, 255, 0, 150);
      p.circle(120, 80, 90);

      // Circle 3: Blue with alpha, overlapping both
      p.fill(0, 0, 255, 150);
      p.circle(100, 120, 90);
    });
    await screenshot(p.getSVG(record));
  });

  // ── Test with combination of everything ────────────────────────────────────
  visualTest('combination of everything', async (p, screenshot) => {
    p.createCanvas(200, 200);
    p.background(255);

    const record = p.buildShape(() => {
      // Solid background shape
      p.fill('#eaeaea');
      p.stroke('#333333');
      p.strokeWeight(3);
      p.rect(20, 20, 160, 160);

      // Overlapping transparent shapes
      p.fill('rgba(255, 0, 0, 0.5)');
      p.noStroke();
      p.circle(70, 70, 60);

      p.fill('rgba(0, 0, 255, 0.5)');
      p.stroke(0, 255, 0);
      p.strokeWeight(5);
      p.rect(90, 90, 60, 60);

      // A thick stroke line cutting through
      p.stroke('rgba(0, 0, 0, 0.7)');
      p.strokeWeight(8);
      p.line(30, 170, 170, 30);
    });
    await screenshot(p.getSVG(record));
  });

});
