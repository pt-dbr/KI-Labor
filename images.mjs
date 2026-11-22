const tf = () => globalThis.tf;
let encoder;

export async function extract(url, signal) {
  signal.throwIfAborted();
  if (!encoder) {
    if (!tf()) await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = './vendor/tf.min.js';
      script.onload = () => { script.remove(); resolve(); };
      script.onerror = () => { script.remove(); reject(new Error('Bibliothek konnte nicht geladen werden.')); };
      document.head.append(script);
    });
    await tf().ready();
    // Always use an absolute URL so the weight paths follow the page on GitHub Pages.
    encoder = await tf().loadLayersModel(new URL('./model/model.json', document.baseURI).href, {requestInit: {signal}});
  }
  signal.throwIfAborted();
  const image = new Image();
  image.src = url;
  await image.decode();
  signal.throwIfAborted();
  const vector = tf().tidy(() => {
    const input = tf().browser.fromPixels(image).toFloat().div(127.5).sub(1).expandDims(0);
    return Float32Array.from(encoder.predict(input).dataSync());
  });
  const length = Math.hypot(...vector) || 1;
  return vector.map(value => value / length);
}

export function releaseEncoder() {
  encoder?.dispose();
  encoder = undefined;
}

export async function thumbnail(file) {
  if (file.size > 24 * 1024 * 1024) throw new Error('Das Bild ist zu groß. Wähle ein Bild unter 24 MB.');
  const source = URL.createObjectURL(file);
  const image = new Image();
  const canvas = document.createElement('canvas');
  try {
    image.src = source;
    try { await image.decode(); }
    catch { throw new Error('Dieses Bild lässt sich nicht öffnen. Versuche es mit einem JPEG- oder PNG-Bild.'); }
    const {naturalWidth: width, naturalHeight: height} = image;
    if (Math.min(width, height) < 32) throw new Error('Das Bild ist zu klein. Verwende ein größeres Foto.');
    canvas.width = canvas.height = 224;
    const context = canvas.getContext('2d');
    const scale = 224 / Math.max(width, height);
    context.fillStyle = '#808080';
    context.fillRect(0, 0, 224, 224);
    context.drawImage(image, (224 - width * scale) / 2, (224 - height * scale) / 2, width * scale, height * scale);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.87));
    if (!blob) throw new Error('Das Bild konnte nicht verkleinert werden. Versuche ein kleineres Foto.');
    return URL.createObjectURL(blob);
  } finally {
    URL.revokeObjectURL(source);
    image.removeAttribute('src');
    canvas.width = canvas.height = 1;
  }
}

