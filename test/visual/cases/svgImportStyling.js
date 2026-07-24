/**
 * Visual acceptance tests — SVG Import Styling
 *
 * Exercises the StyleResolver: fill, stroke, opacity, inline CSS style="",
 * CSS <style> block, style inheritance from parent, and currentColor.
 *
 * Each test loads a fixture SVG, imports it through the SVG importer pipeline,
 * replays onto the p5 canvas, and captures a PNG for Pixelmatch comparison.
 */

import { visualSuite, visualTest } from '../visualTest.js';

visualSuite('SVG Import - Styling', () => {

  function setup(p) {
    p.createCanvas(200, 200);
    p.background(200);
  }

  async function loadFixture(p, name) {
    return p.loadSVG(`test/fixtures/svg/${name}.svg`);
  }

  // ── fill: solid fill colors on presentation attributes
  visualTest('fill', async (p, screenshot) => {
    setup(p);
    const shape = await loadFixture(p, 'style-fill');
    p.shape(shape);
    await screenshot();
  });


});
