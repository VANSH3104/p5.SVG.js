export class NodeBase {
  constructor() {
    this.children = [];
  }
  add(child) {
    this.children.push(child);
  }
}

export class ScopeNode extends NodeBase {
  constructor() {
    super();
    this.type = 'scope';
  }

  toSVGElement(visitor) {
    visitor.visitScope(this);
  }
}
export class ShapeNode extends NodeBase {
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

export class BackgroundNode extends NodeBase {
  constructor(color) {
    super();
    this.type = 'background';
    this.color = color;
  }
  toSVGElement(visitor) {
    visitor.addBackground(this);
  }
}

export class ClearNode extends NodeBase {
  constructor() {
    super();
    this.type = 'clear';
  }
  toSVGElement(visitor) {
    visitor.clear();
  }
}

// --- TransformStack ---
export class TransformStack {
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



// ---------------------------------------------------
// Shape Recorder
// ---------------------------------------------------

export class ShapeRecorder {
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
      },
      applyMatrix: (args) => {
        const [a, b, c, d, e, f] = args;
        this.tStack.current.multiplySelf(
          new DOMMatrix([a, b, c, d, e, f])
        );
      }
    };

    Object.keys(transformHandlers).forEach(method => {
      const applyTransform = (origFn, context, args) => {
        if (this._isTransforming) {
          return origFn.apply(context, args);
        }
        this._isTransforming = true;
        try {
          if (this.active) {
            transformHandlers[method](args);
          }
          return origFn.apply(context, args);
        } finally {
          this._isTransforming = false;
        }
      };

      // Intercept p5 instance
      const origP5 = p[method];
      if (typeof origP5 === 'function') {
        p[method] = (...args) => {
          return applyTransform(origP5, p, args);
        };
        this.restores.push(() => {
          p[method] = origP5;
        });
      }

      // Intercept renderer too
      if (renderer && typeof renderer[method] === 'function') {
        const origR = renderer[method];
        renderer[method] = (...args) => {
          return applyTransform(origR, renderer, args);
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
