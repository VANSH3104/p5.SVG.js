import { ShapeRecorder, ShapeNode, TransformStack } from "./p5.ShapeRecorder.js";

class StyleResolver {
    resolveNodeStyle(node, parentContext) {
        const context = parentContext.clone();
        const styleAttr = node.getAttribute("style");
        const inlineStyle = styleAttr ? this.parseInlineStyle(styleAttr) : null;

        this.resolveColor(context, node, inlineStyle);
        this.resolveFill(context, node, inlineStyle);
        this.resolveStroke(context, node, inlineStyle, parentContext);
        this.resolveOpacity(context, node, inlineStyle, parentContext);
        this.resolveDisplayAndVisibility(context, node, inlineStyle, parentContext);

        return context;
    }

    resolveColor(context, node, inlineStyle) {
        const rawColor = this.getProp(node, inlineStyle, "color");
        if (rawColor !== undefined && rawColor !== "currentColor") {
            context.color = rawColor;
        }
    }

    resolveDisplayAndVisibility(context, node, inlineStyle, parentContext) {
        const rawDisplay = this.getProp(node, inlineStyle, "display");
        if (parentContext.display === "none") {
            context.display = "none";
        } else if (rawDisplay !== undefined) {
            context.display = rawDisplay;
        } else {
            context.display = "inline";
        }

        const rawVisibility = this.getProp(node, inlineStyle, "visibility");
        if (rawVisibility !== undefined) {
            context.visibility = rawVisibility;
        }
    }

    resolveOpacity(context, node, inlineStyle, parentContext) {
        const rawOpacity = this.getProp(node, inlineStyle, "opacity");
        if (rawOpacity !== undefined) {
            const val = parseOpacityValue(rawOpacity);
            if (!isNaN(val)) {
                context.opacity = parentContext.opacity * val;
            }
        }
        const rawFillOpacity = this.getProp(node, inlineStyle, "fill-opacity", "fillOpacity");
        if (rawFillOpacity !== undefined) {
            const val = parseOpacityValue(rawFillOpacity);
            if (!isNaN(val)) {
                context.fillOpacity = val;
            }
        }
        const rawStrokeOpacity = this.getProp(node, inlineStyle, "stroke-opacity", "strokeOpacity");
        if (rawStrokeOpacity !== undefined) {
            const val = parseOpacityValue(rawStrokeOpacity);
            if (!isNaN(val)) {
                context.strokeOpacity = val;
            }
        }
    }

    resolveStroke(context, node, inlineStyle, parentContext) {
        const rawStroke = this.getProp(node, inlineStyle, "stroke");
        if (rawStroke !== undefined) {
            context.stroke = rawStroke;
        }
        const rawStrokeWidth = this.getProp(node, inlineStyle, "stroke-width", "strokeWidth");
        if (rawStrokeWidth !== undefined) {
            context.strokeWidth = parseLength(rawStrokeWidth, parentContext.strokeWidth);
        }
    }

    resolveFill(context, node, inlineStyle) {
        const rawFill = this.getProp(node, inlineStyle, "fill");
        if (rawFill !== undefined) {
            context.fill = rawFill;
        }
    }

    getProp(node, inlineStyle, kebabName, camelName) {
        let val;
        if (inlineStyle) {
            val = inlineStyle[kebabName];
            if (val !== undefined && val !== "inherit") {
                return val;
            }
        }
        val = node.getAttribute(kebabName);
        if (val !== null && val !== "inherit") {
            return val;
        }
        if (camelName) {
            val = node.getAttribute(camelName);
            if (val !== null && val !== "inherit") {
                return val;
            }
        }
        return undefined;
    }

    parseInlineStyle(styleStr) {
        const styles = {};
        if (!styleStr) return styles;
        const decls = styleStr.split(";");
        for (const decl of decls) {
            const colonIndex = decl.indexOf(":");
            if (colonIndex === -1) continue;
            const prop = decl.slice(0, colonIndex).trim().toLowerCase();
            const val = decl.slice(colonIndex + 1).trim();
            if (prop && val) {
                styles[prop] = val;
            }
        }
        return styles;
    }

    preprocess(svgRoot) {
        // empty for now
    }
}

class RenderContext {
    constructor(parent) {
        if (parent) {
            this.fill = parent.fill;
            this.stroke = parent.stroke;
            this.strokeWidth = parent.strokeWidth;
            this.opacity = parent.opacity;
            this.fillOpacity = parent.fillOpacity;
            this.strokeOpacity = parent.strokeOpacity;
            this.visibility = parent.visibility;
            this.display = parent.display === "none" ? "none" : "inline";
            this.color = parent.color;
        } else {
            this.fill = "rgb(0, 0, 0)";
            this.stroke = "none";
            this.strokeWidth = 1;
            this.opacity = 1;
            this.fillOpacity = 1;
            this.strokeOpacity = 1;
            this.visibility = "visible";
            this.display = "inline";
            this.color = "rgb(0, 0, 0)"; 
            this.opacity = 1;
            //todo future properties like blendMode, etc.
        }
    }
    clone() {
        return new RenderContext(this);
    }
}


// Parses opacity strings (supporting percentages) and clamps them to [0, 1]
function parseOpacityValue(raw) {
    if (raw === undefined || raw === null || raw === "") return NaN;
    const str = String(raw).trim();
    let val = parseFloat(str);
    if (isNaN(val)) return NaN;
    if (str.endsWith("%")) {
        val = val / 100;
    }
    return Math.max(0, Math.min(1, val));
}

function parseLength(val, defaultValue) {
    if (val === undefined || val === null || val === "") return defaultValue;
    const str = String(val).trim();
    const num = parseFloat(str);
    if (isNaN(num)) return defaultValue;
    return num; // Simplified - just return the number
}



export function SVGImportAddon(p5, fn, lifecycles) {
    class SVGImporter {
        constructor(p5){
            this.p5 = p5;
            this.recorder = new ShapeRecorder(p5);
            this.tStack = new TransformStack();
            this.renderContextStack = [new RenderContext()];
            this.styleResolver = new StyleResolver();
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
                this.styleResolver.preprocess(svg);
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
            const parentContext = this.currentRenderContext;
            const context = this.styleResolver.resolveNodeStyle(node, parentContext);
            this.renderContextStack.push(context);
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
                    this.visitCircle(node, context);
                    break;
                }
                case "ellipse": {
                    this.visitEllipse(node, context);
                    break;
                }
                case "rect": {
                    this.visitRect(node, context);
                    break;
                }
            }
            this.renderContextStack.pop();
            this.tStack.pop();
        }

        // Already browser-native: SVGTransformList + DOMMatrix, no manual matrix
        // string parsing needed here.
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

        makeColor(colorStr, opacity, context) {
            if (colorStr && colorStr.startsWith("url(")) {
                warnOnce("SVG Importer Warning: Gradients and patterns (url(...)) are not supported yet.");
                return null;
            }
            if (!colorStr || colorStr === "none") {
                return null;
            }
            let parsedColor = colorStr;
            if (parsedColor === "currentColor") {
                parsedColor = context.color || "rgb(0, 0, 0)";
            }
            try {
                // Parse color first
                const c = this.p5.color(parsedColor);
                // Convert to a standardized RGBA string using documented public API to resolve HSL/HSB to RGB coords
                const rgbStr = c.toString('rgba');
                const rgbColor = this.p5.color(rgbStr);
                // Set alpha using public API on the RGB-mode color to avoid p5 HSL alpha-scaling bugs
                rgbColor.setAlpha(this.p5.alpha(rgbColor) * opacity);
                
                return rgbColor;
            } catch (e) {
                warnOnce(`SVG Importer Warning: Failed to parse color: "${colorStr}"`);
                return null;
            }
        }

        captureState(context) {
            return {
                transform: new DOMMatrix(this.tStack.current),
                fill: this.makeColor(context.fill, context.opacity * context.fillOpacity, context),
                stroke: this.makeColor(context.stroke, context.opacity * context.strokeOpacity, context),
                strokeWeight: context.strokeWidth,
                renderContext: context.clone(),
                fillOpacity: context.fillOpacity,
                strokeOpacity: context.strokeOpacity,
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
      
        visitCircle(node, context) {
            const r = Number(node.getAttribute("r")) || 0;

            this.addEllipse(
                Number(node.getAttribute("cx")) || 0,
                Number(node.getAttribute("cy")) || 0,
                r,
                r,
                context
            );
        }

        visitEllipse(node, context) {
            this.addEllipse(
                Number(node.getAttribute("cx")) || 0,
                Number(node.getAttribute("cy")) || 0,
                Number(node.getAttribute("rx")) || 0,
                Number(node.getAttribute("ry")) || 0,
                context
            );
        }

        addEllipse(cx, cy, rx, ry, context) {
            const shape = this.createShape(shape => {
                shape.ellipsePrimitive(
                    cx - rx,
                    cy - ry,
                    rx * 2,
                    ry * 2
                );
            });
            const state = this.captureState(context);
            this.recorder.addNode(
                new ShapeNode(shape, state)
            );
        }
        visitRect(node, context) {
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
            
            const state = this.captureState(context);
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