/* ==========================================================================
   Modern QR Code Generator JavaScript
   Beginner-Friendly, Clean, Client-Side Logic
   ========================================================================== */

// 1. Global State Variables
let currentMode = 'text';          // Current mode: 'text' or 'image'
let selectedImageDataUrl = '';     // Holds browser Data URL of chosen image
let qrcodeInstance = null;         // Reference to active QRCode instance

// Max allowed image file size for QR code storage (~2 KB raw = ~2.7 KB base64 string)
const MAX_IMAGE_SIZE_BYTES = 2 * 1024; 

// 2. DOM Element References
const textModeBtn = document.getElementById('textModeBtn');
const imageModeBtn = document.getElementById('imageModeBtn');
const textModeSection = document.getElementById('textModeSection');
const imageModeSection = document.getElementById('imageModeSection');

const textInput = document.getElementById('textInput');
const imageInput = document.getElementById('imageInput');
const imagePreviewContainer = document.getElementById('imagePreviewContainer');
const imagePreview = document.getElementById('imagePreview');
const fileNameDisplay = document.getElementById('fileNameDisplay');

const errorBanner = document.getElementById('errorBanner');
const errorMessage = document.getElementById('errorMessage');

const qrResultSection = document.getElementById('qrResultSection');
const qrContainer = document.getElementById('qrContainer');

// 3. Switch between Text/URL mode and Image mode
function switchMode(mode) {
  currentMode = mode;
  hideError();

  if (mode === 'text') {
    // Update active tab buttons
    textModeBtn.classList.add('active');
    textModeBtn.setAttribute('aria-selected', 'true');
    imageModeBtn.classList.remove('active');
    imageModeBtn.setAttribute('aria-selected', 'false');

    // Show text section, hide image section
    textModeSection.classList.remove('hidden');
    imageModeSection.classList.add('hidden');
    
    // Focus text input
    textInput.focus();
  } else if (mode === 'image') {
    // Update active tab buttons
    imageModeBtn.classList.add('active');
    imageModeBtn.setAttribute('aria-selected', 'true');
    textModeBtn.classList.remove('active');
    textModeBtn.setAttribute('aria-selected', 'false');

    // Show image section, hide text section
    imageModeSection.classList.remove('hidden');
    textModeSection.classList.add('hidden');
  }
}

// 4. Trigger standard browser file picker when clicking upload card
function triggerFileInput() {
  imageInput.click();
}

// 5. Handle image selection & local reading (100% Client-Side)
function handleImageSelect(event) {
  hideError();
  const file = event.target.files[0];

  if (!file) {
    return;
  }

  // Check image file size restriction (QR codes have limited data capacity)
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    showError('Image is too large for a QR code. Please choose a smaller image.');
    clearSelectedImage();
    return;
  }

  // Read file locally using FileReader API
  const reader = new FileReader();

  reader.onload = function (e) {
    selectedImageDataUrl = e.target.result; // Data URL string (e.g. data:image/png;base64,...)
    
    // Display file name and image preview
    fileNameDisplay.textContent = `Selected image: ${file.name}`;
    imagePreview.src = selectedImageDataUrl;
    imagePreviewContainer.classList.remove('hidden');
  };

  reader.onerror = function () {
    showError('Something went wrong reading the file. Please try again.');
  };

  reader.readAsDataURL(file);
}

// 6. Clear selected image
function clearSelectedImage() {
  selectedImageDataUrl = '';
  imageInput.value = '';
  imagePreview.src = '';
  fileNameDisplay.textContent = 'Selected image: none';
  imagePreviewContainer.classList.add('hidden');
}

// 7. Generate QR Code
function generateQRCode() {
  hideError();

  let qrContent = '';

  if (currentMode === 'text') {
    qrContent = textInput.value.trim();
    if (!qrContent) {
      showError('Please enter some text or a URL.');
      return;
    }
  } else if (currentMode === 'image') {
    if (!selectedImageDataUrl) {
      showError('Please choose an image.');
      return;
    }
    qrContent = selectedImageDataUrl;
  }

  // Check payload length before passing to QRCode generator
  if (qrContent.length > 2900) {
    showError('Image is too large for a QR code. Please choose a smaller image.');
    return;
  }

  try {
    // Clear previous QR code canvas/image
    qrContainer.innerHTML = '';

    // Verify QRCode library is loaded
    if (typeof QRCode === 'undefined') {
      showError('QR Code library failed to load. Please check your internet connection.');
      return;
    }

    // Generate new QR Code inside qrContainer
    qrcodeInstance = new QRCode(qrContainer, {
      text: qrContent,
      width: 220,
      height: 220,
      colorDark: "#0f172a",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.M
    });

    // Reveal result card
    qrResultSection.classList.remove('hidden');

    // Smooth scroll to QR code result
    qrResultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  } catch (error) {
    console.error("QR Generation error:", error);
    showError('Image is too large for a QR code. Please choose a smaller image.');
  }
}

// 8. Download Generated QR Code as PNG
function downloadQRCode() {
  hideError();

  // Find canvas or img element generated inside qrContainer
  const canvas = qrContainer.querySelector('canvas');
  const img = qrContainer.querySelector('img');

  let imageSrc = '';

  if (canvas) {
    imageSrc = canvas.toDataURL('image/png');
  } else if (img && img.src) {
    imageSrc = img.src;
  }

  if (!imageSrc) {
    showError('Something went wrong. Please try again.');
    return;
  }

  // Create temporary invisible link for browser download
  const downloadLink = document.createElement('a');
  downloadLink.href = imageSrc;
  downloadLink.download = 'qr-code.png';
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
}

// 9. Display & Hide Error Banner
function showError(message) {
  errorMessage.textContent = message;
  errorBanner.classList.remove('hidden');
}

function hideError() {
  errorBanner.classList.add('hidden');
  errorMessage.textContent = '';
}

// 10. Event Listeners initialization
document.addEventListener('DOMContentLoaded', function () {
  // Listen for Enter key in Text input mode
  textInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      generateQRCode();
    }
  });
});
