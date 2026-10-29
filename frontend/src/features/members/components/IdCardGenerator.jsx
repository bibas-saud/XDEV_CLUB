import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Download, Expand, IdCard, Loader2, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { initials } from "@/utils/format";
import { displayRole, roleLabel } from "@/utils/roleLabels";
import logoWhiteUrl from "@/assets/large-white-image.png";
import { withPhotoBust } from "@/features/members/photoBust";

const W = 750;
const FACE_H = 1260;
const NAVY = "#203864";
const INK = "#111111";
const GRAY = "#71717a";

function loadImage(src) {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function poly(ctx, points) {
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
  ctx.closePath();
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function setLetterSpacing(ctx, px) {
  try {
    ctx.letterSpacing = `${px}px`;
  } catch {
    /* unsupported browsers keep default spacing */
  }
}

/**
 * Crisp white wordmark drawn straight onto the black band (transparent bg,
 * no chip). Falls back to the drawn X mark if the image fails to load.
 */
async function drawLogo(ctx, cx, centerY, scale = 1) {
  const logo = await loadImage(logoWhiteUrl);
  if (!logo) {
    // fallback: red X + wordmark text
    ctx.save();
    const pad = 14 * scale;
    const bx = cx - 160 * scale;
    const by = centerY - 36 * scale;
    ctx.strokeStyle = "#dc2626";
    ctx.lineWidth = 7 * scale;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(bx + pad, by + pad);
    ctx.lineTo(bx + 64 * scale, by + 72 * scale - pad);
    ctx.moveTo(bx + 64 * scale, by + pad);
    ctx.lineTo(bx + pad, by + 72 * scale - pad);
    ctx.stroke();
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#ffffff";
    ctx.font = `800 ${30 * scale}px Inter, Arial, sans-serif`;
    ctx.fillText("XDEV CLUB", bx + 82 * scale, by + 36 * scale);
    ctx.restore();
    return;
  }

  // target height ~76% of band height (about 1.2x base size); keep native aspect
  const targetH = 76 * scale;
  const fit = targetH / logo.height;
  const dw = logo.width * fit;
  ctx.drawImage(logo, cx - dw / 2, centerY - targetH / 2, dw, targetH);
}

function fitText(ctx, text, maxWidth, basePx, minPx, fontTpl) {
  let size = basePx;
  ctx.font = fontTpl.replace("{s}", String(size));
  while (ctx.measureText(text).width > maxWidth && size > minPx) {
    size -= 1;
    ctx.font = fontTpl.replace("{s}", String(size));
  }
  return size;
}

/** "Aug 2026 - Present" for active members, "Aug 2026 - Nov 2026" for past */
function membershipPeriod(member) {
  const opts = { month: "short", year: "numeric" };
  if (!member.joined_at) return "-";
  const start = new Date(member.joined_at).toLocaleDateString("en-US", opts);
  if (!member.is_active && member.left_at) {
    const end = new Date(member.left_at).toLocaleDateString("en-US", opts);
    return `${start} - ${end}`;
  }
  return `${start} - Present`;
}

async function renderFront(ctx, member, photoImg) {
  ctx.save();

  // base
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, FACE_H);

  // black angled header + thin red brand stripe along its edge
  ctx.fillStyle = "#09090b";
  poly(ctx, [
    [0, 0],
    [W, 0],
    [W, 320],
    [0, 500],
  ]);
  ctx.fill();
  ctx.fillStyle = "#dc2626";
  poly(ctx, [
    [0, 500],
    [W, 320],
    [W, 344],
    [0, 524],
  ]);
  ctx.fill();

  // logo in the black header
  await drawLogo(ctx, 375, 148, 1);

  // gray diagonal bands behind the photo
  ctx.fillStyle = "#e3e3e9";
  poly(ctx, [
    [-40, 590],
    [W + 40, 350],
    [W + 40, 430],
    [-40, 670],
  ]);
  ctx.fill();
  ctx.fillStyle = "#c9c9d3";
  poly(ctx, [
    [-40, 718],
    [340, 610],
    [340, 646],
    [-40, 754],
  ]);
  ctx.fill();
  poly(ctx, [
    [520, 342],
    [W + 40, 264],
    [W + 40, 296],
    [520, 374],
  ]);
  ctx.fill();

  // circular photo pulled up into the header - no dead zone above it
  const cx = 375;
  const cy = 515;
  const r = 240;

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.18)";
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 10;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.restore();

  ctx.beginPath();
  ctx.arc(cx, cy, r + 14, 0, Math.PI * 2);
  ctx.strokeStyle = "#d4d4da";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r - 12, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = "#f4f4f5";
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  if (photoImg) {
    const scale = Math.max((r * 2) / photoImg.width, (r * 2) / photoImg.height);
    const dw = photoImg.width * scale;
    const dh = photoImg.height * scale;
    ctx.drawImage(photoImg, cx - dw / 2, cy - dh / 2, dw, dh);
  } else {
    ctx.fillStyle = "#18181b";
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    ctx.fillStyle = "#dc2626";
    ctx.font = "800 118px Inter, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(initials(member.full_name) || "?", cx, cy);
  }
  ctx.restore();

  // name
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  const nameText = member.full_name.toUpperCase();
  fitText(ctx, nameText, 620, 64, 44, "{s}px Inter, Arial, sans-serif");
  setLetterSpacing(ctx, 1);
  ctx.fillStyle = INK;
  ctx.fillText(nameText, 375, 838);
  setLetterSpacing(ctx, 0);

  // small red divider under the name
  ctx.fillStyle = "#dc2626";
  roundRectPath(ctx, 375 - 32, 862, 64, 6, 3);
  ctx.fill();
  // active members: role / alumni: ALUMNI with [Ex Role] beneath in small
  ctx.textAlign = "center";
  if (member.is_active) {
    const roleText = roleLabel(member.role).toUpperCase();
    ctx.font = "700 31px Inter, Arial, sans-serif";
    setLetterSpacing(ctx, 5);
    ctx.fillStyle = NAVY;
    ctx.fillText(roleText, 375, 920);
    setLetterSpacing(ctx, 0);
  } else {
    ctx.font = "700 31px Inter, Arial, sans-serif";
    setLetterSpacing(ctx, 5);
    ctx.fillStyle = NAVY;
    ctx.fillText("ALUMNI", 375, 914);
    setLetterSpacing(ctx, 0);
    ctx.font = "600 21px Inter, Arial, sans-serif";
    setLetterSpacing(ctx, 1);
    ctx.fillStyle = GRAY;
    ctx.fillText(`[${displayRole(member.role, false)}]`, 375, 946);
    setLetterSpacing(ctx, 0);
  }

  // details panel - wider, so nothing overflows; email gets the biggest value text
  const panelX = 60;
  const panelW = W - panelX * 2;
  const panelY = 976;
  const rowH = 54;
  const labelX = panelX + 34;
  const valueX = panelX + 290;
  const valueMaxW = panelX + panelW - 36 - valueX;
  const rows = [
    ["MEMBER ID", String(member.id).slice(0, 8).toUpperCase(), "600 {s}px 'JetBrains Mono', monospace", 25, 20, "#18181b"],
    ["EMAIL ADDRESS", member.email, "500 {s}px Inter, Arial, sans-serif", 33, 27, "#18181b"],
    ["MEMBER SINCE", membershipPeriod(member), "500 {s}px Inter, Arial, sans-serif", 27, 22, "#3f3f46"],
  ];
  ctx.fillStyle = "#f7f7fa";
  roundRectPath(ctx, panelX, panelY, panelW, 186, 24);
  ctx.fill();
  ctx.strokeStyle = "#ececf1";
  ctx.lineWidth = 2;
  roundRectPath(ctx, panelX, panelY, panelW, 186, 24);
  ctx.stroke();

  let rowY = panelY + 52;
  for (const [label, value, fontTpl, basePx, minPx, color] of rows) {
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.font = "600 26px Inter, Arial, sans-serif";
    ctx.fillStyle = "#52525b";
    setLetterSpacing(ctx, 1);
    ctx.fillText(label, labelX, rowY);
    setLetterSpacing(ctx, 0);

    fitText(ctx, value, valueMaxW, basePx, minPx, fontTpl);
    ctx.fillStyle = color;
    ctx.fillText(value, valueX, rowY);
    rowY += rowH;
  }

  // face border
  ctx.strokeStyle = "#ececf1";
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, W - 2, FACE_H - 2);
  ctx.restore();
}

async function renderBack(ctx, member, qrDataUrl) {
  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, FACE_H);

  // mirrored black band with logo + red edge stripe
  ctx.fillStyle = "#09090b";
  poly(ctx, [
    [0, 130],
    [W, 40],
    [W, 250],
    [0, 340],
  ]);
  ctx.fill();
  ctx.fillStyle = "#dc2626";
  poly(ctx, [
    [0, 130],
    [W, 40],
    [W, 64],
    [0, 154],
  ]);
  ctx.fill();
  await drawLogo(ctx, 375, 186, 0.92);

  // QR tile
  const tileSize = 430;
  const tx = 375 - tileSize / 2;
  const ty = 440;
  ctx.fillStyle = "#ffffff";
  roundRectPath(ctx, tx, ty, tileSize, tileSize, 28);
  ctx.shadowColor = "rgba(0,0,0,0.10)";
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 6;
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.strokeStyle = "#e4e4ea";
  ctx.lineWidth = 2;
  roundRectPath(ctx, tx, ty, tileSize, tileSize, 28);
  ctx.stroke();

  if (qrDataUrl) {
    const qr = await loadImage(qrDataUrl);
    if (qr) {
      ctx.drawImage(qr, tx + 26, ty + 26, tileSize - 52, tileSize - 52);
    }
  }

  // captions
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.font = "700 31px Inter, Arial, sans-serif";
  setLetterSpacing(ctx, 4);
  ctx.fillStyle = NAVY;
  ctx.fillText("SCAN TO VIEW PROFILE", 375, ty + tileSize + 88);
  setLetterSpacing(ctx, 0);
  ctx.font = "500 21px 'JetBrains Mono', monospace";
  ctx.fillStyle = GRAY;
  ctx.fillText(
    `${window.location.host}/m/${String(member.id).slice(0, 8).toUpperCase()}`,
    375,
    ty + tileSize + 130
  );

  // property badge (outlined pill)
  const propText = "Property of XDEV Club - if found, please return.";
  const pw = Math.min(560, W - 120);
  const ph = 54;
  const px = 375 - pw / 2;
  const py = 1070;
  ctx.strokeStyle = "#d4d4da";
  ctx.lineWidth = 2;
  roundRectPath(ctx, px, py, pw, ph, ph / 2);
  ctx.stroke();
  ctx.fillStyle = "#52525b";
  ctx.textBaseline = "middle";
  fitText(ctx, propText, pw - 48, 23, 19, "{s}px Inter, Arial, sans-serif");
  ctx.fillText(propText, 375, py + ph / 2 + 1);

  // face border
  ctx.strokeStyle = "#ececf1";
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, W - 2, FACE_H - 2);
  ctx.restore();
}

function createFaceCanvas() {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = FACE_H;
  return canvas;
}

function FacePreview({ label, src, onClick }) {
  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={onClick}
        disabled={!src}
        title="Click to view full size"
        className="lift group relative overflow-hidden rounded-lg border bg-muted cursor-pointer"
      >
        {src ? (
          <img src={src} alt={`${label} side of ID card`} className="mx-auto block w-full max-w-[230px]" />
        ) : (
          <div className="flex aspect-[750/1260] items-center justify-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        )}
        <span className="absolute left-2 top-2 rounded-md bg-zinc-950/85 px-2 py-0.5 text-[10px] font-bold tracking-wider text-white">
          {label}
        </span>
        {src && (
          <span className="absolute inset-0 hidden items-center justify-center bg-black/45 group-hover:flex">
            <Expand className="size-7 text-primary-foreground" />
          </span>
        )}
      </button>
    </div>
  );
}

export function IdCardGenerator({ member }) {
  const [previewFront, setPreviewFront] = useState(null);
  const [previewBack, setPreviewBack] = useState(null);
  const [generating, setGenerating] = useState(false);
  const facesRef = useRef({ front: null, back: null });

  const generate = useCallback(async () => {
    setGenerating(true);
    try {
      if (document.fonts?.ready) await document.fonts.ready;

      const profileUrl = `${window.location.origin}/m/${member.id}`;
      const qrDataUrl = await QRCode.toDataURL(profileUrl, {
        margin: 0,
        width: 720,
        color: { dark: "#09090b", light: "#ffffff" },
        errorCorrectionLevel: "M",
      });
      const photoImg = await loadImage(withPhotoBust(member));

      const frontCanvas = createFaceCanvas();
      await renderFront(frontCanvas.getContext("2d"), member, photoImg);
      const backCanvas = createFaceCanvas();
      await renderBack(backCanvas.getContext("2d"), member, qrDataUrl);

      facesRef.current = { front: frontCanvas, back: backCanvas };
      setPreviewFront(frontCanvas.toDataURL("image/png"));
      setPreviewBack(backCanvas.toDataURL("image/png"));
    } catch {
      toast.error("Could not render the ID card.");
    } finally {
      setGenerating(false);
    }
  }, [member]);

  useEffect(() => {
    generate();
  }, [generate]);

  function openFullSize(face) {
    const canvas = facesRef.current[face];
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    }, "image/png");
  }

  function handleDownload() {
    const { front, back } = facesRef.current;
    if (!front || !back) return;

    const combined = document.createElement("canvas");
    combined.width = W;
    combined.height = FACE_H * 2 + 24; // small gap between faces
    const ctx = combined.getContext("2d");
    ctx.fillStyle = "#f4f4f5";
    ctx.fillRect(0, 0, combined.width, combined.height);
    ctx.drawImage(front, 0, 0);
    ctx.drawImage(back, 0, FACE_H + 24);

    combined.toBlob((blob) => {
      if (!blob) {
        toast.error("Download failed. Please try again.");
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${member.full_name.replace(/\s+/g, "-").toLowerCase()}-xdev-id-card.png`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("ID card downloaded.");
    }, "image/png");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <IdCard className="size-4 text-muted-foreground" /> Club ID Card
        </CardTitle>
        <CardDescription>
            Front with member details, back with a QR code that opens their public profile.
          card to view full size.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FacePreview label="FRONT" src={previewFront} onClick={() => openFullSize("front")} />
          <FacePreview label="BACK" src={previewBack} onClick={() => openFullSize("back")} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={handleDownload} disabled={generating || !previewFront}>
            <Download /> Download PNG
          </Button>
          <Button size="sm" variant="outline" onClick={generate} disabled={generating}>
            {generating ? <Loader2 className="animate-spin" /> : <RefreshCcw />}
            Regenerate
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Rendered entirely in your browser - nothing is uploaded. Only admins can see or download it.
          it.
        </p>
      </CardContent>
    </Card>
  );
}
