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

  
});
