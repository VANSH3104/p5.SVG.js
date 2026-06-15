let recorded;

function setup() {

  createCanvas(400, 400);
  fill("#00f"); 
  stroke("#f00"); 
  strokeWeight(5);
  circle(200, 200, 400);

  recorded = buildShape(() => {
    fill("#00f"); 
    stroke("#f00"); 
    strokeWeight(5);
    circle(200, 200, 400);
  });

 saveSVG(recorded); 
}