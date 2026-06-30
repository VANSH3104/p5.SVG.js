import { ShapeRecorder, ShapeNode, TransformStack } from "./p5.ShapeRecorder.js";

export function SVGImportAddon(p5, fn, lifecycles) {
    class SVGImporter {
        constructor(p5){
            this.p5 = p5;
            this.recorder = new ShapeRecorder(p5);
            this.tStack = new TransformStack();
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
            switch (node.tagName) {
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
            }
            this.tStack.pop();
        }

        parseStyle(node) {
            const cs = getComputedStyle(node);

            const opacity = Number(cs.opacity || 1);
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
                opacity,
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
                opacity: style.opacity,
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
    }

    // SVG IMPORT api
    fn.loadSVG = function(svgText) {
        const importer = new SVGImporter(this);
        return importer.import(svgText)
    }
}

if (typeof p5 !== 'undefined') {
  p5.registerAddon(SVGImportAddon);
}