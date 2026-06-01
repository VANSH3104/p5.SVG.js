export function SVGExportAddon(p5, fn, lifecycles) {
  // --- TransformStack ---
  class TransformStack {
    constructor() {
      this.stack = [new DOMMatrix()];
    }

    push() {
      this.stack.push(new DOMMatrix(this.current));
    }

    pop() {
      if (this.stack.length > 1) this.stack.pop();
    }

    translate(x, y) {
      this.current.translateSelf(x, y);
    }

    rotate(rad) {
      this.current.rotateSelf(rad * 180 / Math.PI);
    }

    scale(x, y) {
      this.current.scaleSelf(x, y !== undefined ? y : x);
    }

    get current() {
      return this.stack[this.stack.length - 1];
    }
  }



  fn._svgCaptureAdapters = function () {
    return {

      drawShape: {
        intercept(renderer, recorder) {
          const original = renderer.drawShape;
          if (!original) return null;

          renderer.drawShape = function (shape) {
            const state = recorder.p5._svgCaptureState();
            if (recorder.active) {

              recorder.items.push({
                type: 'shape',
                shape,
                state:
                  recorder.p5
                    ._svgCaptureState()
              });
            }
            return original.call(renderer, shape);
          };

          // Return restore function
          return () => {
            renderer.drawShape = original;
          };
        }
      },

      background: {
        intercept(renderer, recorder) {
          const original = renderer.background;

          renderer.background = (...args) => {
            if (recorder.active) {
              const c = recorder.p5.color(...args);
              recorder.items.push({
                type: 'background',
                color: c
              });
            }
            return original.apply(renderer, args);
          };

          return () => {
            renderer.background = original;
          };
        }
      },
    }
  }

  fn._svgCaptureState = function () {
    const recorder = this._activeRecorder;
    return {
      transform: recorder ? new DOMMatrix(
        recorder.tStack.current
      ) : new DOMMatrix(),

      fill: this._renderer.states.fillColor,
      stroke: this._renderer.states.strokeColor,
      strokeWeight: this._renderer.states.strokeWeight
    };
  };


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

    colorToSVG(color) {
      if (!color) {
        return 'none';
      }

      if (typeof color === 'string') {
        return color;
      }

      if (typeof color.toString === 'function') {

        const str = color.toString();

        if (str === 'rgba(0,0,0,0)') {
          return 'none';
        }

        return str;
      }

      return 'none';
    }

    _applyStyle(el) {
      const state = this.currentState;

      if (!state) {
        return;
      }

      el.setAttribute('fill', this.colorToSVG(state.fill));
      el.setAttribute('stroke', this.colorToSVG(state.stroke));

      if (state.stroke && state.strokeWeight != null) {
        el.setAttribute('stroke-width', state.strokeWeight);
      }
    }

    _appendShapeElement(el) {
      const m = this.currentState?.transform;

      if (
        m &&
        !(m.a === 1 && m.b === 0 && m.c === 0 && m.d === 1 && m.e === 0 && m.f === 0)
      ) {
        const g = this._createElement('g');
        g.setAttribute('transform', `matrix(${m.a} ${m.b} ${m.c} ${m.d} ${m.e} ${m.f})`);
        g.appendChild(el);
        this.svgElement.appendChild(g);
        return;
      }

      this.svgElement.appendChild(el);
    }

    addBackground(item) {
      const fillStr = this.colorToSVG(item.color);

      const rect = this._createElement('rect', {
        x: 0,
        y: 0,
        width: this.width,
        height: this.height,
        fill: fillStr
      });

      this.svgElement.appendChild(rect);
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
        });
        this._applyStyle(circle);
        this._appendShapeElement(circle);
      } else {
        const ellipseEl = this._createElement('ellipse', {
          cx: cx,
          cy: cy,
          rx: rx,
          ry: ry,
          fill: 'black'
        });
        this._applyStyle(ellipseEl);
        this._appendShapeElement(ellipseEl);
      }
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
      this.tStack = new TransformStack();
      this.restores = [];
      this._isTransforming = false;
    }

    start() {
      this.active = true;
      this.items = [];
      this.restores = [];
      this._interceptTransforms();
      const renderer = this.p5._renderer;
      const adapters = this.p5._svgCaptureAdapters();
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

    _interceptTransforms() {
      const p = this.p5;
      const renderer = p._renderer;

      const transformHandlers = {
        push: () => {
          this.tStack.push();
        },
        pop: () => {
          this.tStack.pop();
        },
        translate: (args) => {
          this.tStack.translate(args[0] || 0, args[1] || 0);
        },
        rotate: (args) => {
          this.tStack.rotate(args[0] || 0);
        },
        scale: (args) => {
          this.tStack.scale(args[0] || 1, args[1]);
        }
      };

      Object.keys(transformHandlers).forEach(method => {
        const updateStack = (args) => {
          if (!this.active || this._isTransforming) {
            return;
          }
          this._isTransforming = true;
          try {
            transformHandlers[method](args);
          } finally {
            this._isTransforming = false;
          }
        };

        // Intercept p5 instance
        const origP5 = p[method];
        if (typeof origP5 === 'function') {
          p[method] = (...args) => {
            updateStack(args);
            return origP5.apply(p, args);
          };
          this.restores.push(() => {
            p[method] = origP5;
          });
        }

        // Intercept renderer too
        if (renderer && typeof renderer[method] === 'function') {
          const origR = renderer[method];
          renderer[method] = (...args) => {
            updateStack(args);
            return origR.apply(renderer, args);
          };
          this.restores.push(() => {
            renderer[method] = origR;
          });
        }
      });
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
    this._activeRecorder = recorder;
    recorder.start();
    callback();
    recorder.stop();
    this._activeRecorder = null;
    return recorder.getRecord();
  };

  fn.saveSVG = function (record, filename = 'drawing.svg') {
    // Save the SVG record to a file
    const visitor = new SVGVisitor(this);
    for (const item of record) {
      if (item.type === 'background') {
        visitor.addBackground(item);
        continue;
      }
      visitor.currentState = item.state;
      item.shape.accept(visitor);
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

if (typeof p5 !== 'undefined') {
  p5.registerAddon(SVGExportAddon);
}
