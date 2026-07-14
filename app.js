const input = document.querySelector('#imageInput');
const uploadCard = document.querySelector('#uploadCard');
const panels = [...document.querySelectorAll('.render-canvas')];
const gridPreviews = [...document.querySelectorAll('.grid-preview')];
const emptyState = document.querySelector('#emptyState');
const previewPanel = document.querySelector('#previewPanel');
const downloadActions = document.querySelector('#downloadActions');
const fileStatus = document.querySelector('#fileStatus');
const downloadButtons = [...document.querySelectorAll('[data-panel]')];
const downloadAll = document.querySelector('#downloadAll');
const cropControls = document.querySelector('#cropControls');
const cropRange = document.querySelector('#cropRange');
const cropValue = document.querySelector('#cropValue');
const resetCrop = document.querySelector('#resetCrop');
const fitControls = document.querySelector('#fitControls');
const modeButtons = [...document.querySelectorAll('[data-mode]')];
const colorControls = document.querySelector('#colorControls');
const solidColor = document.querySelector('#solidColor');
const solidSizeControls = document.querySelector('#solidSizeControls');
const solidSizeRange = document.querySelector('#solidSizeRange');
const solidSizeValue = document.querySelector('#solidSizeValue');
const resetSolidSize = document.querySelector('#resetSolidSize');
let filename = 'framia-panorama';
let sourceImage;
let cropPosition = 50;
let fitMode = 'crop';
let letterboxColor = solidColor.value;
let solidImageScale = 100;
const masterCanvas = document.createElement('canvas');
const blurCanvas = document.createElement('canvas');
masterCanvas.width = panels.reduce((width, panel) => width + panel.width, 0);
masterCanvas.height = panels[0].height;

function renderPanels() {
  if (!sourceImage) return;

  const panelRatio = panels[0].width / panels[0].height;
  const totalRatio = panelRatio * panels.length;
  const imageRatio = sourceImage.width / sourceImage.height;
  if (fitMode === 'fill' || fitMode === 'solid') {
    renderFilledPanels(totalRatio);
    return;
  }

  let cropWidth, cropHeight, cropX, cropY;

  // 세 장을 합친 9:4 영역을 먼저 만들고, 같은 폭으로 나누면 경계가 정확히 이어진다.
  if (imageRatio > totalRatio) {
    cropHeight = sourceImage.height;
    cropWidth = cropHeight * totalRatio;
    cropX = (sourceImage.width - cropWidth) * (cropPosition / 100);
    cropY = 0;
  } else {
    cropWidth = sourceImage.width;
    cropHeight = cropWidth / totalRatio;
    cropX = 0;
    cropY = (sourceImage.height - cropHeight) / 2;
  }

  const sliceWidth = cropWidth / panels.length;
  panels.forEach((panel, index) => {
    const context = panel.getContext('2d');
    context.clearRect(0, 0, panel.width, panel.height);
    context.drawImage(
      sourceImage,
      cropX + sliceWidth * index,
      cropY,
      sliceWidth,
      cropHeight,
      0,
      0,
      panel.width,
      panel.height,
    );
  });
  renderGridPreviews();
}

function renderFilledPanels(totalRatio) {
  const context = masterCanvas.getContext('2d');
  const sourceRatio = sourceImage.width / sourceImage.height;
  const width = masterCanvas.width;
  const height = masterCanvas.height;

  context.clearRect(0, 0, width, height);

  if (fitMode === 'solid') {
    context.fillStyle = letterboxColor;
    context.fillRect(0, 0, width, height);
  } else {
    drawBlurredBackground(context, sourceRatio, totalRatio, width, height);
  }

  const containScale = Math.min(width / sourceImage.width, height / sourceImage.height);
  const foregroundScale = fitMode === 'solid' ? containScale * (solidImageScale / 100) : containScale;
  const foregroundWidth = sourceImage.width * foregroundScale;
  const foregroundHeight = sourceImage.height * foregroundScale;
  context.drawImage(sourceImage, (width - foregroundWidth) / 2, (height - foregroundHeight) / 2, foregroundWidth, foregroundHeight);

  panels.forEach((panel, index) => {
    panel.getContext('2d').drawImage(masterCanvas, panel.width * index, 0, panel.width, panel.height, 0, 0, panel.width, panel.height);
  });
  renderGridPreviews();
}

function renderGridPreviews() {
  gridPreviews.forEach((preview, index) => {
    const panel = panels[index];
    const context = preview.getContext('2d');
    context.clearRect(0, 0, preview.width, preview.height);
    // 프로필 그리드는 정사각이지만, 결과 전체를 축소해 블러·단색 레터박스도 확인할 수 있게 한다.
    const scale = Math.min(preview.width / panel.width, preview.height / panel.height);
    const width = panel.width * scale;
    const height = panel.height * scale;
    context.fillStyle = '#111319';
    context.fillRect(0, 0, preview.width, preview.height);
    context.drawImage(panel, (preview.width - width) / 2, (preview.height - height) / 2, width, height);
  });
}

function drawBlurredBackground(context, sourceRatio, totalRatio, width, height) {
  // 작은 캔버스에 먼저 그린 뒤 크게 확대하면 filter 지원 여부와 무관하게 강한 블러가 남는다.
  blurCanvas.width = 160;
  blurCanvas.height = Math.round(blurCanvas.width / totalRatio);
  const blurContext = blurCanvas.getContext('2d');
  const scale = sourceRatio > totalRatio ? blurCanvas.height / sourceImage.height : blurCanvas.width / sourceImage.width;
  const backgroundWidth = sourceImage.width * scale * 1.12;
  const backgroundHeight = sourceImage.height * scale * 1.12;
  blurContext.clearRect(0, 0, blurCanvas.width, blurCanvas.height);
  blurContext.drawImage(sourceImage, (blurCanvas.width - backgroundWidth) / 2, (blurCanvas.height - backgroundHeight) / 2, backgroundWidth, backgroundHeight);

  context.imageSmoothingEnabled = true;
  context.drawImage(blurCanvas, 0, 0, width, height);
  context.fillStyle = 'rgb(0 0 0 / 18%)';
  context.fillRect(0, 0, width, height);
}

function updateVisibleControls() {
  if (!sourceImage) return;
  const totalRatio = (panels[0].width / panels[0].height) * panels.length;
  cropControls.hidden = fitMode !== 'crop' || sourceImage.width / sourceImage.height <= totalRatio;
  colorControls.hidden = fitMode !== 'solid';
  solidSizeControls.hidden = fitMode !== 'solid';
  solidColor.disabled = fitMode !== 'solid';
  colorControls.classList.remove('is-disabled');
  if (fitMode === 'solid') updateSolidSizeRange();
  modeButtons.forEach((button) => button.classList.toggle('active', button.dataset.mode === fitMode));
}

function updateSolidSizeRange() {
  const containScale = Math.min(masterCanvas.width / sourceImage.width, masterCanvas.height / sourceImage.height);
  const coverScale = Math.max(masterCanvas.width / sourceImage.width, masterCanvas.height / sourceImage.height);
  solidSizeRange.max = Math.max(100, Math.ceil((coverScale / containScale) * 100));
  solidImageScale = Math.min(solidImageScale, Number(solidSizeRange.max));
  solidSizeRange.value = solidImageScale;
  if (solidImageScale === 100) solidSizeValue.textContent = '전체 보이기';
  else if (solidImageScale === Number(solidSizeRange.max)) solidSizeValue.textContent = '화면 채움';
  else solidSizeValue.textContent = `${solidImageScale}%`;
}

function updateCropLabel() {
  if (cropPosition === 50) cropValue.textContent = '가운데';
  else cropValue.textContent = cropPosition < 50 ? `왼쪽 ${50 - cropPosition}%` : `오른쪽 ${cropPosition - 50}%`;
}

function drawImage(file) {
  if (!file?.type.startsWith('image/')) return;

  const image = new Image();
  const objectUrl = URL.createObjectURL(file);
  image.onload = () => {
    sourceImage = image;
    cropPosition = 50;
    solidImageScale = 100;
    cropRange.value = cropPosition;
    cropRange.disabled = image.width / image.height <= (panels[0].width / panels[0].height) * panels.length;
    updateCropLabel();
    renderPanels();

    filename = file.name.replace(/\.[^/.]+$/, '') || 'framia-panorama';
    fileStatus.textContent = file.name;
    emptyState.hidden = true;
    fitControls.hidden = false;
    cropControls.hidden = false;
    updateVisibleControls();
    downloadActions.hidden = false;
    if (window.matchMedia('(max-width: 760px)').matches) previewPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    URL.revokeObjectURL(objectUrl);
  };
  image.src = objectUrl;
}

input.addEventListener('change', (event) => drawImage(event.target.files[0]));

['dragenter', 'dragover'].forEach((eventName) => uploadCard.addEventListener(eventName, (event) => {
  event.preventDefault();
  uploadCard.classList.add('dragging');
}));
['dragleave', 'drop'].forEach((eventName) => uploadCard.addEventListener(eventName, (event) => {
  event.preventDefault();
  uploadCard.classList.remove('dragging');
}));
uploadCard.addEventListener('drop', (event) => drawImage(event.dataTransfer.files[0]));

cropRange.addEventListener('input', () => {
  cropPosition = Number(cropRange.value);
  updateCropLabel();
  renderPanels();
});
resetCrop.addEventListener('click', () => {
  cropPosition = 50;
  cropRange.value = cropPosition;
  updateCropLabel();
  renderPanels();
});
modeButtons.forEach((button) => button.addEventListener('click', () => {
  fitMode = button.dataset.mode;
  updateVisibleControls();
  renderPanels();
}));
solidColor.addEventListener('input', () => {
  letterboxColor = solidColor.value;
  if (fitMode === 'solid') renderPanels();
});
solidSizeRange.addEventListener('input', () => {
  solidImageScale = Number(solidSizeRange.value);
  updateSolidSizeRange();
  if (fitMode === 'solid') renderPanels();
});
resetSolidSize.addEventListener('click', () => {
  solidImageScale = 100;
  updateSolidSizeRange();
  if (fitMode === 'solid') renderPanels();
});

function canvasToBlob(canvas) {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

function triggerDownload(blob, name) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.style.display = 'none';
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30000);
}

async function downloadPanel(index) {
  const blob = await canvasToBlob(panels[index]);
  if (blob) triggerDownload(blob, `${filename}-${index + 1}.png`);
}

const crcTable = new Uint32Array(256);
for (let index = 0; index < 256; index += 1) {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  crcTable[index] = value >>> 0;
}

function crc32(bytes) {
  let value = 0xffffffff;
  for (const byte of bytes) value = crcTable[(value ^ byte) & 0xff] ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
}

async function makeZip(files) {
  const encoder = new TextEncoder();
  const preparedFiles = await Promise.all(files.map(async ({ name, blob }) => ({
    name: encoder.encode(name),
    data: new Uint8Array(await blob.arrayBuffer()),
  })));
  const localParts = [];
  const centralParts = [];
  let localOffset = 0;

  preparedFiles.forEach(({ name, data }) => {
    const checksum = crc32(data);
    const local = new Uint8Array(30 + name.length + data.length);
    const localView = new DataView(local.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0x0800, true);
    localView.setUint32(14, checksum, true);
    localView.setUint32(18, data.length, true);
    localView.setUint32(22, data.length, true);
    localView.setUint16(26, name.length, true);
    local.set(name, 30);
    local.set(data, 30 + name.length);
    localParts.push(local);

    const central = new Uint8Array(46 + name.length);
    const centralView = new DataView(central.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0x0800, true);
    centralView.setUint32(16, checksum, true);
    centralView.setUint32(20, data.length, true);
    centralView.setUint32(24, data.length, true);
    centralView.setUint16(28, name.length, true);
    centralView.setUint32(42, localOffset, true);
    central.set(name, 46);
    centralParts.push(central);
    localOffset += local.length;
  });

  const centralOffset = localOffset;
  const centralSize = centralParts.reduce((size, part) => size + part.length, 0);
  const zip = new Uint8Array(centralOffset + centralSize + 22);
  let offset = 0;
  [...localParts, ...centralParts].forEach((part) => { zip.set(part, offset); offset += part.length; });
  const end = new DataView(zip.buffer, offset, 22);
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, preparedFiles.length, true);
  end.setUint16(10, preparedFiles.length, true);
  end.setUint32(12, centralSize, true);
  end.setUint32(16, centralOffset, true);
  return new Blob([zip], { type: 'application/zip' });
}

downloadButtons.forEach((button) => button.addEventListener('click', () => downloadPanel(Number(button.dataset.panel))));
downloadAll.addEventListener('click', async () => {
  downloadAll.disabled = true;
  const originalText = downloadAll.textContent;
  downloadAll.textContent = 'ZIP 만드는 중…';
  try {
    const blobs = await Promise.all(panels.map(canvasToBlob));
    if (blobs.some((blob) => !blob)) return;
    const zip = await makeZip(blobs.map((blob, index) => ({ name: `${filename}-${index + 1}.png`, blob })));
    triggerDownload(zip, `${filename}-3panels.zip`);
  } finally {
    downloadAll.disabled = false;
    downloadAll.textContent = originalText;
  }
});
