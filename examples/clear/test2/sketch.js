let recorded;

function setup() {
  createCanvas(400, 400);

  recorded = buildShape(() => {
    translate(100, 100);
    circle(0, 0, 40);

    clear();

    circle(50, 0, 40);
  });

  console.log(recorded);
  // saveSVG(recorded, "clear.svg");
}
