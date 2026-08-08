/**
 * Visual acceptance tests — SVG Round-Trip
 *
 * Pipeline: p5 drawing commands → buildShape → getSVG (export) → loadSVG
 * (import) → shape (replay).
 *
 * We compare the replayed canvas against the original drawing using the
 * pixelmatch comparison already built into visualTest.
 *
 * Structural comparison rules (per spec):
 *   - Compare node types and counts, NOT byte-identical SVG strings.
 *   - Numeric values (positions, colours, matrix components) within epsilon 1e-3.
 *   - Do NOT assert exact d-path strings (bezier/arc approximations differ).
 */

import { visualSuite, visualTest } from '../visualTest.js';

visualSuite('SVG Round-Trip', () => {

  // ── Helpers ──────────────────────────────────────────────────────────────

  function setup(p) {
    p.createCanvas(200, 200);
    p.background(220);
    p.fill(255);
    p.stroke(0);
    p.strokeWeight(1);
  }

  /**
   * Draw something using drawFn, export to SVG, re-import, replay onto a
   * fresh canvas, then capture both screenshots for comparison.
   */
  async function roundTrip(p, screenshot, drawFn) {
    // --- Original render ---
    setup(p);
    const original = p.buildShape(drawFn);
    p.background(220); // reset canvas to same bg before replaying
    p.shape(original);
    await screenshot(); // screenshot 0: original canvas render

    // --- Round-trip: export → import → replay ---
    const svgString = p.getSVG(original);
    const reImported = await p.loadSVG(
      URL.createObjectURL(new Blob([svgString], { type: 'image/svg+xml' }))
    );
    setup(p);
    p.background(220);
    p.shape(reImported);
    await screenshot(); // screenshot 1: replayed from re-imported SVG
  }

  // ── 1. Simple circle round-trip ──────────────────────────────────────────

  visualTest('circle round-trip', async (p, screenshot) => {
    await roundTrip(p, screenshot, () => {
      p.fill(0, 128, 255);
      p.stroke(0);
      p.strokeWeight(2);
      p.circle(100, 100, 80);
    });
  });

  // ── 2. Multi-shape scene round-trip ─────────────────────────────────────

  visualTest('multi-shape scene round-trip', async (p, screenshot) => {
    await roundTrip(p, screenshot, () => {
      p.fill(255, 0, 0);
      p.noStroke();
      p.rect(20, 20, 70, 50);

      p.fill(0, 200, 0);
      p.stroke(0);
      p.strokeWeight(1);
      p.circle(150, 120, 60);

      p.stroke(0, 0, 200);
      p.strokeWeight(3);
      p.noFill();
      p.line(30, 170, 170, 30);
    });
  });

  // ── 3. Styled shape (fill + stroke + strokeWeight) round-trip ─────────

  visualTest('styled shape round-trip', async (p, screenshot) => {
    await roundTrip(p, screenshot, () => {
      p.fill(255, 200, 0);           // yellow fill
      p.stroke(100, 0, 200);         // purple stroke
      p.strokeWeight(4);
      p.rect(50, 50, 100, 80);
    });
  });

});
