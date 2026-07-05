import { ShapeRecorder, ShapeNode, TransformStack } from "./p5.ShapeRecorder.js";

class RenderContext {
    constructor(parent) {
        if (parent) {
            this.opacity = parent.opacity;
        } else {
            this.opacity = 1;
            //todo future properties like blendMode, etc.
        }
    }
    clone() {
        return new RenderContext(this);
    }
}
export function SVGImportAddon(p5, fn, lifecycles) {
    class SVGImporter {
        constructor(p5){
            this.p5 = p5;
            this.recorder = new ShapeRecorder(p5);
            this.tStack = new TransformStack();
            this.renderContextStack = [
                new RenderContext()
            ];
        }

        get currentRenderContext() {
            return this.renderContextStack[
                this.renderContextStack.length - 1
            ];
        }
        import(svgText) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(svgText, "image/svg+xml");

            const svg = doc.documentElement;

            const host = document.createElement("div");
            host.style.position = "absolute";
            host.style.left = "-99999px";
            host.style.visibility = "hidden";
            host.style.pointerEvents = "none";

            document.body.appendChild(host);
            try {
                host.appendChild(svg);
                this.visit(host.firstChild);
            } finally {
                host.remove();
            }

            return this.recorder.getRecord();
        }
        visit(node) {
            if (!node) {
                return;
            }
            this.tStack.push();
            this.parseTransform(node);
            this.parseRenderContext(node);
            const tag = node.localName;
            switch (tag) {
                case "svg": {
                    this.visitSVG(node);
                    break;
                }
                case "g": {
                    this.visitGroup(node);
                    break;
                }
                case "circle": {
                    const style = this.parseStyle(node);
                    this.visitCircle(node, style);
                    break;
                }
                case "ellipse": {
                    const style = this.parseStyle(node);
                    this.visitEllipse(node, style);
                    break;
                }
                case "rect": {
                    const style = this.parseStyle(node);
                    this.visitRect(node, style);
                    break;
                }
            }
            this.renderContextStack.pop();
            this.tStack.pop();
        }

        parseRenderContext(node) {
            const context = this.currentRenderContext.clone();
            const cs = getComputedStyle(node);
            context.opacity *= Number(cs.opacity || 1);

            this.renderContextStack.push(context);
        }

        parseStyle(node) {
            const cs = getComputedStyle(node);

            const opacity = this.currentRenderContext.opacity;
            const fillOpacity = Number(cs.fillOpacity || 1);
            const strokeOpacity = Number(cs.strokeOpacity || 1);

            let fill = null;
            if (cs.fill !== "none") {
                fill = this.p5.color(cs.fill);
                fill.setAlpha(255 * opacity * fillOpacity);
            }

            let stroke = null;
            if (cs.stroke !== "none") {
                stroke = this.p5.color(cs.stroke);
                stroke.setAlpha(255 * opacity * strokeOpacity);
            }

            return {
                fill,
                stroke,
                strokeWeight: parseFloat(cs.strokeWidth) || 1,
                fillOpacity,
                strokeOpacity,
            };
        }


        parseTransform(node) {
            if (!node.transform?.baseVal) {
                return;
            }

            const transforms = node.transform.baseVal;

            for (let i = 0; i < transforms.numberOfItems; i++) {
                const matrix = transforms.getItem(i).matrix;

                this.tStack.current.multiplySelf(
                    new DOMMatrix([
                        matrix.a,
                        matrix.b,
                        matrix.c,
                        matrix.d,
                        matrix.e,
                        matrix.f,
                    ])
                );
            }
        }

        captureState(style) {
            return {
                transform: new DOMMatrix(this.tStack.current),
                fill: style.fill,
                stroke: style.stroke,
                strokeWeight: style.strokeWeight,
                renderContext: this.currentRenderContext.clone(),
                fillOpacity: style.fillOpacity,
                strokeOpacity: style.strokeOpacity,
            };
        }

        visitSVG(node) {
            for (const child of node.children) {
                this.visit(child);
            }
        }

        visitGroup(node) {
            this.recorder.enterScope();

            for (const child of node.children) {
                this.visit(child);
            }

            this.recorder.leaveScope();
        }

        createShape(builder) {
            const shape = new p5.Shape({
                position: new p5.Vector(0, 0)
            });
            shape.beginShape();
            builder(shape);
            shape.endShape();
            return shape;
        }
      
        visitCircle(node, style) {
            const r = Number(node.getAttribute("r")) || 0;

            this.addEllipse(
                Number(node.getAttribute("cx")) || 0,
                Number(node.getAttribute("cy")) || 0,
                r,
                r,
                style
            );
        }

        visitEllipse(node, style) {
            this.addEllipse(
                Number(node.getAttribute("cx")) || 0,
                Number(node.getAttribute("cy")) || 0,
                Number(node.getAttribute("rx")) || 0,
                Number(node.getAttribute("ry")) || 0,
                style
            );
        }

        addEllipse(cx, cy, rx, ry, style) {
            const shape = this.createShape(shape => {
                shape.ellipsePrimitive(
                    cx - rx,
                    cy - ry,
                    rx * 2,
                    ry * 2
                );
            });
            const state = this.captureState(style);
            this.recorder.addNode(
                new ShapeNode(shape, state)
            );
        }
        visitRect(node, style) {
            const x = Number(node.getAttribute("x")) || 0;
            const y = Number(node.getAttribute("y")) || 0;
            const w = Number(node.getAttribute("width")) || 0;
            const h = Number(node.getAttribute("height")) || 0;
            
            // Get corner radii
            const rx = Number(node.getAttribute("rx")) || 0;
            const ry = Number(node.getAttribute("ry")) || 0;

            if (w <= 0 || h <= 0) return;

            // Clamp radii to at most half of the respective side length
            const resolvedRx = Math.min(rx, w / 2);
            const resolvedRy = Math.min(ry, h / 2);

            const shape = this.createShape(shape => {
                if (resolvedRx > 0 || resolvedRy > 0) {
                    // Use rounded rect with corner radii
                    const r = Math.min(resolvedRx, resolvedRy);
                    shape.rectPrimitive(x, y, w, h, r, r, r, r);
                } else {
                    // Simple rect
                    shape.rectPrimitive(x, y, w, h);
                }
            });
            
            const state = this.captureState(style);
            this.recorder.addNode(
                new ShapeNode(shape, state)
            );
        }
    }
    function parseSVGText(pInst, svgText) {
        const importer = new SVGImporter(pInst);
        return importer.import(svgText);
    }

    // SVG IMPORT api
    fn.parseSVG = function (svgText) {
        return parseSVGText(this, svgText);
    };

    fn.loadSVG = async function (
        path,
        successCallback,
        failureCallback
    ) {
        try {
            const req = new Request(path, {
                method: 'GET',
                mode: 'cors'
            });
            let svgText;
            if (typeof request === 'function') {
                const { data } = await request(req, 'text');
                svgText = data;
            } else {
                const response = await fetch(req);
                if (!response.ok) {
                    throw new Error(`Failed to load SVG: ${path}`);
                }
                svgText = await response.text();
            }
            const shape = parseSVGText(this, svgText);
            const cb = () => {
                if (successCallback) {
                    return successCallback(shape);
                }
                return shape;
            };
            return this._internal
                ? this._internal(cb)
                : cb();
        } catch (err) {
            if (typeof p5._friendlyFileLoadError === 'function') {
                p5._friendlyFileLoadError(1, path);
            }
            if (typeof failureCallback === 'function') {
                return failureCallback(err);
            } else {
                throw err;
            }
        }
    };
}

if (typeof p5 !== 'undefined') {
  p5.registerAddon(SVGImportAddon);
}