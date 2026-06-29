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