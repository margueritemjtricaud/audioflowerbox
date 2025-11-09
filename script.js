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

// Define polygon area for flowers
let polygon = [
  { x: 583, y: 582 },
  { x: 1403, y: 582 },
  { x: 1760, y: 970 },
  { x: 160, y: 970 }
];

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

  // Draw flowers
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

    uploadTextTimer--;
    if (uploadTextTimer <= 0) showUploadText = false;
  }
}

// Mouse and touch handling
function mousePressed() {
  handleMicPress(mouseX, mouseY);
}

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

          // Show small upload text at bottom right for ~2 seconds
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

// Plant flower inside polygon
function plantFlower() {
  let pos = randomPointInPolygon(polygon);
  let fixedSize = 50;
  flowers.push({ x: pos.x, y: pos.y, size: fixedSize });
}

// Random point inside polygon using bounding box + ray-casting
function randomPointInPolygon(poly) {
  let minX = Math.min(...poly.map(p => p.x));
  let maxX = Math.max(...poly.map(p => p.x));
  let minY = Math.min(...poly.map(p => p.y));
  let maxY = Math.max(...poly.map(p => p.y));

  let x, y;
  do {
    x = random(minX, maxX);
    y = random(minY, maxY);
  } while (!pointInPolygon(x, y, poly));
  return { x, y };
}

// Ray-casting algorithm to test point inside polygon
function pointInPolygon(px, py, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y;
    const xj = poly[j].x, yj = poly[j].y;
    const intersect = ((yi > py) !== (yj > py)) &&
                      (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
