let recorded;

function setup() {

  createCanvas(400, 400);
  stroke("#f00"); 
  circle(200, 200, 400);

  recorded = buildShape(() => {
    stroke("#f00"); 
    circle(200, 200, 400);
  });

 saveSVG(recorded); 
}