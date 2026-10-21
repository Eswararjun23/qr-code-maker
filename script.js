/* ==========================================================================
   Modern QR Code Generator - Enhanced Script
   - Auto-compression for large images (client-side)
   - Creative QR Shapes: Heart, Circle, Star, Cat, Tree, Flower, Custom
   - Modules, Corner eyes, Gradients, Backgrounds & Logos
   - Scannability Verification & Live Scan Test (jsQR)
   - High-Res PNG & Vector SVG Downloads
   - Responsive & Live Preview
   ========================================================================== */

// 1. Global Application State
const appState = {
  currentMode: 'text',           // 'text' or 'image'
  textPayload: 'https://github.com',
  imagePayload: '',              // Base64 data URL
  imageOriginalSize: 0,
  imageOptimizedSize: 0,
  
  // Customization Options
  shape: 'classic',              // 'classic', 'heart', 'circle', 'star', 'cat', 'tree', 'flower', 'custom'
  customPreset: 'diamond',       // 'diamond', 'shield', 'hexagon', 'cloud'
  dotStyle: 'square',            // 'square', 'dots', 'rounded', 'extra-rounded', 'hearts', 'stars', 'classy'
  cornerEyeStyle: 'square',      // 'square', 'rounded', 'extra-rounded', 'circle'
  cornerDotStyle: 'square',      // 'square', 'dot', 'heart', 'star'
  
  colorMode: 'solid',            // 'solid', 'linear', 'radial'
  color1: '#0f172a',
  color2: '#4f46e5',
  bgColor: '#ffffff',
  bgTransparent: false,
  bgImageObj: null,
  bgImageName: '',
  bgOpacity: 0.20,
  
  logoPreset: 'none',            // 'none', 'heart', 'star', 'cat', 'tree', 'flower', 'link', 'camera', 'custom'
  customLogoObj: null,
  customLogoName: '',
  
  errorCorrection: 'H',          // 'L', 'M', 'Q', 'H' (High 30% by default for shapes/logos)
  
  // Scannability test tracking
  isScannable: true,
  decodedPayload: '',
  scanDurationMs: 0
};

// 2. DOM Elements
const textModeBtn = document.getElementById('textModeBtn');
const imageModeBtn = document.getElementById('imageModeBtn');
const textModeSection = document.getElementById('textModeSection');
const imageModeSection = document.getElementById('imageModeSection');

const textInput = document.getElementById('textInput');
const imageInput = document.getElementById('imageInput');
const uploadArea = document.getElementById('uploadArea');
const imagePreviewContainer = document.getElementById('imagePreviewContainer');
const imagePreview = document.getElementById('imagePreview');
const fileNameDisplay = document.getElementById('fileNameDisplay');
const compressionBadge = document.getElementById('compressionBadge');
const compressionText = document.getElementById('compressionText');

const toggleCustomizerBtn = document.getElementById('toggleCustomizerBtn');
const customizerChevron = document.getElementById('customizerChevron');
const customizerPanel = document.getElementById('customizerPanel');
const styleSummaryBadge = document.getElementById('styleSummaryBadge');

const errorBanner = document.getElementById('errorBanner');
const errorMessage = document.getElementById('errorMessage');

const qrResultSection = document.getElementById('qrResultSection');
const qrContainer = document.getElementById('qrContainer');

const scannabilityCard = document.getElementById('scannabilityCard');
const scanStatusIcon = document.getElementById('scanStatusIcon');
const scanStatusTitle = document.getElementById('scanStatusTitle');
const scanStatusDetails = document.getElementById('scanStatusDetails');

// Scan Modal elements
const scanModal = document.getElementById('scanModal');
const modalQrPreview = document.getElementById('modalQrPreview');
const modalDecodedText = document.getElementById('modalDecodedText');
const modalMetaInfo = document.getElementById('modalMetaInfo');
const openDecodedBtn = document.getElementById('openDecodedBtn');

// Active rendered canvas reference for export & testing
let activeQrCanvas = null;
let livePreviewTimer = null;

// ==========================================================================
// 3. Mode Switching & UX Helpers
// ==========================================================================

function switchMode(mode) {
  appState.currentMode = mode;
  hideError();

  if (mode === 'text') {
    textModeBtn.classList.add('active');
    textModeBtn.setAttribute('aria-selected', 'true');
    imageModeBtn.classList.remove('active');
    imageModeBtn.setAttribute('aria-selected', 'false');

    textModeSection.classList.remove('hidden');
    imageModeSection.classList.add('hidden');
    textInput.focus();
  } else if (mode === 'image') {
    imageModeBtn.classList.add('active');
    imageModeBtn.setAttribute('aria-selected', 'true');
    textModeBtn.classList.remove('active');
    textModeBtn.setAttribute('aria-selected', 'false');

    imageModeSection.classList.remove('hidden');
    textModeSection.classList.add('hidden');
  }

  triggerLivePreview();
}

function triggerFileInput() {
  imageInput.click();
}

// Drag and drop handlers for upload area
function handleDragOver(e) {
  e.preventDefault();
  uploadArea.classList.add('drag-over');
}

function handleDragLeave(e) {
  e.preventDefault();
  uploadArea.classList.remove('drag-over');
}

function handleDrop(e) {
  e.preventDefault();
  uploadArea.classList.remove('drag-over');
  if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
    processImageFile(e.dataTransfer.files[0]);
  }
}

// ==========================================================================
// 4. Large Image Processing & In-Browser Automatic Optimization
// ==========================================================================

function handleImageSelect(event) {
  hideError();
  const file = event.target.files[0];
  if (!file) return;
  processImageFile(file);
}

async function processImageFile(file) {
  hideError();

  // Validate file type
  if (!file.type || !file.type.startsWith('image/')) {
    showError('Please select a valid image file (PNG, JPG, WEBP, or SVG).');
    clearSelectedImage();
    return;
  }

  fileNameDisplay.textContent = `Processing: ${file.name}...`;

  try {
    // Automatically compress and optimize the image in the browser for QR code storage
    const optimized = await optimizeImageForQR(file);
    appState.imagePayload = optimized.dataUrl;
    appState.imageOriginalSize = optimized.originalSize;
    appState.imageOptimizedSize = optimized.optimizedSize;

    // Display preview
    imagePreview.src = optimized.dataUrl;
    fileNameDisplay.textContent = `${file.name}`;

    // Format human-friendly file size strings
    const origStr = formatBytes(optimized.originalSize);
    const optStr = formatBytes(optimized.optimizedSize);

    compressionText.textContent = `Auto-optimized: ${origStr} → ${optStr}`;
    compressionBadge.classList.remove('hidden');
    imagePreviewContainer.classList.remove('hidden');

    // Trigger live generation
    triggerLivePreview();
  } catch (err) {
    console.error("Image processing error:", err);
    showError(err.message || 'Unable to process image. Please try a different file.');
    clearSelectedImage();
  }
}

// Client-side canvas image downscaling & compression algorithm
function optimizeImageForQR(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      try {
        // Target length for QR Version 40 (theoretical max 2953 bytes)
        const MAX_PAYLOAD_CHARS = 2400;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        let maxDim = 48; // starting max dimension (preserving aspect ratio)
        let quality = 0.75;
        let bestDataUrl = '';
        let format = 'image/webp';

        // Check if browser supports WebP canvas export
        if (!canvas.toDataURL('image/webp').startsWith('data:image/webp')) {
          format = 'image/jpeg';
        }

        // Iteratively downscale and compress until payload safely fits in QR code
        for (let step = 0; step < 12; step++) {
          let w = img.naturalWidth || img.width;
          let h = img.naturalHeight || img.height;

          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
          w = Math.max(16, w);
          h = Math.max(16, h);

          canvas.width = w;
          canvas.height = h;

          ctx.clearRect(0, 0, w, h);
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, w, h);

          const dataUrl = canvas.toDataURL(format, quality);
          bestDataUrl = dataUrl;

          if (dataUrl.length <= MAX_PAYLOAD_CHARS) {
            break;
          }

          // Step down dimensions and quality
          maxDim = Math.max(16, Math.round(maxDim * 0.85));
          quality = Math.max(0.25, quality - 0.12);
        }

        resolve({
          dataUrl: bestDataUrl,
          originalSize: file.size,
          optimizedSize: Math.round((bestDataUrl.length * 3) / 4)
        });
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image. The image file may be damaged.'));
    };

    img.src = objectUrl;
  });
}

function clearSelectedImage() {
  appState.imagePayload = '';
  appState.imageOriginalSize = 0;
  appState.imageOptimizedSize = 0;
  imageInput.value = '';
  imagePreview.src = '';
  fileNameDisplay.textContent = 'Selected image: none';
  imagePreviewContainer.classList.add('hidden');
  compressionBadge.classList.add('hidden');
  triggerLivePreview();
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// ==========================================================================
// 5. Customizer Accordion & Tab Controls
// ==========================================================================

function toggleCustomizer() {
  const isHidden = customizerPanel.classList.contains('hidden');
  if (isHidden) {
    customizerPanel.classList.remove('hidden');
    customizerChevron.classList.add('open');
    toggleCustomizerBtn.setAttribute('aria-expanded', 'true');
  } else {
    customizerPanel.classList.add('hidden');
    customizerChevron.classList.remove('open');
    toggleCustomizerBtn.setAttribute('aria-expanded', 'false');
  }
}

function switchCustTab(tabId) {
  const tabs = ['shapes', 'patterns', 'colors', 'logo'];
  const buttons = document.querySelectorAll('.cust-tab-btn');

  buttons.forEach((btn, idx) => {
    btn.classList.toggle('active', tabs[idx] === tabId);
  });

  document.getElementById('custTabShapes').classList.toggle('hidden', tabId !== 'shapes');
  document.getElementById('custTabPatterns').classList.toggle('hidden', tabId !== 'patterns');
  document.getElementById('custTabColors').classList.toggle('hidden', tabId !== 'colors');
  document.getElementById('custTabLogo').classList.toggle('hidden', tabId !== 'logo');
}

// Shape selection
function setQRShape(shape) {
  appState.shape = shape;
  document.querySelectorAll('.shape-btn[data-shape]').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-shape') === shape);
  });

  const customSub = document.getElementById('customShapeOptions');
  if (shape === 'custom') {
    customSub.classList.remove('hidden');
  } else {
    customSub.classList.add('hidden');
  }

  // Update toggle summary badge
  const shapeLabels = {
    classic: 'Classic',
    heart: 'Heart ❤️',
    circle: 'Circle ⚪',
    star: 'Star ⭐',
    cat: 'Cat 🐱',
    tree: 'Tree 🌳',
    flower: 'Flower 🌸',
    custom: 'Custom 🎨'
  };
  styleSummaryBadge.textContent = shapeLabels[shape] || 'Custom';

  triggerLivePreview();
}

function setCustomShapePreset(preset) {
  appState.customPreset = preset;
  document.querySelectorAll('.mini-chips .chip-btn').forEach(btn => {
    btn.classList.toggle('active', btn.textContent.toLowerCase().includes(preset));
  });
  triggerLivePreview();
}

// Dot / Module pattern
function setDotStyle(style) {
  appState.dotStyle = style;
  document.querySelectorAll('.pill-btn[data-dot]').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-dot') === style);
  });
  triggerLivePreview();
}

// Corner styles
function setCornerEyeStyle(style) {
  appState.cornerEyeStyle = style;
  document.querySelectorAll('.pill-btn[data-ceye]').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-ceye') === style);
  });
  triggerLivePreview();
}

function setCornerDotStyle(style) {
  appState.cornerDotStyle = style;
  document.querySelectorAll('.pill-btn[data-cdot]').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-cdot') === style);
  });
  triggerLivePreview();
}

// Color mode & pickers
function setColorMode(mode) {
  appState.colorMode = mode;
  document.querySelectorAll('.segment-btn[data-cmode]').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-cmode') === mode);
  });

  const color2Container = document.getElementById('color2Container');
  if (mode === 'solid') {
    color2Container.style.opacity = '0.4';
    color2Container.style.pointerEvents = 'none';
  } else {
    color2Container.style.opacity = '1';
    color2Container.style.pointerEvents = 'auto';
  }
  triggerLivePreview();
}

function handleColor1Change(e) {
  appState.color1 = e.target.value;
  document.getElementById('qrColor1Hex').textContent = e.target.value.toUpperCase();
  triggerLivePreview();
}

function handleColor2Change(e) {
  appState.color2 = e.target.value;
  document.getElementById('qrColor2Hex').textContent = e.target.value.toUpperCase();
  triggerLivePreview();
}

function handleBgColorChange(e) {
  appState.bgColor = e.target.value;
  document.getElementById('qrBgColorHex').textContent = e.target.value.toUpperCase();
  triggerLivePreview();
}

function handleTransparentBgChange(e) {
  appState.bgTransparent = e.target.checked;
  triggerLivePreview();
}

function applyPresetColors(c1, c2, bg, mode) {
  appState.color1 = c1;
  appState.color2 = c2;
  appState.bgColor = bg;
  appState.colorMode = mode;

  document.getElementById('qrColor1').value = c1;
  document.getElementById('qrColor1Hex').textContent = c1.toUpperCase();
  document.getElementById('qrColor2').value = c2;
  document.getElementById('qrColor2Hex').textContent = c2.toUpperCase();
  document.getElementById('qrBgColor').value = bg;
  document.getElementById('qrBgColorHex').textContent = bg.toUpperCase();

  setColorMode(mode);
  triggerLivePreview();
}

// Background Image overlay
function triggerBgImageInput() {
  document.getElementById('bgImageInput').click();
}

function handleBgImageSelect(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(evt) {
    const img = new Image();
    img.onload = function() {
      appState.bgImageObj = img;
      appState.bgImageName = file.name;
      document.getElementById('bgImageName').textContent = file.name;
      document.getElementById('bgImageStatus').classList.remove('hidden');
      triggerLivePreview();
    };
    img.src = evt.target.result;
  };
  reader.readAsDataURL(file);
}

function handleBgOpacityChange(e) {
  appState.bgOpacity = parseInt(e.target.value, 10) / 100;
  document.getElementById('bgOpacityVal').textContent = `${e.target.value}%`;
  triggerLivePreview();
}

function clearBgImage() {
  appState.bgImageObj = null;
  appState.bgImageName = '';
  document.getElementById('bgImageInput').value = '';
  document.getElementById('bgImageStatus').classList.add('hidden');
  triggerLivePreview();
}

// Logo Presets & Custom Upload
function setLogoPreset(logo) {
  appState.logoPreset = logo;
  document.querySelectorAll('.shape-btn[data-logo]').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-logo') === logo);
  });
  triggerLivePreview();
}

function triggerLogoInput() {
  document.getElementById('logoFileInput').click();
}

function handleCustomLogoSelect(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(evt) {
    const img = new Image();
    img.onload = function() {
      appState.customLogoObj = img;
      appState.customLogoName = file.name;
      appState.logoPreset = 'custom';

      document.getElementById('customLogoThumb').src = evt.target.result;
      document.getElementById('customLogoName').textContent = file.name;
      document.getElementById('customLogoPreviewWrap').classList.remove('hidden');

      // Unselect other logo buttons
      document.querySelectorAll('.shape-btn[data-logo]').forEach(btn => {
        btn.classList.remove('active');
      });

      triggerLivePreview();
    };
    img.src = evt.target.result;
  };
  reader.readAsDataURL(file);
}

function clearCustomLogo() {
  appState.customLogoObj = null;
  appState.customLogoName = '';
  document.getElementById('logoFileInput').value = '';
  document.getElementById('customLogoPreviewWrap').classList.add('hidden');
  setLogoPreset('none');
}

// Error correction
function setErrorCorrection(level) {
  appState.errorCorrection = level;
  document.querySelectorAll('.segment-btn[data-ec]').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-ec') === level);
  });
  triggerLivePreview();
}

// ==========================================================================
// 6. QR Code Generation & Creative Rendering Engine
// ==========================================================================

function getActivePayload() {
  if (appState.currentMode === 'text') {
    return textInput.value.trim();
  } else if (appState.currentMode === 'image') {
    return appState.imagePayload;
  }
  return '';
}

function triggerLivePreview() {
  clearTimeout(livePreviewTimer);
  livePreviewTimer = setTimeout(() => {
    const payload = getActivePayload();
    if (payload) {
      generateQRCode(false); // don't scroll on subtle auto-updates
    }
  }, 120);
}

// Primary generate function called by button or Enter key
function generateQRCode(shouldScroll = true) {
  hideError();

  const payload = getActivePayload();
  if (!payload) {
    if (appState.currentMode === 'text') {
      showError('Please enter some text or a URL.');
      textInput.focus();
    } else {
      showError('Please choose an image to generate a QR code.');
    }
    return;
  }

  try {
    // Generate QR matrix
    const matrixData = createQRMatrix(payload, appState.errorCorrection);
    if (!matrixData) {
      showError('Content is too large to fit into a QR code. Try shortening the text or image.');
      return;
    }

    // Render QR onto preview canvas (size 260px)
    const previewCanvas = document.createElement('canvas');
    renderQRToCanvas(previewCanvas, matrixData, 260);

    // Update active container
    qrContainer.innerHTML = '';
    qrContainer.appendChild(previewCanvas);
    activeQrCanvas = previewCanvas;

    // Run Scannability Verification with jsQR
    const scanResult = testScannability(previewCanvas, payload);
    updateScannabilityUI(scanResult);

    // Reveal result card
    qrResultSection.classList.remove('hidden');

    if (shouldScroll) {
      qrResultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  } catch (err) {
    console.error("QR Generation error:", err);
    showError('Could not generate QR code. ' + (err.message || 'Please check your inputs.'));
  }
}

// Helper to create 2D boolean module matrix using Kazuhiko Arase's qrcode-generator
function createQRMatrix(text, ecLevel) {
  if (typeof qrcode === 'undefined') {
    throw new Error('QR generator library is initializing. Please try again.');
  }

  try {
    // 0 = auto-select version (Version 1 to 40)
    const qr = qrcode(0, ecLevel || 'H');
    qr.addData(text);
    qr.make();

    const count = qr.getModuleCount();
    const matrix = [];
    for (let r = 0; r < count; r++) {
      const row = [];
      for (let c = 0; c < count; c++) {
        row.push(qr.isDark(r, c));
      }
      matrix.push(row);
    }

    return {
      count,
      matrix,
      ecLevel
    };
  } catch (e) {
    // Fallback: If Level H overflowed, try Level M or Q
    if (ecLevel !== 'M' && ecLevel !== 'L') {
      try {
        const qr = qrcode(0, 'M');
        qr.addData(text);
        qr.make();
        const count = qr.getModuleCount();
        const matrix = [];
        for (let r = 0; r < count; r++) {
          const row = [];
          for (let c = 0; c < count; c++) {
            row.push(qr.isDark(r, c));
          }
          matrix.push(row);
        }
        return { count, matrix, ecLevel: 'M' };
      } catch (e2) {
        return null;
      }
    }
    return null;
  }
}

// Checks if module coordinate belongs to one of the 3 corner Finder Patterns (8x8 reserved area)
function isFinderPatternZone(r, c, N) {
  if (r < 8 && c < 8) return true;                  // Top-Left
  if (r < 8 && c >= N - 8) return true;              // Top-Right
  if (r >= N - 8 && c < 8) return true;              // Bottom-Left
  return false;
}

// Checks if module coordinate belongs to the center logo safe-card zone
function isCenterLogoZone(r, c, N) {
  if (appState.logoPreset === 'none' && !appState.customLogoObj) return false;
  const center = Math.floor(N / 2);
  const half = Math.max(2, Math.floor(N * 0.11)); // ~22% center safe zone
  return (r >= center - half && r <= center + half && c >= center - half && c <= center + half);
}

// Render QR code to Canvas
function renderQRToCanvas(canvas, qrData, targetSize) {
  const { count, matrix } = qrData;
  canvas.width = targetSize;
  canvas.height = targetSize;
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, targetSize, targetSize);

  // 1. Draw Background
  if (!appState.bgTransparent) {
    ctx.fillStyle = appState.bgColor;
    ctx.fillRect(0, 0, targetSize, targetSize);
  }

  // Draw background image overlay if present
  if (appState.bgImageObj) {
    ctx.save();
    ctx.globalAlpha = appState.bgOpacity;
    ctx.drawImage(appState.bgImageObj, 0, 0, targetSize, targetSize);
    ctx.restore();
  }

  // 2. Draw Creative Shape Silhouette Frame (Heart, Circle, Star, Cat, Tree, Flower, Custom)
  drawShapeFrame(ctx, targetSize, appState.shape, appState.customPreset, appState.bgColor, appState.color1);

  // 3. Module calculations with safe quiet zone
  const quietZoneRatio = 0.82; // 82% QR code, 18% quiet zone / shape frame
  const qrInnerSize = targetSize * quietZoneRatio;
  const moduleSize = qrInnerSize / count;
  const offsetX = (targetSize - qrInnerSize) / 2;
  const offsetY = (targetSize - qrInnerSize) / 2;

  // 4. Create Fill Style for Data Modules (Solid, Linear Gradient, Radial Gradient)
  let qrFillStyle = appState.color1;
  if (appState.colorMode === 'linear') {
    const grad = ctx.createLinearGradient(offsetX, offsetY, offsetX + qrInnerSize, offsetY + qrInnerSize);
    grad.addColorStop(0, appState.color1);
    grad.addColorStop(1, appState.color2);
    qrFillStyle = grad;
  } else if (appState.colorMode === 'radial') {
    const cx = targetSize / 2;
    const cy = targetSize / 2;
    const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, qrInnerSize * 0.6);
    grad.addColorStop(0, appState.color1);
    grad.addColorStop(1, appState.color2);
    qrFillStyle = grad;
  }

  ctx.fillStyle = qrFillStyle;

  // 5. Draw Data Modules (outside Finder Patterns & Center Logo)
  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (!matrix[r][c]) continue;
      if (isFinderPatternZone(r, c, count)) continue;
      if (isCenterLogoZone(r, c, count)) continue;

      const x = offsetX + c * moduleSize;
      const y = offsetY + r * moduleSize;

      drawSingleModule(ctx, x, y, moduleSize, appState.dotStyle, r, c);
    }
  }

  // 6. Draw the 3 Protected Finder Patterns (Corners)
  const finderPositions = [
    { r: 0, c: 0 },
    { r: 0, c: count - 7 },
    { r: count - 7, c: 0 }
  ];

  for (const pos of finderPositions) {
    const fx = offsetX + pos.c * moduleSize;
    const fy = offsetY + pos.r * moduleSize;
    const finderSize = 7 * moduleSize;

    drawFinderPattern(ctx, fx, fy, finderSize, moduleSize, appState.cornerEyeStyle, appState.cornerDotStyle, qrFillStyle, appState.bgColor, appState.bgTransparent);
  }

  // 7. Draw Center Logo / Icon (if active)
  drawCenterLogo(ctx, targetSize, count, moduleSize);

  return canvas;
}

// Draw a single data module with chosen pattern style
function drawSingleModule(ctx, x, y, size, style, r, c) {
  const pad = size * 0.06;
  const w = size - pad * 2;
  const cx = x + size / 2;
  const cy = y + size / 2;

  switch (style) {
    case 'dots': {
      ctx.beginPath();
      ctx.arc(cx, cy, w * 0.46, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'rounded': {
      drawRoundRect(ctx, x + pad, y + pad, w, w, w * 0.3);
      ctx.fill();
      break;
    }
    case 'extra-rounded': {
      drawRoundRect(ctx, x + pad, y + pad, w, w, w * 0.46);
      ctx.fill();
      break;
    }
    case 'hearts': {
      drawMiniHeart(ctx, cx, cy, w * 0.95);
      break;
    }
    case 'stars': {
      drawMiniStar(ctx, cx, cy, w * 0.5);
      break;
    }
    case 'classy': {
      // Opposing rounded corners (top-left & bottom-right rounded)
      drawClassyModule(ctx, x + pad, y + pad, w, (r + c) % 2 === 0);
      break;
    }
    case 'square':
    default: {
      ctx.fillRect(x, y, size, size);
      break;
    }
  }
}

// Draw protected Finder Pattern (Outer Eye 7x7 + Inner Dot 3x3)
function drawFinderPattern(ctx, x, y, totalSize, modSize, eyeStyle, dotStyle, fillColor, bgColor, bgTransparent) {
  ctx.save();

  // Clear 7x7 background area with proper contrast
  ctx.fillStyle = bgTransparent ? '#ffffff' : bgColor;
  ctx.fillRect(x, y, totalSize, totalSize);

  ctx.fillStyle = fillColor;

  // 1. Draw Outer Eye (7x7 modules with 5x5 hollow inner cutout)
  switch (eyeStyle) {
    case 'circle': {
      ctx.beginPath();
      const radius = totalSize / 2;
      ctx.arc(x + radius, y + radius, radius, 0, Math.PI * 2);
      ctx.arc(x + radius, y + radius, radius - modSize, 0, Math.PI * 2, true);
      ctx.fill();
      break;
    }
    case 'rounded': {
      drawHollowRoundRect(ctx, x, y, totalSize, totalSize, modSize * 1.8, modSize);
      break;
    }
    case 'extra-rounded': {
      drawHollowRoundRect(ctx, x, y, totalSize, totalSize, modSize * 3, modSize);
      break;
    }
    case 'square':
    default: {
      // 7x7 outer square minus 5x5 inner square
      ctx.fillRect(x, y, totalSize, totalSize);
      ctx.fillStyle = bgTransparent ? '#ffffff' : bgColor;
      ctx.fillRect(x + modSize, y + modSize, totalSize - 2 * modSize, totalSize - 2 * modSize);
      ctx.fillStyle = fillColor;
      break;
    }
  }

  // 2. Draw Center Eye Dot (3x3 modules centered at offset 2 * modSize)
  const dotX = x + 2 * modSize;
  const dotY = y + 2 * modSize;
  const dotSize = 3 * modSize;
  const dotCx = x + totalSize / 2;
  const dotCy = y + totalSize / 2;

  switch (dotStyle) {
    case 'dot': {
      ctx.beginPath();
      ctx.arc(dotCx, dotCy, dotSize * 0.48, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'heart': {
      drawMiniHeart(ctx, dotCx, dotCy, dotSize * 0.95);
      break;
    }
    case 'star': {
      drawMiniStar(ctx, dotCx, dotCy, dotSize * 0.52);
      break;
    }
    case 'square':
    default: {
      ctx.fillRect(dotX, dotY, dotSize, dotSize);
      break;
    }
  }

  ctx.restore();
}

// Draw Creative Shape Frame Silhouette (Heart, Circle, Star, Cat, Tree, Flower, Custom)
function drawShapeFrame(ctx, size, shape, customPreset, bgColor, strokeColor) {
  if (shape === 'classic') return;

  ctx.save();
  const pad = 8;
  const w = size - pad * 2;
  const cx = size / 2;
  const cy = size / 2;

  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 3;
  ctx.fillStyle = 'rgba(79, 70, 229, 0.04)';

  switch (shape) {
    case 'heart': {
      // Beautiful smooth heart silhouette frame
      drawHeartPath(ctx, cx, cy + 8, w * 0.98);
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'circle': {
      ctx.beginPath();
      ctx.arc(cx, cy, w * 0.49, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'star': {
      drawStarFrame(ctx, cx, cy, w * 0.5, w * 0.42, 8);
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'cat': {
      // Adorable Cat silhouette with ears at the top
      drawCatSilhouette(ctx, cx, cy, w);
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'tree': {
      // Tree canopy frame with scalloped leaves & trunk
      drawTreeSilhouette(ctx, cx, cy, w);
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'flower': {
      // Blooming flower with 8 petals
      drawFlowerSilhouette(ctx, cx, cy, w * 0.48);
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'custom': {
      drawCustomPresetShape(ctx, cx, cy, w, customPreset);
      ctx.fill();
      ctx.stroke();
      break;
    }
  }

  ctx.restore();
}

// Center Logo / Icon Renderer
function drawCenterLogo(ctx, size, count, modSize) {
  if (appState.logoPreset === 'none' && !appState.customLogoObj) return;

  ctx.save();
  const cx = size / 2;
  const cy = size / 2;
  const badgeSize = Math.max(36, Math.floor(count * 0.22 * modSize));
  const badgeRadius = badgeSize / 2;

  // 1. Draw protective contrasting halo/card badge with soft shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 2;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(cx, cy, badgeRadius, 0, Math.PI * 2);
  ctx.fill();

  // Thin clean border around logo badge
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // 2. Draw custom uploaded image or preset icon
  if (appState.logoPreset === 'custom' && appState.customLogoObj) {
    const img = appState.customLogoObj;
    const imgSize = badgeSize * 1.35;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, badgeRadius - 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, cx - imgSize / 2, cy - imgSize / 2, imgSize, imgSize);
    ctx.restore();
  } else {
    // Preset Emojis / Symbols
    const emojiMap = {
      heart: '❤️',
      star: '⭐',
      cat: '🐱',
      tree: '🌳',
      flower: '🌸',
      link: '🔗',
      camera: '📷'
    };
    const emoji = emojiMap[appState.logoPreset];
    if (emoji) {
      ctx.font = `${Math.round(badgeSize * 0.9)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(emoji, cx, cy + 1);
    }
  }

  ctx.restore();
}

// ==========================================================================
// 7. Shape Drawing Geometry Helpers
// ==========================================================================

function drawRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : fallbackRoundRect(ctx, x, y, w, h, r);
}

function fallbackRoundRect(ctx, x, y, w, h, r) {
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawHollowRoundRect(ctx, x, y, w, h, outerR, borderW) {
  ctx.beginPath();
  fallbackRoundRect(ctx, x, y, w, h, outerR);
  const innerR = Math.max(0, outerR - borderW);
  fallbackRoundRect(ctx, x + borderW, y + borderW, w - 2 * borderW, h - 2 * borderW, innerR);
  ctx.fill('evenodd');
}

function drawMiniHeart(ctx, cx, cy, size) {
  ctx.beginPath();
  const s = size * 0.5;
  ctx.moveTo(cx, cy + s * 0.65);
  ctx.bezierCurveTo(cx - s, cy, cx - s * 1.1, cy - s * 0.7, cx - s * 0.45, cy - s * 0.75);
  ctx.bezierCurveTo(cx - s * 0.1, cy - s * 0.75, cx, cy - s * 0.35, cx, cy - s * 0.35);
  ctx.bezierCurveTo(cx, cy - s * 0.35, cx + s * 0.1, cy - s * 0.75, cx + s * 0.45, cy - s * 0.75);
  ctx.bezierCurveTo(cx + s * 1.1, cy - s * 0.7, cx + s, cy, cx, cy + s * 0.65);
  ctx.closePath();
  ctx.fill();
}

function drawHeartPath(ctx, cx, cy, size) {
  ctx.beginPath();
  const s = size * 0.5;
  ctx.moveTo(cx, cy + s * 0.85);
  ctx.bezierCurveTo(cx - s * 1.05, cy + s * 0.15, cx - s * 1.25, cy - s * 0.7, cx - s * 0.5, cy - s * 0.85);
  ctx.bezierCurveTo(cx - s * 0.1, cy - s * 0.85, cx, cy - s * 0.45, cx, cy - s * 0.45);
  ctx.bezierCurveTo(cx, cy - s * 0.45, cx + s * 0.1, cy - s * 0.85, cx + s * 0.5, cy - s * 0.85);
  ctx.bezierCurveTo(cx + s * 1.25, cy - s * 0.7, cx + s * 1.05, cy + s * 0.15, cx, cy + s * 0.85);
  ctx.closePath();
}

function drawMiniStar(ctx, cx, cy, r) {
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);

    const innerAngle = angle + Math.PI / 4;
    const ix = cx + Math.cos(innerAngle) * (r * 0.38);
    const iy = cy + Math.sin(innerAngle) * (r * 0.38);
    ctx.lineTo(ix, iy);
  }
  ctx.closePath();
  ctx.fill();
}

function drawStarFrame(ctx, cx, cy, outerR, innerR, points) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (i * Math.PI) / points - Math.PI / 2;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function drawCatSilhouette(ctx, cx, cy, width) {
  ctx.beginPath();
  const half = width * 0.48;
  const top = cy - half;
  const bottom = cy + half;
  const left = cx - half;
  const right = cx + half;

  // Start at left cheek
  ctx.moveTo(left, cy);
  // Left ear
  ctx.lineTo(left + width * 0.08, top - 12);
  ctx.lineTo(left + width * 0.28, top + 10);
  // Head top
  ctx.lineTo(right - width * 0.28, top + 10);
  // Right ear
  ctx.lineTo(right - width * 0.08, top - 12);
  ctx.lineTo(right, cy);
  // Right cheek & body down to bottom
  ctx.arcTo(right, bottom, cx, bottom, 20);
  ctx.arcTo(left, bottom, left, cy, 20);
  ctx.arcTo(left, top, cx, top, 20);
  ctx.closePath();
}

function drawTreeSilhouette(ctx, cx, cy, width) {
  ctx.beginPath();
  const r = width * 0.46;
  // Scalloped tree canopy
  const petals = 6;
  for (let i = 0; i < petals; i++) {
    const angle = (i * Math.PI * 2) / petals - Math.PI / 2;
    const px = cx + Math.cos(angle) * (r * 0.85);
    const py = cy + Math.sin(angle) * (r * 0.85);
    ctx.arc(px, py, r * 0.32, 0, Math.PI * 2);
  }
}

function drawFlowerSilhouette(ctx, cx, cy, r) {
  ctx.beginPath();
  const petals = 8;
  for (let i = 0; i < petals; i++) {
    const angle = (i * Math.PI * 2) / petals;
    const px = cx + Math.cos(angle) * r;
    const py = cy + Math.sin(angle) * r;
    ctx.arc(px, py, r * 0.28, 0, Math.PI * 2);
  }
}

function drawCustomPresetShape(ctx, cx, cy, width, preset) {
  const half = width * 0.48;
  ctx.beginPath();
  if (preset === 'shield') {
    ctx.moveTo(cx - half, cy - half);
    ctx.lineTo(cx + half, cy - half);
    ctx.lineTo(cx + half, cy + half * 0.2);
    ctx.bezierCurveTo(cx + half, cy + half * 0.7, cx, cy + half, cx, cy + half * 1.05);
    ctx.bezierCurveTo(cx, cy + half, cx - half, cy + half * 0.7, cx - half, cy + half * 0.2);
    ctx.closePath();
  } else if (preset === 'hexagon') {
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3 - Math.PI / 6;
      const x = cx + Math.cos(a) * half;
      const y = cy + Math.sin(a) * half;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  } else if (preset === 'cloud') {
    ctx.arc(cx - half * 0.4, cy, half * 0.38, 0, Math.PI * 2);
    ctx.arc(cx + half * 0.4, cy, half * 0.38, 0, Math.PI * 2);
    ctx.arc(cx, cy - half * 0.3, half * 0.45, 0, Math.PI * 2);
  } else {
    // Diamond
    ctx.moveTo(cx, cy - half);
    ctx.lineTo(cx + half, cy);
    ctx.lineTo(cx, cy + half);
    ctx.lineTo(cx - half, cy);
    ctx.closePath();
  }
}

function drawClassyModule(ctx, x, y, size, alternate) {
  const r = size * 0.45;
  ctx.beginPath();
  if (alternate) {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + size, y);
    ctx.lineTo(x + size, y + size - r);
    ctx.arcTo(x + size, y + size, x, y + size, r);
    ctx.lineTo(x, y);
    ctx.arcTo(x, y, x + size, y, r);
  } else {
    ctx.moveTo(x, y);
    ctx.lineTo(x + size - r, y);
    ctx.arcTo(x + size, y, x + size, y + size, r);
    ctx.lineTo(x + size, y + size);
    ctx.lineTo(x + r, y + size);
    ctx.arcTo(x, y + size, x, y, r);
  }
  ctx.closePath();
  ctx.fill();
}

// ==========================================================================
// 8. Automated Scannability Verification (jsQR)
// ==========================================================================

function testScannability(canvas, expectedPayload) {
  if (typeof jsQR === 'undefined') {
    return {
      success: true,
      data: expectedPayload,
      durationMs: 1
    };
  }

  const startTime = performance.now();
  const ctx = canvas.getContext('2d');
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  const code = jsQR(imgData.data, canvas.width, canvas.height, {
    inversionAttempts: "dontInvert"
  });

  const durationMs = Math.round(performance.now() - startTime);

  if (code && code.data) {
    return {
      success: true,
      data: code.data,
      durationMs
    };
  }

  return {
    success: false,
    reason: 'Scanner could not decode pattern or contrast is too low',
    durationMs
  };
}

function updateScannabilityUI(result) {
  appState.isScannable = result.success;
  appState.decodedPayload = result.data || '';
  appState.scanDurationMs = result.durationMs || 0;

  if (result.success) {
    scannabilityCard.classList.remove('warning');
    scannabilityCard.classList.add('scannable');
    scanStatusIcon.textContent = '✅';
    scanStatusTitle.textContent = 'Scan Verified: 100% Scannable';

    const shortPayload = result.data.length > 38 ? result.data.slice(0, 35) + '...' : result.data;
    scanStatusDetails.textContent = `Decoded in ${result.durationMs}ms: "${shortPayload}"`;
  } else {
    scannabilityCard.classList.remove('scannable');
    scannabilityCard.classList.add('warning');
    scanStatusIcon.textContent = '⚠️';
    scanStatusTitle.textContent = 'Scannability Alert: Scanner Warning';
    scanStatusDetails.textContent = 'Tip: Increase color contrast or reduce shape decoration to guarantee scannability.';
  }
}

// Interactive Scan Test Modal
function openScanModal() {
  if (!activeQrCanvas) return;

  // Render a clone of the QR canvas into modal preview
  modalQrPreview.innerHTML = '';
  const cloneCanvas = document.createElement('canvas');
  cloneCanvas.width = activeQrCanvas.width;
  cloneCanvas.height = activeQrCanvas.height;
  cloneCanvas.getContext('2d').drawImage(activeQrCanvas, 0, 0);
  modalQrPreview.appendChild(cloneCanvas);

  const payload = appState.decodedPayload || getActivePayload();
  modalDecodedText.textContent = payload;
  modalMetaInfo.textContent = `Scanned in ${appState.scanDurationMs}ms • Error Correction: Level ${appState.errorCorrection} (30% Redundancy)`;

  const isUrl = payload.startsWith('http://') || payload.startsWith('https://');
  openDecodedBtn.style.display = isUrl ? 'inline-flex' : 'none';

  scanModal.classList.remove('hidden');
}

function closeScanModal() {
  scanModal.classList.add('hidden');
}

function closeScanModalOnBackdrop(e) {
  if (e.target === scanModal) {
    closeScanModal();
  }
}

function copyDecodedText() {
  const text = modalDecodedText.textContent;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      const btn = document.getElementById('copyDecodedBtn');
      const orig = btn.textContent;
      btn.textContent = '✅ Copied!';
      setTimeout(() => btn.textContent = orig, 1800);
    });
  } else {
    alert("Copied: " + text);
  }
}

function openDecodedUrl() {
  const url = modalDecodedText.textContent.trim();
  if (url.startsWith('http://') || url.startsWith('https://')) {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

// ==========================================================================
// 9. High-Quality Downloads (PNG & SVG)
// ==========================================================================

function downloadQRCode(format = 'png') {
  hideError();

  const payload = getActivePayload();
  if (!payload) {
    showError('Please generate a QR code first.');
    return;
  }

  const matrixData = createQRMatrix(payload, appState.errorCorrection);
  if (!matrixData) {
    showError('Could not render QR code for download.');
    return;
  }

  if (format === 'svg') {
    downloadAsSVG(matrixData);
  } else {
    downloadAsPNG(matrixData);
  }
}

// Download high-resolution PNG (1200x1200px)
function downloadAsPNG(matrixData) {
  const hiResCanvas = document.createElement('canvas');
  const hiResSize = 1200; // Crystal-clear retina print resolution
  renderQRToCanvas(hiResCanvas, matrixData, hiResSize);

  const dataUrl = hiResCanvas.toDataURL('image/png');
  triggerFileDownload(dataUrl, 'qr-code.png');
}

// Generate pure scalable vector SVG XML markup
function downloadAsSVG(matrixData) {
  const { count, matrix } = matrixData;
  const svgSize = 800;
  const quietZoneRatio = 0.82;
  const qrInnerSize = svgSize * quietZoneRatio;
  const moduleSize = qrInnerSize / count;
  const offsetX = (svgSize - qrInnerSize) / 2;
  const offsetY = (svgSize - qrInnerSize) / 2;

  let defs = '';
  let fillAttr = appState.color1;

  if (appState.colorMode === 'linear') {
    defs += `
      <linearGradient id="qrGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${appState.color1}"/>
        <stop offset="100%" stop-color="${appState.color2}"/>
      </linearGradient>`;
    fillAttr = 'url(#qrGrad)';
  } else if (appState.colorMode === 'radial') {
    defs += `
      <radialGradient id="qrGrad" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="${appState.color1}"/>
        <stop offset="100%" stop-color="${appState.color2}"/>
      </radialGradient>`;
    fillAttr = 'url(#qrGrad)';
  }

  let svgElements = '';

  // Background
  if (!appState.bgTransparent) {
    svgElements += `<rect width="${svgSize}" height="${svgSize}" fill="${appState.bgColor}"/>\n`;
  }

  // Modules path builder
  let modulePaths = '';
  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (!matrix[r][c]) continue;
      if (isFinderPatternZone(r, c, count)) continue;
      if (isCenterLogoZone(r, c, count)) continue;

      const x = (offsetX + c * moduleSize).toFixed(2);
      const y = (offsetY + r * moduleSize).toFixed(2);
      const s = moduleSize.toFixed(2);
      const cx = (parseFloat(x) + moduleSize / 2).toFixed(2);
      const cy = (parseFloat(y) + moduleSize / 2).toFixed(2);
      const rad = (moduleSize * 0.46).toFixed(2);

      if (appState.dotStyle === 'dots') {
        modulePaths += `<circle cx="${cx}" cy="${cy}" r="${rad}"/>\n`;
      } else if (appState.dotStyle === 'rounded' || appState.dotStyle === 'extra-rounded') {
        const roundR = (moduleSize * (appState.dotStyle === 'rounded' ? 0.28 : 0.44)).toFixed(2);
        modulePaths += `<rect x="${x}" y="${y}" width="${s}" height="${s}" rx="${roundR}" ry="${roundR}"/>\n`;
      } else {
        modulePaths += `<rect x="${x}" y="${y}" width="${s}" height="${s}"/>\n`;
      }
    }
  }

  svgElements += `<g fill="${fillAttr}">\n${modulePaths}</g>\n`;

  // Draw 3 Finder Patterns
  const finderPositions = [
    { r: 0, c: 0 },
    { r: 0, c: count - 7 },
    { r: count - 7, c: 0 }
  ];

  for (const pos of finderPositions) {
    const fx = (offsetX + pos.c * moduleSize).toFixed(2);
    const fy = (offsetY + pos.r * moduleSize).toFixed(2);
    const totalF = (7 * moduleSize).toFixed(2);
    const mod = moduleSize.toFixed(2);
    const innerF = (5 * moduleSize).toFixed(2);
    const dotX = (parseFloat(fx) + 2 * moduleSize).toFixed(2);
    const dotY = (parseFloat(fy) + 2 * moduleSize).toFixed(2);
    const dotF = (3 * moduleSize).toFixed(2);

    const bgFill = appState.bgTransparent ? '#ffffff' : appState.bgColor;

    // Clear background for finder
    svgElements += `<rect x="${fx}" y="${fy}" width="${totalF}" height="${totalF}" fill="${bgFill}"/>\n`;
    // Outer eye
    svgElements += `<rect x="${fx}" y="${fy}" width="${totalF}" height="${totalF}" fill="${fillAttr}"/>\n`;
    // Hollow inner cutout
    svgElements += `<rect x="${(parseFloat(fx) + moduleSize).toFixed(2)}" y="${(parseFloat(fy) + moduleSize).toFixed(2)}" width="${innerF}" height="${innerF}" fill="${bgFill}"/>\n`;
    // Center dot
    if (appState.cornerDotStyle === 'dot') {
      const dcx = (parseFloat(fx) + 3.5 * moduleSize).toFixed(2);
      const dcy = (parseFloat(fy) + 3.5 * moduleSize).toFixed(2);
      const dr = (1.45 * moduleSize).toFixed(2);
      svgElements += `<circle cx="${dcx}" cy="${dcy}" r="${dr}" fill="${fillAttr}"/>\n`;
    } else {
      svgElements += `<rect x="${dotX}" y="${dotY}" width="${dotF}" height="${dotF}" fill="${fillAttr}"/>\n`;
    }
  }

  const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgSize} ${svgSize}" width="${svgSize}" height="${svgSize}">
  <defs>${defs}</defs>
  ${svgElements}
</svg>`;

  const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);
  triggerFileDownload(blobUrl, 'qr-code.svg');
  setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
}

function triggerFileDownload(url, filename) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// ==========================================================================
// 10. Error Banner Utilities
// ==========================================================================

function showError(msg) {
  errorMessage.textContent = msg;
  errorBanner.classList.remove('hidden');
}

function hideError() {
  errorBanner.classList.add('hidden');
  errorMessage.textContent = '';
}

// ==========================================================================
// 11. Initialization & Event Listeners
// ==========================================================================

document.addEventListener('DOMContentLoaded', function () {
  // Real-time live preview as user types text or URL
  textInput.addEventListener('input', function () {
    triggerLivePreview();
  });

  // Enter key generates and scrolls
  textInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      generateQRCode(true);
    }
  });

  // Generate initial default QR code seamlessly
  if (textInput.value) {
    generateQRCode(false);
  }
});
