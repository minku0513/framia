const input = document.querySelector('#imageInput');
const uploadCard = document.querySelector('#uploadCard');
const fileStatus = document.querySelector('#fileStatus');
const splitControls = document.querySelector('#splitControls');
const countRange = document.querySelector('#countRange');
const countLabel = document.querySelector('#countLabel');
const cropControls = document.querySelector('#cropControls');
const cropRange = document.querySelector('#cropRange');
const cropValue = document.querySelector('#cropValue');
const resetCrop = document.querySelector('#resetCrop');
const downloadActions = document.querySelector('#downloadActions');
const singleDownloads = document.querySelector('#singleDownloads');
const downloadAll = document.querySelector('#downloadAll');
const previewPanel = document.querySelector('#previewPanel');
const carousel = document.querySelector('#carousel');
const carouselTrack = document.querySelector('#carouselTrack');
const carouselDots = document.querySelector('#carouselDots');
const emptyState = document.querySelector('#emptyState');
const pageCount = document.querySelector('#pageCount');
const previousButton = document.querySelector('#previousButton');
const nextButton = document.querySelector('#nextButton');

const PANEL_WIDTH = 1080;
const PANEL_HEIGHT = 1440;
let sourceImage;
let filename = 'framia-portrait';
let panelCount = 3;
let cropPosition = 50;
let activeSlide = 0;
let panels = [];
let dragStartX = 0;
let dragOffsetX = 0;
let dragging = false;
let dragPointerId;

function getTargetRatio() { return (PANEL_WIDTH / PANEL_HEIGHT) * panelCount; }

function updateCropLabel() {
  cropValue.textContent = cropPosition === 50 ? '가운데' : cropPosition < 50 ? `왼쪽 ${50 - cropPosition}%` : `오른쪽 ${cropPosition - 50}%`;
}

function updateControls() {
  countLabel.textContent = `${panelCount}장의 게시물`;
  if (!sourceImage) return;
  cropControls.hidden = sourceImage.width / sourceImage.height <= getTargetRatio();
}

function renderPanels() {
  if (!sourceImage) return;
  const targetRatio = getTargetRatio();
  const imageRatio = sourceImage.width / sourceImage.height;
  let cropWidth;
  let cropHeight;
  let cropX;
  let cropY;

  if (imageRatio > targetRatio) {
    cropHeight = sourceImage.height;
    cropWidth = cropHeight * targetRatio;
    cropX = (sourceImage.width - cropWidth) * (cropPosition / 100);
    cropY = 0;
  } else {
    cropWidth = sourceImage.width;
    cropHeight = cropWidth / targetRatio;
    cropX = 0;
    cropY = (sourceImage.height - cropHeight) / 2;
  }

  panels = Array.from({ length: panelCount }, (_, index) => {
    const canvas = document.createElement('canvas');
    canvas.width = PANEL_WIDTH;
    canvas.height = PANEL_HEIGHT;
    canvas.getContext('2d').drawImage(sourceImage, cropX + (cropWidth / panelCount) * index, cropY, cropWidth / panelCount, cropHeight, 0, 0, PANEL_WIDTH, PANEL_HEIGHT);
    return canvas;
  });
  activeSlide = Math.min(activeSlide, panels.length - 1);
  updateControls();
  renderCarousel();
  renderDownloads();
}

function renderCarousel() {
  carouselTrack.replaceChildren(...panels.map((canvas) => {
    const slide = document.createElement('div');
    slide.className = 'carousel-slide';
    const preview = document.createElement('canvas');
    preview.width = PANEL_WIDTH;
    preview.height = PANEL_HEIGHT;
    preview.getContext('2d').drawImage(canvas, 0, 0);
    slide.append(preview);
    return slide;
  }));
  carouselDots.replaceChildren(...panels.map((_, index) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.setAttribute('aria-label', `${index + 1}번 사진 보기`);
    dot.addEventListener('click', () => goToSlide(index));
    return dot;
  }));
  emptyState.hidden = true;
  pageCount.hidden = false;
  updateCarousel();
}

function updateCarousel(offset = 0) {
  carouselTrack.style.transform = `translateX(calc(-${activeSlide * 100}% + ${offset}px))`;
  pageCount.textContent = `${activeSlide + 1}/${panels.length}`;
  [...carouselDots.children].forEach((dot, index) => dot.classList.toggle('active', index === activeSlide));
  previousButton.hidden = activeSlide === 0 || panels.length < 2;
  nextButton.hidden = activeSlide === panels.length - 1 || panels.length < 2;
}

function goToSlide(index) {
  activeSlide = Math.max(0, Math.min(index, panels.length - 1));
  updateCarousel();
}

function renderDownloads() {
  singleDownloads.replaceChildren(...panels.map((_, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = `${index + 1}번 저장`;
    button.addEventListener('click', () => downloadPanel(index));
    return button;
  }));
  downloadActions.hidden = false;
}

function drawImage(file) {
  if (!file?.type.startsWith('image/')) return;
  const image = new Image();
  const objectUrl = URL.createObjectURL(file);
  image.onload = () => {
    sourceImage = image;
    filename = file.name.replace(/\.[^/.]+$/, '') || 'framia-portrait';
    fileStatus.textContent = file.name;
    panelCount = Number(countRange.value);
    cropPosition = 50;
    cropRange.value = cropPosition;
    splitControls.hidden = false;
    updateCropLabel();
    renderPanels();
    if (window.matchMedia('(max-width: 760px)').matches) previewPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    URL.revokeObjectURL(objectUrl);
  };
  image.src = objectUrl;
}

input.addEventListener('change', (event) => drawImage(event.target.files[0]));
['dragenter', 'dragover'].forEach((eventName) => uploadCard.addEventListener(eventName, (event) => { event.preventDefault(); uploadCard.classList.add('dragging'); }));
['dragleave', 'drop'].forEach((eventName) => uploadCard.addEventListener(eventName, (event) => { event.preventDefault(); uploadCard.classList.remove('dragging'); }));
uploadCard.addEventListener('drop', (event) => drawImage(event.dataTransfer.files[0]));
countRange.addEventListener('input', () => { panelCount = Number(countRange.value); activeSlide = 0; renderPanels(); });
cropRange.addEventListener('input', () => { cropPosition = Number(cropRange.value); updateCropLabel(); renderPanels(); });
resetCrop.addEventListener('click', () => { cropPosition = 50; cropRange.value = 50; updateCropLabel(); renderPanels(); });
previousButton.addEventListener('click', () => goToSlide(activeSlide - 1));
nextButton.addEventListener('click', () => goToSlide(activeSlide + 1));
carousel.addEventListener('pointerdown', (event) => {
  if (event.target.closest('.carousel-arrow') || panels.length < 2 || (event.pointerType === 'mouse' && event.button !== 0)) return;
  dragging = true;
  dragPointerId = event.pointerId;
  dragStartX = event.clientX;
  dragOffsetX = 0;
  carousel.setPointerCapture(event.pointerId);
  carouselTrack.classList.add('is-dragging');
});
carousel.addEventListener('pointermove', (event) => {
  if (!dragging || event.pointerId !== dragPointerId) return;
  dragOffsetX = event.clientX - dragStartX;
  if ((activeSlide === 0 && dragOffsetX > 0) || (activeSlide === panels.length - 1 && dragOffsetX < 0)) dragOffsetX *= 0.32;
  updateCarousel(dragOffsetX);
});
function finishDrag(event) {
  if (!dragging || event.pointerId !== dragPointerId) return;
  const threshold = Math.min(85, carousel.clientWidth * 0.18);
  const direction = Math.abs(dragOffsetX) >= threshold ? (dragOffsetX < 0 ? 1 : -1) : 0;
  dragging = false;
  dragPointerId = undefined;
  carouselTrack.classList.remove('is-dragging');
  goToSlide(activeSlide + direction);
}
carousel.addEventListener('pointerup', finishDrag);
carousel.addEventListener('pointercancel', finishDrag);

function canvasToBlob(canvas) { return new Promise((resolve) => canvas.toBlob(resolve, 'image/png')); }
function triggerDownload(blob, name) { const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = name; link.style.display = 'none'; document.body.append(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 30000); }
async function downloadPanel(index) { const blob = await canvasToBlob(panels[index]); if (blob) triggerDownload(blob, `${filename}-${index + 1}.png`); }

const crcTable = new Uint32Array(256);
for (let index = 0; index < 256; index += 1) { let value = index; for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1; crcTable[index] = value >>> 0; }
function crc32(bytes) { let value = 0xffffffff; for (const byte of bytes) value = crcTable[(value ^ byte) & 0xff] ^ (value >>> 8); return (value ^ 0xffffffff) >>> 0; }
async function makeZip(files) {
  const encoder = new TextEncoder();
  const prepared = await Promise.all(files.map(async ({ name, blob }) => ({ name: encoder.encode(name), data: new Uint8Array(await blob.arrayBuffer()) })));
  const localParts = []; const centralParts = []; let localOffset = 0;
  prepared.forEach(({ name, data }) => { const checksum = crc32(data); const local = new Uint8Array(30 + name.length + data.length); const localView = new DataView(local.buffer); localView.setUint32(0, 0x04034b50, true); localView.setUint16(4, 20, true); localView.setUint16(6, 0x0800, true); localView.setUint32(14, checksum, true); localView.setUint32(18, data.length, true); localView.setUint32(22, data.length, true); localView.setUint16(26, name.length, true); local.set(name, 30); local.set(data, 30 + name.length); localParts.push(local); const central = new Uint8Array(46 + name.length); const centralView = new DataView(central.buffer); centralView.setUint32(0, 0x02014b50, true); centralView.setUint16(4, 20, true); centralView.setUint16(6, 20, true); centralView.setUint16(8, 0x0800, true); centralView.setUint32(16, checksum, true); centralView.setUint32(20, data.length, true); centralView.setUint32(24, data.length, true); centralView.setUint16(28, name.length, true); centralView.setUint32(42, localOffset, true); central.set(name, 46); centralParts.push(central); localOffset += local.length; });
  const centralOffset = localOffset; const centralSize = centralParts.reduce((size, part) => size + part.length, 0); const zip = new Uint8Array(centralOffset + centralSize + 22); let offset = 0; [...localParts, ...centralParts].forEach((part) => { zip.set(part, offset); offset += part.length; }); const end = new DataView(zip.buffer, offset, 22); end.setUint32(0, 0x06054b50, true); end.setUint16(8, prepared.length, true); end.setUint16(10, prepared.length, true); end.setUint32(12, centralSize, true); end.setUint32(16, centralOffset, true); return new Blob([zip], { type: 'application/zip' });
}
downloadAll.addEventListener('click', async () => { downloadAll.disabled = true; const text = downloadAll.textContent; downloadAll.textContent = 'ZIP 만드는 중…'; try { const blobs = await Promise.all(panels.map(canvasToBlob)); if (blobs.some((blob) => !blob)) return; triggerDownload(await makeZip(blobs.map((blob, index) => ({ name: `${filename}-${index + 1}.png`, blob }))), `${filename}-${panelCount}posts.zip`); } finally { downloadAll.disabled = false; downloadAll.textContent = text; } });
