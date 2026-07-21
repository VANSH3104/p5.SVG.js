# p5.svg-export / p5.svg-import

> [!WARNING]
> This repository is currently in active development. API names, design, and behavior are subject to change.

Native SVG export and import support for p5.js using the Shape system and PrimitiveVisitor architecture.

This project is being developed as a GSoC 2026 project and focuses on building a retained rendering pipeline for exporting and importing p5.js sketches as scalable SVG documents.

Try it live in the [p5.js Web Editor](https://editor.p5js.org/vanshkabra05/full/45caLrfVy).

---

## Documentation Guides

For detailed explanations of the APIs along with comprehensive examples, check out the documentation guides:
- [SVG Export API Guide](doc/export.md)
- [SVG Import API Guide](doc/import.md)

---

## Quick Start

### 1. Include the Addon Libraries
Include the p5.js library and the `p5.svg-io` addons in your project's `index.html` file:

```html
<!-- index.html -->
<!DOCTYPE html>
<html>
<head>
  <title>p5.SVG Example</title>
  <!-- Load p5.js -->
  <script src="https://raw.esm.sh/pr/p5@02bcb7e/lib/p5.min.js"></script>
  
  <!-- Load p5.SVG Export Addon -->
  <script src="https://cdn.jsdelivr.net/npm/p5.svg-io@0.1.3/dist/p5.svgExport.min.js"></script>
  <!-- Load p5.SVG Import Addon -->
  <script src="https://cdn.jsdelivr.net/npm/p5.svg-io@0.1.3/dist/p5.svgImport.min.js"></script>
</head>
<body>
  <script src="sketch.js"></script>
</body>
</html>
```

### 2. Exporting SVGs (`sketch.js`)
Use `buildShape` to record commands, `shape` to render the record, and `saveSVG` to export as a file:

```js
// sketch.js
function setup() {
  createCanvas(400, 400);

  // Record drawing commands using buildShape
  const drawing = buildShape(() => {
    fill(255, 0, 0);
    circle(100, 100, 50);
    rect(200, 100, 80, 60);
  });

  // Render the recorded shape on the canvas
  shape(drawing);

  // Save the recorded drawing as an SVG
  saveSVG(drawing, 'my-art.svg');
}
```

### 3. Importing SVGs (`sketch.js`)
Use `loadSVG` asynchronously to import an external SVG file and draw it onto the canvas:

```js
// sketch.js
let botLogo;

async function setup() {
  createCanvas(500, 500);

  try {
    // loadSVG returns a promise; await the resolved RecordedShape
    botLogo = await loadSVG('assets/robot.svg');
  } catch (err) {
    console.error('Failed to load SVG:', err);
  }
}

function draw() {
  background(255);
  if (botLogo) {
    shape(botLogo);
  }
}
```

---

## Design Document

The complete architecture and implementation planning document is available here:

[Google Doc - p5.svg-export Design Document](https://docs.google.com/document/d/1In7b9c1mGdPZNsAf_oS53gEQ0jcRGJ4KQkb749_bqFY/edit?usp=sharing)

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

This will run Rollup to bundle the addons, outputting the results to the `dist/` directory.
