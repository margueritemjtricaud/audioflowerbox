let recording = false;
let audioChunks = [];
let mediaRecorder;

let micImg, bgImg, flowerImg;
let micScale = 0.3;
let flowers = [];
let micX ;
let micY ;
let size =50;

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
   micX = width / 8;
   micY = height / 5;

  if (bgImg) image(bgImg, width / 2, height / 2, width, height);

  for (let f of flowers) {
    if (flowerImg) image(flowerImg, f.x, f.y, f.size, f.size);
    else ellipse(f.x, f.y, f.size);
  }

  // Animate mic size
  micScale = recording ? lerp(micScale, 0.25, 0.08) : lerp(micScale, 0.15, 0.08);

  if (micImg)
    image(micImg, micX, micY, micImg.width * micScale, micImg.height * micScale);

  // Upload feedback at bottom right
  if (showUploadText) {
    fill(253, 185, 146); // beige
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
  let x = random(20, width-20);
  let y = random(200, height -20);
  flowers.push({ x, y, size });
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}















