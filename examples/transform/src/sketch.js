let recorded;

function setup() {

  createCanvas(600, 600);

  recorded = buildShape(() => {

    fill(255, 0, 0);
    stroke(255);
    strokeWeight(3);
    circle(300, 300, 50);

    push();
    translate(100, 100);

    fill(0, 255, 0);
    stroke(0);
    strokeWeight(2);

    circle(300, 300, 50);

    scale(2);

    fill(0, 0, 255, 120);
    stroke(255, 255, 0);
    strokeWeight(1);

    circle(300, 300, 50);

    pop();

    push();

    scale(2);

    fill(200, 50, 255);
    stroke(255);
    strokeWeight(4);

    circle(100, 100, 50);

    pop();

    push();

    noFill();
    stroke(0, 255, 255);
    strokeWeight(6);

    circle(450, 150, 80);

    pop();
    push();

    noStroke();
    fill(255, 165, 0, 180);

    circle(150, 450, 100);

    pop();
  });

  console.log(recorded);

  shape(recorded);
  // saveSVG(recorded, "flat.svg");
}