export function SVGExportAddon(p5, fn, lifecycles) {

  fn.buildShape = function (callback) {
    // Run the callback function to build the shape
    callback();
  };

  fn.saveSVG = function (record, filename = 'drawing.svg') {
    // Save the SVG record to a file
    
  };
};

if(typeof p5 !== 'undefined'){
  p5.registerAddon(addonTemplate);
}
