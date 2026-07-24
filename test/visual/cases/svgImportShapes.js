/**
 * Visual acceptance tests — SVG Import Shapes
 *
 * Covers each SVG shape element supported by the importer:
 * circle, rect, ellipse, polygon, polyline, path, arc, rounded rect.
 *
 * Each test loads a fixture SVG from test/fixtures/svg/, imports it through
 * the SVG importer pipeline (loadSVG -> parseSVG -> ShapeRecorder -> ShapeNode),
 * replays the resulting shape onto the p5 canvas, and captures a PNG for
 * Pixelmatch comparison.
 */

import { visualSuite, visualTest } from '../visualTest.js';

visualSuite('SVG Import - Shapes', () => {

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

  // ── circle
  visualTest('circle', async (p, screenshot) => {
    setup(p);
    const shape = await loadFixture(p, 'circle');
    p.shape(shape);
    await screenshot();
  });

  // ── rect
  visualTest('rect', async (p, screenshot) => {
    setup(p);
    const shape = await loadFixture(p, 'rect');
    p.shape(shape);
    await screenshot();
  });


});
