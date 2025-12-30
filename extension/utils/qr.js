const defaultSize = 180;

export const renderQrToCanvas = (canvas, text, size = defaultSize) => {
  if (!canvas || !text || typeof qrcode === "undefined") return;
  const qr = qrcode(0, "M");
  qr.addData(text);
  qr.make();

  const modules = qr.getModuleCount();
  const cellSize = Math.max(2, Math.floor(size / modules));
  const margin = Math.max(4, Math.floor(cellSize));
  const totalSize = modules * cellSize + margin * 2;

  canvas.width = totalSize;
  canvas.height = totalSize;

  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, totalSize, totalSize);
  ctx.fillStyle = "#111";

  for (let row = 0; row < modules; row += 1) {
    for (let col = 0; col < modules; col += 1) {
      if (qr.isDark(row, col)) {
        const x = margin + col * cellSize;
        const y = margin + row * cellSize;
        ctx.fillRect(x, y, cellSize, cellSize);
      }
    }
  }
};

export const getQrDataUrl = (text, size = defaultSize) => {
  const canvas = document.createElement("canvas");
  renderQrToCanvas(canvas, text, size);
  return canvas.toDataURL("image/png");
};
