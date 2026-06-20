/**
 * Visual acceptance tests — Clears
 */

import { visualSuite, visualTest } from '../visualTest.js';

visualSuite('Clears', () => {

  // Helper to initialize a 200x200 canvas
  function setupCanvas(p) {
    p.createCanvas(200, 200);
  }

  // ── 1. Clear on the top ────────────────────────────────────────────────────
  visualTest('clear on the top', async (p, screenshot) => {
    setupCanvas(p);
    const record = p.buildShape(() => {
      // Draw red shape first
      p.fill(255, 0, 0);
      p.noStroke();
      p.rect(40, 60, 120, 80);
      
      // Clear it
      p.clear();
    });
    await screenshot(p.getSVG(record));
  });

  // ── 2. Clear in between the shapes with alpha ──────────────────────────────
  visualTest('clear in between the shapes with alpha', async (p, screenshot) => {
    setupCanvas(p);
    const record = p.buildShape(() => {
      // Draw red shape
      p.fill(255, 0, 0);
      p.noStroke();
      p.rect(20, 30, 120, 80);
      
      // Clear screen
      p.clear();
      
      // Draw blue shape with transparency
      p.fill(0, 0, 255, 128);
      p.rect(70, 90, 110, 70);
    });
    await screenshot(p.getSVG(record));
  });

  // ── 3. Clear in between the shapes and transform ───────────────────────────
  visualTest('clear in between the shapes and transform', async (p, screenshot) => {
    setupCanvas(p);
    const record = p.buildShape(() => {
      // Draw red shape
      p.fill(255, 0, 0);
      p.noStroke();
      p.rect(20, 30, 120, 80);
      
      // Translate canvas
      p.translate(40, 60);
      
      // Clear screen
      p.clear();
      
      // Draw blue shape - should still be translated by (40, 60)
      p.fill(0, 0, 255);
      p.rect(0, 0, 110, 70);
    });
    await screenshot(p.getSVG(record));
  });

  // ── 4. Clear and background together ───────────────────────────────────────
  visualTest('clear and background together', async (p, screenshot) => {
    setupCanvas(p);
    const record = p.buildShape(() => {
      // Draw shape
      p.fill(255, 0, 0);
      p.noStroke();
      p.rect(20, 30, 120, 80);
      
      // Clear
      p.clear();
      
      // Add background
      p.background(255, 200, 100); // Yellowish background
    });
    await screenshot(p.getSVG(record));
  });

  // ── 5. Transform and background with clear ──────────────────────────────────
  visualTest('transform and background with clear', async (p, screenshot) => {
    setupCanvas(p);
    const record = p.buildShape(() => {
      // Background and shape
      p.background(255, 0, 0); // Red background
      p.translate(40, 60);
      p.fill(0, 255, 0);
      p.rect(0, 0, 110, 70);
      
      // Clear everything
      p.clear();
      
      // Set new background
      p.background(0, 0, 255); // Blue background
    });
    await screenshot(p.getSVG(record));
  });

  // ── 6. Only clear ──────────────────────────────────────────────────────────
  visualTest('only clear', async (p, screenshot) => {
    setupCanvas(p);
    const record = p.buildShape(() => {
      p.clear();
    });
    await screenshot(p.getSVG(record));
  });

});
