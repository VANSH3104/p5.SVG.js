let recorded;

function setup() {
  createCanvas(400, 400);

  recorded = buildShape(() => {
    circle(50, 50, 40);

    background('yellow');

    circle(150, 50, 40);

    background('cyan');

    circle(250, 50, 40);
  });

  console.log(recorded);
  shape(recorded);
  // saveSVG(recorded, "background.svg");
}
