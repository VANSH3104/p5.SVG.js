let recorded;

function setup() {

  createCanvas(400, 400);

  circle(150, 150, 200);
  circle(150, 250, 200);
  circle(250, 150, 200);
  circle(250, 250, 200);

  recorded = buildShape(() => {
  circle(150, 150, 200);
  circle(150, 250, 200);
  circle(250, 150, 200);
  circle(250, 250, 200);
  });

 saveSVG(recorded); 
}