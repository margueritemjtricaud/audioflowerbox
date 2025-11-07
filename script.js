let recording = false;
let audioChunks = [];
let mediaRecorder;

let micImg, bgImg, flowerImg;
let micScale = 1;
let flowers = [];

let recordButton;

// Tap guard to prevent double firing on iPad
let ignoreNextTap = false;

function preload() {
  micImg = loadImage("assets/mic.png");
  bgImg = loadImage("assets/background.png");
  flowerImg = loadImage("assets/flower.png");
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  textAlign(CENTER, CENTER);
  rectMode(CENTER);
  imageMode(CENTER);

  // Create record button
  recordButton = createButton("Start Recording");
  recordButton.position(width / 2 - 70, height - 100);
  recordButton.style("font-size", "20px");

  // Desktop click
  recordButton.mousePressed(() => {
    if (ignoreNextTap) return;
    ignoreNextTap = true;
    setTimeout(() => (ignoreNextTap = false), 300);
    startStopRecording();
  });

  // iPad touch
  recordButton.touchEnded(() => {
    if (ignoreNextTap) return;
    ignoreNextTap = true;
    setTimeout(() => (ignoreNextTap = false), 300);
    startStopRecording();
    return false; // prevent simulated click
  });
}

function draw() {
  background(30);

  if (bgImg) image(bgImg, width / 2, height / 2, width, height);

  for (let f of flowers) {
    if (flowerImg) image(flowerImg, f.x, f.y, f.size, f.size);
    else {
      fill(0, 255, 0);
      ellipse(f.x, f.y, f.size);
    }
  }

  micScale = recording ? lerp(micScale, 1.5, 0.1) : lerp(micScale, 1, 0.1);
  if (micImg)
    image(micImg, width / 3, height / 2 + 150, micImg.width * micScale, micImg.height * micScale);

  fill(255);
  textSize(24);
  text(recording ? "Recording..." : "Tap button to record", width / 2, height / 2);
}

async function startStopRecording() {
  if (!recording) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];

      mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunks, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "myRecording.webm";
        a.click();
      };

      mediaRecorder.start();
      recording = true;
      recordButton.html("Stop Recording");
    } catch (err) {
      console.error("Microphone access denied or failed:", err);
    }
  } else {
    mediaRecorder.stop();
    recording = false;
    plantFlower();
    recordButton.html("Start Recording");
  }
}

function plantFlower() {
  let size = random(50, 150);
  let x = random(size / 2, width - size / 2);
  let y = random(size / 2, height - size / 2);
  flowers.push({ x, y, size });
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  recordButton.position(width / 2 - 70, height - 100);
}

