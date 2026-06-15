let recorded;

function setup() {

  createCanvas(400, 400);

  circle(200, 200, 400);

  recorded = buildShape(() => {
    circle(200, 200, 400);
  });

 saveSVG(recorded); 
}