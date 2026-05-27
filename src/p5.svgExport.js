export function SVGExportAddon(p5, fn, lifecycles) {
  fn._svgCaptureAdapters = function(){
    return {
      rect: {
        intercept(renderer, recorder) {
          const original = renderer.rect;
          if (!original) return null;

          renderer.rect = (...args) => {
            if (recorder.active) {
              const actualArgs = Array.isArray(args[0]) ? args[0] : args;
              const [x, y, w, h] = actualArgs;
              const p = recorder.p5;

              // Construct proper p5.Shape using Quad primitive (4 vertices)
              const shape = new p.constructor.Shape({
                position: new p.constructor.Vector(0, 0)
              });

              shape.beginShape(p.QUADS);
              shape.vertex({ x, y });
              shape.vertex({ x: x + w, y });
              shape.vertex({ x: x + w, y: y + h });
              shape.vertex({ x, y: y + h });
              shape.endShape(p.CLOSE);

              recorder.items.push({
                shape,
                state:
                  recorder.p5
                    ._svgCaptureState()
              });
            }
            return original.apply(renderer, args);
          };

          // Return restore function
          return () => {
            renderer.rect = original;
          };
        }
      },

      ellipse: {
        intercept(renderer, recorder) {
          const original = renderer.ellipse;
          if (!original) return null;

          renderer.ellipse = (...args) => {
            if (recorder.active) {
              const actualArgs = Array.isArray(args[0]) ? args[0] : args;
              const [x, y, w, h] = actualArgs;
              const p = recorder.p5;

              // Construct proper p5.Shape using native EllipsePrimitive
              const shape = new p.constructor.Shape({
                position: new p.constructor.Vector(0, 0)
              });

              shape.beginShape();
              shape.ellipsePrimitive(x, y, w, h);
              shape.endShape();

              recorder.items.push({
                shape,
                state:
                  recorder.p5
                    ._svgCaptureState()
              });
            }
            return original.apply(renderer, args);
          };

          // Return restore function
          return () => {
            renderer.ellipse = original;
          };
        }
      },

      triangle: {
        intercept(renderer, recorder) {
          const original = renderer.triangle;
          if (!original) return null;

          renderer.triangle = (...args) => {
            if (recorder.active) {
              const actualArgs = Array.isArray(args[0]) ? args[0] : args;
              console.log('Intercepted triangle with args:', actualArgs);
              const [x1, y1, x2, y2, x3, y3] = actualArgs;
              const p = recorder.p5;

              // Construct proper p5.Shape using native TRIANGLES primitive
              const shape = new p.constructor.Shape({
                position: new p.constructor.Vector(0, 0)
              });

              shape.beginShape(p.TRIANGLES);
              shape.vertex({ x: x1, y: y1 });
              shape.vertex({ x: x2, y: y2 });
              shape.vertex({ x: x3, y: y3 });
              shape.endShape(p.CLOSE);

              recorder.items.push({
                shape,
                state:
                  recorder.p5
                    ._svgCaptureState()
              });
            }
            return original.apply(renderer, args);
          };

          // Return restore function
          return () => {
            renderer.triangle = original;
          };
        }
      }
    }
  }
  fn._svgCaptureState = function() {
    return {
      //capture relevant p5 state here as needed (e.g. fill, stroke, transformations)
    };
  }


  // ---------------------------------------------------
  // SVG Visitor
  // ---------------------------------------------------

  class SVGVisitor extends p5.PrimitiveVisitor {

    constructor(pInst) {
      super();

      this.p5 = pInst;
      this.width = pInst.width;
      this.height = pInst.height;

      // Initialize root SVG DOM element with the standard namespace
      this.svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      this.svgElement.setAttribute('width', this.width);
      this.svgElement.setAttribute('height', this.height);
      this.svgElement.setAttribute('viewBox', `0 0 ${this.width} ${this.height}`);
    }

    _createElement(tagName, attrs = {}) {
      const el = document.createElementNS('http://www.w3.org/2000/svg', tagName);
      for (const [key, val] of Object.entries(attrs)) {
        el.setAttribute(key, val);
      }
      return el;
    }

    visitTriangle(triangle) {
      const pts = triangle.vertices
        .map(v => `${v.position.x},${v.position.y}`)
        .join(' ');

      const polygon = this._createElement('polygon', {
        points: pts,
        fill: 'black'
      });
      this.svgElement.appendChild(polygon);
    }

    visitEllipsePrimitive(ellipse) {
      const cx = ellipse.x + ellipse.w / 2;
      const cy = ellipse.y + ellipse.h / 2;
      const rx = ellipse.w / 2;
      const ry = ellipse.h / 2;

      if (ellipse.w === ellipse.h) {
        const circle = this._createElement('circle', {
          cx: cx,
          cy: cy,
          r: rx,
          fill: 'black'
        });
        this.svgElement.appendChild(circle);
      } else {
        const ellipseEl = this._createElement('ellipse', {
          cx: cx,
          cy: cy,
          rx: rx,
          ry: ry,
          fill: 'black'
        });
        this.svgElement.appendChild(ellipseEl);
      }
    }

    visitQuad(quad) {
      const pts = quad.vertices
        .map(v => `${v.position.x},${v.position.y}`)
        .join(' ');

      const polygon = this._createElement('polygon', {
        points: pts,
        fill: 'black'
      });
      this.svgElement.appendChild(polygon);
    }

    buildSVG() {
      const serializer = new XMLSerializer();
      return serializer.serializeToString(this.svgElement);
    }
  }

  // ---------------------------------------------------
  // Shape Recorder
  // ---------------------------------------------------

  class ShapeRecorder {
    constructor(pInst) {
      this.p5 = pInst;
      this.active = false;
      this.items = [];
      this.restores = [];
    }

    start() {
      this.active = true;
      this.items = [];
      this.restores = [];

      const renderer = this.p5._renderer;
      const adapters =this.p5._svgCaptureAdapters();
      if (renderer) {
        for (const name in adapters) {
          const restore = adapters[name].intercept(renderer, this);
          if (restore) {
            this.restores.push(restore);
          }
        }
      }
    }

    stop() {
      this.active = false;
      for (const restore of this.restores) {
        restore();
      }
      this.restores = [];
    }

    getRecord() {
      return this.items;
    }
  }

  // ---------------------------------------------------
  // API
  // ---------------------------------------------------

  fn.buildShape = function (callback) {
    const recorder = new ShapeRecorder(this);
    recorder.start();
    callback();
    recorder.stop();
    return recorder.getRecord();
  };

  fn.saveSVG = function (record, filename = 'drawing.svg') {
    // Save the SVG record to a file
    const visitor = new SVGVisitor(this);
    for (const items of record) {
        items.shape.accept(visitor);
    }

    const svg = visitor.buildSVG();

    const blob = new Blob(
      [svg],
      { type: 'image/svg+xml' }
    );

    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');

    a.href = url;
    a.download = filename;

    // Must append to DOM for browser programmatic download capability
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
  };
  fn.saveAsSVG = fn.saveSVG;
};

if(typeof p5 !== 'undefined'){
  p5.registerAddon(SVGExportAddon);
}
