import { visualSuite, visualTest } from '../visualTest.js';

visualSuite('SVG Import - defs and use', () => {

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

  // ── basic use: single circle in <defs>, stamped four times via <use>
  visualTest('basic use', async (p, screenshot) => {
    setup(p);
    const shape = await loadFixture(p, 'defs-use-circle');
    p.shape(shape);
    await screenshot();
  });

  // ── group use: <g> cross-shape in <defs>, reused with rotation transforms
  visualTest('group use', async (p, screenshot) => {
    setup(p);
    const shape = await loadFixture(p, 'defs-use-group');
    p.shape(shape);
    await screenshot();
  });

  // ── nested use: <use> elements inside a <g> defined in <defs>, then outer <use>
  visualTest('nested use', async (p, screenshot) => {
    setup(p);
    const shape = await loadFixture(p, 'defs-use-nested');
    p.shape(shape);
    await screenshot();
  });

  // ── symbol: <symbol> element referenced via <use>
  visualTest('symbol', async (p, screenshot) => {
    setup(p);
    const shape = await loadFixture(p, 'defs-symbol');
    p.shape(shape);
    await screenshot();
  });

  // ── viewBox: <symbol viewBox="..."> with width/height on <use> triggers scaling
  visualTest('viewBox', async (p, screenshot) => {
    setup(p);
    const shape = await loadFixture(p, 'defs-symbol-viewbox');
    p.shape(shape);
    await screenshot();
  });

  // ── x/y: x and y attributes on <use> position each stamp independently
  visualTest('x and y', async (p, screenshot) => {
    setup(p);
    const shape = await loadFixture(p, 'defs-use-xy');
    p.shape(shape);
    await screenshot();
  });

});
