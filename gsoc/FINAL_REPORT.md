# GSoC 2026: Native SVG Import and Export for p5.js

## 1. Introduction

p5.js provides an intuitive API for drawing graphics to an HTML5 `<canvas>`, but standard canvas rendering is raster-based and pixelated when scaled or sent to digital fabrication tools like pen plotters, laser cutters, or vector editors.

SVG provides a scalable, XML-based vector representation. During Google Summer of Code 2026 with the Processing Foundation, my project built native, retained SVG export and import capabilities for p5.js designed directly around p5's new `p5.Shape` architecture.

---

## 2. Project Goals

When I started the summer, the primary objective was to move away from legacy canvas-interception techniques and leverage p5.js's emerging shape infrastructure to build a unified, retained vector graphics ecosystem. The goal was to allow graphics to move fluidly between raster-oriented creative coding workflows and vector-based editing tools.

### Combined Vision
I aimed to create a complete round-trip pipeline (`p5 Sketch ↔ p5.Shape ↔ SVG Document`) where sketches can be recorded into native vector documents, and external SVG vector graphics can be imported and rendered onto the canvas using p5's shape representation.

### SVG Export Goals:
- **Command Interception & Retained Recording**: Intercept p5 drawing operations during sketch execution via functional (`buildShape`) and event-driven (`createShape`) APIs.
- **State & Transform Scoping**: Capture, preserve, and scope transformation matrices (`translate`, `rotate`, `scale`, `applyMatrix`) and state management (`push`, `pop`) using browser `DOMMatrix` instances.
- **AST Visitor Serialization**: Convert recorded geometry, styles, background colors, and embedded base64 image data into clean, well-structured SVG XML elements using an AST visitor pattern (`SVGVisitor`).
- **Deferred Export**: Provide clean file saving (`saveSVG`) and raw string generation (`getSVG`) without canvas clearing artifacts.

### SVG Import Goals:
- **File & String Parsing**: Support asynchronous loading of external SVG files (`loadSVG`) as well as synchronous parsing of inline SVG strings and DOM elements (`createSVG`).
- **Element & Group Traversal**: Translate standard SVG elements (`<rect>`, `<circle>`, `<ellipse>`, `<line>`, `<polygon>`, `<polyline>`, `<path>`, `<g>`) into internal `p5.Shape` structures.
- **Defs, Use & Symbol Resolution**: Pre-index elements with `id` attributes to resolve `<use>` references pointing to `<defs>` or `<symbol>` templates.
- **Complex Path Parsing**: Implement a robust tokenizer and state machine to process path commands (`M`, `L`, `H`, `V`, `C`, `S`, `Q`, `T`, `A`, `Z`).
- **Arc-to-Bézier Conversion**: Implement an elliptical arc parameterization converter to translate SVG arc commands (`A`/`a`) into cubic Bézier curve segments compatible with `p5.Shape`.
- **Style & Inheritance Resolution**: Resolve styles across presentation attributes, inline CSS, parent group inheritance, `currentColor`, and opacity rules (`StyleResolver`).
- **Editable SVG DOM**: Expose the parsed SVG DOM root (`.sourceSVG`) on returned shape objects, allowing developers to inspect or modify DOM properties before re-building shapes.

### Core Infrastructure & Testing Goals:
- **Upstream p5.js Core Contributions**: Extend p5's internal `Shape` class to support `Arc`, `Ellipse`, and `RoundRect` primitives.
- **Visual Regression & Automated Testing**: Establish unit tests and automated visual regression testing suites with round-trip verification.
- **Documentation & Design Specs**: Provide comprehensive documentation guides and maintain an architectural design document.

---

## 3. My Work

### Part 1: Extending the p5.Shape System

Before SVG export or import could cleanly translate vector primitives, the underlying `p5.Shape` infrastructure inside core p5.js needed to support primitives beyond basic polygons. A key part of my GSoC work involved contributing directly to the main `processing/p5.js` repository to expand its primitive shape representations.

#### Upstream Contributions to p5.js Core:

1. **[PR #8617: Add ShapePrimitive support for arcs and ellipses](https://github.com/processing/p5.js/pull/8617)** *(Merged April 11, 2026)*
   - **What changed**: Added explicit `ShapePrimitive` support for `arc()` and `ellipse()` inside p5's core `Shape` class.
   - **Why it matters**: Previously, curved primitives were coerced into standard polygon vertices or lacked explicit primitive representation in the shape system. Adding arc and ellipse primitives allowed the shape system to preserve exact geometric parameters (radius, start angle, stop angle, arc mode), which is essential when exporting to native `<ellipse>` or `<path>` elements in SVG.

2. **[PR #8899: Fix other shape usage of the Shape class and add RoundRect Primitive](https://github.com/processing/p5.js/pull/8899)** *(Merged June 11, 2026)*
   - **What changed**: Fixed inconsistencies in how primitives consumed `p5.Shape` internally and implemented a dedicated `RoundRect` primitive representation using corner radii calculations.
   - **Why it matters**: Rounded rectangles (`rect(x, y, w, h, detailX, detailY)`) are extremely common in both p5 sketches and SVG markup (`<rect rx="..." ry="...">`). Adding `RoundRect` primitive support ensured that rounded corners could be parsed and exported cleanly as native `<rect rx="" ry="">` attributes rather than approximating corners as dense line segments.

---

### Part 2: SVG Export

The export pipeline records p5 drawing commands during sketch execution and converts the recorded geometry tree into an SVG document.

#### Recording Architecture:
Rather than writing an immediate string builder or attempting to read raw pixels from the canvas, I implemented a retained node tree structure (`NodeBase`, `ScopeNode`, `ShapeNode`, `BackgroundNode`, `ClearNode`, `ImageNode`) managed by `ShapeRecorder` ([src/p5.ShapeRecorder.js](https://github.com/VANSH3104/p5.SVG.js/blob/main/src/p5.ShapeRecorder.js)). I initially drafted this design in our project [Design Document](https://docs.google.com/document/d/1In7b9c1mGdPZNsAf_oS53gEQ0jcRGJ4KQkb749_bqFY/edit?usp=sharing).

`p5 Sketch Execution → ShapeRecorder → Retained Tree → SVGVisitor → Serialized SVG Document / File Download`

#### Key Implementation Details:
- **Functional & Retained Recording**: `buildShape(callback, options)` provides synchronous callback recording, while `createShape()` returns a `RecordedShape` instance whose recording can be started (`.begin()`) and ended (`.end()`) across frames or user events.
- **Deferred Export (`saveSVG`)**: Skips canvas clearing artifacts and defers SVG serialization until the shape recording is complete.
- **Transform Scoping**: Uses a custom `TransformStack` backed by browser `DOMMatrix` instances. `push()` and `pop()` wrap operations in `ScopeNode` instances, mapping directly to `<g>` tags in SVG.
- **State Capture**: Captures fill, stroke, stroke weight, stroke cap, and blend state at the precise moment a shape is drawn.
- **Primitive Visitor (`SVGVisitor`)**: Converts recorded node types to native SVG elements (`<rect>`, `<circle>`, `<ellipse>`, `<line>`, `<polyline>`, `<path>`, `<image>`). Base64 Data URLs are generated for `image()` calls.
- **Export Confidence Milestone**: Exporting the complex falling leaf generative sketch ([`falling-leaf.svg`](showcase/falling-leaf.svg)) was a key moment for me. When it exported cleanly with thousands of organic curved paths and vertices without errors, it gave me full confidence that the export pipeline works properly.

---

### Part 3: SVG Import

The import pipeline translates external SVG files or XML strings into a `RecordedShape` object that can be rendered onto a p5 canvas using `shape(importedShape)`.

#### Import Pipeline (`SVGImporter`):
1. **DOM Parsing**: Uses browser `DOMParser` to parse SVG strings into a live SVG DOM tree.
2. **Traversal & Node Indexing**: Scans elements recursively. Pre-indexes all elements with `id` attributes to handle `<use>` references to `<defs>` or `<symbol>` templates.
3. **Style Resolution (`StyleResolver`)**: Computes styles across presentation attributes (`fill="..."`), inline CSS (`style="..."`), and inherited parent group properties. Supports `currentColor`, opacity, and display rules.
4. **Transform Resolution (`TransformResolver`)**: Parses `transform` attributes (`translate`, `rotate`, `scale`, `matrix`) into `DOMMatrix` multiplications.
5. **Shape Construction**: Translates SVG elements (`<rect>`, `<circle>`, `<ellipse>`, `<line>`, `<polygon>`, `<polyline>`, `<path>`) into `p5.Shape` instances.

#### Editable SVG DOM (`.sourceSVG`):
Every imported `RecordedShape` exposes its underlying parsed DOM tree under `record.sourceSVG`. This allows users to inspect or modify attributes via standard DOM APIs before re-building the shape:

```js
const record = await loadSVG('assets/robot.svg');
record.sourceSVG.querySelectorAll('circle').forEach(c => c.setAttribute('fill', '#ff0000'));
const updatedShape = createSVG(record.sourceSVG);
```

---

### Part 4: SVG Path Handling

SVG path commands (`<path d="...">`) are far more complex than standard shape primitives. I built a dedicated path tokenizer and state machine parser ([src/p5.svgImport.js](https://github.com/VANSH3104/p5.SVG.js/blob/main/src/p5.svgImport.js)) to process path strings.

#### Supported Path Commands:
- **Move**: `M`, `m`
- **Line**: `L`, `l`, `H`, `h`, `V`, `v`
- **Cubic Bézier**: `C`, `c`, `S`, `s`
- **Quadratic Bézier**: `Q`, `q`, `T`, `t`
- **Elliptical Arc**: `A`, `a`
- **Close Path**: `Z`, `z`

#### Arc-to-Bézier Conversion:
The SVG specification defines elliptical arcs using **endpoint parameterization**:
`Arc(rx, ry, xAxisRotation, largeArcFlag, sweepFlag, x, y)`

However, canvas and `p5.Shape` systems require center parameterization or cubic Bézier curve segments.

I implemented an arc conversion algorithm that:
1. Translates SVG endpoint parameterization into center parameterization `(cx, cy, rx, ry, startAngle, deltaAngle)`.
2. Decomposes the arc into 1 to 4 cubic Bézier curve segments (each spanning ≤ 90°).
3. Converts each segment into `bezierVertex()` calls within the shape builder.
4. **Import Confidence Milestone**: Initially, I faced significant challenges with path handling, arc parameterizations, and CSS style resolution during import. But when the complex vector tiger artwork ([`tiger.svg`](showcase/tiger.svg)) parsed and rendered successfully onto the canvas, it gave me full confidence that our import parser and path handling work properly.

---

### Part 5: API and Usage

Here are practical code examples demonstrating the finalized API:

#### 1. Exporting a Sketch synchronously with `buildShape`:
```js
function setup() {
  createCanvas(400, 400);

  const drawing = buildShape(() => {
    fill(255, 100, 0);
    stroke(0);
    strokeWeight(2);
    rect(50, 50, 100, 100, 10);
    circle(250, 100, 80);
  });

  // Render on screen and save SVG
  shape(drawing);
  saveSVG(drawing, 'my-drawing.svg');
}
```

#### 2. Event-Driven Retained Recording with `createShape`:
```js
let userArt;

function setup() {
  createCanvas(400, 400);
  userArt = createShape();
  userArt.begin({ draw: true });
}

function draw() {
  if (mouseIsPressed) {
    fill(0, 150, 255);
    circle(mouseX, mouseY, 20);
  }
}

function keyPressed() {
  if (key === 's') {
    userArt.end();
    saveSVG(userArt, 'canvas-artwork.svg');
  }
}
```

#### 3. Importing and Rendering an SVG with `loadSVG`:
```js
let botLogo;

async function setup() {
  createCanvas(500, 500);
  try {
    botLogo = await loadSVG('assets/robot.svg');
  } catch (err) {
    console.error('Error loading SVG:', err);
  }
}

function draw() {
  background(240);
  if (botLogo) {
    shape(botLogo);
  }
}
```

---

### Part 6: Testing

To ensure reliability, I established two automated test suites configured in `vitest.config.js` running in headless Chrome via WebdriverIO.

1. **Unit Tests (`test/unit/core`)**:
   - `ShapeRecorder.js`: Validates node hierarchy creation, transform stack pushes/pops, and interceptor cleanup.
   - `SVGVisitor.js`: Verifies serialization of shape nodes into valid SVG XML.
   - `SVGImporterFull.js`: Tests XML parsing, style resolution, path command tokenization, and `<use>`/`<defs>` referencing.
   - `TransformStack.js`: Validates matrix multiplication accuracy.

2. **Visual Regression Tests (`test/visual`)**:
   - Uses `pixelmatch` to compare canvas renderings of recorded and imported shapes against baseline reference screenshots.
   - **Round-Trip Tests (`svgRoundTrip.js`)**: Validates the full cycle: `p5 Sketch -> SVG Export -> SVG Import -> Canvas Render`. The resulting canvas output is pixel-matched against the original canvas.

---

### Part 7: Community Testing and Feedback

Throughout the summer, I prioritized active community testing and feedback. I reached out directly to creative coders, artists, and educators on Discord, Discourse, and via email to get real-world testing on the export and import workflows.

I had valuable discussions with community members like **Sophia (fractalkitty)**, who tested exported SVGs on physical pen plotters, and **Craig S. Kaplan**, who provided key insights into API design and vector workflows. I actively pitched design ideas and API concepts to my mentors, **Claudine** and **Dave**, and we brainstormed together during weekly check-ins to refine the user experience.


---

### Part 8: Upstream Contributions & Issue Tracking

The development was organized into major feature areas tracked directly on GitHub:

#### Core p5.js Upstream Contributions:
- **[PR #8617](https://github.com/processing/p5.js/pull/8617)**: Add ShapePrimitive support for arcs and ellipses (Merged April 11, 2026).
- **[PR #8899](https://github.com/processing/p5.js/pull/8899)**: Fix shape usage of Shape class and add RoundRect primitive (Merged June 11, 2026).

#### Standalone Addon Repository Tracking (`p5.SVG.js`):
Most of the project PRs and implementation milestones were organized and tracked under these two master GitHub issue threads:
- **[Issue #25: SVG Import Architecture & Implementation Tracking](https://github.com/VANSH3104/p5.SVG.js/issues/25)**: Served as the primary hub for SVG import development, path command tokenization, arc-to-Bézier conversion, style inheritance, `<use>` / `<defs>` resolution, and DOM manipulation APIs.
- **[Issue #4: SVG Export & Shape System Integration Tracking](https://github.com/VANSH3104/p5.SVG.js/issues/4)**: Tracked the retained shape recording pipeline, `TransformStack` scoping, adapter interceptors, image Data URL encoding, and deferred `saveSVG` execution.

---

### Part 9: Blogs and Community Updates

I documented the evolution, technical decisions, and challenges of the project throughout GSoC on my Hashnode blog and shared testing updates with the Processing Foundation community on Discourse to gather user feedback:

- **GSoC Development Blog**: [vansh3104.hashnode.dev](https://vansh3104.hashnode.dev): I initially planned to post regular development blogs throughout the summer; while I wasn't able to publish consistent posts every week, it documents my initial journey, early technical explorations, and core setup.
- **Processing Discourse Community Testing Threads**:
  - **[Help test SVG Export for p5.js (GSoC 2026)](https://discourse.processing.org/t/help-test-svg-export-for-p5-js-gsoc-2026/48850)**: Community testing call created to gather early feedback on SVG export performance, shape recording, and file saving.
  - **[Help test the SVG Import/Export Addon for p5.js (GSoC 2026)](https://discourse.processing.org/t/help-test-the-svg-import-export-addon-for-p5-js-gsoc-2026/49019)**: Community post created for user feedback and testing on SVG import capabilities, path parsing, and style resolution.

---

### Part 10: Current State

Here is an honest summary of the project status at the conclusion of GSoC 2026:

| Component | Status | Notes |
| :--- | :--- | :--- |
| **SVG Export** | Complete | Supports primitives, paths, styles, transforms, background, clear, and images. |
| **SVG Import** | Complete | Parses XML strings and URLs; supports shapes, paths, groups, defs, and use tags. |
| **Shape Primitives** | Complete | Rect, circle, ellipse, line, point, triangle, quad, arc, roundRect. |
| **SVG Path Commands** | Complete | Full support for M, L, H, V, C, S, Q, T, A, Z (relative & absolute). |
| **Arc Parameterization**| Complete | Elliptical arcs converted to cubic Bézier curve segments. |
| **Transform Stack** | Complete | DOMMatrix-backed scoping (`push`/`pop`, `translate`, `rotate`, `scale`, `applyMatrix`). |
| **Style Resolution** | Complete | Resolves fill, stroke, stroke-width, stroke-cap, opacity, inheritance, and `currentColor`. |
| **Testing Infrastructure** | Complete | Vitest unit tests + pixelmatch visual regression & round-trip tests. |
| **Documentation** | Complete | Detailed export (`doc/export.md`) and import (`doc/import.md`) API guides. |

---

### Part 11: Known Limitations

To keep the report grounded and accurate, here are the current limitations:
- **Text Elements (`<text>`)**: Drawing text via `text()` or importing SVG `<text>` elements is not supported. Converting fonts to vector path outlines requires heavy third-party font parsers (e.g. opentype.js) which was outside the scope of core shape recording.
- **Clipping Paths (`<clipPath>`)**: Canvas masking and SVG `<clipPath>` tags are not currently parsed or exported.
- **Gradients & Filters**: Complex SVG paint servers (`url(#gradientId)`), patterns, and CSS filters/shaders are skipped during import.
- **WebGL Mode**: The addon targets 2D renderer workflows; 3D WebGL scenes are not supported.

---

### Part 12: Future Work

For future contributors interested in building upon `p5.SVG.js`:
1. **Font & Text Outline Conversion**: Integrate a lightweight font parser to convert `text()` calls into vector paths so text can be exported to SVG without relying on system fonts.
2. **Clipping Mask Support**: Map p5's `clip()` operations to SVG `<clipPath>` definitions.
3. **Gradient & Pattern Fill Resolution**: Add support for linear/radial gradients and SVG `<pattern>` fills in `StyleResolver`.
4. **Performance Optimization for Complex SVGs**: Implement path simplification and chunked parsing for giant SVG files containing tens of thousands of path nodes.

---

### Part 13: Technical Things I Learned

Working on this project was a fantastic engineering experience. Some of the key technical areas I gained deep hands-on experience with include:
- **Geometry & Computational Math**: Learning the mathematics behind converting SVG elliptical arc endpoint parameterizations into cubic Bézier curves using center parameterization and transformation matrices.
- **Learning p5.js Core Internals**: Gained a deep, hands-on understanding of p5.js's internal renderer architecture, method dispatch, and shape infrastructure.
- **Parser & AST Architecture**: Building path tokenizers and implementing the Visitor pattern to convert node trees into XML strings.
- **Browser & Visual Testing**: Setting up headless browser testing with Vitest, WebdriverIO, and pixelmatch to automate visual regression checks.
- **Open Source Collaboration**: Contributing upstream to core `p5.js`, participating in code reviews, and refining APIs based on community feedback.

---

### Part 14: Challenges

#### Challenge 1: Designing `ShapeRecorder` as the Central API for Import & Export
Designing a cohesive architecture that bridges exporting procedural p5 sketches and importing external SVG files required careful API design.

- **The Design Problem**: In p5.js, canvas drawing commands execute immediately without building an underlying shape tree. Exporting requires intercepting drawing operations and transform state, while importing requires parsing XML elements (`<rect>`, `<path>`, `<g>`) into a structure p5 can replay on canvas. Designing a single recorder mechanism capable of serving both import and export without duplicating rendering logic was a core challenge.
- **How We Approached It**: We made `ShapeRecorder` and its retained node tree the central foundation for the entire addon. During export, `ShapeRecorder` intercepts p5 drawing commands (`rect()`, `circle()`, `translate()`) and constructs a retained node hierarchy (`ScopeNode`, `ShapeNode`). During import, `SVGImporter` parses SVG XML elements directly into the same `ShapeNode` tree structure. Making `ShapeRecorder` the single central representation for both workflows provided a unified geometry model and consistent API foundation for `shape()`.

#### Challenge 2: Visual Testing & SVG Round-Trip Verification
Evaluating whether SVG import and export work correctly cannot be done through standard text assertions alone; vector graphics require visual verification.

- **The Problem**: Writing unit tests for XML string output is brittle because attribute order can vary, and subtle rendering bugs (like arc endpoint misalignments or transform matrix scaling glitches) are only visible when rendered to pixels. At the same time, we wanted to avoid overly complex, brittle test setups.
- **How We Solved It**: We built a visual regression test harness using Vitest and `pixelmatch` running in headless Chrome via WebdriverIO. We created a dedicated round-trip test suite (`svgRoundTrip.js`):
  `p5 Canvas Sketch → SVG Export → SVG Import → Canvas Render → Pixel Comparison`
  By running pixel-by-pixel comparisons against baseline screenshots, we ensured that exporting a sketch to SVG and importing it back produced pixel-identical canvas results without requiring manual inspection.

---

### Part 15: Links

- **Main Repository**: [p5.SVG.js on GitHub](https://github.com/VANSH3104/p5.SVG.js)
- **Official Design Document**: [Google Doc: p5.svg-export Design Document](https://docs.google.com/document/d/1In7b9c1mGdPZNsAf_oS53gEQ0jcRGJ4KQkb749_bqFY/edit?tab=t.0)
- **Interactive Demos**: [p5.js Web Editor Collection](https://editor.p5js.org/vanshkabra05/collections/zFSI0veVz)
- **Main Tracking Issues**:
  - [Issue #25: SVG Import Architecture & Implementation Tracking](https://github.com/VANSH3104/p5.SVG.js/issues/25)
  - [Issue #4: SVG Export Architecture Tracking](https://github.com/VANSH3104/p5.SVG.js/issues/4)
- **Upstream p5.js Core PRs**:
  - [PR #8617: Arc and Ellipse ShapePrimitives](https://github.com/processing/p5.js/pull/8617)
  - [PR #8899: Shape class fixes & RoundRect Primitive](https://github.com/processing/p5.js/pull/8899)
- **GSoC Development Blog**: [vansh3104.hashnode.dev](https://vansh3104.hashnode.dev)
- **Community Testing Threads**:
  - [Help test SVG Export for p5.js on Processing Discourse](https://discourse.processing.org/t/help-test-svg-export-for-p5-js-gsoc-2026/48850)
  - [Help test the SVG Import/Export Addon for p5.js on Processing Discourse](https://discourse.processing.org/t/help-test-the-svg-import-export-addon-for-p5-js-gsoc-2026/49019)
- **Documentation Guides**:
  - [SVG Export API Guide](https://github.com/VANSH3104/p5.SVG.js/blob/main/doc/export.md)
  - [SVG Import API Guide](https://github.com/VANSH3104/p5.SVG.js/blob/main/doc/import.md)

---

### Part 16: Acknowledgements

I want to express my sincere gratitude to my mentors, [Claudine Chen](https://github.com/mingness) and [Dave Pagurek](https://github.com/davepagurek), as well as the Processing Foundation community and p5.js maintainers, for their invaluable guidance, weekly check-ins, architectural discussions, and constant encouragement throughout the summer. Working on p5.js under their mentorship has been an incredibly rewarding experience!
