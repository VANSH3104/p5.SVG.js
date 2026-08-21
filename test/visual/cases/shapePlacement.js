/**
 * Visual acceptance tests — Shape Placement, Alignment & Options
 *
 * Tests shape placement, scaling, and alignment options (CORNER, CENTER, VIEWBOX)
 * primarily for imported SVG records which carry coordinate bounds metadata
 * (viewBox, width, height, coordinateBounds).
 *
 * Fixture used: placement-shape.svg
 *   A 200×200 four-quadrant colorful SVG (red/blue/green/orange quadrants)
 *   with a white cross at centre (100,100) and a black L-marker at top-left (0,0).
 *   This makes any shift, scale, or alignment error immediately visible in diffs.
 *
 * Edge cases covered:
 * - No options (plain replay, no placement transform)
 * - Translate only (anchor stage)
 * - Uniform scale
 * - Non-uniform scale { x, y }
 * - scale: 1 exact no-op (no push/pop applied)
 * - CORNER alignment with zero-origin SVG (no-op offset)
 * - CORNER alignment with non-zero viewBox origin (actual offset applied)
 * - CENTER alignment (shape visually centred on given point)
 * - VIEWBOX alignment (identity offset, shape at natural position + translate)
 * - Transform isolation (subsequent draws are unaffected after placement)
 */

import { visualSuite, visualTest } from '../visualTest.js';

visualSuite('Shape Placement', () => {

  function setup(p) {
    p.createCanvas(200, 200);
    p.background(200);
    p.fill(255, 100, 100);
    p.stroke(0);
    p.strokeWeight(1);
  }

  async function loadFixture(p, name) {
    return p.loadSVG(`test/fixtures/svg/${name}.svg`);
  }

  // ── No options: plain replay with no placement transform ───────────────────
  // Verifies that shape(record) with no x/y/options still works correctly
  // (no push/pop, no translate, shape at its native position).
  visualTest('imported SVG plain replay no options', async (p, screenshot) => {
    setup(p);
    const svgShape = await loadFixture(p, 'placement-shape');
    p.background(200);
    p.shape(svgShape);
    await screenshot();
  });

  // ── Translate only (x, y; no scale, default CORNER align) ─────────────────
  visualTest('imported SVG placement translate only', async (p, screenshot) => {
    setup(p);
    const svgShape = await loadFixture(p, 'placement-shape');
    p.background(200);
    p.shape(svgShape, 50, 50);
    await screenshot();
  });

  // ── Uniform scale ──────────────────────────────────────────────────────────
  visualTest('imported SVG placement uniform scale', async (p, screenshot) => {
    setup(p);
    const svgShape = await loadFixture(p, 'placement-shape');
    p.background(200);
    p.shape(svgShape, 50, 50, { scale: 0.5 });
    await screenshot();
  });

  // ── Non-uniform scale { x, y } ────────────────────────────────────────────
  visualTest('imported SVG placement non-uniform scale', async (p, screenshot) => {
    setup(p);
    const svgShape = await loadFixture(p, 'placement-shape');
    p.background(200);
    p.shape(svgShape, 20, 40, { scale: { x: 0.8, y: 0.5 } });
    await screenshot();
  });

  // ── Scale 1 exact no-op (no placement transform should be applied) ─────────
  // scale: 1 is short-circuited inside the pipeline; push/pop should NOT fire.
  // The four-quadrant colors make any unintended shift immediately obvious.
  visualTest('imported SVG scale 1 no-op', async (p, screenshot) => {
    setup(p);
    const svgShape = await loadFixture(p, 'placement-shape');
    p.background(200);
    p.shape(svgShape, 0, 0, { scale: 1 });
    await screenshot();
  });

  // ── CORNER alignment with zero-origin SVG (offset is 0,0 → no-op) ─────────
  // placement-shape.svg has no explicit viewBox, so coordinateBounds = { x:0, y:0 }.
  // CORNER subtracts (0,0) → only the anchor translate fires.
  // The black L-marker at the shape's top-left corner should land at (40,40).
  visualTest('imported SVG alignment CORNER zero origin', async (p, screenshot) => {
    setup(p);
    const svgShape = await loadFixture(p, 'placement-shape');
    p.background(200);
    p.shape(svgShape, 40, 40, { align: p.CORNER, scale: 0.5 });
    await screenshot();
  });

  // ── CORNER alignment with non-zero viewBox origin ─────────────────────────
  // viewbox-offset.svg has viewBox="30 30 100 100". CORNER translates by (-30, -30)
  // so the shape's top-left corner lands at the given (x, y) point.
  visualTest('imported SVG alignment CORNER non-zero viewBox origin', async (p, screenshot) => {
    setup(p);
    const svgShape = await loadFixture(p, 'viewbox-offset');
    p.background(200);
    // Red L-marker at anchor point
    p.stroke(255, 0, 0);
    p.line(60, 50, 70, 60);
    p.line(70, 50, 60, 60);
    p.stroke(0);
    p.shape(svgShape, 65, 55, { align: p.CORNER, scale: 0.8 });
    await screenshot();
  });

  // ── CENTER alignment ───────────────────────────────────────────────────────
  // Shape's visual centre should land on (100, 100).
  // The white cross baked into placement-shape.svg marks its own centre (100,100),
  // which should align with the blue crosshair drawn on canvas.
  visualTest('imported SVG alignment CENTER', async (p, screenshot) => {
    setup(p);
    const svgShape = await loadFixture(p, 'placement-shape');
    p.background(200);
    // Blue crosshair at target centre (100,100) for visual verification
    p.stroke(0, 0, 255);
    p.line(100, 0, 100, 200);
    p.line(0, 100, 200, 100);
    p.stroke(0);
    p.shape(svgShape, 100, 100, { align: p.CENTER, scale: 0.6 });
    await screenshot();
  });

  // ── VIEWBOX alignment ──────────────────────────────────────────────────────
  // VIEWBOX always returns offsetX/Y = 0 (no alignment translate), only the
  // anchor translate fires.
  visualTest('imported SVG alignment VIEWBOX', async (p, screenshot) => {
    setup(p);
    const svgShape = await loadFixture(p, 'placement-shape');
    p.background(200);
    p.shape(svgShape, 20, 20, { align: p.VIEWBOX, scale: 0.5 });
    await screenshot();
  });

  // ── Transform isolation via push/pop ──────────────────────────────────────
  // A green rect drawn after shape() must appear at its own coordinates,
  // unaffected by the placement transforms.
  visualTest('imported SVG placement transform isolation', async (p, screenshot) => {
    setup(p);
    const svgShape = await loadFixture(p, 'placement-shape');
    p.background(200);
    p.shape(svgShape, 100, 100, { scale: 0.6, align: p.CENTER });

    // This rect must render at (10, 10), not shifted by the placement transform
    p.fill(0, 255, 0);
    p.rect(10, 10, 30, 30);

    await screenshot();
  });

});

// ─── viewBox edge cases — visual tests ────────────────────────────────────────
// Each fixture has an unusual but valid viewBox; we verify the importer
// reads coordinateBounds correctly AND that placement (CORNER/CENTER) works.

visualSuite('Shape Placement — viewBox edge cases', () => {

  function setup(p) {
    p.createCanvas(200, 200);
    p.background(220);
    p.stroke(0);
    p.strokeWeight(1);
  }

  async function loadFixture(p, name) {
    return p.loadSVG(`test/fixtures/svg/${name}.svg`);
  }

  // ── Negative x/y origin: viewBox="-50 -50 200 200" ────────────────────────
  // coordinateBounds = { x:-50, y:-50, width:200, height:200 }
  // CORNER alignment subtracts (-50,-50) → adds (50,50), so shape's top-left
  // lands at the anchor point.
  visualTest('viewBox negative origin — CORNER align', async (p, screenshot) => {
    setup(p);
    const svgShape = await loadFixture(p, 'viewbox-negative-origin');
    p.background(220);
    // Red L-marker at anchor (40,40)
    p.stroke(255, 0, 0); p.strokeWeight(1.5);
    p.line(40, 40, 40, 52); p.line(40, 40, 52, 40); p.stroke(0); p.strokeWeight(1);
    p.shape(svgShape, 40, 40, { align: p.CORNER, scale: 0.5 });
    await screenshot();
  });

  visualTest('viewBox negative origin — CENTER align', async (p, screenshot) => {
    setup(p);
    const svgShape = await loadFixture(p, 'viewbox-negative-origin');
    p.background(220);
    // Blue crosshair at canvas centre (100,100)
    p.stroke(0, 0, 255, 150); p.strokeWeight(1);
    p.line(100, 0, 100, 200); p.line(0, 100, 200, 100);
    p.stroke(0); p.strokeWeight(1);
    // With viewBox="-50 -50 200 200", the geometric centre in SVG-space is (50,50).
    // CENTER alignment offsets by -(x + w/2) = -(-50+100) = -50, -(y + h/2) = -50.
    // So the shape's centre lands on (100,100).
    p.shape(svgShape, 100, 100, { align: p.CENTER, scale: 0.5 });
    await screenshot();
  });

  // ── Fractional values: viewBox="0.5 1.5 99.5 98.5" ───────────────────────
  // Verifies that fractional parsing doesn't truncate and placement is accurate.
  visualTest('viewBox fractional values — CORNER align', async (p, screenshot) => {
    setup(p);
    const svgShape = await loadFixture(p, 'viewbox-fractional');
    p.background(220);
    p.stroke(255, 0, 0); p.strokeWeight(1.5);
    p.line(30, 30, 30, 42); p.line(30, 30, 42, 30); p.stroke(0); p.strokeWeight(1);
    p.shape(svgShape, 30, 30, { align: p.CORNER, scale: 0.8 });
    await screenshot();
  });

  // ── No viewBox: only width and height attrs (coordinateBounds from dimensions) ─
  // placement-shape.svg has width=200 height=200 and no viewBox.
  // coordinateBounds = { x:0, y:0, width:200, height:200 }
  // CORNER: no-op offset; CENTER: offsets by -(0+100)=-100 in each axis.
  visualTest('no viewBox width and height only — CENTER align', async (p, screenshot) => {
    setup(p);
    const svgShape = await loadFixture(p, 'placement-shape');
    p.background(220);
    p.stroke(0, 0, 255, 150); p.strokeWeight(1);
    p.line(100, 0, 100, 200); p.line(0, 100, 200, 100);
    p.stroke(0); p.strokeWeight(1);
    p.shape(svgShape, 100, 100, { align: p.CENTER, scale: 0.5 });
    await screenshot();
  });

  // ── No viewBox, no width and height: coordinateBounds is undefined ─────────
  // CENTER alignment on a record with no coordinateBounds should warn and
  // fall back gracefully (no crash). This case is pure-unit-test territory;
  // the visual output should still show the shape at the anchor position.
  visualTest('no viewBox no dimensions — CENTER falls back gracefully', async (p, screenshot) => {
    setup(p);
    // Create a minimal SVG with no viewBox and no w/h so coordinateBounds = undefined
    const record = p.createSVG(
      `<svg xmlns="http://www.w3.org/2000/svg"><rect x="10" y="10" width="80" height="80" fill="steelblue"/></svg>`
    );
    p.background(220);
    const warnings = [];
    const orig = console.warn;
    console.warn = (m) => { warnings.push(m); };
    p.shape(record, 50, 50, { align: p.CENTER });
    console.warn = orig;
    // Should have warned about missing coordinateBounds, but must not crash
    assert.isTrue(warnings.some(w => w.includes('CENTER alignment')));
    await screenshot();
  });

});
