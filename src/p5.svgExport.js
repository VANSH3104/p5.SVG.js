export function SVGExportAddon(p5, fn, lifecycles) {

  class NodeBase {
    constructor() {
      this.children = [];
    }
    add(child) {
      this.children.push(child);
    }
  }

  class ScopeNode extends NodeBase {
    constructor() {
      super();
      this.type = 'scope';
    }

    toSVGElement(visitor) {
      visitor.visitScope(this);
    }
  }
  class ShapeNode extends NodeBase {
    constructor(shape, state) {
      super();
      this.type = 'shape';
      this.shape = shape;
      this.state = state;
    }
    toSVGElement(visitor) {
      visitor.currentState = this.state;
      this.shape.accept(visitor);
    }
  }

  class BackgroundNode extends NodeBase {
    constructor(color) {
      super();
      this.type = 'background';
      this.color = color;
    }
    toSVGElement(visitor) {
      visitor.addBackground(this);
    }
  }

  class ClearNode extends NodeBase {
    constructor() {
      super();
      this.type = 'clear';
    }
    toSVGElement(visitor) {
      visitor.clear();
    }
  }

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
            if (recorder.active) {
              recorder.addNode(
                new ShapeNode(shape, recorder.p5._svgCaptureState())
              );
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
              recorder.addNode(new BackgroundNode(c));
            }
            return original.apply(renderer, args);
          };

          return () => {
            renderer.background = original;
          };
        }
      },

      clear: {
        intercept(renderer, recorder) {
          const original = renderer.clear;
          if (!original) return null;

          renderer.clear = (...args) => {
            if (recorder.active) {
              recorder.addNode(new ClearNode());
            }
            return original.apply(renderer, args);
          };

          return () => {
            renderer.clear = original;
          };
        }
      },
    }
  }

  fn._svgCaptureState = function () {
    const recorder = this._activeRecorder;
    const states = this._renderer.states;
    return {
      transform: recorder ? new DOMMatrix(
        recorder.tStack.current
      ) : new DOMMatrix(),

      fill: states.fillSet ? states.fillColor : states._cachedFillStyle,
      stroke: states.strokeSet ? states.strokeColor : states._cachedStrokeStyle,
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

    visitScope(scope) {
      for (const child of scope.children) {
        child.toSVGElement(this);
      }
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

    clear() {
      while (this.svgElement.firstChild) {
        this.svgElement.removeChild(this.svgElement.firstChild);
      }
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
      this.root = new ScopeNode();
      this.scopeStack = [this.root];
      this.tStack = new TransformStack();
      this.restores = [];
      this._isTransforming = false;
    }

    start() {
      this.active = true;
      this.root = new ScopeNode();
      this.scopeStack = [this.root];
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
    addNode(node) {
      this.scopeStack[
        this.scopeStack.length - 1
      ].add(node);
    }
    _interceptTransforms() {
      const p = this.p5;
      const renderer = p._renderer;

      const transformHandlers = {
        push: () => {
          this.tStack.push();
          const scope = new ScopeNode();
          this.scopeStack[
            this.scopeStack.length - 1
          ].add(scope);

          this.scopeStack.push(scope);
        },
        pop: () => {
          this.tStack.pop();
          if (this.scopeStack.length > 1) {
            this.scopeStack.pop();
          }
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
      return this.root;
    }
  }

  // ---------------------------------------------------
  // API
  // ---------------------------------------------------

  fn.buildShape = function (callback) {
    const recorder = new ShapeRecorder(this);
    this._activeRecorder = recorder;
    recorder.start();
    try {
      callback();
    } finally {
      recorder.stop();
      this._activeRecorder = null;
    }
    return recorder.getRecord();
  };

  fn.getSVG = function (record) {
    const visitor = new SVGVisitor(this);
    record.toSVGElement(visitor);
    return visitor.buildSVG();
  };

  fn.saveSVG = function (record, filename = 'drawing.svg') {
    const svg = this.getSVG(record);

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
