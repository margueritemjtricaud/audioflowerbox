let recording = false;
let audioChunks = [];
let mediaRecorder;

let micImg;
let micScale = 1;
let bgImg;
let flowerImg;

// Array to store all flowers
let flowers = [];

function preload() {
  micImg = loadImage("assets/mic.png");
  bgImg = loadImage("assets/background.png");
  flowerImg = loadImage("assets/flower.png");
}

function setup() {
  const cnv = createCanvas(windowWidth, windowHeight);
  textAlign(CENTER, CENTER);
  textSize(24);

  cnv.mousePressed(startStopRecording);
  cnv.touchStarted(startStopRecording);
}

function draw() {
  clear();
  background(recording ? lerpColor(color(30,40,60), color(200,50,50), 0.05)
                     : color(30,40,60));

  if (bgImg) {
    imageMode(CENTER);
    image(bgImg, width/2, height/2, width, height);
  }

  // Draw all flowers
  imageMode(CENTER);
  for (let f of flowers) {
    image(flowerImg, f.x, f.y, f.size, f.size);
  }

  fill(255);
  //textAlign(CENTER, CENTER);
  //textSize(24);
  //text(recording ? "Recording..." : "Tap the mic to record", width/2, height/2);

  micScale = recording ? lerp(micScale, 1.5, 0.1) : lerp(micScale, 1, 0.1);
  image(micImg, width/2, height/2 + 100, micImg.width * micScale, micImg.height * micScale);
}

async function startStopRecording() {
  if (!recording) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];

      mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunks, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'myRecording.webm';
        a.click();
      };

      mediaRecorder.start();
      recording = true;
    } catch (err) {
      console.error("Microphone access denied or failed:", err);
    }
  } else {
    mediaRecorder.stop();
    recording = false;
    plantFlower();
  }

  return false;
}

function plantFlower() {
  let size = random(50, 150); // random flower size
  let x = random(size/2, width - size/2);
  let y = random(size/2, height - size/2);
  flowers.push({ x, y, size });
}
