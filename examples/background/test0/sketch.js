let recorded;

function setup() {
  createCanvas(400, 400);

  recorded = buildShape(() => {
    background('yellow');

    fill('red');
    circle(100, 100, 50);
  });

  console.log(recorded);
  shape(recorded);
  // saveSVG(recorded, "background.svg");
}
