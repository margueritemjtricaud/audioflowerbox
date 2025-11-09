let recording = false;
let audioChunks = [];
let mediaRecorder;

let micImg, bgImg, flowerImg;
let micScale = 0.15; // base scale
let flowers = [];

// Upload feedback
let showUploadText = false;
let uploadTextTimer = 0;

// Prevent double tap on iPad
let ignoreNextTap = false;

// Original polygon in 1920x1080 coordinates
let originalPolygon = [
  { x: 570, y: 570 },
  { x: 1400, y: 570 },
  { x: 1740, y: 970 },
  { x: 160, y: 970 }
];

// Mic hover target scale
let micTargetScale = 0.15;

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

  // Draw flowers with hover/play scaling
  for (let f of flowers) {
    // Hover detection
    let d = dist(mouseX, mouseY, f.x, f.y);
    f.hover = d < f.size / 2;

    // Determine target size
    let targetSize = f.size;
    if (f.hover) targetSize *= 1.2;   // bigger on hover
    if (f.playing) targetSize *= 1.5; // bigger when playing

    // Smoothly animate current size
    if (!f.currentSize) f.currentSize = f.size;
    f.currentSize = lerp(f.currentSize, targetSize, 0.2);

    // Draw flower
    if (flowerImg) image(flowerImg, f.x, f.y, f.currentSize, f.currentSize);
    else ellipse(f.x, f.y, f.currentSize);
  }

  // Animate mic scale (pulse and hover)
  let micX = 150;
  let micY = 150;
  let micW = micImg.width * micScale;
  let micH = micImg.height * micScale;

  // Hover detection for mic
  if (mouseX > micX - micW / 2 && mouseX < micX + micW / 2 &&
      mouseY > micY - micH / 2 && mouseY < micY + micH / 2) {
    micTargetScale = 0.18; // slightly bigger on hover
  } else {
    micTargetScale = recording ? 0.15 : 0.1; // normal or recording pulse
  }

  micScale = lerp(micScale, micTargetScale, 0.2);
  if (micImg)
    image(micImg, micX, micY, micImg.width * micScale, micImg.height * micScale);

  // Upload feedback at bottom right
  if (showUploadText) {
    fill(282, 189, 144); // your color
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
  handleFlowerClick(mouseX, mouseY);
}

function touchStarted() {
  handleMicPress(touchX, touchY);
  handleFlowerClick(touchX, touchY);
  return false;
}

function handleMicPress(x, y) {
  if (ignoreNextTap) return;
  ignoreNextTap = true;
  setTimeout(() => (ignoreNextTap = false), 300);

  let micX = 150;
  let micY = 150;
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

          // Show upload text
          showUploadText = true;
          uploadTextTimer = 120; // 2 seconds

          // Plant flower with audio
          plantFlower(downloadURL);
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
  }
}

// Plant flower inside polygon, store audio URL
function plantFlower(audioURL) {
  let polygon = getScaledPolygon();
  let pos = randomPointInPolygon(polygon);
  let fixedSize = 50;
  flowers.push({
    x: pos.x,
    y: pos.y,
    size: fixedSize,
    audio: audioURL,
    hover: false,
    playing: false,
    currentSize: fixedSize
  });
}

// Detect clicks on flowers and play audio
function handleFlowerClick(x, y) {
  for (let f of flowers) {
    let d = dist(x, y, f.x, f.y);
    if (d < f.size / 2 && f.audio) {
      let audio = new Audio(f.audio);
      f.playing = true;
      audio.play();
      audio.onended = () => f.playing = false;
      break;
    }
  }
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

// Scale polygon coordinates to current canvas size
function getScaledPolygon() {
  const scaleX = width / 1920;
  const scaleY = height / 1080;
  return originalPolygon.map(p => ({ x: p.x * scaleX, y: p.y * scaleY }));
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
