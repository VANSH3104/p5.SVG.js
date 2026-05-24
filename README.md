# p5.svg-export / p5.svg-import

Native SVG export and import support for p5.js using the Shape system and PrimitiveVisitor architecture.

This project is being developed as a GSoC 2026 project and focuses on building a retained rendering pipeline for exporting and importing p5.js sketches as scalable SVG documents.

---

## Basic Usage

```js
const drawing = buildShape(() => {
  circle(100, 100, 50);
  rect(200, 100, 80, 60);
});

saveSVG(drawing, 'my-art.svg');
```

Users continue writing standard p5.js drawing code without learning a new API.

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
