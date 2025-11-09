let recording = false;
let audioChunks = [];
let mediaRecorder;

let micImg, bgImg, flowerImg;
let micScale = 0.3;
let flowers = [];

// Upload feedback
let showUploadText = false;
let uploadTextTimer = 0;

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
}

function draw() {
  background(30);

  if (bgImg) image(bgImg, width / 2, height / 2, width, height);

  for (let f of flowers) {
    if (flowerImg) image(flowerImg, f.x, f.y, f.size, f.size);
    else ellipse(f.x, f.y, f.size);
  }

  // Animate mic size
  micScale = recording ? lerp(micScale, 0.5, 0.05) : lerp(micScale, 0.3, 0.05);

  if (micImg)
    image(micImg, width / 2, height - 150, micImg.width * micScale, micImg.height * micScale);

  // Status text in center
  fill(255);
  textSize(24);
  text(recording ? "Recording..." : "Tap mic to record", width / 2, height / 2);

  // Upload feedback at bottom right
  if (showUploadText) {
    fill(0, 255, 0); // green
    textSize(18);
    textAlign(RIGHT, BOTTOM);
    text("Uploaded!", width - 20, height - 20);

    // Timer countdown
    uploadTextTimer--;
    if (uploadTextTimer <= 0) showUploadText = false;
  }
}

// Handle mouse clicks
function mousePressed() {
  handleMicPress(mouseX, mouseY);
}

// Handle touches
function touchStarted() {
  handleMicPress(touchX, touchY);
  return false;
}

function handleMicPress(x, y) {
  if (ignoreNextTap) return;
  ignoreNextTap = true;
  setTimeout(() => (ignoreNextTap = false), 300);

  let micX = width / 2;
  let micY = height - 150;
  let micW = micImg.width * micScale;
  let micH = micImg.height * micScale;

  if (
    x > micX - micW / 2 &&
    x < micX + micW / 2 &&
    y > micY - micH / 2 &&
    y < micY + micH / 2
  ) {
    startStopRecording();
  }
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

          // Show small upload text at bottom right for 2 seconds
          showUploadText = true;
          uploadTextTimer = 120; // 60 fps * 2s

        } catch (err) {
          console.error("Upload failed:", err);
        }

        plantFlower();
      };

      mediaRecorder.start();
      recording = true;
    } catch (err) {
      console.error("Microphone access denied or failed:", err);
    }
  } else {
    mediaRecorder.stop();
    recording = false;
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
}
