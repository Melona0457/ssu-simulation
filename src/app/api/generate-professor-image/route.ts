import { NextResponse } from "next/server";
import sharp from "sharp";
import {
  createGeminiClient,
  extractFirstInlineData,
  extractTextFromGeminiResponse,
  getGeminiImageModel,
} from "@/lib/gemini/server";
import { professorReferenceFusionGuide, professorSpriteStylePreset } from "@/lib/game-data";

type ImageRequestPayload = {
  professorName: string;
  professorSummary: string;
  illustrationPrompt: string;
};

type BackgroundColor = {
  r: number;
  g: number;
  b: number;
};

type SpriteQualityMetrics = {
  opaqueRatio: number;
  bottomOpaqueRatio: number;
  centerOpaqueRatio: number;
  edgeOpaqueRatio: number;
  cornerOpaqueRatio: number;
  mainAreaRatio: number;
  mainWidthRatio: number;
  mainHeightRatio: number;
  mainTouchesEdge: boolean;
};

type OpaqueComponent = {
  id: number;
  area: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

function colorDistanceSquared(
  r: number,
  g: number,
  b: number,
  background: BackgroundColor,
) {
  const dr = r - background.r;
  const dg = g - background.g;
  const db = b - background.b;
  return dr * dr + dg * dg + db * db;
}

function minDistanceToPaletteSquared(
  r: number,
  g: number,
  b: number,
  palette: BackgroundColor[],
) {
  let minDist = Number.POSITIVE_INFINITY;

  for (const color of palette) {
    const dist = colorDistanceSquared(r, g, b, color);
    if (dist < minDist) {
      minDist = dist;
    }
  }

  return minDist;
}

function collectBorderPalette(data: Buffer, width: number, height: number) {
  const border = Math.max(2, Math.floor(Math.min(width, height) * 0.04));
  const bins = new Map<number, { count: number; sumR: number; sumG: number; sumB: number }>();

  const samplePixel = (x: number, y: number) => {
    const index = (y * width + x) * 4;
    if (data[index + 3] <= 24) {
      return;
    }

    const key = ((data[index] >> 4) << 8) | ((data[index + 1] >> 4) << 4) | (data[index + 2] >> 4);
    const entry = bins.get(key);
    if (entry) {
      entry.count += 1;
      entry.sumR += data[index];
      entry.sumG += data[index + 1];
      entry.sumB += data[index + 2];
    } else {
      bins.set(key, {
        count: 1,
        sumR: data[index],
        sumG: data[index + 1],
        sumB: data[index + 2],
      });
    }
  };

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (x < border || x >= width - border || y < border || y >= height - border) {
        samplePixel(x, y);
      }
    }
  }

  const palette = [...bins.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 28)
    .map((entry) => ({
      r: Math.round(entry.sumR / entry.count),
      g: Math.round(entry.sumG / entry.count),
      b: Math.round(entry.sumB / entry.count),
    }));

  if (palette.length > 0) {
    return palette;
  }

  return [estimateCornerBackground(data, width, height)];
}

function estimateCornerBackground(data: Buffer, width: number, height: number): BackgroundColor {
  const patch = Math.max(6, Math.min(24, Math.floor(Math.min(width, height) * 0.03)));
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;

  const samplePatch = (startX: number, startY: number) => {
    for (let y = startY; y < startY + patch; y += 1) {
      for (let x = startX; x < startX + patch; x += 1) {
        const index = (y * width + x) * 4;
        r += data[index];
        g += data[index + 1];
        b += data[index + 2];
        count += 1;
      }
    }
  };

  samplePatch(0, 0);
  samplePatch(width - patch, 0);
  samplePatch(0, height - patch);
  samplePatch(width - patch, height - patch);

  if (count === 0) {
    return { r: 245, g: 245, b: 245 };
  }

  return {
    r: Math.round(r / count),
    g: Math.round(g / count),
    b: Math.round(b / count),
  };
}

function buildEdgeConnectedBackgroundMask(
  data: Buffer,
  width: number,
  height: number,
  thresholdSquared: number,
) {
  const background = estimateCornerBackground(data, width, height);
  const totalPixels = width * height;
  const visited = new Uint8Array(totalPixels);
  const mask = new Uint8Array(totalPixels);
  const queue = new Uint32Array(totalPixels);
  let head = 0;
  let tail = 0;

  const tryEnqueue = (x: number, y: number) => {
    const pixelIndex = y * width + x;
    if (visited[pixelIndex]) {
      return;
    }

    const offset = pixelIndex * 4;
    const alpha = data[offset + 3];
    if (alpha < 8) {
      return;
    }

    const dist = colorDistanceSquared(
      data[offset],
      data[offset + 1],
      data[offset + 2],
      background,
    );
    if (dist <= thresholdSquared) {
      queue[tail] = pixelIndex;
      tail += 1;
    }
  };

  for (let x = 0; x < width; x += 1) {
    tryEnqueue(x, 0);
    tryEnqueue(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    tryEnqueue(0, y);
    tryEnqueue(width - 1, y);
  }

  while (head < tail) {
    const pixelIndex = queue[head];
    head += 1;

    if (visited[pixelIndex]) {
      continue;
    }
    visited[pixelIndex] = 1;

    const offset = pixelIndex * 4;
    const alpha = data[offset + 3];
    if (alpha < 8) {
      continue;
    }

    const dist = colorDistanceSquared(
      data[offset],
      data[offset + 1],
      data[offset + 2],
      background,
    );
    if (dist > thresholdSquared) {
      continue;
    }

    mask[pixelIndex] = 1;

    const x = pixelIndex % width;
    const y = Math.floor(pixelIndex / width);

    if (x > 0) {
      const left = pixelIndex - 1;
      if (!visited[left]) {
        queue[tail] = left;
        tail += 1;
      }
    }
    if (x < width - 1) {
      const right = pixelIndex + 1;
      if (!visited[right]) {
        queue[tail] = right;
        tail += 1;
      }
    }
    if (y > 0) {
      const up = pixelIndex - width;
      if (!visited[up]) {
        queue[tail] = up;
        tail += 1;
      }
    }
    if (y < height - 1) {
      const down = pixelIndex + width;
      if (!visited[down]) {
        queue[tail] = down;
        tail += 1;
      }
    }
  }

  return { mask, background };
}

async function removeFlatBackgroundToTransparent(inputBuffer: Buffer) {
  const { data, info } = await sharp(inputBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const width = info.width;
  const height = info.height;
  const working = Buffer.from(data);
  const totalPixels = width * height;

  let result = buildEdgeConnectedBackgroundMask(working, width, height, 42 * 42);
  let removedCount = 0;
  for (let i = 0; i < totalPixels; i += 1) {
    removedCount += result.mask[i];
  }

  const removedRatio = removedCount / totalPixels;
  if (removedRatio < 0.08) {
    result = buildEdgeConnectedBackgroundMask(working, width, height, 70 * 70);
    removedCount = 0;
    for (let i = 0; i < totalPixels; i += 1) {
      removedCount += result.mask[i];
    }
  }

  const finalRemovedRatio = removedCount / totalPixels;
  if (finalRemovedRatio > 0.94) {
    return sharp(inputBuffer).png().toBuffer();
  }

  for (let i = 0; i < totalPixels; i += 1) {
    if (result.mask[i]) {
      const offset = i * 4;
      working[offset + 3] = 0;
    }
  }

  const neighborOffsets = [-1, 1, -width, width];
  for (let i = 0; i < totalPixels; i += 1) {
    if (result.mask[i]) {
      continue;
    }

    let touchingBackground = false;
    for (const neighborOffset of neighborOffsets) {
      const neighborIndex = i + neighborOffset;
      if (neighborIndex < 0 || neighborIndex >= totalPixels) {
        continue;
      }
      if (result.mask[neighborIndex]) {
        touchingBackground = true;
        break;
      }
    }

    if (!touchingBackground) {
      continue;
    }

    const offset = i * 4;
    const dist = colorDistanceSquared(
      working[offset],
      working[offset + 1],
      working[offset + 2],
      result.background,
    );
    if (dist <= 75 * 75) {
      working[offset + 3] = Math.min(working[offset + 3], 140);
    }
  }

  return sharp(working, {
    raw: {
      width,
      height,
      channels: 4,
    },
  })
    .png()
    .toBuffer();
}

async function removePaletteBackgroundToTransparent(inputBuffer: Buffer, aggressive = false) {
  const { data, info } = await sharp(inputBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const width = info.width;
  const height = info.height;
  const totalPixels = width * height;
  const working = Buffer.from(data);
  const palette = collectBorderPalette(working, width, height);

  const buildMask = (seedThresholdSquared: number, growThresholdSquared: number) => {
    const visited = new Uint8Array(totalPixels);
    const mask = new Uint8Array(totalPixels);
    const queue = new Uint32Array(totalPixels);
    let head = 0;
    let tail = 0;

    const trySeed = (x: number, y: number) => {
      const pixelIndex = y * width + x;
      if (visited[pixelIndex]) {
        return;
      }

      const offset = pixelIndex * 4;
      const alpha = working[offset + 3];
      if (alpha < 8) {
        return;
      }

      const dist = minDistanceToPaletteSquared(
        working[offset],
        working[offset + 1],
        working[offset + 2],
        palette,
      );
      if (dist <= seedThresholdSquared) {
        queue[tail] = pixelIndex;
        tail += 1;
      }
    };

    for (let x = 0; x < width; x += 1) {
      trySeed(x, 0);
      trySeed(x, height - 1);
    }
    for (let y = 0; y < height; y += 1) {
      trySeed(0, y);
      trySeed(width - 1, y);
    }

    while (head < tail) {
      const pixelIndex = queue[head];
      head += 1;

      if (visited[pixelIndex]) {
        continue;
      }
      visited[pixelIndex] = 1;

      const offset = pixelIndex * 4;
      const alpha = working[offset + 3];
      if (alpha < 8) {
        continue;
      }

      const dist = minDistanceToPaletteSquared(
        working[offset],
        working[offset + 1],
        working[offset + 2],
        palette,
      );
      if (dist > growThresholdSquared) {
        continue;
      }

      mask[pixelIndex] = 1;
      const x = pixelIndex % width;
      const y = Math.floor(pixelIndex / width);

      if (x > 0) {
        const left = pixelIndex - 1;
        if (!visited[left]) {
          queue[tail] = left;
          tail += 1;
        }
      }
      if (x < width - 1) {
        const right = pixelIndex + 1;
        if (!visited[right]) {
          queue[tail] = right;
          tail += 1;
        }
      }
      if (y > 0) {
        const up = pixelIndex - width;
        if (!visited[up]) {
          queue[tail] = up;
          tail += 1;
        }
      }
      if (y < height - 1) {
        const down = pixelIndex + width;
        if (!visited[down]) {
          queue[tail] = down;
          tail += 1;
        }
      }
    }

    return mask;
  };

  const strictMask = buildMask(40 * 40, 64 * 64);
  const relaxedMask = buildMask(56 * 56, aggressive ? 98 * 98 : 84 * 84);
  const mergedMask = new Uint8Array(totalPixels);
  let strictRemoved = 0;
  for (let i = 0; i < totalPixels; i += 1) {
    strictRemoved += strictMask[i];
  }
  const useRelaxed = strictRemoved / totalPixels < 0.08 || aggressive;

  for (let i = 0; i < totalPixels; i += 1) {
    mergedMask[i] = strictMask[i] || (useRelaxed ? relaxedMask[i] : 0);
  }

  for (let i = 0; i < totalPixels; i += 1) {
    if (mergedMask[i]) {
      const offset = i * 4;
      working[offset + 3] = 0;
    }
  }

  for (let i = 0; i < totalPixels; i += 1) {
    if (mergedMask[i]) {
      continue;
    }

    const x = i % width;
    const y = Math.floor(i / width);
    const offset = i * 4;
    const alpha = working[offset + 3];
    if (alpha <= 24) {
      continue;
    }

    let touchingBackground = false;
    const neighbors = [
      x > 0 ? i - 1 : -1,
      x < width - 1 ? i + 1 : -1,
      y > 0 ? i - width : -1,
      y < height - 1 ? i + width : -1,
    ];
    for (const neighbor of neighbors) {
      if (neighbor >= 0 && mergedMask[neighbor]) {
        touchingBackground = true;
        break;
      }
    }

    if (!touchingBackground) {
      continue;
    }

    const dist = minDistanceToPaletteSquared(
      working[offset],
      working[offset + 1],
      working[offset + 2],
      palette,
    );
    if (dist <= 74 * 74) {
      working[offset + 3] = Math.min(alpha, 72);
    } else if (dist <= 98 * 98) {
      working[offset + 3] = Math.min(alpha, 128);
    }
  }

  return sharp(working, {
    raw: {
      width,
      height,
      channels: 4,
    },
  })
    .png()
    .toBuffer();
}

async function measureSpriteQuality(pngBuffer: Buffer): Promise<SpriteQualityMetrics> {
  const { data, info } = await sharp(pngBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const width = info.width;
  const height = info.height;
  const totalPixels = width * height;

  let opaqueCount = 0;
  let bottomOpaqueCount = 0;
  let centerOpaqueCount = 0;
  let edgeOpaqueCount = 0;
  let cornerOpaqueCount = 0;
  let bottomTotal = 0;
  let centerTotal = 0;
  let edgeTotal = 0;
  let cornerTotal = 0;

  const bottomStart = Math.max(0, Math.floor(height * 0.88));
  const centerTop = Math.floor(height * 0.2);
  const centerBottom = Math.floor(height * 0.85);
  const centerLeft = Math.floor(width * 0.18);
  const centerRight = Math.floor(width * 0.82);
  const edgeBand = Math.max(2, Math.floor(Math.min(width, height) * 0.03));
  const cornerPatch = Math.max(6, Math.floor(Math.min(width, height) * 0.1));

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const alpha = data[index + 3];
      const isOpaque = alpha > 24;

      if (isOpaque) {
        opaqueCount += 1;
      }

      if (y >= bottomStart) {
        bottomTotal += 1;
        if (isOpaque) {
          bottomOpaqueCount += 1;
        }
      }

      if (y >= centerTop && y <= centerBottom && x >= centerLeft && x <= centerRight) {
        centerTotal += 1;
        if (isOpaque) {
          centerOpaqueCount += 1;
        }
      }

      if (x < edgeBand || x >= width - edgeBand || y < edgeBand || y >= height - edgeBand) {
        edgeTotal += 1;
        if (isOpaque) {
          edgeOpaqueCount += 1;
        }
      }

      const inTopLeft = x < cornerPatch && y < cornerPatch;
      const inTopRight = x >= width - cornerPatch && y < cornerPatch;
      const inBottomLeft = x < cornerPatch && y >= height - cornerPatch;
      const inBottomRight = x >= width - cornerPatch && y >= height - cornerPatch;
      if (inTopLeft || inTopRight || inBottomLeft || inBottomRight) {
        cornerTotal += 1;
        if (isOpaque) {
          cornerOpaqueCount += 1;
        }
      }
    }
  }

  const { components } = buildOpaqueComponents(data, width, height);
  const mainComponent =
    components.length > 0
      ? components.reduce((best, current) => (current.area > best.area ? current : best))
      : null;
  const mainWidth =
    mainComponent !== null ? mainComponent.maxX - mainComponent.minX + 1 : 0;
  const mainHeight =
    mainComponent !== null ? mainComponent.maxY - mainComponent.minY + 1 : 0;
  const mainTouchesEdge =
    mainComponent !== null &&
    (mainComponent.minX <= 2 ||
      mainComponent.maxX >= width - 3 ||
      mainComponent.minY <= 2 ||
      mainComponent.maxY >= height - 3);

  return {
    opaqueRatio: totalPixels > 0 ? opaqueCount / totalPixels : 0,
    bottomOpaqueRatio: bottomTotal > 0 ? bottomOpaqueCount / bottomTotal : 0,
    centerOpaqueRatio: centerTotal > 0 ? centerOpaqueCount / centerTotal : 0,
    edgeOpaqueRatio: edgeTotal > 0 ? edgeOpaqueCount / edgeTotal : 0,
    cornerOpaqueRatio: cornerTotal > 0 ? cornerOpaqueCount / cornerTotal : 0,
    mainAreaRatio:
      mainComponent !== null && totalPixels > 0 ? mainComponent.area / totalPixels : 0,
    mainWidthRatio: width > 0 ? mainWidth / width : 0,
    mainHeightRatio: height > 0 ? mainHeight / height : 0,
    mainTouchesEdge,
  };
}

function isNoisySprite(metrics: SpriteQualityMetrics) {
  const likelyBackgroundMergedIntoMain =
    metrics.mainAreaRatio > 0.46 ||
    (metrics.mainWidthRatio > 0.95 && metrics.mainHeightRatio > 0.92) ||
    (metrics.mainTouchesEdge && metrics.mainWidthRatio > 0.86 && metrics.edgeOpaqueRatio > 0.1);

  return (
    metrics.opaqueRatio > 0.52 ||
    metrics.bottomOpaqueRatio > 0.28 ||
    metrics.centerOpaqueRatio > 0.7 ||
    metrics.edgeOpaqueRatio > 0.13 ||
    metrics.cornerOpaqueRatio > 0.22 ||
    likelyBackgroundMergedIntoMain
  );
}

function buildOpaqueComponents(data: Buffer, width: number, height: number) {
  const total = width * height;
  const labels = new Int32Array(total);
  const queue = new Uint32Array(total);
  const components: OpaqueComponent[] = [];
  let currentLabel = 0;

  for (let i = 0; i < total; i += 1) {
    const alpha = data[i * 4 + 3];
    if (alpha <= 24 || labels[i] !== 0) {
      continue;
    }

    currentLabel += 1;
    let head = 0;
    let tail = 0;
    queue[tail] = i;
    tail += 1;
    labels[i] = currentLabel;

    const component: OpaqueComponent = {
      id: currentLabel,
      area: 0,
      minX: width,
      maxX: 0,
      minY: height,
      maxY: 0,
    };

    while (head < tail) {
      const pixelIndex = queue[head];
      head += 1;
      const x = pixelIndex % width;
      const y = Math.floor(pixelIndex / width);

      component.area += 1;
      if (x < component.minX) {
        component.minX = x;
      }
      if (x > component.maxX) {
        component.maxX = x;
      }
      if (y < component.minY) {
        component.minY = y;
      }
      if (y > component.maxY) {
        component.maxY = y;
      }

      const neighbors = [
        x > 0 ? pixelIndex - 1 : -1,
        x < width - 1 ? pixelIndex + 1 : -1,
        y > 0 ? pixelIndex - width : -1,
        y < height - 1 ? pixelIndex + width : -1,
      ];

      for (const neighbor of neighbors) {
        if (neighbor < 0 || labels[neighbor] !== 0) {
          continue;
        }
        const neighborAlpha = data[neighbor * 4 + 3];
        if (neighborAlpha <= 24) {
          continue;
        }
        labels[neighbor] = currentLabel;
        queue[tail] = neighbor;
        tail += 1;
      }
    }

    components.push(component);
  }

  return { labels, components };
}

function removeBottomDetachedTextLikeComponents(data: Buffer, width: number, height: number) {
  const { labels, components } = buildOpaqueComponents(data, width, height);
  if (components.length === 0) {
    return 0;
  }

  const total = width * height;
  const largestArea = Math.max(...components.map((component) => component.area));
  let removed = 0;

  for (const component of components) {
    if (component.area === largestArea) {
      continue;
    }

    const compHeight = component.maxY - component.minY + 1;
    const compWidth = component.maxX - component.minX + 1;
    const isBottomBand = component.minY > height * 0.8;
    const isCompact = component.area < total * 0.04;
    const isTextLikeShape = compHeight < height * 0.13 && compWidth > width * 0.18;
    const isSmallComparedToMain = component.area < largestArea * 0.25;

    if (!(isBottomBand && isCompact && isTextLikeShape && isSmallComparedToMain)) {
      continue;
    }

    for (let i = 0; i < total; i += 1) {
      if (labels[i] === component.id) {
        data[i * 4 + 3] = 0;
        removed += 1;
      }
    }
  }

  return removed;
}

function keepPrimaryCharacterComponent(data: Buffer, width: number, height: number) {
  const { labels, components } = buildOpaqueComponents(data, width, height);
  if (components.length <= 1) {
    return 0;
  }

  const centerX = width / 2;
  const centerY = height * 0.55;

  const scoreComponent = (component: OpaqueComponent) => {
    const compWidth = component.maxX - component.minX + 1;
    const compHeight = component.maxY - component.minY + 1;
    const compCenterX = (component.minX + component.maxX) / 2;
    const compCenterY = (component.minY + component.maxY) / 2;
    const xDist = Math.abs(compCenterX - centerX) / width;
    const yDist = Math.abs(compCenterY - centerY) / height;
    const touchesEdge =
      component.minX <= 2 ||
      component.maxX >= width - 3 ||
      component.minY <= 2 ||
      component.maxY >= height - 3;
    const verticalCoverage = compHeight / height;
    const aspect = compWidth / Math.max(compHeight, 1);

    let score = component.area * (1 + verticalCoverage * 0.85);
    score *= Math.max(0.12, 1 - xDist * 0.9 - yDist * 0.7);

    if (touchesEdge) {
      score *= 0.22;
    }
    if (aspect > 1.35) {
      score *= 0.7;
    }

    return score;
  };

  const mainComponent = components.reduce((best, current) =>
    scoreComponent(current) > scoreComponent(best) ? current : best,
  );
  const expandedMainBounds = {
    minX: Math.max(0, mainComponent.minX - Math.floor(width * 0.04)),
    maxX: Math.min(width - 1, mainComponent.maxX + Math.floor(width * 0.04)),
    minY: Math.max(0, mainComponent.minY - Math.floor(height * 0.04)),
    maxY: Math.min(height - 1, mainComponent.maxY + Math.floor(height * 0.04)),
  };
  const keepIds = new Set<number>([mainComponent.id]);

  for (const component of components) {
    if (component.id === mainComponent.id) {
      continue;
    }

    const areaRatio = component.area / mainComponent.area;
    const compNearBottom = component.minY > height * 0.86;
    const compWide = component.maxX - component.minX + 1 > width * 0.22;
    const likelyShadow = compNearBottom && compWide && areaRatio < 0.08;
    if (likelyShadow) {
      continue;
    }

    const intersectsMainBounds = !(
      component.maxX < expandedMainBounds.minX ||
      component.minX > expandedMainBounds.maxX ||
      component.maxY < expandedMainBounds.minY ||
      component.minY > expandedMainBounds.maxY
    );

    if (intersectsMainBounds && areaRatio > 0.004) {
      keepIds.add(component.id);
    }
  }

  const total = width * height;
  let removed = 0;
  for (let i = 0; i < total; i += 1) {
    if (labels[i] !== 0 && !keepIds.has(labels[i])) {
      data[i * 4 + 3] = 0;
      removed += 1;
    }
  }

  return removed;
}

function hardenTransparentEdges(data: Buffer, width: number, height: number) {
  const total = width * height;
  const nextAlpha = new Uint8Array(total);

  for (let i = 0; i < total; i += 1) {
    nextAlpha[i] = data[i * 4 + 3];
  }

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const pixelIndex = y * width + x;
      const alpha = data[pixelIndex * 4 + 3];
      if (alpha === 0 || alpha === 255) {
        continue;
      }

      let opaqueNeighbors = 0;
      let transparentNeighbors = 0;
      for (let ny = y - 1; ny <= y + 1; ny += 1) {
        for (let nx = x - 1; nx <= x + 1; nx += 1) {
          if (nx === x && ny === y) {
            continue;
          }
          const neighborIndex = (ny * width + nx) * 4;
          const neighborAlpha = data[neighborIndex + 3];
          if (neighborAlpha > 210) {
            opaqueNeighbors += 1;
          } else if (neighborAlpha < 16) {
            transparentNeighbors += 1;
          }
        }
      }

      if ((alpha < 72 && transparentNeighbors >= 3) || (alpha < 138 && transparentNeighbors >= 5)) {
        nextAlpha[pixelIndex] = 0;
      } else if (opaqueNeighbors >= 5 && transparentNeighbors >= 1 && alpha >= 90) {
        nextAlpha[pixelIndex] = 255;
      } else if (opaqueNeighbors <= 1 && alpha < 180) {
        nextAlpha[pixelIndex] = 0;
      }
    }
  }

  for (let i = 0; i < total; i += 1) {
    data[i * 4 + 3] = nextAlpha[i];
  }
}

function defringeEdgeColors(data: Buffer, width: number, height: number) {
  const total = width * height;
  const nextRgb = new Uint8Array(total * 3);

  for (let i = 0; i < total; i += 1) {
    const offset = i * 4;
    nextRgb[i * 3] = data[offset];
    nextRgb[i * 3 + 1] = data[offset + 1];
    nextRgb[i * 3 + 2] = data[offset + 2];
  }

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const pixelIndex = y * width + x;
      const offset = pixelIndex * 4;
      const alpha = data[offset + 3];
      if (alpha < 8 || alpha > 220) {
        continue;
      }

      let sumR = 0;
      let sumG = 0;
      let sumB = 0;
      let strongNeighborCount = 0;

      for (let ny = y - 1; ny <= y + 1; ny += 1) {
        for (let nx = x - 1; nx <= x + 1; nx += 1) {
          if (nx === x && ny === y) {
            continue;
          }
          const neighborIndex = (ny * width + nx) * 4;
          const neighborAlpha = data[neighborIndex + 3];
          if (neighborAlpha < 220) {
            continue;
          }

          sumR += data[neighborIndex];
          sumG += data[neighborIndex + 1];
          sumB += data[neighborIndex + 2];
          strongNeighborCount += 1;
        }
      }

      if (strongNeighborCount < 3) {
        continue;
      }

      const targetR = Math.round(sumR / strongNeighborCount);
      const targetG = Math.round(sumG / strongNeighborCount);
      const targetB = Math.round(sumB / strongNeighborCount);
      const mixRatio = alpha < 96 ? 0.95 : alpha < 160 ? 0.82 : 0.7;

      const rgbOffset = pixelIndex * 3;
      nextRgb[rgbOffset] = Math.round(data[offset] * (1 - mixRatio) + targetR * mixRatio);
      nextRgb[rgbOffset + 1] = Math.round(
        data[offset + 1] * (1 - mixRatio) + targetG * mixRatio,
      );
      nextRgb[rgbOffset + 2] = Math.round(
        data[offset + 2] * (1 - mixRatio) + targetB * mixRatio,
      );
    }
  }

  for (let i = 0; i < total; i += 1) {
    const offset = i * 4;
    const rgbOffset = i * 3;
    data[offset] = nextRgb[rgbOffset];
    data[offset + 1] = nextRgb[rgbOffset + 1];
    data[offset + 2] = nextRgb[rgbOffset + 2];
  }
}

function removeInteriorDarkSpeckles(data: Buffer, width: number, height: number) {
  const total = width * height;
  const nextRgb = new Uint8Array(total * 3);

  for (let i = 0; i < total; i += 1) {
    const offset = i * 4;
    nextRgb[i * 3] = data[offset];
    nextRgb[i * 3 + 1] = data[offset + 1];
    nextRgb[i * 3 + 2] = data[offset + 2];
  }

  const luminance = (r: number, g: number, b: number) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const pixelIndex = y * width + x;
      const offset = pixelIndex * 4;
      const alpha = data[offset + 3];
      if (alpha < 220) {
        continue;
      }

      const centerLum = luminance(data[offset], data[offset + 1], data[offset + 2]);
      if (centerLum > 46) {
        continue;
      }

      let opaqueNeighbors = 0;
      let brightNeighbors = 0;
      let sumR = 0;
      let sumG = 0;
      let sumB = 0;
      let sumLum = 0;

      for (let ny = y - 1; ny <= y + 1; ny += 1) {
        for (let nx = x - 1; nx <= x + 1; nx += 1) {
          if (nx === x && ny === y) {
            continue;
          }

          const neighborIndex = (ny * width + nx) * 4;
          const neighborAlpha = data[neighborIndex + 3];
          if (neighborAlpha < 220) {
            continue;
          }

          const nr = data[neighborIndex];
          const ng = data[neighborIndex + 1];
          const nb = data[neighborIndex + 2];
          const nLum = luminance(nr, ng, nb);

          opaqueNeighbors += 1;
          if (nLum > 82) {
            brightNeighbors += 1;
          }
          sumR += nr;
          sumG += ng;
          sumB += nb;
          sumLum += nLum;
        }
      }

      if (opaqueNeighbors < 6 || brightNeighbors < 5) {
        continue;
      }

      const avgLum = sumLum / opaqueNeighbors;
      if (avgLum - centerLum < 38) {
        continue;
      }

      const rgbOffset = pixelIndex * 3;
      nextRgb[rgbOffset] = Math.round(sumR / opaqueNeighbors);
      nextRgb[rgbOffset + 1] = Math.round(sumG / opaqueNeighbors);
      nextRgb[rgbOffset + 2] = Math.round(sumB / opaqueNeighbors);
    }
  }

  for (let i = 0; i < total; i += 1) {
    const offset = i * 4;
    const rgbOffset = i * 3;
    data[offset] = nextRgb[rgbOffset];
    data[offset + 1] = nextRgb[rgbOffset + 1];
    data[offset + 2] = nextRgb[rgbOffset + 2];
  }
}

function healTinyTransparentPinholes(data: Buffer, width: number, height: number) {
  const total = width * height;
  const nextAlpha = new Uint8Array(total);
  const nextRgb = new Uint8Array(total * 3);

  for (let i = 0; i < total; i += 1) {
    const offset = i * 4;
    nextAlpha[i] = data[offset + 3];
    nextRgb[i * 3] = data[offset];
    nextRgb[i * 3 + 1] = data[offset + 1];
    nextRgb[i * 3 + 2] = data[offset + 2];
  }

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const pixelIndex = y * width + x;
      const offset = pixelIndex * 4;
      if (data[offset + 3] > 8) {
        continue;
      }

      let opaqueNeighbors = 0;
      let sumR = 0;
      let sumG = 0;
      let sumB = 0;
      let sumA = 0;

      for (let ny = y - 1; ny <= y + 1; ny += 1) {
        for (let nx = x - 1; nx <= x + 1; nx += 1) {
          if (nx === x && ny === y) {
            continue;
          }
          const neighborIndex = (ny * width + nx) * 4;
          const neighborAlpha = data[neighborIndex + 3];
          if (neighborAlpha < 200) {
            continue;
          }

          opaqueNeighbors += 1;
          sumR += data[neighborIndex];
          sumG += data[neighborIndex + 1];
          sumB += data[neighborIndex + 2];
          sumA += neighborAlpha;
        }
      }

      if (opaqueNeighbors < 7) {
        continue;
      }

      nextAlpha[pixelIndex] = Math.round(sumA / opaqueNeighbors);
      const rgbOffset = pixelIndex * 3;
      nextRgb[rgbOffset] = Math.round(sumR / opaqueNeighbors);
      nextRgb[rgbOffset + 1] = Math.round(sumG / opaqueNeighbors);
      nextRgb[rgbOffset + 2] = Math.round(sumB / opaqueNeighbors);
    }
  }

  for (let i = 0; i < total; i += 1) {
    const offset = i * 4;
    data[offset] = nextRgb[i * 3];
    data[offset + 1] = nextRgb[i * 3 + 1];
    data[offset + 2] = nextRgb[i * 3 + 2];
    data[offset + 3] = nextAlpha[i];
  }
}

function removeDominantCenterPanel(data: Buffer, width: number, height: number) {
  const histogram = new Map<number, { count: number; sumR: number; sumG: number; sumB: number }>();
  const centerTop = Math.floor(height * 0.16);
  const centerBottom = Math.floor(height * 0.88);
  const centerLeft = Math.floor(width * 0.12);
  const centerRight = Math.floor(width * 0.88);

  for (let y = centerTop; y < centerBottom; y += 1) {
    for (let x = centerLeft; x < centerRight; x += 1) {
      const index = (y * width + x) * 4;
      if (data[index + 3] <= 24) {
        continue;
      }
      const key = ((data[index] >> 4) << 8) | ((data[index + 1] >> 4) << 4) | (data[index + 2] >> 4);
      const entry = histogram.get(key);
      if (entry) {
        entry.count += 1;
        entry.sumR += data[index];
        entry.sumG += data[index + 1];
        entry.sumB += data[index + 2];
      } else {
        histogram.set(key, {
          count: 1,
          sumR: data[index],
          sumG: data[index + 1],
          sumB: data[index + 2],
        });
      }
    }
  }

  let dominant:
    | {
        count: number;
        sumR: number;
        sumG: number;
        sumB: number;
      }
    | undefined;
  for (const entry of histogram.values()) {
    if (!dominant || entry.count > dominant.count) {
      dominant = entry;
    }
  }

  if (!dominant || dominant.count < width * height * 0.035) {
    return 0;
  }

  const target = {
    r: Math.round(dominant.sumR / dominant.count),
    g: Math.round(dominant.sumG / dominant.count),
    b: Math.round(dominant.sumB / dominant.count),
  };

  let removed = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      if (data[index + 3] <= 24) {
        continue;
      }

      const dist = colorDistanceSquared(data[index], data[index + 1], data[index + 2], target);
      if (dist > 38 * 38) {
        continue;
      }

      const rightIndex = x < width - 1 ? index + 4 : index;
      const downIndex = y < height - 1 ? index + width * 4 : index;
      const rightDiff = colorDistanceSquared(
        data[index],
        data[index + 1],
        data[index + 2],
        {
          r: data[rightIndex],
          g: data[rightIndex + 1],
          b: data[rightIndex + 2],
        },
      );
      const downDiff = colorDistanceSquared(
        data[index],
        data[index + 1],
        data[index + 2],
        {
          r: data[downIndex],
          g: data[downIndex + 1],
          b: data[downIndex + 2],
        },
      );

      if (rightDiff > 18 * 18 || downDiff > 18 * 18) {
        continue;
      }

      data[index + 3] = 0;
      removed += 1;
    }
  }

  return removed;
}

async function cleanupPanelAndBottomText(pngBuffer: Buffer, aggressive = false) {
  const { data, info } = await sharp(pngBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const working = Buffer.from(data);
  const width = info.width;
  const height = info.height;

  removeDominantCenterPanel(working, width, height);
  removeBottomDetachedTextLikeComponents(working, width, height);
  keepPrimaryCharacterComponent(working, width, height);
  healTinyTransparentPinholes(working, width, height);
  removeInteriorDarkSpeckles(working, width, height);
  defringeEdgeColors(working, width, height);
  if (aggressive) {
    hardenTransparentEdges(working, width, height);
    defringeEdgeColors(working, width, height);
  }

  return sharp(working, {
    raw: {
      width,
      height,
      channels: 4,
    },
  })
    .png()
    .toBuffer();
}

export async function POST(request: Request) {
  const gemini = createGeminiClient();

  if (!gemini) {
    return NextResponse.json(
      {
        message: "GEMINI_API_KEY가 설정되지 않았습니다.",
      },
      { status: 500 },
    );
  }

  const body = (await request.json()) as ImageRequestPayload;
  const styleGuideLine = `Style lock for every output: ${professorSpriteStylePreset.join(", ")}. Reference fusion lock: ${professorReferenceFusionGuide}.`;

  const detailedPrompt = [
    "Create a single full-body 2D game character sprite of a Korean university professor.",
    "Visual novel style, polished illustration, standing pose, full body visible from head to shoes.",
    styleGuideLine,
    "Use a pure white studio background (#FFFFFF) that is flat and uniform.",
    "Character only. No panel, no backdrop card, no shape behind the character.",
    "The background must be pure white only. No texture, no gradient, no shadow, and no floor.",
    "No background objects, no desk, no classroom, no text, no caption, no subtitle, no logo, no watermark, no speech bubble.",
    "Show only one professor character and keep the silhouette clean for easy in-game visual novel use.",
    "The entire head, hair, shoulders, hands, legs, and shoes must be fully inside the frame.",
    "Leave generous empty space around the character, especially above the head and below the shoes.",
    "Do not crop the top of the head. Do not crop the feet. Do not zoom in.",
    "Compose the character smaller within the canvas so the full-body sprite fits comfortably.",
    `Professor identity reference: ${body.professorName}. Do not write this name as text in image.`,
    `Persona summary: ${body.professorSummary}`,
    `Visual guidance: ${body.illustrationPrompt}`,
  ].join(" ");
  const fallbackPrompt = [
    "Create one full-body 2D visual novel professor character sprite.",
    "Standing pose, single character only, clean silhouette.",
    styleGuideLine,
    "Background must be plain pure white (#FFFFFF) only.",
    "Follow the persona and visual guidance for appearance and personality.",
    `Persona summary: ${body.professorSummary}`,
    `Visual guidance: ${body.illustrationPrompt}`,
    "No panel, no backdrop card, no shape behind character.",
    "Flat plain background with no objects and no text/caption/logo/watermark.",
    "Do not write any letters or symbols in the image.",
  ].join(" ");
  const promptCandidates = [detailedPrompt, fallbackPrompt];

  try {
    let imagePart: { data: string; mimeType: string } | null = null;
    let promptUsed = detailedPrompt;
    const failedAttempts: string[] = [];
    const noisyAttempts: string[] = [];

    for (const [attemptIndex, candidatePrompt] of promptCandidates.entries()) {
      const response = await gemini.models.generateContent({
        model: getGeminiImageModel(),
        contents: candidatePrompt,
        config: {
          responseModalities: ["IMAGE"],
          imageConfig: {
            aspectRatio: "3:4",
          },
        },
      });

      imagePart = extractFirstInlineData(response);
      if (imagePart) {
        const inputBuffer = Buffer.from(imagePart.data, "base64");
        let outputBuffer = await removeFlatBackgroundToTransparent(inputBuffer);
        outputBuffer = await removePaletteBackgroundToTransparent(outputBuffer, false);
        outputBuffer = await cleanupPanelAndBottomText(outputBuffer, false);
        let quality = await measureSpriteQuality(outputBuffer);

        if (quality.edgeOpaqueRatio > 0.1 || quality.cornerOpaqueRatio > 0.2) {
          outputBuffer = await removePaletteBackgroundToTransparent(outputBuffer, true);
          outputBuffer = await cleanupPanelAndBottomText(outputBuffer, true);
          quality = await measureSpriteQuality(outputBuffer);
        }

        if (
          quality.centerOpaqueRatio > 0.86 ||
          quality.opaqueRatio > 0.5 ||
          quality.edgeOpaqueRatio > 0.12
        ) {
          outputBuffer = await cleanupPanelAndBottomText(outputBuffer, true);
          quality = await measureSpriteQuality(outputBuffer);
        }

        if (isNoisySprite(quality)) {
          noisyAttempts.push(
            `${attemptIndex + 1}:opaque=${quality.opaqueRatio.toFixed(2)},bottom=${quality.bottomOpaqueRatio.toFixed(2)},center=${quality.centerOpaqueRatio.toFixed(2)},edge=${quality.edgeOpaqueRatio.toFixed(2)},corner=${quality.cornerOpaqueRatio.toFixed(2)},mainArea=${quality.mainAreaRatio.toFixed(2)},mainW=${quality.mainWidthRatio.toFixed(2)},mainH=${quality.mainHeightRatio.toFixed(2)}`,
          );
          imagePart = null;
          continue;
        }

        const outputBase64 = outputBuffer.toString("base64");
        promptUsed = candidatePrompt;
        return NextResponse.json({
          imageDataUrl: `data:image/png;base64,${outputBase64}`,
          promptUsed,
        });
      }

      const finishReason =
        typeof (response as { candidates?: Array<{ finishReason?: unknown }> }).candidates?.[0]
          ?.finishReason === "string"
          ? ((response as { candidates?: Array<{ finishReason?: string }> }).candidates?.[0]
              ?.finishReason ?? "UNKNOWN")
          : "UNKNOWN";
      const responseText = extractTextFromGeminiResponse(response);
      failedAttempts.push(
        `${attemptIndex + 1}:${finishReason}${responseText ? `:${responseText.slice(0, 80)}` : ""}`,
      );
    }

    if (!imagePart) {
      return NextResponse.json(
        {
          message: `이미지 생성 재시도 실패. (missing: ${failedAttempts.join(" | ") || "none"}, noisy: ${noisyAttempts.join(" | ") || "none"})`,
        },
        { status: 500 },
      );
    }
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "이미지 생성 중 알 수 없는 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}
