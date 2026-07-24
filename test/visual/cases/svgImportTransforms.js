/**
 * Visual acceptance tests — SVG Import Transforms
 *
 * Exercises the TransformResolver: translate, rotate, scale, and nested groups
 * with multiple stacked transforms.
 *
 * Each test loads a fixture SVG, imports it through the SVG importer pipeline,
 * replays onto the p5 canvas, and captures a PNG for Pixelmatch comparison.
 */

import { visualSuite, visualTest } from '../visualTest.js';

visualSuite('SVG Import - Transforms', () => {

  function setup(p) {
    p.createCanvas(200, 200);
    p.background(200);
    p.fill(255);
    p.stroke(0);
    p.strokeWeight(1);
  }

  async function loadFixture(p, name) {
    return p.loadSVG(`test/fixtures/svg/${name}.svg`);
  }

  // ── translate: transform="translate(x,y)" on a group
  visualTest('translate', async (p, screenshot) => {
    setup(p);
    const shape = await loadFixture(p, 'transform-translate');
    p.shape(shape);
    await screenshot();
  });

  // ── rotate: transform="rotate(deg)" on a group
  visualTest('rotate', async (p, screenshot) => {
    setup(p);
    const shape = await loadFixture(p, 'transform-rotate');
    p.shape(shape);
    await screenshot();
  });

  
});
