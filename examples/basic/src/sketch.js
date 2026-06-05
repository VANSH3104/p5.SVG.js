let recorded;

function setup() {

  createCanvas(400, 400);

  recorded = buildShape(() => {
    rect(50, 50, 100, 100);
    rect(200, 100, 120, 80);
    circle(300, 300, 50);
    triangle(150, 200, 180, 250, 120, 250);
  });

  // saveSVG(recorded); 
}