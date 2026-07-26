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

  // ── ellipse
  visualTest('ellipse', async (p, screenshot) => {
    setup(p);
    const shape = await loadFixture(p, 'ellipse');
    p.shape(shape);
    await screenshot();
  });

  // ── polygon
  visualTest('polygon', async (p, screenshot) => {
    setup(p);
    const shape = await loadFixture(p, 'polygon');
    p.shape(shape);
    await screenshot();
  });

  // ── polyline
  visualTest('polyline', async (p, screenshot) => {
    setup(p);
    const shape = await loadFixture(p, 'polyline');
    p.shape(shape);
    await screenshot();
  });

  // ── path (bezier curve path)
  visualTest('path', async (p, screenshot) => {
    setup(p);
    const shape = await loadFixture(p, 'path-bezier');
    p.shape(shape);
    await screenshot();
  });

  // ── arc (path with A command)
  visualTest('arc', async (p, screenshot) => {
    setup(p);
    const shape = await loadFixture(p, 'arc');
    p.shape(shape);
    await screenshot();
  });

  // ── rounded rect (rect with rx/ry)
  visualTest('rounded rect', async (p, screenshot) => {
    setup(p);
    const shape = await loadFixture(p, 'rounded-rect');
    p.shape(shape);
    await screenshot();
  });

  // ── overlapping shapes with per-shape fill and stroke
  visualTest('overlapping shapes', async (p, screenshot) => {
    setup(p);
    const shape = await loadFixture(p, 'overlapping-shapes');
    p.shape(shape);
    await screenshot();
  });

});
