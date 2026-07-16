let recorded;

function setup() {

  createCanvas(400, 400);
  strokeWeight(5);
  circle(200, 200, 400);

  recorded = buildShape(() => {
    strokeWeight(5);
    circle(200, 200, 400);
  });

 saveSVG(recorded); 
}