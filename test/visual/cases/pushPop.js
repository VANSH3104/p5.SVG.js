/**
 * Visual acceptance tests — Push and Pop state restoration
 */

import { visualSuite, visualTest } from '../visualTest.js';

visualSuite('Push Pop State', () => {

  // Helper to initialize a 200x200 canvas
  function setupCanvas(p) {
    p.createCanvas(200, 200);
  }

  // ── 1. Nothing (Empty push/pop) ────────────────────────────────────────────
  visualTest('nothing', async (p, screenshot) => {
    setupCanvas(p);
    const record = p.buildShape(() => {
      p.push();
      p.pop();
    });
    await screenshot(p.getSVG(record));
  });

  // ── 2. Push pop with transforms with combinations ──────────────────────────
  visualTest('transforms and combinations', async (p, screenshot) => {
    setupCanvas(p);
    const record = p.buildShape(() => {
      p.translate(50, 50);
      
      p.push();
      p.rotate(p.QUARTER_PI); // Rotate 45 degrees
      p.fill(0);
      p.rect(0, 0, 40, 40); // Under translate + rotate
      p.pop();

      p.fill(128);
      p.rect(0, 0, 40, 40); // Under translate only
    });
    await screenshot(p.getSVG(record));
  });

  // ── 3. Sequentials push pop - multi stage transform ────────────────────────
  visualTest('sequential transforms', async (p, screenshot) => {
    setupCanvas(p);
    const record = p.buildShape(() => {
      p.noStroke();

      p.push();
      p.translate(50, 20);
      p.fill(255, 0, 0); // Red
      p.rect(0, 0, 30, 30);
      p.pop();

      p.push();
      p.translate(20, 100);
      p.fill(0, 255, 0); // Green
      p.rect(0, 0, 30, 30);
      p.pop();

      p.push();
      p.translate(120, 80);
      p.fill(0, 0, 255); // Blue
      p.rect(0, 0, 30, 30);
      p.pop();
    });
    await screenshot(p.getSVG(record));
  });

  // ── 4. Nested push pop with shapes ─────────────────────────────────────────
  visualTest('nested transforms', async (p, screenshot) => {
    setupCanvas(p);
    const record = p.buildShape(() => {
      p.noStroke();

      p.push();
      p.translate(40, 20);
      p.fill(255, 0, 0); // Red
      p.rect(0, 0, 25, 25); // shape 1 (x: 40, y: 20)

      p.push();
      p.translate(0, 50);
      p.fill(0, 255, 0); // Green
      p.rect(0, 0, 25, 25); // shape 2 (x: 40, y: 70)
      p.pop();

      p.fill(0, 0, 255); // Blue
      p.rect(0, 100, 25, 25); // shape 3 (x: 40, y: 120)
      p.pop();

      p.fill(255, 255, 0); // Yellow
      p.rect(0, 0, 25, 25); // shape 4 (x: 0, y: 0)
    });
    await screenshot(p.getSVG(record));
  });

  // ── 5. Push pop with background ────────────────────────────────────────────
  visualTest('background', async (p, screenshot) => {
    setupCanvas(p);
    const record = p.buildShape(() => {
      p.push();
      p.background(255, 200, 100); // Yellowish background
      p.pop();
    });
    await screenshot(p.getSVG(record));
  });

  // ── 6. Transform + background + shape + fill + combinations ────────────────
  visualTest('transform background shape fill and combinations', async (p, screenshot) => {
    setupCanvas(p);
    const record = p.buildShape(() => {
      p.fill(255, 0, 0); // Base fill is red
      p.stroke(0);
      p.strokeWeight(2);

      p.push();
      p.translate(60, 60);
      p.fill(0, 255, 0); // Scoped fill is green
      p.stroke(0, 0, 255); // Scoped stroke is blue
      p.strokeWeight(5);
      p.rect(0, 0, 50, 50); // Under translate + green fill + blue stroke (weight 5)
      
      p.background(200, 100, 100); // Reddish background
      p.pop();

      p.rect(120, 120, 50, 50); // Should use base red fill + black stroke (weight 2)
    });
    await screenshot(p.getSVG(record));
  });

  // ── 7. Push pop with clear ──────────────────────────────────────────────────
  visualTest('clear', async (p, screenshot) => {
    setupCanvas(p);
    const record = p.buildShape(() => {
      // Draw red shape first
      p.fill(255, 0, 0);
      p.noStroke();
      p.rect(20, 20, 50, 50);

      p.push();
      // Draw green shape
      p.fill(0, 255, 0);
      p.rect(80, 80, 50, 50);
      
      // Clear the canvas
      p.clear();
      p.pop();

      // Draw blue shape (this should be the only visible shape because clear was called)
      p.fill(0, 0, 255);
      p.rect(120, 120, 50, 50);
    });
    await screenshot(p.getSVG(record));
  });

});
