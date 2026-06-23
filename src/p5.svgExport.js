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
              if (p5.Shape) {
                renderer._currentShape = new p5.Shape(renderer.getCommonVertexProperties());
              }
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

      fill: states.fillColor,
      stroke: states.strokeColor,
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
      
      // For path tracking
      this.currentPathElement = null;
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
        this._currentOpacity = 1;
        return 'none';
      }
      const [, , , alpha] = color._getRGBA([255, 255, 255, 255]);

      this._currentOpacity = alpha / 255;

          return color.toString('#rrggbb');
      }

    _applyStyle(el) {
      const state = this.currentState;

      if (!state) {
        return;
      }

      this._currentOpacity = 1;
      const fill = this.colorToSVG(state.fill);
      const fillOpacity = this._currentOpacity;

      this._currentOpacity = 1;
      const stroke = this.colorToSVG(state.stroke);
      const strokeOpacity = this._currentOpacity;

      el.setAttribute('fill', fill);
      el.setAttribute('stroke', stroke);

      if (fillOpacity < 1 && fill !== 'none') {
        el.setAttribute('fill-opacity', fillOpacity.toFixed(4));
      }

      if (strokeOpacity < 1 && stroke !== 'none') {
        el.setAttribute('stroke-opacity', strokeOpacity.toFixed(4));
      }

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
      this._currentOpacity = 1;
      const fillStr = this.colorToSVG(item.color);
      const opacity = this._currentOpacity;

      const rect = this._createElement('rect', {
        x: 0,
        y: 0,
        width: this.width,
        height: this.height,
        fill: fillStr
      });

      if (opacity < 1 && fillStr !== 'none') {
        rect.setAttribute('fill-opacity', opacity.toFixed(4));
      }

      this.svgElement.appendChild(rect);
    }

    clear() {
      while (this.svgElement.firstChild) {
        this.svgElement.removeChild(this.svgElement.firstChild);
      }
    }

    // ============ ADDED PRIMITIVE VISITOR METHODS ============
    
    // Path primitives
    visitAnchor(anchor) {
      const vertex = anchor.getEndVertex();
      const pathEl = this._createElement('path', {
        d: `M ${vertex.position.x} ${vertex.position.y}`
      });
      this._applyStyle(pathEl);
      this._appendShapeElement(pathEl);
      this.currentPathElement = pathEl;
    }

    visitLineSegment(lineSegment) {
      if (!this.currentPathElement) return;
      let d = this.currentPathElement.getAttribute('d') || '';
      if (lineSegment.isClosing) {
        d += ' Z';
      } else {
        const vertex = lineSegment.getEndVertex();
        d += ` L ${vertex.position.x} ${vertex.position.y}`;
      }
      this.currentPathElement.setAttribute('d', d);
    }

    visitBezierSegment(bezierSegment) {
      if (!this.currentPathElement) return;
      let d = this.currentPathElement.getAttribute('d') || '';
      const [v1, v2, v3] = bezierSegment.vertices;
      if (bezierSegment.order === 2) {
        const p1 = v1?.position || { x: 0, y: 0 };
        const p2 = v2?.position || p1;
        d += ` Q ${p1.x} ${p1.y} ${p2.x} ${p2.y}`;
      } else if (bezierSegment.order === 3) {
        const p1 = v1?.position || { x: 0, y: 0 };
        const p2 = v2?.position || p1;
        const p3 = v3?.position || p2;
        d += ` C ${p1.x} ${p1.y} ${p2.x} ${p2.y} ${p3.x} ${p3.y}`;
      }
      this.currentPathElement.setAttribute('d', d);
    }

    visitSplineSegment(splineSegment) {
      if (!this.currentPathElement) return;
      const shape = splineSegment._shape;
      let d = this.currentPathElement.getAttribute('d') || '';

      if (
        splineSegment._splineProperties.ends === this.p5.EXCLUDE &&
        !splineSegment._comesAfterSegment
      ) {
        const startVertex = splineSegment._firstInterpolatedVertex;
        const startPos = startVertex?.position || { x: 0, y: 0 };
        const sx = startPos.x !== undefined ? startPos.x : (startPos[0] !== undefined ? startPos[0] : (startPos.values ? startPos.values[0] : 0));
        const sy = startPos.y !== undefined ? startPos.y : (startPos[1] !== undefined ? startPos[1] : (startPos.values ? startPos.values[1] : 0));
        d += ` M ${sx} ${sy}`;
      }

      const arrayVertices = splineSegment.getControlPoints().map(
        v => shape.vertexToArray(v)
      );
      const bezierArrays = shape.catmullRomToBezier(
        arrayVertices,
        splineSegment._splineProperties.tightness
      );

      for (const array of bezierArrays) {
        const points = array.flatMap(pt => [pt[0], pt[1]]);
        d += ` C ${points[0]} ${points[1]} ${points[2]} ${points[3]} ${points[4]} ${points[5]}`;
      }
      this.currentPathElement.setAttribute('d', d);
    }

    visitArcPrimitive(arc) {
      const centerX = arc.x + arc.w / 2;
      const centerY = arc.y + arc.h / 2;
      const radiusX = arc.w / 2;
      const radiusY = arc.h / 2;

      const delta = arc.stop - arc.start;
      const isFullCircle = Math.abs(delta % (2 * Math.PI)) < 0.00001 &&
        Math.abs(delta) > 0.00001;

      if (isFullCircle) {
        if (radiusX === radiusY) {
          const circle = this._createElement('circle', {
            cx: centerX,
            cy: centerY,
            r: radiusX,
          });
          this._applyStyle(circle);
          this._appendShapeElement(circle);
        } else {
          const ellipseEl = this._createElement('ellipse', {
            cx: centerX,
            cy: centerY,
            rx: radiusX,
            ry: radiusY,
          });
          this._applyStyle(ellipseEl);
          this._appendShapeElement(ellipseEl);
        }
        return;
      }

      const startX = centerX + radiusX * Math.cos(arc.start);
      const startY = centerY + radiusY * Math.sin(arc.start);
      const endX = centerX + radiusX * Math.cos(arc.stop);
      const endY = centerY + radiusY * Math.sin(arc.stop);

      const largeArcFlag = Math.abs(delta) % (2 * Math.PI) > Math.PI ? 1 : 0;
      const sweepFlag = delta > 0 ? 1 : 0;

      const openPath = `M ${startX} ${startY} A ${radiusX} ${radiusY} 0 ${largeArcFlag} ${sweepFlag} ${endX} ${endY}`;

      let dFill = openPath;
      let dStroke = openPath;

      const mode = arc.mode ? arc.mode.toLowerCase() : undefined;
      if (mode === 'pie') {
        dFill = dStroke = `${openPath} L ${centerX} ${centerY} Z`;
      } else if (mode === 'chord') {
        dFill = dStroke = `${openPath} Z`;
      } else if (mode === 'open') {
        dFill = dStroke = openPath;
      } else {
        // default / undefined: fill is pie, stroke is open
        dFill = `${openPath} L ${centerX} ${centerY} Z`;
        dStroke = openPath;
      }

      if (dFill === dStroke) {
        const pathEl = this._createElement('path', { d: dFill });
        this._applyStyle(pathEl);
        this._appendShapeElement(pathEl);
      } else {
        const state = this.currentState;
        const fillStr = this.colorToSVG(state?.fill);
        const strokeStr = this.colorToSVG(state?.stroke);
        const hasFill = fillStr !== 'none';
        const hasStroke = strokeStr !== 'none' && state?.strokeWeight != null;

        if (hasFill) {
          const fillEl = this._createElement('path', { d: dFill });
          this._applyStyle(fillEl);
          fillEl.setAttribute('stroke', 'none');
          this._appendShapeElement(fillEl);
        }
        if (hasStroke) {
          const strokeEl = this._createElement('path', { d: dStroke });
          this._applyStyle(strokeEl);
          strokeEl.setAttribute('fill', 'none');
          this._appendShapeElement(strokeEl);
        }
      }
    }

    // Existing ellipse primitive (already had this)
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

    // Rect primitive with rounded corners
    visitRectPrimitive(rect) {
      const x = rect.x;
      const y = rect.y;
      const w = rect.w;
      const h = rect.h;
      let tl = rect.tl;
      let tr = rect.tr;
      let br = rect.br;
      let bl = rect.bl;

      const attrs = {
        x: x,
        y: y,
        width: w,
        height: h
      };

      if (typeof tl !== 'undefined') {
        if (typeof tr === 'undefined') tr = tl;
        if (typeof br === 'undefined') br = tr;
        if (typeof bl === 'undefined') bl = br;

        if (tl === tr && tl === br && tl === bl) {
          attrs.rx = tl;
          attrs.ry = tl;
          const rectEl = this._createElement('rect', attrs);
          this._applyStyle(rectEl);
          this._appendShapeElement(rectEl);
        } else {
          const r_tl = Math.max(0, tl);
          const r_tr = Math.max(0, tr);
          const r_br = Math.max(0, br);
          const r_bl = Math.max(0, bl);
          
          let d = `M ${x + r_tl} ${y} ` +
                  `L ${x + w - r_tr} ${y} ` +
                  `A ${r_tr} ${r_tr} 0 0 1 ${x + w} ${y + r_tr} ` +
                  `L ${x + w} ${y + h - r_br} ` +
                  `A ${r_br} ${r_br} 0 0 1 ${x + w - r_br} ${y + h} ` +
                  `L ${x + r_bl} ${y + h} ` +
                  `A ${r_bl} ${r_bl} 0 0 1 ${x} ${y + h - r_bl} ` +
                  `L ${x} ${y + r_tl} ` +
                  `A ${r_tl} ${r_tl} 0 0 1 ${x + r_tl} ${y} Z`;
                  
          const pathEl = this._createElement('path', { d });
          this._applyStyle(pathEl);
          this._appendShapeElement(pathEl);
        }
      } else {
        const rectEl = this._createElement('rect', attrs);
        this._applyStyle(rectEl);
        this._appendShapeElement(rectEl);
      }
    }

    // Point primitive
    visitPoint(point) {
      const { x, y } = point.vertices[0].position;
      const line = this._createElement('line', {
        x1: x,
        y1: y,
        x2: x + 0.0001,
        y2: y
      });
      this._applyStyle(line);
      line.setAttribute('stroke-linecap', 'round');
      this._appendShapeElement(line);
    }

    // Line primitive
    visitLine(line) {
      const { x: x0, y: y0 } = line.vertices[0].position;
      const { x: x1, y: y1 } = line.vertices[1].position;
      const lineEl = this._createElement('line', {
        x1: x0,
        y1: y0,
        x2: x1,
        y2: y1
      });
      this._applyStyle(lineEl);
      this._appendShapeElement(lineEl);
    }

    // Triangle primitive
    visitTriangle(triangle) {
      const [v0, v1, v2] = triangle.vertices;
      const points = `${v0.position.x},${v0.position.y} ${v1.position.x},${v1.position.y} ${v2.position.x},${v2.position.y}`;
      const triangleEl = this._createElement('polygon', { points });
      this._applyStyle(triangleEl);
      this._appendShapeElement(triangleEl);
    }

    // Quad primitive
    visitQuad(quad) {
      const [v0, v1, v2, v3] = quad.vertices;
      const points = `${v0.position.x},${v0.position.y} ${v1.position.x},${v1.position.y} ${v2.position.x},${v2.position.y} ${v3.position.x},${v3.position.y}`;
      const quadEl = this._createElement('polygon', { points });
      this._applyStyle(quadEl);
      this._appendShapeElement(quadEl);
    }

    // Tessellation primitives
    visitTriangleFan(triangleFan) {
      if (triangleFan.vertices.length < 3) return;
      const [v0, ...rest] = triangleFan.vertices;
      let d = '';
      for (let i = 0; i < rest.length - 1; i++) {
        const v1 = rest[i];
        const v2 = rest[i + 1];
        d += `M ${v0.position.x} ${v0.position.y} L ${v1.position.x} ${v1.position.y} L ${v2.position.x} ${v2.position.y} Z `;
      }
      const pathEl = this._createElement('path', { d: d.trim() });
      this._applyStyle(pathEl);
      this._appendShapeElement(pathEl);
    }

    visitTriangleStrip(triangleStrip) {
      if (triangleStrip.vertices.length < 3) return;
      let d = '';
      for (let i = 0; i < triangleStrip.vertices.length - 2; i++) {
        const v0 = triangleStrip.vertices[i];
        const v1 = triangleStrip.vertices[i + 1];
        const v2 = triangleStrip.vertices[i + 2];
        d += `M ${v0.position.x} ${v0.position.y} L ${v1.position.x} ${v1.position.y} L ${v2.position.x} ${v2.position.y} Z `;
      }
      const pathEl = this._createElement('path', { d: d.trim() });
      this._applyStyle(pathEl);
      this._appendShapeElement(pathEl);
    }

    visitQuadStrip(quadStrip) {
      if (quadStrip.vertices.length < 4) return;
      let d = '';
      for (let i = 0; i < quadStrip.vertices.length - 3; i += 2) {
        const v0 = quadStrip.vertices[i];
        const v1 = quadStrip.vertices[i + 1];
        const v2 = quadStrip.vertices[i + 2];
        const v3 = quadStrip.vertices[i + 3];
        d += `M ${v0.position.x} ${v0.position.y} L ${v1.position.x} ${v1.position.y} L ${v3.position.x} ${v3.position.y} L ${v2.position.x} ${v2.position.y} Z `;
      }
      const pathEl = this._createElement('path', { d: d.trim() });
      this._applyStyle(pathEl);
      this._appendShapeElement(pathEl);
    }

    // ============ END ADDED PRIMITIVES ============

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

  fn.beginRecord = function () {
    if (this._activeRecorder) {
      console.warn('beginRecord() called while already recording. Stopping previous recording.');
      this._activeRecorder.stop();
    }
    const recorder = new ShapeRecorder(this);
    this._activeRecorder = recorder;
    recorder.start();
  };

  fn.endRecord = function () {
    const recorder = this._activeRecorder;
    if (!recorder) {
      console.warn('endRecord() called without a matching beginRecord().');
      return null;
    }
    recorder.stop();
    this._activeRecorder = null;
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
