let recorded;

function setup() {

  createCanvas(400, 400);
  fill("#f00");
  circle(200, 200, 400);

  recorded = buildShape(() => {
    fill("#f00");
    circle(200, 200, 400);
  });

 saveSVG(recorded); 
}