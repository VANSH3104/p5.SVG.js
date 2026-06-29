import { ShapeRecorder, ShapeNode } from "./p5.ShapeRecorder.js";

export function SVGImportAddon(p5, fn, lifecycles) {
    class SVGImporter {
        constructor(p5){
            this.p5 = p5;
            this.recorder = new ShapeRecorder(p5);
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
            this.parseStyle(node);
            switch (node.tagName) {
                case "svg":
                    return this.visitSVG(node);
                case "g":
                    return this.visitGroup(node);
                case "circle":
                    return this.visitCircle(node);
                case "ellipse":
                    return this.visitEllipse(node);
            }
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