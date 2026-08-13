(() => {
  "use strict";

  const ANIMAL_COUNT = 31;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = src;
    });
  }

  function readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function pixelDistance(pixels, offset, background) {
    const red = pixels[offset] - background[0];
    const green = pixels[offset + 1] - background[1];
    const blue = pixels[offset + 2] - background[2];
    return Math.sqrt(red * red + green * green + blue * blue);
  }

  function sampleCorners(context, width, height) {
    const size = Math.max(2, Math.min(12, Math.round(Math.min(width, height) * .006)));
    const points = [[0, 0], [width - size, 0], [0, height - size], [width - size, height - size]];
    const total = [0, 0, 0, 0];
    points.forEach(([x, y]) => {
      const pixels = context.getImageData(Math.max(0, x), Math.max(0, y), size, size).data;
      for (let offset = 0; offset < pixels.length; offset += 4) {
        if (pixels[offset + 3] < 16) continue;
        total[0] += pixels[offset]; total[1] += pixels[offset + 1]; total[2] += pixels[offset + 2]; total[3] += 1;
      }
    });
    return total[3] ? total.slice(0, 3).map((value) => value / total[3]) : [255, 255, 255];
  }

  function connectedMask(pixels, width, height, background, threshold) {
    const count = width * height;
    const mask = new Uint8Array(count);
    const queue = new Uint32Array(count);
    let head = 0;
    let tail = 0;
    const enqueue = (pixel) => {
      if (mask[pixel] || pixelDistance(pixels, pixel * 4, background) > threshold) return;
      mask[pixel] = 1;
      queue[tail++] = pixel;
    };
    for (let x = 0; x < width; x += 1) { enqueue(x); enqueue((height - 1) * width + x); }
    for (let y = 1; y < height - 1; y += 1) { enqueue(y * width); enqueue(y * width + width - 1); }
    while (head < tail) {
      const pixel = queue[head++];
      const x = pixel % width;
      const y = Math.floor(pixel / width);
      if (x > 0) enqueue(pixel - 1);
      if (x + 1 < width) enqueue(pixel + 1);
      if (y > 0) enqueue(pixel - width);
      if (y + 1 < height) enqueue(pixel + width);
    }
    return mask;
  }

  function cropCanvas(source, bounds) {
    if (bounds.maxX < bounds.minX || bounds.maxY < bounds.minY) return source;
    const subjectSize = Math.max(bounds.maxX - bounds.minX + 1, bounds.maxY - bounds.minY + 1);
    const padding = Math.max(2, Math.round(subjectSize * .025));
    const x = Math.max(0, bounds.minX - padding);
    const y = Math.max(0, bounds.minY - padding);
    const right = Math.min(source.width, bounds.maxX + padding + 1);
    const bottom = Math.min(source.height, bounds.maxY + padding + 1);
    const output = document.createElement("canvas");
    output.width = right - x;
    output.height = bottom - y;
    output.getContext("2d").drawImage(source, x, y, output.width, output.height, 0, 0, output.width, output.height);
    return output;
  }

  async function processFile(file, options = {}) {
    const dataUrl = await readFile(file);
    if (/gif/i.test(file.type)) return { src: dataUrl, status: "GIF 保留原动画，不执行自动抠图。" };
    const image = await loadImage(dataUrl);
    const originalWidth = image.naturalWidth || image.width;
    const originalHeight = image.naturalHeight || image.height;
    const scale = Math.min(1, 2048 / Math.max(originalWidth, originalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(originalWidth * scale));
    canvas.height = Math.max(1, Math.round(originalHeight * scale));
    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    if (options.removeBackground === false || /svg/i.test(file.type)) {
      return { src: canvas.toDataURL("image/png"), status: `保留原背景 · ${canvas.width}×${canvas.height}` };
    }
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    const background = sampleCorners(context, canvas.width, canvas.height);
    const tolerance = Number(options.tolerance ?? 32);
    const feather = Number(options.feather ?? 4);
    const mask = connectedMask(pixels, canvas.width, canvas.height, background, tolerance + feather);
    const transparent = context.createImageData(canvas.width, canvas.height);
    const target = transparent.data;
    const bounds = { minX: canvas.width, minY: canvas.height, maxX: -1, maxY: -1 };
    for (let offset = 0; offset < pixels.length; offset += 4) {
      const pixel = offset / 4;
      const distance = pixelDistance(pixels, offset, background);
      let keep = 1;
      if (mask[pixel]) keep = distance <= tolerance ? 0 : feather > 0 ? Math.min(1, (distance - tolerance) / feather) : 1;
      let red = pixels[offset], green = pixels[offset + 1], blue = pixels[offset + 2];
      if (keep > .03 && keep < .995) {
        red = clamp((red - background[0] * (1 - keep)) / keep, 0, 255);
        green = clamp((green - background[1] * (1 - keep)) / keep, 0, 255);
        blue = clamp((blue - background[2] * (1 - keep)) / keep, 0, 255);
      }
      target[offset] = red; target[offset + 1] = green; target[offset + 2] = blue;
      target[offset + 3] = Math.round(pixels[offset + 3] * keep);
      if (target[offset + 3] > 8) {
        const x = pixel % canvas.width;
        const y = Math.floor(pixel / canvas.width);
        bounds.minX = Math.min(bounds.minX, x); bounds.maxX = Math.max(bounds.maxX, x);
        bounds.minY = Math.min(bounds.minY, y); bounds.maxY = Math.max(bounds.maxY, y);
      }
    }
    const transparentCanvas = document.createElement("canvas");
    transparentCanvas.width = canvas.width;
    transparentCanvas.height = canvas.height;
    transparentCanvas.getContext("2d").putImageData(transparent, 0, 0);
    const output = cropCanvas(transparentCanvas, bounds);
    return { src: output.toDataURL("image/png"), status: `背景已转透明 · 高清主体 ${output.width}×${output.height}` };
  }

  function animalAssets(limit = ANIMAL_COUNT) {
    return Array.from({ length: Math.min(ANIMAL_COUNT, limit) }, (_, index) => ({
      id: `animal${String(index + 1).padStart(2, "0")}`,
      label: `动物 ${String(index + 1).padStart(2, "0")}`,
      src: `assets/transparent-animals/animal-${String(index + 1).padStart(2, "0")}.png`
    }));
  }

  window.TokenAssetTools = { animalAssets, processFile };
})();
