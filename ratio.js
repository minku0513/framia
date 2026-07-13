const input = document.querySelector('#imageInput');
const uploadCard = document.querySelector('#uploadCard');
const fileStatus = document.querySelector('#fileStatus');
const formatControls = document.querySelector('#formatControls');
const formatButtons = [...document.querySelectorAll('[data-ratio]')];
const colorControls = document.querySelector('#colorControls');
const backgroundColor = document.querySelector('#backgroundColor');
const sizeControls = document.querySelector('#sizeControls');
const scaleRange = document.querySelector('#scaleRange');
const scaleValue = document.querySelector('#scaleValue');
const resetSize = document.querySelector('#resetSize');
const downloadActions = document.querySelector('#downloadActions');
const downloadImage = document.querySelector('#downloadImage');
const previewPanel = document.querySelector('#previewPanel');
const postImage = document.querySelector('#postImage');
const emptyState = document.querySelector('#emptyState');
const previewCanvas = document.querySelector('#previewCanvas');
const outputCanvas = document.createElement('canvas');

const formats = { portrait: { width: 1080, height: 1440 }, square: { width: 1080, height: 1080 } };
let selectedFormat = 'portrait';
let sourceImage;
let filename = 'framia-post';

function currentFormat() { return formats[selectedFormat]; }
function updateScaleRange() {
  if (!sourceImage) return;
  const format = currentFormat();
  const widthFit = format.width / sourceImage.width;
  const coverFit = Math.max(format.width / sourceImage.width, format.height / sourceImage.height);
  scaleRange.max = Math.max(100, Math.ceil((coverFit / widthFit) * 100));
  scaleRange.value = 100;
}
function updateScaleLabel() {
  const value = Number(scaleRange.value);
  if (value === 100) scaleValue.textContent = '양옆 맞춤';
  else if (value === Number(scaleRange.max)) scaleValue.textContent = '화면 채움';
  else scaleValue.textContent = `${value}%`;
}
function render() {
  if (!sourceImage) return;
  const format = currentFormat();
  outputCanvas.width = format.width;
  outputCanvas.height = format.height;
  const context = outputCanvas.getContext('2d');
  context.fillStyle = backgroundColor.value;
  context.fillRect(0, 0, format.width, format.height);
  const scale = (format.width / sourceImage.width) * (Number(scaleRange.value) / 100);
  const width = sourceImage.width * scale;
  const height = sourceImage.height * scale;
  context.drawImage(sourceImage, (format.width - width) / 2, (format.height - height) / 2, width, height);

  previewCanvas.width = format.width;
  previewCanvas.height = format.height;
  previewCanvas.getContext('2d').drawImage(outputCanvas, 0, 0);
  postImage.classList.toggle('square', selectedFormat === 'square');
  updateScaleLabel();
}
function drawImage(file) {
  if (!file?.type.startsWith('image/')) return;
  const image = new Image();
  const objectUrl = URL.createObjectURL(file);
  image.onload = () => {
    sourceImage = image;
    filename = file.name.replace(/\.[^/.]+$/, '') || 'framia-post';
    fileStatus.textContent = file.name;
    formatControls.hidden = false;
    colorControls.hidden = false;
    sizeControls.hidden = false;
    downloadActions.hidden = false;
    updateScaleRange();
    render();
    emptyState.hidden = true;
    if (window.matchMedia('(max-width: 760px)').matches) previewPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    URL.revokeObjectURL(objectUrl);
  };
  image.src = objectUrl;
}
input.addEventListener('change', (event) => drawImage(event.target.files[0]));
['dragenter', 'dragover'].forEach((eventName) => uploadCard.addEventListener(eventName, (event) => { event.preventDefault(); uploadCard.classList.add('dragging'); }));
['dragleave', 'drop'].forEach((eventName) => uploadCard.addEventListener(eventName, (event) => { event.preventDefault(); uploadCard.classList.remove('dragging'); }));
uploadCard.addEventListener('drop', (event) => drawImage(event.dataTransfer.files[0]));
formatButtons.forEach((button) => button.addEventListener('click', () => { selectedFormat = button.dataset.ratio; formatButtons.forEach((item) => item.classList.toggle('active', item === button)); updateScaleRange(); render(); }));
scaleRange.addEventListener('input', render);
backgroundColor.addEventListener('input', render);
resetSize.addEventListener('click', () => { scaleRange.value = 100; render(); });
downloadImage.addEventListener('click', () => outputCanvas.toBlob((blob) => { if (!blob) return; const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `${filename}-${selectedFormat}.png`; link.style.display = 'none'; document.body.append(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 30000); }, 'image/png'));
