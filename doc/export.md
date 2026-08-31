# SVG Export API Guide

The SVG Export addon allows you to record your p5.js drawing commands and export them as high-quality, scalable SVG documents. You can capture sketches synchronously, dynamically across frames, or render previously recorded shapes back to the canvas.

> 📺 **Video Tutorials:** Check out the [p5.SVG Video Tutorial Playlist](https://www.youtube.com/playlist?list=PLfSK1t5BHz4c) on YouTube.

---

## 1. Functional Capture (`buildShape`)

`buildShape` is the easiest way to record a self-contained drawing block. It intercepts p5.js drawing commands within the callback and stores them.

### API Signature
```js
buildShape(callback, [options])
```
* **`callback`** `(Function)`: A function containing the drawing instructions.
* **`options`** `(Object)` *(Optional)*:
  * **`draw`** `(Boolean)`: If `true`, the drawing commands will be drawn onto the canvas in addition to being recorded. If `false` (default), they are only recorded silently without rendering.

### Examples

<details>
<summary><b>Example 1: Basic Silent Recording & Download</b></summary>

In this example, shapes are recorded silently (without rendering to the screen canvas) and saved as an SVG.

```js
function setup() {
  createCanvas(400, 400);

  // Record drawing commands silently
  const drawing = buildShape(() => {
    fill(255, 0, 0);
    rect(50, 50, 100, 100);
    circle(300, 300, 80);
  });

  // Save the SVG file
  saveSVG(drawing, 'my-drawing.svg');
}
```
</details>

<details>
<summary><b>Example 2: Recording and Rendering Simultaneously</b></summary>

By passing `{ draw: true }`, you can draw on the screen while recording.

```js
function setup() {
  createCanvas(400, 400);

  // Record drawing commands and render them on the screen canvas
  const drawing = buildShape(() => {
    background(240);
    strokeWeight(4);
    stroke(0);
    line(0, 0, width, height);
  }, { draw: true });

  // Save the SVG
  saveSVG(drawing, 'diagonal-line.svg');
}
```
</details>

---

## 2. Object-Oriented/Retained Capture (`createShape`)

If you want more granular control over when recording starts and stops—especially when operations span across multiple functions, events, or frames—you can use the `createShape()` API to instantiate a `RecordedShape` object.

### API Signature
```js
createShape()
```
Returns a new `RecordedShape` instance.

### `RecordedShape` Methods
* **`begin([options])`**: Starts recording drawing commands.
  * `options`: `{ draw: true/false }` (Defaults to `false`).
* **`end()`**: Stops recording. The captured tree is saved in the shape instance.

### Examples

<details>
<summary><b>Example: Start and End Recording via Events</b></summary>

You can begin recording in `setup` and end/save the recording when the user clicks the mouse.

```js
let customShape;

function setup() {
  createCanvas(400, 400);
  
  // Create the shape instance
  customShape = createShape();
  
  // Start recording
  customShape.begin({ draw: true });
  
  background(220);
  fill(0, 150, 255);
}

function draw() {
  // Record user drawing coordinates
  if (mouseIsPressed) {
    circle(mouseX, mouseY, 20);
  }
}

function keyPressed() {
  if (key === 's') {
    // End recording and save
    customShape.end();
    saveSVG(customShape, 'brush-stroke.svg');
    noLoop();
  }
}
```
</details>

---

## 3. Replaying Shapes (`shape`)

You can draw/replay a previously recorded shape object onto the screen canvas using the `shape()` function. This enables a retained graphics pipeline similar to processing `PShape`.

### API Signature
```js
shape(record)
```
* **`record`** `(RecordedShape)`: The shape object returned from `buildShape()` or `createShape()`.

### Examples

<details>
<summary><b>Example: Record Once, Replay Multiple Times with Transformations</b></summary>

This is highly efficient for repeating complex components with different translations or rotations.

```js
let starShape;

function setup() {
  createCanvas(400, 400);
  
  // Record the star shape once
  starShape = buildShape(() => {
    beginShape();
    vertex(0, -50);
    vertex(14, -20);
    vertex(47, -15);
    vertex(23, 7);
    vertex(29, 40);
    vertex(0, 25);
    vertex(-29, 40);
    vertex(-23, 7);
    vertex(-47, -15);
    vertex(-14, -20);
    endShape(CLOSE);
  });
}

function draw() {
  background(255);
  
  // Replay/render the shape at different positions with scaling/rotation
  push();
  translate(100, 100);
  fill(255, 204, 0);
  shape(starShape);
  pop();
  
  push();
  translate(250, 250);
  scale(1.5);
  fill(0, 204, 255);
  shape(starShape);
  pop();
}
```
</details>

---

## 4. Saving and Exporting API

You can export SVG documents either by triggering a **deferred frame capture** of your regular `draw()` loop or by exporting a **`RecordedShape` object** directly.

---

### `saveSVG`

Downloads the sketch or a recorded shape as an SVG file. `saveSVG` supports two modes: **Deferred Frame Export** and **Direct Shape Export**.

#### 1. Deferred Frame Export: `saveSVG([filename])`
Queues an automatic SVG export for a frame using p5.js lifecycle hooks (`predraw` and `postdraw`).

```js
saveSVG([filename])
```
* **`filename`** `(String)` *(Optional)*: The downloaded file name (defaults to `'drawing.svg'`).

**How it works & timing:**
* Shape recording automatically starts at `predraw` and stops at `postdraw`, exporting the complete SVG immediately after the frame finishes drawing. The `draw()` loop only runs once for the capture.
* **Calling in `setup()`**: Queues the export so that the very first frame of `draw()` is captured. Call `saveSVG()` in `setup()` if you want to capture the initial sketch output.
* **Calling in `draw()` or event handlers (`keyPressed`, `mousePressed`)**: Because `predraw` for the current frame has already finished when `draw()` runs, the export is automatically scheduled and captured on the **next frame**.

#### 2. Direct Shape Export: `saveSVG(record, [filename])`
Immediately exports an existing `RecordedShape` instance created with `buildShape()` or `createShape()`.

```js
saveSVG(record, [filename])
```
* **`record`** `(RecordedShape)`: The recorded shape object.
* **`filename`** `(String)` *(Optional)*: The downloaded file name (defaults to `'drawing.svg'`).

---

### `getSVG`
Returns the raw SVG XML string from a `RecordedShape`. Useful if you want to display it inline in the DOM or upload it to a server.

```js
getSVG(record)
```
* **`record`** `(RecordedShape)`: The recorded shape object.
* **Returns**: `String` containing the serialized SVG document.

---

### Examples

<details>
<summary><b>Example 1: Deferred Export from setup() (First Frame)</b></summary>

Calling `saveSVG()` in `setup()` captures the canvas during the first `draw()` cycle and downloads it automatically:

```js
function setup() {
  createCanvas(400, 400);
  // Queue deferred export for the first frame
  saveSVG('first-frame.svg');
}

function draw() {
  background(240);
  fill(255, 100, 100);
  stroke(0);
  strokeWeight(2);
  circle(200, 200, 150);
  rect(150, 150, 100, 100);
  noLoop();
}
```
</details>

<details>
<summary><b>Example 2: Deferred Export Triggered by User Interaction</b></summary>

Calling `saveSVG()` from an event or inside `draw()` captures the full next frame:

```js
function setup() {
  createCanvas(400, 400);
}

function draw() {
  background(220);
  fill(0, 120, 255);
  circle(mouseX, mouseY, 50);
}

function keyPressed() {
  if (key === 's') {
    // Queues export for the next frame
    saveSVG('interactive-frame.svg');
  }
}
```
</details>

<details>
<summary><b>Example 3: Direct RecordedShape Export</b></summary>

Exporting a specific recorded shape immediately:

```js
function setup() {
  createCanvas(400, 400);

  const customDrawing = buildShape(() => {
    fill(0, 200, 100);
    rect(50, 50, 200, 200);
  });

  // Exports immediately
  saveSVG(customDrawing, 'direct-shape.svg');
}
```
</details>

<details>
<summary><b>Example 4: Getting SVG String for inline DOM injection</b></summary>

```js
function setup() {
  createCanvas(200, 200);

  const star = buildShape(() => {
    circle(100, 100, 50);
  });

  const xmlString = getSVG(star);
  console.log(xmlString); // Outputs: <svg ...><circle ...></svg>
  
  // You could insert this directly into an HTML element:
  // document.getElementById('svg-container').innerHTML = xmlString;
}
```
</details>

---

## 5. Features Supported & Limitations

The SVG Exporter intercepts p5.js drawing commands and translates them into native SVG elements:

* **Basic Primitives**: `rect()`, `circle()`, `ellipse()`, `line()`, `point()`, `triangle()`, `quad()`, `arc()`.
* **Complex Paths**: Custom shapes generated with `beginShape()`, `vertex()`, `bezierVertex()`, `splineVertex()`, `beginContour()`, `endContour()`, and `endShape()`.
* **Images**: `image()` drawing commands, exported as embedded base64 Data URLs.
* **Transforms & State**: Matrix transformations (`translate()`, `rotate()`, `scale()`, `applyMatrix()`), state scoping (`push()`, `pop()`), and color/stroke styling (`fill()`, `stroke()`, `strokeWeight()`, `background()`, `clear()`).

### Limitations

* **Text**: `text()` drawing commands and custom typography font styling are not currently supported.
* **Clipping**: Canvas mask/clipping regions created using `clip()` are not yet supported.
* **Filters & WebGL**: WebGL 3D rendering, custom shaders, and canvas blend modes/filters are not supported.

