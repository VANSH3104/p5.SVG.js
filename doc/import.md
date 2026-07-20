# SVG Import API Guide

The SVG Import addon allows you to load and parse external SVG files/strings directly into p5.js, translating SVG elements and attributes into a `RecordedShape` object that can be rendered using p5's native Canvas rendering system.

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

## 2. Importing from String (`createSVG`)

If you have SVG source code as a text string (e.g. from an API response, user input, or hardcoded), you can parse it synchronously using `createSVG()`.

### API Signature
```js
createSVG(svgText)
```
* **`svgText`** `(String)`: The raw SVG source code.
* **Returns**: A `RecordedShape` object containing the parsed shape tree.

### Examples

<details>
<summary><b>Example: Synchronously parsing and drawing inline SVG</b></summary>

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
  
  // Parse inline SVG text
  importedShape = createSVG(inlineSvg);
}

function draw() {
  background(240);
  
  // Render the imported SVG
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

## 4. Features Supported & Rendering Details

The SVG Importer supports standard SVG elements and translates them directly to p5.js Shape commands:

* **Basic Primitives**: `<rect>`, `<circle>`, `<ellipse>`, `<line>`, `<polygon>`, `<polyline>`.
* **Path Data**: `<path>` elements with standard commands (`M`, `L`, `H`, `V`, `C`, `S`, `Q`, `T`, `A`, `Z` and their relative/implicit repeats).
* **Styles**: Resolves color/opacity inheritance, parsing `fill`, `stroke`, `stroke-width`, `opacity`, `fill-opacity`, `stroke-opacity`, `display`, and `visibility`. Supports both presentation attributes and CSS/inline styles.
* **Groups**: `<g>` elements are supported and preserve layout hierarchy.
* **Defs & Reuse**: `<use>` elements resolving references to symbols/paths defined in `<defs>`.
* **Transforms**: Matrix operations such as translations and scaling defined on elements are integrated using p5's matrix transforms.

### Limitations

* Text elements (`<text>`) are currently skipped.
* Complex filters, gradients, and patterns (`url(#...)`) are not yet supported.
