import { ShapeRecorder, ShapeNode } from "./p5.ShapeRecorder.js";
class StyleStack {
    constructor(p5) {
        this.p5 = p5;
        this.stack = [{
            fill: p5.color("#ffffff"),
            stroke: p5.color("#000000"),
            strokeWeight: 1,
        }];
    }

    get current() {
        return this.stack[this.stack.length - 1];
    }

    push() {
        const current = this.current;

        this.stack.push({
            fill: current.fill,
            stroke: current.stroke,
            strokeWeight: current.strokeWeight,
            opacity: current.opacity,
            fillOpacity: current.fillOpacity,
            strokeOpacity: current.strokeOpacity,
        });
    }

    pop() {
        if (this.stack.length > 1) {
            this.stack.pop();
        }
    }
}

export function SVGImportAddon(p5, fn, lifecycles) {
    class SVGImporter {
        constructor(p5){
            this.p5 = p5;
            this.recorder = new ShapeRecorder(p5);
            this.styleStack = new StyleStack(p5);
        }
        import(svgText) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(svgText, "image/svg+xml");
            this.visit(doc.documentElement);
            console.log(doc.documentElement);

            // Next step:
            // this.visit(doc.documentElement);

            return this.recorder.getRecord();
        }
        visit(node) {
            this.styleStack.push();
            this.parseStyle(node);
            switch (node.tagName) {
                case "svg":
                    this.visitSVG(node);
                    break;
                case "g":
                    this.visitGroup(node);
                    break;
                case "circle":
                    this.visitCircle(node);
                    break;
                case "ellipse":
                    this.visitEllipse(node);
                    break;
            }
            this.styleStack.pop();
        }

        parseStyle(node) {
            const style = this.styleStack.current;

            const fill = node.getAttribute("fill");
            if (fill === "none") {
                style.fill = null;
            } else if (fill) {
                const color = this.p5.color(fill);

                const opacity =
                    Number(node.getAttribute("opacity") ?? 1) *
                    Number(node.getAttribute("fill-opacity") ?? 1);

                color.setAlpha(255 * opacity);

                style.fill = color;
            }

            const stroke = node.getAttribute("stroke");
            if (stroke === "none") {
                style.stroke = null;
            } else if (stroke) {
                const color = this.p5.color(stroke);

                const opacity =
                    Number(node.getAttribute("opacity") ?? 1) *
                    Number(node.getAttribute("stroke-opacity") ?? 1);

                color.setAlpha(255 * opacity);

                style.stroke = color;
            }

            const weight = node.getAttribute("stroke-width");
            if (weight) {
                style.strokeWeight = Number(weight);
            }
        }

        parseTransform(node) {
            return new DOMMatrix(
                node.getAttribute("transform") ?? undefined
            );
        }

        captureState(node) {
            const style = this.styleStack.current;

            return {
                transform: this.parseTransform(node),
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
      
        visitCircle(node) {
            const r = Number(node.getAttribute("r")) || 0;

            this.addEllipse(
                Number(node.getAttribute("cx")) || 0,
                Number(node.getAttribute("cy")) || 0,
                r,
                r,
                node
            );
        }

        visitEllipse(node) {
            this.addEllipse(
                Number(node.getAttribute("cx")) || 0,
                Number(node.getAttribute("cy")) || 0,
                Number(node.getAttribute("rx")) || 0,
                Number(node.getAttribute("ry")) || 0,
                node
            );
        }

        addEllipse(cx, cy, rx, ry, node) {
            const shape = this.createShape(shape => {
                shape.ellipsePrimitive(
                    cx - rx,
                    cy - ry,
                    rx * 2,
                    ry * 2
                );
            });
            const state = this.captureState(node);
            this.recorder.addNode(
                new ShapeNode(
                    shape,
                    this.captureState(node)
                )
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