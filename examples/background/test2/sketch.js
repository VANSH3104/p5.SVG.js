let recorded;

function setup() {
  createCanvas(400, 400);

  recorded = buildShape(() => {
    translate(100, 100);

    push();

    rotate(PI / 4);

    circle(0, 0, 40);

    background('yellow');

    circle(50, 0, 40);

    pop();

    circle(100, 100, 40);
  });

  console.log(recorded);
  shape(recorded);
  // saveSVG(recorded, "background.svg");
}
