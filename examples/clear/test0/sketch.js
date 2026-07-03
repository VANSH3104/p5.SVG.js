let recorded;

function setup() {
  createCanvas(400, 400);

  recorded = buildShape(() => {
    clear();

    fill('red');
    circle(100, 100, 50);
  });

  console.log(recorded);
  shape(recorded);
}
