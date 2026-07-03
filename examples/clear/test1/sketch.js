let recorded;

function setup() {
  createCanvas(400, 400);

  recorded = buildShape(() => {
    fill('red');
    circle(50, 50, 40);

    clear();

    fill('blue');
    circle(150, 50, 40);
  });

  console.log(recorded);
  shape(recorded);
}
