/* Canvas drawing for AR Labs face modes. Landmarks are normalised MediaPipe face points (478). */
export type FP = { x: number; y: number };
export type Conn = { start: number; end: number }[];
export const FILTERS = [
  "Glasses",
  "Crown",
  "Dog ears",
  "Heart shades",
  "Flower crown",
  "Starlight",
] as const;
export type FilterName = (typeof FILTERS)[number];

function frame(l: FP[], w: number, h: number) {
  const px = (i: number) => ({ x: l[i]!.x * w, y: l[i]!.y * h });
  const le = px(33),
    re = px(263);
  const angle = Math.atan2(re.y - le.y, re.x - le.x);
  const fw = Math.hypot(px(454).x - px(234).x, px(454).y - px(234).y);
  return { px, le, re, angle, fw };
}

export function drawFilter(ctx: CanvasRenderingContext2D, l: FP[], filter: FilterName) {
  const { width: w, height: h } = ctx.canvas;
  const { px, le, re, angle, fw } = frame(l, w, h);
  ctx.save();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  if (filter === "Glasses") {
    const c = { x: (le.x + re.x) / 2, y: (le.y + re.y) / 2 };
    const eyeGap = Math.hypot(re.x - le.x, re.y - le.y);
    const r = eyeGap * 0.38;
    ctx.translate(c.x, c.y);
    ctx.rotate(angle);
    ctx.lineWidth = Math.max(4, fw * 0.035);
    ctx.strokeStyle = "#252321";
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(s * eyeGap * 0.42, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(214,90,122,0.35)";
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(s * eyeGap * 0.42 - r * 0.3, -r * 0.3, r * 0.22, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(s * (eyeGap * 0.42 + r), 0);
      ctx.lineTo(s * fw * 0.52, -r * 0.2);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(-eyeGap * 0.42 + r, -r * 0.1);
    ctx.quadraticCurveTo(0, -r * 0.5, eyeGap * 0.42 - r, -r * 0.1);
    ctx.stroke();
  } else if (filter === "Heart shades") {
    const c = { x: (le.x + re.x) / 2, y: (le.y + re.y) / 2 };
    const gap = Math.hypot(re.x - le.x, re.y - le.y);
    ctx.translate(c.x, c.y);
    ctx.rotate(angle);
    const r = gap * 0.4;
    for (const s of [-1, 1]) {
      const x = s * gap * 0.43;
      ctx.beginPath();
      ctx.moveTo(x, r * 0.8);
      ctx.bezierCurveTo(x - r * 1.6, -r * 0.15, x - r * 0.9, -r * 1.15, x, -r * 0.5);
      ctx.bezierCurveTo(x + r * 0.9, -r * 1.15, x + r * 1.6, -r * 0.15, x, r * 0.8);
      ctx.closePath();
      ctx.fillStyle = "rgba(214,90,122,0.6)";
      ctx.fill();
      ctx.strokeStyle = "#F4F1EC";
      ctx.lineWidth = Math.max(3, fw * 0.02);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + s * r, -r * 0.15);
      ctx.lineTo(s * fw * 0.53, -r * 0.2);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(-gap * 0.43 + r, -r * 0.2);
    ctx.quadraticCurveTo(0, -r * 0.55, gap * 0.43 - r, -r * 0.2);
    ctx.stroke();
  } else if (filter === "Starlight") {
    const top = px(10),
      nose = px(4);
    const star = (x: number, y: number, r: number) => {
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5,
          rad = i % 2 ? r * 0.45 : r;
        const X = x + Math.cos(a) * rad,
          Y = y + Math.sin(a) * rad;
        if (i) ctx.lineTo(X, Y);
        else ctx.moveTo(X, Y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    };
    ctx.translate(top.x, top.y);
    ctx.rotate(angle);
    ctx.fillStyle = "#E8B84A";
    ctx.strokeStyle = "#F4F1EC";
    ctx.lineWidth = Math.max(2, fw * 0.012);
    star(0, -fw * 0.25, fw * 0.14);
    for (const s of [-1, 1]) {
      star(s * fw * 0.34, -fw * 0.12, fw * 0.075);
      star(s * fw * 0.22, fw * 0.19, fw * 0.035);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.translate(nose.x, nose.y);
    ctx.rotate(angle);
    ctx.strokeStyle = "#E8B84A";
    ctx.lineWidth = Math.max(2, fw * 0.012);
    ctx.beginPath();
    ctx.arc(0, 0, fw * 0.12, -0.3, Math.PI + 0.3);
    ctx.stroke();
  } else {
    const top = px(10);
    ctx.translate(top.x, top.y);
    ctx.rotate(angle);
    if (filter === "Crown") {
      const cw = fw * 0.75,
        ch = fw * 0.42,
        y0 = -fw * 0.05;
      ctx.beginPath();
      ctx.moveTo(-cw / 2, y0);
      const pts = [
        [-0.5, -1],
        [-0.25, -0.5],
        [0, -1.15],
        [0.25, -0.5],
        [0.5, -1],
      ] as const;
      for (const [x, y] of pts) ctx.lineTo(x * cw, y0 + y * ch);
      ctx.lineTo(cw / 2, y0);
      ctx.closePath();
      ctx.fillStyle = "#E8B84A";
      ctx.strokeStyle = "#8A6420";
      ctx.lineWidth = Math.max(3, fw * 0.02);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#D65A7A";
      for (const [x, y] of [
        [-0.5, -1],
        [0, -1.15],
        [0.5, -1],
      ] as const) {
        ctx.beginPath();
        ctx.arc(x * cw, y0 + y * ch, fw * 0.04, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#8C6BB1";
      ctx.beginPath();
      ctx.arc(0, y0 - ch * 0.3, fw * 0.05, 0, Math.PI * 2);
      ctx.fill();
    } else if (filter === "Flower crown") {
      const petals = ["#D65A7A", "#8C6BB1", "#E8B84A", "#D65A7A", "#8C6BB1"];
      ctx.strokeStyle = "#517563";
      ctx.lineWidth = Math.max(3, fw * 0.015);
      ctx.beginPath();
      ctx.moveTo(-fw * 0.46, -fw * 0.02);
      ctx.quadraticCurveTo(0, -fw * 0.38, fw * 0.46, -fw * 0.02);
      ctx.stroke();
      for (let i = 0; i < 5; i++) {
        const x = (i - 2) * fw * 0.2,
          y = -fw * (0.17 + (2 - Math.abs(i - 2)) * 0.065),
          r = fw * (i === 2 ? 0.09 : 0.07);
        ctx.fillStyle = petals[i]!;
        for (let j = 0; j < 6; j++) {
          const a = (j * Math.PI) / 3;
          ctx.beginPath();
          ctx.ellipse(
            x + Math.cos(a) * r,
            y + Math.sin(a) * r,
            r * 0.67,
            r * 0.43,
            a,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }
        ctx.fillStyle = "#E8B84A";
        ctx.beginPath();
        ctx.arc(x, y, r * 0.45, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      for (const s of [-1, 1]) {
        ctx.save();
        ctx.translate(s * fw * 0.38, -fw * 0.12);
        ctx.rotate(s * 0.35);
        ctx.beginPath();
        ctx.ellipse(0, -fw * 0.12, fw * 0.14, fw * 0.28, 0, 0, Math.PI * 2);
        ctx.fillStyle = "#7A4E2D";
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(0, -fw * 0.1, fw * 0.08, fw * 0.19, 0, 0, Math.PI * 2);
        ctx.fillStyle = "#D99A8B";
        ctx.fill();
        ctx.restore();
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const nose = px(4);
      ctx.translate(nose.x, nose.y);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.ellipse(0, 0, fw * 0.09, fw * 0.06, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#252321";
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(-fw * 0.03, -fw * 0.02, fw * 0.025, fw * 0.015, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.fill();
    }
  }
  ctx.restore();
}

export type DoodleSets = {
  oval: Conn;
  leftEye: Conn;
  rightEye: Conn;
  leftBrow: Conn;
  rightBrow: Conn;
  lips: Conn;
  leftIris: Conn;
  rightIris: Conn;
};
const NOSE = [168, 6, 197, 195, 5, 4];
const NOSE_BASE = [98, 97, 2, 326, 327];

export function drawDoodle(
  ctx: CanvasRenderingContext2D,
  l: FP[] | undefined,
  sets: DoodleSets,
  t: number,
) {
  const { width: w, height: h } = ctx.canvas;
  ctx.save();
  ctx.fillStyle = "#F4F1EC";
  ctx.fillRect(0, 0, w, h);
  // Ruled sketchbook paper, sparse registration marks and a hand-drawn frame.
  ctx.strokeStyle = "rgba(140,107,177,0.11)";
  ctx.lineWidth = 1;
  for (let y = 40; y < h; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(214,90,122,0.22)";
  ctx.beginPath();
  ctx.moveTo(w * 0.09, 0);
  ctx.lineTo(w * 0.09, h);
  ctx.stroke();
  ctx.strokeStyle = "rgba(37,35,33,0.32)";
  ctx.lineWidth = 2;
  ctx.strokeRect(18, 18, w - 36, h - 36);
  if (!l) {
    ctx.restore();
    return;
  }
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  // small per-frame wobble gives a hand-sketched feel
  const j = (i: number, k: number) => Math.sin(t * 0.012 + i * 1.7 + k) * 1.4;
  const P = (i: number, k = 0) => ({ x: l[i]!.x * w + j(i, k), y: l[i]!.y * h + j(i, k + 3) });
  const stroke = (c: Conn, color: string, width: number, passes = 2) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    for (let p = 0; p < passes; p++) {
      ctx.beginPath();
      for (const { start, end } of c) {
        const a = P(start, p),
          b = P(end, p);
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
      }
      ctx.stroke();
    }
  };
  const path = (idx: number[], color: string, width: number) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    idx.forEach((i, n) => {
      const p = P(i);
      if (n) ctx.lineTo(p.x, p.y);
      else ctx.moveTo(p.x, p.y);
    });
    ctx.stroke();
  };
  // A soft cut-paper silhouette under the lively ink contours.
  const ovalIds = [
    10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152,
    148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109,
  ];
  ctx.beginPath();
  ovalIds.forEach((i, n) => {
    const p = P(i);
    if (n) ctx.lineTo(p.x, p.y);
    else ctx.moveTo(p.x, p.y);
  });
  ctx.closePath();
  ctx.fillStyle = "#E9E5DF";
  ctx.fill();
  ctx.strokeStyle = "rgba(140,107,177,0.45)";
  ctx.lineWidth = 12;
  ctx.stroke();
  // Scribbled cheeks follow the cheek landmarks as expressions change.
  ctx.fillStyle = "rgba(214,90,122,0.22)";
  const faceWidth = Math.hypot(P(234).x - P(454).x, P(234).y - P(454).y);
  for (const i of [50, 280]) {
    const p = P(i);
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, faceWidth * 0.095, faceWidth * 0.055, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  stroke(sets.oval, "#252321", 4);
  ctx.setLineDash([3, 9]);
  stroke(sets.oval, "#8C6BB1", 1.5, 1);
  ctx.setLineDash([]);
  stroke(sets.leftBrow, "#252321", 6, 1);
  stroke(sets.rightBrow, "#252321", 6, 1);
  stroke(sets.leftEye, "#252321", 3);
  stroke(sets.rightEye, "#252321", 3);
  for (const iris of [sets.leftIris, sets.rightIris]) {
    if (!iris.length) continue;
    const ids = [...new Set(iris.flatMap((c) => [c.start, c.end]))];
    const cx = ids.reduce((s, i) => s + P(i).x, 0) / ids.length,
      cy = ids.reduce((s, i) => s + P(i).y, 0) / ids.length;
    ctx.fillStyle = "#252321";
    ctx.beginPath();
    ctx.arc(cx, cy, w * 0.008, 0, Math.PI * 2);
    ctx.fill();
  }
  path(NOSE, "#68635E", 3);
  path(NOSE_BASE, "#252321", 3);
  stroke(sets.lips, "#D65A7A", 4);
  // Responsive highlights and tiny hand-drawn accents around the face.
  for (const i of [50, 280]) {
    const p = P(i);
    ctx.strokeStyle = "#D65A7A";
    ctx.lineWidth = 2;
    for (let n = 0; n < 3; n++) {
      ctx.beginPath();
      ctx.moveTo(p.x - faceWidth * 0.04 + n * faceWidth * 0.025, p.y + faceWidth * 0.065);
      ctx.lineTo(p.x - faceWidth * 0.025 + n * faceWidth * 0.025, p.y + faceWidth * 0.045);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/* Emotion reading from MediaPipe face blendshapes (52 named scores, 0–1). */
export const EMOTIONS = ["Happy", "Surprised", "Sad", "Angry", "Neutral"] as const;
export type Emotion = (typeof EMOTIONS)[number];
export function readEmotion(
  cats: { categoryName: string; score: number }[],
): Record<Emotion, number> {
  const s = (n: string) => cats.find((c) => c.categoryName === n)?.score ?? 0;
  const avg = (...n: string[]) => n.reduce((a, k) => a + s(k), 0) / n.length;
  const happy = Math.min(
    1,
    avg("mouthSmileLeft", "mouthSmileRight") * 1.2 +
      avg("cheekSquintLeft", "cheekSquintRight") * 0.3,
  );
  const surprised = Math.min(
    1,
    avg("browInnerUp", "browOuterUpLeft", "browOuterUpRight") * 0.6 +
      s("jawOpen") * 0.6 +
      avg("eyeWideLeft", "eyeWideRight") * 0.4,
  );
  const sad = Math.min(
    1,
    avg("mouthFrownLeft", "mouthFrownRight") * 1.4 +
      s("browInnerUp") * 0.4 * (1 - s("jawOpen")) +
      avg("mouthPressLeft", "mouthPressRight") * 0.2,
  );
  const angry = Math.min(
    1,
    avg("browDownLeft", "browDownRight") * 1.3 +
      avg("noseSneerLeft", "noseSneerRight") * 0.6 +
      avg("eyeSquintLeft", "eyeSquintRight") * 0.2,
  );
  const neutral = Math.max(0, 1 - Math.max(happy, surprised, sad, angry) * 1.6);
  return { Happy: happy, Surprised: surprised, Sad: sad, Angry: angry, Neutral: neutral };
}
export const EMOJI: Record<Emotion, string> = {
  Happy: "😄",
  Surprised: "😮",
  Sad: "😢",
  Angry: "😠",
  Neutral: "😐",
};
export function topEmotion(e: Record<Emotion, number>): Emotion {
  return EMOTIONS.reduce((a, b) => (e[b] > e[a] ? b : a), "Neutral" as Emotion);
}
/* Draws a tracking box + expression cue over the face. Canvas is mirrored by CSS, so text is flipped back. */
export function drawEmotion(ctx: CanvasRenderingContext2D, l: FP[], label: Emotion, conf: number) {
  const { width: w, height: h } = ctx.canvas;
  let x0 = 1,
    y0 = 1,
    x1 = 0,
    y1 = 0;
  for (const p of l) {
    x0 = Math.min(x0, p.x);
    y0 = Math.min(y0, p.y);
    x1 = Math.max(x1, p.x);
    y1 = Math.max(y1, p.y);
  }
  const X = x0 * w,
    Y = y0 * h,
    W = (x1 - x0) * w,
    H = (y1 - y0) * h;
  ctx.save();
  ctx.strokeStyle = "#D65A7A";
  ctx.lineWidth = 4;
  ctx.setLineDash([14, 10]);
  ctx.strokeRect(X, Y, W, H);
  ctx.setLineDash([]);
  ctx.fillStyle = "#D65A7A";
  for (const i of [33, 263, 1, 61, 291, 105, 334]) {
    ctx.beginPath();
    ctx.arc(l[i]!.x * w, l[i]!.y * h, 5, 0, 7);
    ctx.fill();
  }
  const text = `${EMOJI[label]} Looks ${label.toLowerCase()}`;
  ctx.font = `600 ${Math.max(18, Math.min(30, W * 0.085))}px Manrope, sans-serif`;
  const tw = ctx.measureText(text).width;
  const cx = Math.max(tw / 2 + 18, Math.min(w - tw / 2 - 18, X + W / 2));
  const cy = Y > 68 ? Y - 15 : Math.min(h - 15, Y + H + 50);
  ctx.translate(cx, cy);
  ctx.scale(-1, 1);
  ctx.fillStyle = "rgba(244,241,236,0.95)";
  ctx.fillRect(-tw / 2 - 12, -32, tw + 24, 42);
  ctx.fillStyle = "#252321";
  ctx.textAlign = "center";
  ctx.fillText(text, 0, 0);
  ctx.restore();
}
