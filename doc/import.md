# SVG Import API Guide

The SVG Import addon allows you to load and parse external SVG files/strings directly into p5.js, translating SVG elements and attributes into a `RecordedShape` object that can be rendered using p5's native Canvas rendering system.

> 📺 **Video Tutorials:** Check out the [p5.SVG Video Tutorial Playlist](https://www.youtube.com/playlist?list=PLfSK1t5BHz4c) on YouTube.

---

## 1. Importing from File (`loadSVG`)

`loadSVG` is an asynchronous method that fetches an SVG file from a URL or local file path, parses it, and returns the resulting `RecordedShape`.

### API Signature
```js
loadSVG(path, [successCallback], [failureCallback])
```
* **`path`** `(String)`: The path or URL of the SVG file.
* **`successCallback`** `(Function)` *(Optional)*: Function called with the `RecordedShape` object after successful loading and parsing.
* **`failureCallback`** `(Function)` *(Optional)*: Function called with the error object if loading fails.
* **Returns**: A `Promise` resolving to the `RecordedShape`.

> [!NOTE]
> Since `loadSVG` returns a standard JS `Promise`, the recommended approach is to use `async / await` to load the SVG asynchronously.

### Examples

<details>
<summary><b>Example: Using `async / await` in `setup()`</b></summary>

This approach loads the SVG file asynchronously when the sketch initializes.

```js
let botLogo;

async function setup() {
  createCanvas(500, 500);

  try {
    // loadSVG returns a promise; await the resolved RecordedShape
    botLogo = await loadSVG('assets/robot.svg');
    console.log('SVG Loaded successfully!');
  } catch (err) {
    console.error('Failed to load SVG:', err);
  }
}

function draw() {
  background(255);
  
  // Render the SVG once it is fully loaded
  if (botLogo) {
    shape(botLogo);
  } else {
    fill(100);
    text('Loading SVG...', 20, 30);
  }
}
```
</details>

---

## 2. Importing from String or DOM (`createSVG`)

If you have SVG content already available — either as a raw text string (e.g. from an API response, user input, or hardcoded markup) or as a live browser DOM element — you can parse it synchronously using `createSVG()`.

### API Signature
```js
createSVG(svgSource)
```
* **`svgSource`** `(String | SVGElement)`: Either:
  * A **raw SVG string** — the full SVG source code as text, or
  * An **SVG DOM element** — a browser `SVGElement` (e.g. obtained from `document.querySelector('svg')` or from `recordedShape.sourceSVG`).
* **Returns**: A `RecordedShape` object containing the parsed shape tree.

> [!NOTE]
> `createSVG` is **synchronous** — no `await` needed. Use it when you already have the SVG content in memory. For loading from a file or URL, use `loadSVG` instead.

### Examples

<details>
<summary><b>Example: Parsing an inline SVG string</b></summary>

```js
const inlineSvg = `
<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
  <rect x="20" y="20" width="160" height="160" fill="lightblue" stroke="blue" stroke-width="4" />
  <circle cx="100" cy="100" r="50" fill="yellow" />
</svg>
`;

let importedShape;

function setup() {
  createCanvas(400, 400);

  // Parse the SVG string directly — no async needed
  importedShape = createSVG(inlineSvg);
}

function draw() {
  background(240);
  shape(importedShape);
}
```
</details>

---

## 3. Accessing & Editing the SVG DOM (`sourceSVG`)

Every `RecordedShape` returned by `createSVG()` or `loadSVG()` stores a reference to its parsed DOM representation under the `.sourceSVG` property. This is a standard browser DOM `SVGElement`.

You can query this DOM using standard browser APIs (e.g., `querySelector()`, `getAttribute()`, `setAttribute()`) to inspect elements, read metadata, or modify properties dynamically.

### Examples

<details>
<summary><b>Example: Querying and Editing SVG DOM Attributes</b></summary>

In this example, we load an SVG file, access its underlying DOM elements to change their attributes, and then re-import the updated XML to render the modified shape on canvas.

```js
let botLogo;

async function setup() {
  createCanvas(500, 500);

  // 1. Load the original SVG file
  const record = await loadSVG('assets/robot.svg');

  // 2. Access the parsed DOM root
  const svgDom = record.sourceSVG;

  // 3. Query elements and modify attributes (e.g., change color of all circles to red)
  const circles = svgDom.querySelectorAll('circle');
  circles.forEach(circle => {
    circle.setAttribute('fill', '#ff0000');
    circle.setAttribute('stroke', '#000000');
  });

  // 4. Re-import the modified SVG DOM
  botLogo = createSVG(svgDom);

}

function draw() {
  background(255);

  if (botLogo) {
    shape(botLogo);
  } else {
    fill(100);
    text('Loading and modifying SVG...', 20, 30);
  }
}
```
</details>

---

## 4. Shape Placement, Alignment & Scaling (`shape`)

> [!NOTE]
> **Experimental Feature**: The shape placement and alignment options (`shape(record, x, y, options)`, `align`, `scale`, `CORNER`, `CENTER`, `VIEWBOX`) are experimental and actively evolving. We welcome community feedback, use cases, and suggestions to help refine these APIs!

When rendering an imported SVG with `shape()`, you can pass position coordinates `(x, y)` and an `options` configuration object to control alignment and scaling directly without manually wrapping calls in `push()`, `translate()`, `scale()`, and `pop()`.

### API Signature
```js
shape(record, [x], [y], [options])
```
* **`record`** `(RecordedShape)`: The imported shape object from `loadSVG()` or `createSVG()`.
* **`x`** `(Number)` *(Optional, default: `0`)*: The x-coordinate to anchor the shape.
* **`y`** `(Number)` *(Optional, default: `0`)*: The y-coordinate to anchor the shape.
* **`options`** `(Object)` *(Optional)*:
  * **`align`** `(String)`: Alignment mode for positioning. Options include:
    * **`CORNER`** *(or `'corner'`, default)*: Aligns the top-left corner of the shape's coordinate bounds to `(x, y)`. Normalizes any non-zero viewBox offsets (e.g., `viewBox="30 30 100 100"` or negative origins).
    * **`CENTER`** *(or `'center'`)*: Centers the shape's bounding box precisely at `(x, y)`.
    * **`VIEWBOX`** *(or `'viewbox'`)*: Preserves raw SVG coordinates without bounding box offset normalization, translating the origin `(0, 0)` directly to `(x, y)`.
  * **`scale`** `(Number | Object)`: Scaling factor to apply:
    * **Uniform scaling**: A single number (e.g. `{ scale: 0.5 }` or `{ scale: 2 }`).
    * **Non-uniform scaling**: An object with independent axes (e.g. `{ scale: { x: 1.5, y: 0.8 } }`).

### Coordinate Bounds Metadata
During import, `SVGImporter` extracts geometric bounds from the SVG root and attaches metadata to the `RecordedShape`:
* `record.viewBox`: Parsed `{ x, y, width, height }` from the SVG `viewBox` attribute.
* `record.width` / `record.height`: Dimensions defined on the `<svg>` tag.
* `record.coordinateBounds`: Resolved coordinate bounds `{ x, y, width, height }` used by `CORNER` and `CENTER` alignments.

### Transform Isolation
When `x`, `y`, `scale`, or non-zero alignment offsets are applied, `shape()` automatically wraps transformations inside `push()` and `pop()`. Subsequent drawing operations on the canvas remain completely unaffected.

---

### Placement & Alignment Examples

<details>
<summary><b>Example 1: Centering an Imported SVG on Canvas</b></summary>

Place the geometric center of an imported SVG directly at the center of the canvas:

```js
let icon;

async function setup() {
  createCanvas(400, 400);
  icon = await loadSVG('assets/star.svg');
}

function draw() {
  background(240);

  if (icon) {
    // Aligns the center of the SVG icon to canvas center (200, 200)
    shape(icon, width / 2, height / 2, {
      align: CENTER,
      scale: 0.75
    });
  }
}
```
</details>

<details>
<summary><b>Example 2: Comparing Alignment Modes (`CORNER`, `CENTER`, `VIEWBOX`)</b></summary>

```js
let logo;

async function setup() {
  createCanvas(600, 200);
  logo = await loadSVG('assets/logo.svg');
}

function draw() {
  background(245);

  if (!logo) return;

  // CORNER alignment
  shape(logo, 100, 100, {
    align: CORNER,
    scale: 0.8
  });

  noStroke();
  fill(255, 0, 0);
  circle(100, 100, 10);

  // CENTER alignment
  shape(logo, 300, 100, {
    align: CENTER,
    scale: 0.8
  });

  fill(0, 0, 255);
  circle(300, 100, 10);

  // VIEWBOX alignment
  shape(logo, 500, 100, {
    align: VIEWBOX,
    scale: 0.8
  });

  fill(0, 200, 0);
  circle(500, 100, 10);
}
```
</details>

<details>
<summary><b>Example 3: Non-Uniform Scaling & Grid Layout</b></summary>

```js
let flower;

async function setup() {
  createCanvas(400, 400);
  flower = await loadSVG('assets/flower.svg');
}

function draw() {
  background(255);
  if (!flower) return;

  // Render a 2x2 grid with different scaling factors and CENTER alignment
  const size = 100;
  for (let x = 100; x <= 300; x += size * 2) {
    for (let y = 100; y <= 300; y += size * 2) {
      shape(flower, x, y, {
        align: CENTER,
        scale: { x: 0.5, y: 0.8 } // Stretch vertically
      });
    }
  }
}
```
</details>

---

## 5. Features Supported & Rendering Details

The SVG Importer supports standard SVG elements and translates them directly to p5.js Shape commands:

* **Basic Primitives**: `<rect>`, `<circle>`, `<ellipse>`, `<line>`, `<polygon>`, `<polyline>`.
* **Path Data**: `<path>` elements with standard commands (`M`, `L`, `H`, `V`, `C`, `S`, `Q`, `T`, `A`, `Z` and their relative/implicit repeats).
* **Styles**: Resolves color/opacity inheritance, parsing `fill`, `stroke`, `stroke-width`, `opacity`, `fill-opacity`, `stroke-opacity`, `display`, and `visibility`. Supports both presentation attributes and CSS/inline styles.
* **Groups**: `<g>` elements are supported and preserve layout hierarchy.
* **Defs & Reuse**: `<use>` elements resolving references to symbols/paths defined in `<defs>`.
* **Transforms**: Matrix operations such as translations and scaling defined on elements are integrated using p5's matrix transforms.

### Limitations

* Text elements (`<text>`) are currently skipped.
* Image elements (`<image>`) are not yet supported in import.
* Clipping paths (`<clipPath>`) and clip masks are not yet supported.
* Complex filters, gradients, and patterns (`url(#...)`) are not yet supported.


