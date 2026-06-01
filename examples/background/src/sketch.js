let recorded;

function setup() {

  createCanvas(600, 600);

  recorded = buildShape(() => {

    background(15, 20, 40);

    noStroke();

    fill(100, 150, 255, 40);
    circle(300, 300, 400);

    fill(100, 150, 255, 60);
    circle(300, 300, 300);

    fill(100, 150, 255, 80);
    circle(300, 300, 200);

    fill(255);
    circle(300, 300, 80);

  });

  // saveSVG(recorded);
}