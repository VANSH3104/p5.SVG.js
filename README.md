# p5.svg-export / p5.svg-import

> [!WARNING]
> This repository is currently in active development. API names, design, and behavior are subject to change.

Native SVG export and import support for p5.js using the Shape system and PrimitiveVisitor architecture.

This project is being developed as a GSoC 2026 project and focuses on building a retained rendering pipeline for exporting and importing p5.js sketches as scalable SVG documents.

Try it live in the [p5.js Web Editor](https://editor.p5js.org/vanshkabra05/full/45caLrfVy).

---

## Quick Start

Include the p5.js library and the `p5.svgExport.min.js` addon in your project's `index.html` file:

```html
<!-- index.html -->
<!DOCTYPE html>
<html>
<head>
  <title>p5.SVG Export Example</title>
  <!-- Load p5.js -->
  <script src="https://raw.esm.sh/pr/p5@02bcb7e/lib/p5.min.js"></script>
  <!-- Load p5.SVG Export Addon -->
  <script src="https://cdn.jsdelivr.net/npm/p5.svg-io@0.1.2/dist/p5.svgExport.min.js"></script>
</head>
<body>
  <script src="sketch.js"></script>
</body>
</html>
```

Next, write your p5.js drawing code. Be sure to call `buildShape` and other addon functions inside `setup()`, `draw()`, or event callbacks once the p5.js canvas has been initialized:

```js
// sketch.js
function setup() {
  createCanvas(400, 400);

  // Record drawing commands using buildShape
  const drawing = buildShape(() => {
    circle(100, 100, 50);
    rect(200, 100, 80, 60);
  });

  // Save the recorded drawing as an SVG
  saveSVG(drawing, 'my-art.svg');
}
```

---

## Guide: SVG Recording Options

`p5.SVG.js` provides two distinct ways to capture your drawing instructions as SVGs:

### 1. Functional Capture (`buildShape`)
Best for synchronous, self-contained drawing blocks. You pass a callback containing your drawing code. **Always call `buildShape` inside a p5.js loop or function context after the canvas is created.**

```js
function setup() {
  createCanvas(400, 400);

  const drawing = buildShape(() => {
    background(255);
    fill(255, 0, 0);
    circle(100, 100, 50);
  });

  saveSVG(drawing, 'my-art.svg');
}
```

### 2. State-Based Capture (`beginRecord` & `endRecord`)
Best when drawing operations span multiple functions, are event-driven, or when wrapping code in a callback is not practical.

```js
function setup() {
  createCanvas(400, 400);
  
  // Start recording
  beginRecord();
  
  background(240);
  fill(0, 0, 255);
  rect(50, 50, 100, 100);
}

function mousePressed() {
  // Stop recording and download the SVG
  const record = endRecord();
  if (record) {
    saveSVG(record, 'interactive-sketch.svg');
  }
}
```

### 3. Retrieving the Raw SVG String (`getSVG`)
If you want to access the raw SVG XML string directly (e.g., to display it on the page or send it to a server) instead of triggering a file download:

```js
function setup() {
  createCanvas(400, 400);

  const drawing = buildShape(() => {
    circle(100, 100, 50);
  });

  const svgString = getSVG(drawing);
  console.log(svgString); // "<svg ...>...</svg>"
}
```

### Best Practices & Warnings

- **Mismatched Pairs:** Each call to `beginRecord()` should have a corresponding `endRecord()`. Calling `endRecord()` without first starting a recording will log a warning and return `null`.
- **No Nesting:** Do not call `beginRecord()` while a recording is already active. Doing so will automatically stop and discard the previous recording, issuing a console warning.
- **Record Nodes:** `endRecord()` returns a recorded tree structure. You must pass this object to `saveSVG(record, filename)` or `getSVG(record)` to generate/download the SVG.
- **No Hidden Line Detection:** This addon does not perform hidden line detection. To remove obscured lines/shapes in the exported SVG, you will need to process the file using an external tool.

---

## Design Document

The complete architecture and implementation planning document is available here:

[Google Doc - p5.svg-export Design Document](https://docs.google.com/document/d/1In7b9c1mGdPZNsAf_oS53gEQ0jcRGJ4KQkb749_bqFY/edit?usp=sharing)

The document covers:

- recording architecture
- transform tracking
- flat vs hierarchical recording
- visitor pattern export
- retained rendering structure
- future extensibility

---

## Local Development

To get started with local development:

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Build the bundle:**
   ```bash
   npm run build
   ```

This will run Rollup to bundle the addon, outputting the result to the `dist/` directory.
