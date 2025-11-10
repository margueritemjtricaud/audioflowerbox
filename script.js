let recording = false;
let audioChunks = [];
let mediaRecorder;

let micImg, bgImg, flowerImg;
let micScale = 0.15; // Base scale for mic button
let flowers = [];
let hoveredFlower = null;
let playingFlower = null;

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

// --- AUDIO PLAYER ---
let currentAudio = null;

// --- IMAGES ---
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

  // Load existing flowers from Firestore
  db.collection("flowers")
    .orderBy("createdAt")
    .get()
    .then(snapshot => {
      snapshot.forEach(doc => {
        flowers.push(doc.data());
      });
      console.log(`🌸 Loaded ${flowers.length} flowers`);
    })
    .catch(err => console.error("Failed to load flowers:", err));
}

function draw() {
  background(30);

  if (bgImg) image(bgImg, width / 2, height / 2, width, height);

  // Draw flowers with subtle animation
  hoveredFlower = null;
  for (let f of flowers) {
    let d = dist(mouseX, mouseY, f.x, f.y);
    let hover = d < f.size / 2;

    if (hover && !recording) hoveredFlower = f;

    let targetSize = f.size;
    if (f === playingFlower) targetSize *= 1.4; // bigger while playing
    else if (hover && !recording) targetSize *= 1.15; // gentle hover grow

    f.currentSize = lerp(f.currentSize || f.size, targetSize, 0.1);

    if (flowerImg)
      image(flowerImg, f.x, f.y, f.currentSize, f.currentSize);
    else ellipse(f.x, f.y, f.currentSize);
  }

  // Animate mic (pulse when recording)
  let pulse = recording ? 0.02 * sin(frameCount * 0.1) : 0;
  let targetScale = recording ? 0.15 + pulse : (hoveringMic() ? 0.12 : 0.1);
  micScale = lerp(micScale, targetScale, 0.1);

  // Draw mic button (top-left)
  if (micImg)
    image(micImg, 150, 150, micImg.width * micScale, micImg.height * micScale);

  // Upload feedback at bottom right
  if (showUploadText) {
    fill(282, 189, 144);
    textSize(18);
    textAlign(RIGHT, BOTTOM);
    text("Uploaded!", width - 20, height - 20);
    uploadTextTimer--;
    if (uploadTextTimer <= 0) showUploadText = false;
  }
}

// --- EVENT HANDLERS ---
function mousePressed() {
  if (recording) {
    stopRecording();
    return;
  }

  if (hoveredFlower) {
    playFlower(hoveredFlower);
  } else if (hoveringMic()) {
    startStopRecording();
  }
}

function touchStarted() {
  mousePressed();
  return false;
}

// --- MIC INTERACTION ---
function hoveringMic() {
  let micX = 150;
  let micY = 150;
  let micW = micImg.width * micScale;
  let micH = micImg.height * micScale;
  return (
    mouseX > micX - micW / 2 &&
    mouseX < micX + micW / 2 &&
    mouseY > micY - micH / 2 &&
    mouseY < micY + micH / 2
  );
}

async function startStopRecording() {
  if (!recording) {
    // Stop any playing audio
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
      playingFlower = null;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];

      mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);

      mediaRecorder.onstop = async () => {
        await uploadRecording();
      };

      mediaRecorder.start();
      recording = true;
      console.log("🎙️ Recording started...");
    } catch (err) {
      console.error("Microphone access denied or failed:", err);
    }
  } else {
    stopRecording();
  }
}

function stopRecording() {
  if (mediaRecorder && recording) {
    mediaRecorder.stop();
    recording = false;
    console.log("🛑 Recording stopped");
  }
}

async function uploadRecording() {
  const blob = new Blob(audioChunks, { type: "audio/webm" });
  // Avoid %2F by not using a folder in filename
  const filename = `rec-${Date.now()}.webm`;
  const storageRef = storage.ref(filename);

  try {
    await storageRef.put(blob);
    const downloadURL = await storageRef.getDownloadURL();
    console.log("✅ Uploaded:", downloadURL);

    // 🌼 Create and store flower in Firestore
    const polygon = getScaledPolygon();
    const pos = randomPointInPolygon(polygon);
    const flowerData = {
      x: pos.x,
      y: pos.y,
      size: 50,
      url: downloadURL,
      createdAt: Date.now(),
    };

    await db.collection("flowers").add(flowerData);
    flowers.push(flowerData);

    // Show upload feedback
    showUploadText = true;
    uploadTextTimer = 120;
  } catch (err) {
    console.error("Upload failed:", err);
  }
}

// --- FLOWER PLAYBACK ---
function playFlower(flower) {
  // Stop current audio if any
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
    playingFlower = null;
  }

  currentAudio = new Audio(flower.url);
  playingFlower = flower;
  currentAudio.play();

  currentAudio.onended = () => {
    playingFlower = null;
  };
}

// --- HELPERS ---
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

function getScaledPolygon() {
  const scaleX = width / 1920;
  const scaleY = height / 1080;
  return originalPolygon.map(p => ({ x: p.x * scaleX, y: p.y * scaleY }));
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
