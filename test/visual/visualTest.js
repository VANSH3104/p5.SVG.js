import { SVGExportAddon } from '../../src/p5.svgExport.js';
import { server } from 'vitest/browser';
import pixelmatch from 'pixelmatch';

const { readFile, writeFile } = server.commands;

// By how much can each color channel value (0-255) differ before
// we call it a mismatch? This should be large enough to not trigger
// based on antialiasing.
const COLOR_THRESHOLD = 25;

// The max side length to shrink test images down to before
// comparing, for performance.
const MAX_SIDE = 200; // Adjusted to match canvas size of 200x200 to prevent size differences

// The background color to composite test cases onto before
// diffing. This is used because canvas DIFFERENCE blend mode
// does not handle alpha well. This should be a color that is
// unlikely to be in the images originally.
const BG = '#F0F';

function writeImageFile(filename, base64Data) {
  const prefix = /^data:image\/\w+;base64,/;
  writeFile(filename, base64Data.replace(prefix, ''), 'base64');
}

function toBase64(img) {
  return img.canvas.toDataURL();
}

function escapeName(name) {
  // Encode slashes as `encodeURIComponent('/')`
  return name.replace(/\//g, '%2F');
}

let namePrefix = '';

// By how many pixels can the snapshot shift? This is
// often useful to accommodate different text rendering
// across environments.
let shiftThreshold = 2;

/**
 * A helper to define a category of visual tests.
 */
export function visualSuite(
  name,
  callback,
  { focus = false, skip = false, shiftThreshold: newShiftThreshold } = {}
) {
  let suiteFn = describe;
  if (focus) {
    suiteFn = suiteFn.only;
  }
  if (skip) {
    suiteFn = suiteFn.skip;
  }
  suiteFn(name, () => {
    let lastShiftThreshold;
    let lastPrefix;
    beforeAll(() => {
      lastPrefix = namePrefix;
      namePrefix += escapeName(name) + '/';
      lastShiftThreshold = shiftThreshold;
      if (newShiftThreshold !== undefined) {
        shiftThreshold = newShiftThreshold;
      }
    });

    callback();

    afterAll(() => {
      namePrefix = lastPrefix;
      shiftThreshold = lastShiftThreshold;
    });
  });
}

/**
 * Image Diff Algorithm for p5.js Visual Tests
 */
export function checkMatch(actual, expected, p5Instance) {
  let scale = Math.min(MAX_SIDE/expected.width, MAX_SIDE/expected.height);
  const ratio = expected.width / expected.height;
  const narrow = ratio !== 1;
  if (narrow) {
    scale *= 2;
  }

  for (const img of [actual, expected]) {
    img.resize(
      Math.ceil(img.width * scale),
      Math.ceil(img.height * scale)
    );
  }

  // Ensure both images have the same dimensions
  const width = expected.width;
  const height = expected.height;

  // Create canvases with background color
  const actualCanvas = p5Instance.createGraphics(width, height);
  const expectedCanvas = p5Instance.createGraphics(width, height);
  actualCanvas.pixelDensity(1);
  expectedCanvas.pixelDensity(1);

  actualCanvas.background(BG);
  expectedCanvas.background(BG);

  actualCanvas.image(actual, 0, 0);
  expectedCanvas.image(expected, 0, 0);

  // Load pixel data
  actualCanvas.loadPixels();
  expectedCanvas.loadPixels();

  // Create diff output canvas
  const diffCanvas = p5Instance.createGraphics(width, height);
  diffCanvas.pixelDensity(1);
  diffCanvas.loadPixels();

  // Run pixelmatch
  const diffCount = pixelmatch(
    actualCanvas.pixels,
    expectedCanvas.pixels,
    diffCanvas.pixels,
    width,
    height,
    {
      threshold: 0.1,
      includeAA: false,
      alpha: 0.1
    }
  );

  // If no differences, return early
  if (diffCount === 0) {
    actualCanvas.remove();
    expectedCanvas.remove();
    diffCanvas.updatePixels();
    return { ok: true, diff: diffCanvas };
  }

  // Post-process to identify and filter out isolated differences
  const visited = new Set();
  const clusterSizes = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pos = (y * width + x) * 4;

      // If this is a diff pixel (red in pixelmatch output) and not yet visited
      if (
        diffCanvas.pixels[pos] === 255 &&
        diffCanvas.pixels[pos + 1] === 0 &&
        diffCanvas.pixels[pos + 2] === 0 &&
        !visited.has(pos)
      ) {
        // Find the connected cluster size using BFS
        const clusterSize = findClusterSize(
          diffCanvas.pixels,
          x, y,
          width, height,
          1,
          visited
        );
        clusterSizes.push(clusterSize);
      }
    }
  }

  // Define significance thresholds
  const MIN_CLUSTER_SIZE = 4;  // Minimum pixels in a significant cluster
  const MAX_TOTAL_DIFF_PIXELS = 40;  // Maximum total different pixels

  // Determine if the differences are significant
  const nonLineShiftClusters = clusterSizes
    .filter(c => !c.isLineShift && c.size >= MIN_CLUSTER_SIZE);

  // Calculate significant differences excluding line shifts
  const significantDiffPixels = nonLineShiftClusters
    .reduce((sum, c) => sum + c.size, 0);

  // Update the diff canvas
  diffCanvas.updatePixels();

  // Clean up canvases
  actualCanvas.remove();
  expectedCanvas.remove();

  // Determine test result
  const ok = (
    diffCount === 0 ||
    (
      significantDiffPixels === 0 ||
      (
        (significantDiffPixels <= MAX_TOTAL_DIFF_PIXELS) &&
        (nonLineShiftClusters.length <= 2)  // Not too many significant clusters
      )
    )
  );

  return {
    ok,
    diff: diffCanvas,
    details: {
      totalDiffPixels: diffCount,
      significantDiffPixels,
      clusters: clusterSizes
    }
  };
}

/**
 * Find the size of a connected cluster of diff pixels using BFS
 */
function findClusterSize(
  pixels,
  startX, startY,
  width, height,
  radius,
  visited
) {
  const queue = [{ x: startX, y: startY }];
  let size = 0;
  const clusterPixels = [];

  while (queue.length > 0) {
    const { x, y } = queue.shift();
    const pos = (y * width + x) * 4;

    // Skip if already visited
    if (visited.has(pos)) continue;

    // Skip if not a diff pixel
    if (
      pixels[pos] !== 255 ||
      pixels[pos + 1] !== 0 ||
      pixels[pos + 2] !== 0
    ) continue;

    // Mark as visited
    visited.add(pos);
    size++;
    clusterPixels.push({ x, y });

    // Add neighbors to queue
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const nx = x + dx;
        const ny = y + dy;

        // Skip if out of bounds
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;

        // Skip if already visited
        const npos = (ny * width + nx) * 4;
        if (!visited.has(npos)) {
          queue.push({ x: nx, y: ny });
        }
      }
    }
  }

  let isLineShift = false;
  if (clusterPixels.length > 0) {
    // Count pixels with limited neighbors (line-like characteristic)
    let linelikePixels = 0;

    for (const { x, y } of clusterPixels) {
      // Count neighbors
      let neighbors = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue; // Skip self

          const nx = x + dx;
          const ny = y + dy;

          // Skip if out of bounds
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;

          const npos = (ny * width + nx) * 4;
          // Check if neighbor is a diff pixel
          if (
            pixels[npos] === 255 &&
            pixels[npos + 1] === 0 &&
            pixels[npos + 2] === 0
          ) {
            neighbors++;
          }
        }
      }

      // Line-like pixels typically have 1-2 neighbors
      if (neighbors <= 2) {
        linelikePixels++;
      }
    }

    // If most pixels (>80%) in the cluster have ≤2 neighbors, it's likely a line shift
    isLineShift = linelikePixels / clusterPixels.length > 0.8;
  }

  return {
    size,
    pixels: clusterPixels,
    isLineShift
  };
}

/**
 * A helper to define a visual test.
 */
export function visualTest(
  testName,
  callback,
  { focus = false, skip = false, timeout } = {}
) {
  let suiteFn = describe;
  if (focus) {
    suiteFn = suiteFn.only;
  }
  if (skip) {
    suiteFn = suiteFn.skip;
  }

  suiteFn(testName, function() {
    let name;
    let myp5;
    let lastDeviceRatio = window.devicePixelRatio;

    beforeAll(async function() {
      name = namePrefix + escapeName(testName);
      // Force everything to be 1x
      window.devicePixelRatio = 1;

      if (!window.p5) {
        const response = await fetch('https://cdn.jsdelivr.net/npm/p5@2.3.1/lib/p5.js');
        const code = await response.text();
        const modifiedCode = code + '\nwindow.p5 = p5; export default p5;';
        const blob = new Blob([modifiedCode], { type: 'application/javascript' });
        const url = URL.createObjectURL(blob);
        const { default: loadedP5 } = await import(/* @vite-ignore */ url);
        window.p5 = loadedP5;
        window.p5.registerAddon(SVGExportAddon);
      }

      return new Promise((res) => {
        myp5 = new window.p5(function(p) {
          p.setup = function() {
            res();
          };
        });
      });
    });

    afterAll(function() {
      window.devicePixelRatio = lastDeviceRatio;
      if (myp5) {
        myp5.remove();
      }
    });

    test('matches expected screenshots', async function() {
      let expectedScreenshots;
      try {
        const metadata = JSON.parse(await readFile(
          `./test/visual/screenshots/${name}/metadata.json`
        ));
        expectedScreenshots = metadata.numScreenshots;
      } catch (e) {
        expectedScreenshots = 0;
      }

      const actual = [];

      // Renders an SVG string into the p5 canvas and captures it as a p5.Image.
      // If svgString is not provided, captures the current canvas directly.
      const screenshot = async (svgString) => {
        if (!svgString) {
          const snap = await myp5.get();
          snap.pixelDensity(1);
          actual.push(snap);
          return;
        }
        const blob = new Blob([svgString], { type: 'image/svg+xml' });
        const url  = URL.createObjectURL(blob);

        const img = await new Promise((resolve, reject) => {
          const i = new Image();
          i.onload = () => resolve(i);
          i.onerror = () => reject(new Error('Failed to load SVG into HTMLImageElement'));
          i.src = url;
        });
        URL.revokeObjectURL(url);

        myp5.resetMatrix();
        myp5.clear();
        myp5.drawingContext.drawImage(img, 0, 0, myp5.width, myp5.height);

        const snap = await myp5.get();
        snap.pixelDensity(1);
        actual.push(snap);
      };

      // Generate screenshots
      await callback(myp5, screenshot);

      if (actual.length === 0) {
        throw new Error('No screenshots were generated. Check if your test generates screenshots correctly.');
      }
      if (expectedScreenshots && actual.length !== expectedScreenshots) {
        throw new Error(
          `Expected ${expectedScreenshots} screenshot(s) but generated ${actual.length}`
        );
      }
      if (!expectedScreenshots) {
        await writeFile(
          `./test/visual/screenshots/${name}/metadata.json`,
          JSON.stringify({ numScreenshots: actual.length }, null, 2)
        );
      }

      const expectedFilenames = actual.map(
        (_, i) => `./test/visual/screenshots/${name}/${i.toString().padStart(3, '0')}.png`
      );
      const expected = expectedScreenshots
        ? (
          await Promise.all(
            expectedFilenames.map(path => {
              return new Promise((resolve, reject) => {
                myp5.loadImage(
                  path.slice(2),
                  img => resolve(img),
                  err => reject(err)
                );
              });
            })
          )
        )
        : [];

      for (let i = 0; i < actual.length; i++) {
        const flatName = name.replace(/\//g, '-');
        const actualFilename = `./test/visual/actual-screenshots/${flatName}-${i.toString().padStart(3, '0')}.png`;
        if (expected[i]) {
          const result = checkMatch(actual[i], expected[i], myp5);
          // Always save the actual image before potentially throwing an error
          writeImageFile(actualFilename, toBase64(actual[i]));
          if (!result.ok) {
            const diffFilename = `./test/visual/actual-screenshots/${flatName}-${i.toString().padStart(3, '0')}-diff.png`;
            writeImageFile(diffFilename, toBase64(result.diff));
            throw new Error(
              `Screenshots do not match! Expected:\n${toBase64(expected[i])}\n\nReceived:\n${toBase64(actual[i])}\n\nDiff:\n${toBase64(result.diff)}\n\n` +
              'If this is unexpected, paste these URLs into your browser to inspect them.\n\n' +
              `If this change is expected, please delete the screenshots/${name} folder and run tests again to generate a new screenshot.`
            );
          }
        } else {
          writeImageFile(expectedFilenames[i], toBase64(actual[i]));
          writeImageFile(actualFilename, toBase64(actual[i]));
        }
      }
    }, timeout);
  });
}
