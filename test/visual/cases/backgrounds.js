/**
 * Visual acceptance tests — Backgrounds
 */

import { visualSuite, visualTest } from '../visualTest.js';

visualSuite('Backgrounds', () => {

  // 1. Background on the top
  visualTest('background on the top', async (p, screenshot) => {
    p.createCanvas(200, 200);
    const record = p.buildShape(() => {
      p.background(255, 200, 100); // yellowish
      p.fill(0, 0, 255); // blue
      p.rect(40, 60, 120, 80);
    });
    await screenshot(p.getSVG(record));
  });

  // 2. Only background
  visualTest('only background', async (p, screenshot) => {
    p.createCanvas(200, 200);
    const record = p.buildShape(() => {
      p.background(100, 150, 200); // light blue
    });
    await screenshot(p.getSVG(record));
  });

  // 3. Transform and background
  visualTest('transform and background', async (p, screenshot) => {
    p.createCanvas(200, 200);
    const record = p.buildShape(() => {
      p.translate(90, 110);
      p.scale(2);
      p.background(200, 100, 100); // reddish
      p.fill(255);
      p.circle(0, 0, 20);
    });
    await screenshot(p.getSVG(record));
  });

  // 4. Background in between the shapes with alpha
  visualTest('background in between the shapes with alpha', async (p, screenshot) => {
    p.createCanvas(200, 200);
    const record = p.buildShape(() => {
      p.fill(255, 0, 0); // red
      p.rect(20, 30, 120, 80);
      p.background(0, 255, 0, 128); // semi-transparent green background
      p.fill(0, 0, 255); // blue
      p.rect(70, 90, 110, 70);
    });
    await screenshot(p.getSVG(record));
  });

  // 5. Background in between the shapes and transform
  visualTest('background in between the shapes and transform', async (p, screenshot) => {
    p.createCanvas(200, 200);
    const record = p.buildShape(() => {
      p.fill(255, 0, 0); // red
      p.rect(20, 30, 120, 80);
      p.translate(40, 60);
      p.background(0, 255, 255); // cyan background
      p.fill(0, 0, 255); // blue
      p.rect(0, 0, 110, 70);
    });
    await screenshot(p.getSVG(record));
  });

});
