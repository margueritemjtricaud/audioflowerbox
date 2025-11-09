let recording = false;
let audioChunks = [];
let mediaRecorder;

let micImg, bgImg, flowerImg;
let micScale = 1;
let flowers = [];
let recordButton;

// Prevent double tap on iPad
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

  // Create PNG button
  recordButton = createImg("assets/record.png", "record button");
  recordButton.size(10, 10);
  recordButton.position(width / 2 - 50, height - 350);
  recordButton.style("cursor", "pointer");

  // Handle clicks/taps
  recordButton.mousePressed(handleRecord);
  recordButton.touchEnded(handleRecord);
}

function draw() {
  background(30);

  if (bgImg) image(bgImg, width / 2, height / 2, width, height);

  // Draw flowers
  for (let f of flowers) {
    if (flowerImg) image(flowerImg, f.x, f.y, f.size, f.size);
    else {
      fill(0, 255, 0);
      ellipse(f.x, f.y, f.size);
    }
  }

  // Animate mic
  micScale = recording ? lerp(micScale, 1.5, 0.1) : lerp(micScale, 1, 0.1);
  if (micImg)
    image(micImg, width / 2, height / 2 + 200, micImg.width * micScale, micImg.height * micScale);

  // Animate record button scale
  let targetSize = recording ? 120 : 100;
  recordButton.size(lerp(recordButton.width, targetSize, 0.2), lerp(recordButton.height, targetSize, 0.2));
  recordButton.position(width / 2 - recordButton.width / 2, height - 150);

  // Display text
  fill(255);
  textSize(24);
  text(recording ? "Recording..." : "Tap button to record", width / 2, height / 2);
}

function handleRecord() {
  if (ignoreNextTap) return;
  ignoreNextTap = true;
  setTimeout(() => (ignoreNextTap = false), 300);
  startStopRecording();
}

async function startStopRecording() {
  if (!recording) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];

      mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
      mediaRecorder.onstop = async () => {
        const blob = new Blob(audioChunks, { type: "audio/webm" });
        const filename = `recordings/rec-${Date.now()}.webm`;
        const storageRef = storage.ref(filename);

        try {
          await storageRef.put(blob);
          const downloadURL = await storageRef.getDownloadURL();
          console.log("✅ Uploaded:", downloadURL);
          alert("Recording uploaded!");
        } catch (err) {
          console.error("Upload failed:", err);
        }
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
}

function plantFlower() {
  let size = random(50, 150);
  let x = random(size / 2, width - size / 2);
  let y = random(size / 2, height - size / 2);
  flowers.push({ x, y, size });
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  recordButton.position(width / 2 - recordButton.width / 2, height - 150);
}


