(() => {
  const isGif = (type = "", url = "") => /gif/i.test(`${type} ${url}`);

  async function readGifFrameDurations(blob) {
    if (!blob) return [];
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const durations = [];
    if (bytes.length < 13 || String.fromCharCode(...bytes.slice(0, 3)) !== "GIF") return durations;
    const skipSubBlocks = (offset) => {
      let cursor = offset;
      while (cursor < bytes.length) {
        const size = bytes[cursor];
        cursor += 1;
        if (size === 0) break;
        cursor += size;
      }
      return cursor;
    };
    const globalTableBytes = bytes[10] & 0x80 ? 3 * (2 ** ((bytes[10] & 0x07) + 1)) : 0;
    let index = 13 + globalTableBytes;
    let pendingDelayMs = 100;
    while (index < bytes.length) {
      const marker = bytes[index];
      if (marker === 0x3b) break;
      if (marker === 0x21) {
        const label = bytes[index + 1];
        if (label === 0xf9 && bytes[index + 2] === 0x04 && index + 7 < bytes.length) {
          const delayHundredths = bytes[index + 4] | (bytes[index + 5] << 8);
          pendingDelayMs = delayHundredths > 0 ? delayHundredths * 10 : 100;
          index += 8;
        } else {
          index = skipSubBlocks(index + 2);
        }
        continue;
      }
      if (marker === 0x2c && index + 9 < bytes.length) {
        durations.push(pendingDelayMs);
        pendingDelayMs = 100;
        const localTableBytes = bytes[index + 9] & 0x80 ? 3 * (2 ** ((bytes[index + 9] & 0x07) + 1)) : 0;
        index = skipSubBlocks(index + 11 + localTableBytes);
        continue;
      }
      break;
    }
    return durations;
  }

  async function decode({ url, type = "image/gif", maxFrames = Infinity } = {}) {
    if (!url || !("ImageDecoder" in window) || !isGif(type, url)) return null;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`animated image ${response.status}`);
    const blob = await response.blob();
    const sourceDurations = await readGifFrameDurations(blob);
    const decoder = new ImageDecoder({ data: blob.stream(), type: type || blob.type || "image/gif" });
    try {
      await decoder.tracks.ready;
      const frameCount = decoder.tracks.selectedTrack?.frameCount || 1;
      if (Number.isFinite(maxFrames) && frameCount > maxFrames) {
        throw new Error(`animated image has ${frameCount} frames; limit is ${maxFrames}`);
      }
      const frames = [];
      let totalMs = 0;
      for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
        const decoded = await decoder.decode({ frameIndex, completeFramesOnly: true });
        const decodedDurationMs = Number(decoded.image.duration) / 1000;
        const durationMs = sourceDurations[frameIndex]
          || (Number.isFinite(decodedDurationMs) && decodedDurationMs > 0 ? decodedDurationMs : 100);
        const image = await createImageBitmap(decoded.image);
        decoded.image.close();
        frames.push({ image, startMs: totalMs, durationMs });
        totalMs += durationMs;
      }
      return { kind: "frames", frames, totalMs };
    } finally {
      decoder.close();
    }
  }

  function frameAt(resource, timeSeconds) {
    if (!resource?.frames?.length || !(resource.totalMs > 0)) return null;
    const timeMs = ((Number(timeSeconds) * 1000) % resource.totalMs + resource.totalMs) % resource.totalMs;
    return (resource.frames.find((frame) => timeMs >= frame.startMs && timeMs < frame.startMs + frame.durationMs) || resource.frames.at(-1)).image;
  }

  function dispose(resource) {
    resource?.frames?.forEach((frame) => frame.image?.close?.());
    if (resource?.frames) resource.frames.length = 0;
    if (resource) resource.totalMs = 0;
  }

  window.CellMotionAnimatedImage = Object.freeze({ decode, frameAt, dispose, readGifFrameDurations });
})();
