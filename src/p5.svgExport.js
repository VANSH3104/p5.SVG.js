export function SVGExportAddon(p5, fn, lifecycles) {

  class NodeBase {
    constructor() {
      this.children = [];
    }
    add(child) {
      this.children.push(child);
    }
  }

  class GroupNode extends NodeBase {
    constructor() {
      super();
      this.type = 'group';
    }
    toSVGElement(visitor, parent, currentTransform) {
      for (const child of this.children) {
        visitor.visit(child, parent, currentTransform);
      }
    }
  }

  class TransformNode extends NodeBase {
    constructor(matrix) {
      super();
      this.type = 'transform';
      this.matrix = matrix;
    }
    toSVGElement(visitor, parent, currentTransform) {
      const relativeMatrix = currentTransform.inverse().multiply(this.matrix);
      const g = visitor._createGroup(relativeMatrix);
      parent.appendChild(g);
      for (const child of this.children) {
        child.toSVGElement(visitor, g, this.matrix);
      }
    }
  }

  class ShapeNode extends NodeBase {
    constructor(shape, state) {
      super();
      this.type = 'shape';
      this.shape = shape;
      this.state = state;
    }
    toSVGElement(visitor, parent) {
      visitor.currentParent = parent;
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
    toSVGElement(visitor, parent, currentTransform) {
      visitor.addBackground(this, parent, currentTransform);
    }
  }

  class ClearNode extends NodeBase {
    toSVGElement(visitor) {
      while (visitor.svgElement.firstChild) {
        visitor.svgElement.removeChild(visitor.svgElement.firstChild);
      }
    }
  }

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
              const parent = recorder.transformStack.length ? recorder.transformStack[recorder.transformStack.length - 1] : recorder.currentGroup;
              parent.add(
                new ShapeNode(
                  shape,
                  recorder.p5._svgCaptureState()
                )
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
              const parent = recorder.transformStack.length ? recorder.transformStack[
                recorder.transformStack.length - 1
              ] : recorder.currentGroup;
              parent.add(
                new BackgroundNode(c)
              );
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
    return {
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
      this.currentParent = this.svgElement;
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

    _isIdentity(m) {
      return m.a === 1 && m.b === 0 && m.c === 0 && m.d === 1 && m.e === 0 && m.f === 0;
    }

    _createGroup(matrix) {
      const g = this._createElement('g');
      if (matrix && !this._isIdentity(matrix)) {
        g.setAttribute(
          'transform',
          `matrix(${matrix.a} ${matrix.b} ${matrix.c} ${matrix.d} ${matrix.e} ${matrix.f})`
        );
      }

      return g;
    }

    colorToSVG(color) {
      if (!color) return 'none';
      if (typeof color === 'string') return color;
      if (color.levels && color.levels[3] === 0) return 'none';
      if (typeof color.toString === 'function') return color.toString();
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
      this.currentParent.appendChild(el);
    }

    addBackground(item, parent, currentTransform) {
      const fillStr = this.colorToSVG(item.color);

      const rect = this._createElement('rect', {
        x: 0,
        y: 0,
        width: this.width,
        height: this.height,
        fill: fillStr
      });
      if (!this._isIdentity(currentTransform)) {
        const inverse = currentTransform.inverse();

        rect.setAttribute('transform', `matrix(${inverse.a} ${inverse.b} ${inverse.c} ${inverse.d} ${inverse.e} ${inverse.f})`);
      }
      parent.appendChild(rect);
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
        });
        this._applyStyle(ellipseEl);
        this._appendShapeElement(ellipseEl);
      }
    }

    buildSVG() {
      const serializer = new XMLSerializer();
      return serializer.serializeToString(this.svgElement);
    }

    visit(node, parent = this.svgElement, currentTransform = new DOMMatrix()) {
      if (node.type === 'group') {
        for (const child of node.children) {
          this.visit(child, parent, currentTransform);
        }
        return;
      }
      node.toSVGElement(this, parent, currentTransform);
    }
  }

  // ---------------------------------------------------
  // Shape Recorder
  // ---------------------------------------------------

  class ShapeRecorder {
    constructor(pInst) {
      this.p5 = pInst;
      this.active = false;
      this.root = new GroupNode();
      this.groupStack = [this.root];
      this.matrixStack = new TransformStack();
      this.transformStack = [];
      this.pushFrames = [];
      this.restores = [];
      // Re-entrancy guard: intercept handlers call p5 transform methods which would
      // trigger the intercept again. This flag breaks the cycle.
      this._isTransforming = false;
    }

    get currentGroup() {
      return this.groupStack[
        this.groupStack.length - 1
      ];
    }

    start() {
      this.active = true;
      this.root = new GroupNode();
      this.groupStack = [this.root];
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

    _addTransformNode() {
      const node = new TransformNode(new DOMMatrix(this.matrixStack.current));
      const localStart = this.pushFrames.length 
        ? this.pushFrames[this.pushFrames.length - 1] 
        : 0;
      if (this.transformStack.length === localStart) {
        this.currentGroup.add(node);
      } else {
        this.transformStack[this.transformStack.length - 1].add(node);
      }
      this.transformStack.push(node);
    }

    _interceptTransforms() {
      const p = this.p5;
      const renderer = p._renderer;

      const transformHandlers = {
        push: () => {
          this.matrixStack.push();
          const group = new GroupNode();
          if (this.transformStack.length > 0) {
            this.transformStack[this.transformStack.length - 1].add(group);
          } else {
            this.currentGroup.add(group);
          }
          this.groupStack.push(group);
          this.pushFrames.push(this.transformStack.length);
        },
        pop: () => {
          this.matrixStack.pop();
          if (this.groupStack.length > 1) {
            this.groupStack.pop();
          }
          if (this.pushFrames.length > 0) {
            const targetLen = this.pushFrames.pop();
            while (this.transformStack.length > targetLen) {
              this.transformStack.pop();
            }
          }
        },
        translate: (args) => {
          const x = args[0] || 0;
          const y = args[1] || 0;

          this.matrixStack.translate(x, y);
          this._addTransformNode();
        },
        rotate: (args) => {
          const angle = args[0] || 0;

          this.matrixStack.rotate(angle);
          this._addTransformNode();
        },
        scale: (args) => {
          const x = args[0] || 1;
          const y = args[1];

          this.matrixStack.scale(x, y);
          this._addTransformNode();
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
    recorder.start();
    try {
      callback();
    } finally {
      recorder.stop();
    }
    return recorder.getRecord();
  };

  fn.saveSVG = function (record, filename = 'drawing.svg') {
    // Save the SVG record to a file
    const visitor = new SVGVisitor(this);
    visitor.visit(record);
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
