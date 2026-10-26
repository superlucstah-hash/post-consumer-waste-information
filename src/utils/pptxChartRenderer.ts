import { CountryPCWIDataset, FacilityEntity } from '../types';

function createHiDpiCanvas(
  width: number,
  height: number,
  scale = 2.5
): {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
} {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext('2d')!;
  ctx.scale(scale, scale);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  return { canvas, ctx, width, height };
}

function fmtSpace(val: number | undefined | null): string {
  if (val === undefined || val === null || Number.isNaN(val)) return '0';
  return Math.round(val)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function fmtComma(val: number | undefined | null): string {
  if (val === undefined || val === null || Number.isNaN(val)) return '0';
  return Math.round(val).toLocaleString('en-US');
}

interface PieSliceInput {
  label: string;
  subLabel: string;
  value: number;
  color: string;
}

function drawCalloutPieChart(
  title: string,
  slices: PieSliceInput[],
  canvasW = 560,
  canvasH = 400,
  pieRadius = 102
): string {
  const { canvas, ctx, width, height } = createHiDpiCanvas(canvasW, canvasH, 2.5);

  // Title matching PowerPoint chart style
  ctx.fillStyle = '#334452';
  ctx.font = '500 22px "Segoe UI", "Inter", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(title, width / 2, 16);

  const cx = width / 2;
  const cy = height / 2 + 18;
  const total = slices.reduce((acc, s) => acc + Math.max(0, s.value), 0) || 1;

  let currentAngle = -Math.PI / 2;
  const computedSlices = slices.map((s) => {
    const val = Math.max(0, s.value);
    const sweep = (val / total) * Math.PI * 2;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sweep;
    const midAngle = startAngle + sweep / 2;
    currentAngle = endAngle;
    return {
      ...s,
      startAngle,
      endAngle,
      midAngle,
      sweep
    };
  });

  // Draw pie wedges with white dividers
  computedSlices.forEach((s) => {
    if (s.sweep <= 0.0005) return;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, pieRadius, s.startAngle, s.endAngle);
    ctx.closePath();
    ctx.fillStyle = s.color;
    ctx.fill();
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
  });

  interface CalloutItem {
    slice: (typeof computedSlices)[number];
    anchorX: number;
    anchorY: number;
    kneeX: number;
    kneeY: number;
    isRight: boolean;
  }

  const rightItems: CalloutItem[] = [];
  const leftItems: CalloutItem[] = [];

  computedSlices.forEach((s) => {
    const cos = Math.cos(s.midAngle);
    const sin = Math.sin(s.midAngle);
    const isRight = cos >= -0.01;
    const anchorX = cx + cos * pieRadius;
    const anchorY = cy + sin * pieRadius;
    const kneeX = cx + cos * (pieRadius + 18);
    const kneeY = cy + sin * (pieRadius + 18);
    const item: CalloutItem = {
      slice: s,
      anchorX,
      anchorY,
      kneeX,
      kneeY,
      isRight
    };
    if (isRight) rightItems.push(item);
    else leftItems.push(item);
  });

  const relaxVerticalPositions = (items: CalloutItem[], minGap = 30) => {
    items.sort((a, b) => a.kneeY - b.kneeY);
    for (let i = 1; i < items.length; i++) {
      if (items[i].kneeY - items[i - 1].kneeY < minGap) {
        items[i].kneeY = items[i - 1].kneeY + minGap;
      }
    }
    const maxBottom = height - 24;
    if (items.length > 0 && items[items.length - 1].kneeY > maxBottom) {
      items[items.length - 1].kneeY = maxBottom;
      for (let i = items.length - 2; i >= 0; i--) {
        if (items[i + 1].kneeY - items[i].kneeY < minGap) {
          items[i].kneeY = items[i + 1].kneeY - minGap;
        }
      }
    }
  };

  relaxVerticalPositions(rightItems, 30);
  relaxVerticalPositions(leftItems, 30);

  const drawCallout = (item: CalloutItem) => {
    const { anchorX, anchorY, kneeX, kneeY, isRight, slice } = item;
    const horizEndX = isRight
      ? Math.max(kneeX + 10, cx + pieRadius * 0.52)
      : Math.min(kneeX - 10, cx - pieRadius * 0.52);

    ctx.beginPath();
    ctx.moveTo(anchorX, anchorY);
    ctx.lineTo(kneeX, kneeY);
    ctx.lineTo(horizEndX, kneeY);
    ctx.strokeStyle = '#b6bdc4';
    ctx.lineWidth = 1.3;
    ctx.stroke();

    ctx.fillStyle = '#334452';
    ctx.font = '400 12.5px "Segoe UI", "Inter", Arial, sans-serif';
    ctx.textAlign = isRight ? 'left' : 'right';
    ctx.textBaseline = 'middle';
    const textX = isRight ? horizEndX + 6 : horizEndX - 6;

    if (slice.label && slice.subLabel) {
      ctx.fillText(slice.label, textX, kneeY - 7);
      ctx.fillText(slice.subLabel, textX, kneeY + 8);
    } else {
      ctx.fillText(slice.label || slice.subLabel, textX, kneeY);
    }
  };

  rightItems.forEach(drawCallout);
  leftItems.forEach(drawCallout);

  return canvas.toDataURL('image/png');
}

/**
 * Slide 6 — Chart 1: "Waste type" Pie Chart (matches image11.png in PowerPoint)
 */
export function renderWasteTypePieChart(dataset: CountryPCWIDataset): string {
  const postPct = Math.round(dataset.recoTrace.postConsumerSharePct);
  const prePct = Math.max(0, 100 - postPct);
  return drawCalloutPieChart(
    'Waste type',
    [
      {
        label: 'post-c',
        subLabel: `${postPct}%`,
        value: postPct,
        color: '#4c9bb4'
      },
      {
        label: 'pre-c',
        subLabel: `${prePct}%`,
        value: prePct,
        color: '#5eb591'
      }
    ],
    460,
    330,
    92
  );
}

/**
 * Slide 6 — Chart 2: "End application" Pie Chart (matches image12.png in PowerPoint)
 */
export function renderEndApplicationPieChart(dataset: CountryPCWIDataset): string {
  const palette = ['#4c9bb4', '#5eb591', '#95c962', '#d3bf59', '#df8538', '#ad70a8'];
  const apps = dataset.recoTrace.endApplicationBreakdown;
  const slices: PieSliceInput[] = apps.map((app, idx) => ({
    label: app.tonnes === 0 ? '' : app.label,
    subLabel: `${fmtSpace(app.tonnes)} t (${app.pct}%)`,
    value: Math.max(0.15, app.tonnes),
    color: palette[idx % palette.length]
  }));
  return drawCalloutPieChart('End application', slices, 540, 360, 94);
}

/**
 * Slide 6 — Chart 3: "Waste origin" Pie Chart (matches image13.png in PowerPoint)
 */
export function renderWasteOriginPieChart(dataset: CountryPCWIDataset): string {
  const palette = [
    '#4c9bb4',
    '#5eb591',
    '#95c962',
    '#d3bf59',
    '#df8538',
    '#dc5b35',
    '#ad70a8',
    '#4c9bb4',
    '#95c962',
    '#d3bf59',
    '#df8538',
    '#ad70a8'
  ];
  const origins = dataset.recoTrace.wasteOriginBreakdown;
  const slices: PieSliceInput[] = origins.map((o, idx) => ({
    label: o.label,
    subLabel: `${o.pct}%`,
    value: Math.max(0.5, o.pct),
    color: palette[idx % palette.length]
  }));
  return drawCalloutPieChart('Waste origin', slices, 660, 430, 108);
}

/**
 * Slide 11 — Vertical Column Bar Chart: "Types of PVC Post-Consumer Waste in <Country>" (matches image15.png)
 */
export function renderGenerationColumnChart(dataset: CountryPCWIDataset): string {
  const streams = dataset.card1.q1_2_streams.map((s) => ({
    label: `${s.wasteType} (${s.pvcType})`,
    value: s.quantityTonnes,
    isRigid: s.pvcType === 'Rigid PVC'
  }));

  const bars = [
    ...streams,
    {
      label: 'Total Rigid',
      value: dataset.card1.totalRigidGenerated,
      isRigid: true
    },
    {
      label: 'Total Flexible',
      value: dataset.card1.totalFlexibleGenerated,
      isRigid: false
    }
  ];

  return drawMatplotlibVerticalBarChart({
    title: `Types of PVC Post-Consumer Waste in ${dataset.countryName}`,
    yAxisLabel: 'Quantity (t/year)',
    unitSuffix: 't/year',
    bars,
    canvasW: 1180,
    canvasH: 580,
    bottomMargin: 215,
    labelAngleDeg: -60
  });
}

/**
 * Slide 12 — Vertical Column Bar Chart: "Post-Consumer PVC Waste Collected" (matches image16.png)
 */
export function renderCollectionColumnChart(dataset: CountryPCWIDataset): string {
  const streams = dataset.card2.q2_4_collectedStreams.map((s) => ({
    label: s.wasteType,
    value: s.quantityTonnes,
    isRigid: s.pvcType === 'Rigid PVC'
  }));

  const bars = [
    ...streams,
    {
      label: 'Total Rigid',
      value: dataset.card2.totalRigidCollected,
      isRigid: true
    },
    {
      label: 'Total Flexible',
      value: dataset.card2.totalFlexibleCollected,
      isRigid: false
    }
  ];

  return drawMatplotlibVerticalBarChart({
    title: 'Post-Consumer PVC Waste Collected',
    yAxisLabel: 'Quantity (t/a)',
    unitSuffix: 't/a',
    bars,
    canvasW: 920,
    canvasH: 560,
    bottomMargin: 165,
    labelAngleDeg: -32
  });
}

function drawMatplotlibVerticalBarChart(opts: {
  title: string;
  yAxisLabel: string;
  unitSuffix: string;
  bars: { label: string; value: number; isRigid: boolean }[];
  canvasW: number;
  canvasH: number;
  bottomMargin: number;
  labelAngleDeg: number;
}): string {
  const { title, yAxisLabel, unitSuffix, bars, canvasW, canvasH, bottomMargin, labelAngleDeg } =
    opts;
  const { canvas, ctx, width, height } = createHiDpiCanvas(canvasW, canvasH, 2.5);

  const leftMargin = 105;
  const rightMargin = 28;
  const topMargin = 52;
  const plotW = width - leftMargin - rightMargin;
  const plotH = height - topMargin - bottomMargin;

  // Title
  ctx.fillStyle = '#262626';
  ctx.font = '500 25px "Segoe UI", "Inter", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(title, leftMargin + plotW / 2, 12);

  // Nice Y scale
  const maxVal = Math.max(...bars.map((b) => b.value), 100);
  const yMax = maxVal * 1.12;
  const rawStep = maxVal / 4;
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const norm = rawStep / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag;

  ctx.font = '400 15px "Segoe UI", "Inter", Arial, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  for (let tick = 0; tick <= yMax; tick += step) {
    const y = topMargin + plotH - (tick / yMax) * plotH;
    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(leftMargin, y);
    ctx.lineTo(leftMargin + plotW, y);
    ctx.stroke();
    ctx.restore();

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(leftMargin, y);
    ctx.lineTo(leftMargin + 5, y);
    ctx.stroke();

    ctx.fillStyle = '#111111';
    ctx.fillText(Math.round(tick).toString(), leftMargin - 8, y);
  }

  // Y-axis rotated label
  ctx.save();
  ctx.translate(22, topMargin + plotH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = '#111111';
  ctx.font = '400 18px "Segoe UI", "Inter", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(yAxisLabel, 0, 0);
  ctx.restore();

  const n = Math.max(1, bars.length);
  const slotW = plotW / n;
  const barW = Math.min(72, slotW * 0.74);

  bars.forEach((b, idx) => {
    const centerX = leftMargin + slotW * (idx + 0.5);
    const barX = centerX - barW / 2;
    const barH = Math.max(1.5, (b.value / yMax) * plotH);
    const barY = topMargin + plotH - barH;

    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(centerX, topMargin);
    ctx.lineTo(centerX, topMargin + plotH);
    ctx.stroke();
    ctx.restore();

    // Exact matplotlib bar colors from PPTX: blue #1f77b4 for Rigid, orange #ff7f0e for Flexible
    ctx.fillStyle = b.isRigid ? '#1f77b4' : '#ff7f0e';
    ctx.fillRect(barX, barY, barW, barH);

    // Value label on top of bar
    ctx.fillStyle = '#262626';
    ctx.font =
      bars.length > 10
        ? '400 11px "Segoe UI", Arial, sans-serif'
        : '400 13.5px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`${fmtComma(b.value)} ${unitSuffix}`, centerX, barY - 4);

    // X-axis tick mark
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(centerX, topMargin + plotH);
    ctx.lineTo(centerX, topMargin + plotH - 5);
    ctx.stroke();

    // Rotated X-axis label
    ctx.save();
    ctx.translate(centerX + 3, topMargin + plotH + 8);
    ctx.rotate((labelAngleDeg * Math.PI) / 180);
    ctx.fillStyle = '#111111';
    ctx.font =
      bars.length > 10
        ? '400 13.5px "Segoe UI", Arial, sans-serif'
        : '400 15.5px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    const cleanLabel = b.label.length > 36 ? b.label.slice(0, 34) + '…' : b.label;
    ctx.fillText(cleanLabel, 0, 0);
    ctx.restore();
  });

  // Left and bottom axis spines
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(leftMargin, topMargin);
  ctx.lineTo(leftMargin, topMargin + plotH);
  ctx.lineTo(leftMargin + plotW, topMargin + plotH);
  ctx.stroke();

  return canvas.toDataURL('image/png');
}

/**
 * Slide 10 — End-to-End Value Chain Mass Flow Diagram (matches image14.png in PowerPoint)
 */
export function renderValueChainMassFlowDiagram(dataset: CountryPCWIDataset): string {
  const { canvas, ctx } = createHiDpiCanvas(1620, 750, 2.2);

  const drawRoundedBox = (
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
    fill: string,
    stroke: string,
    lineWidth = 1.5
  ) => {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  };

  const drawBlockArrowH = (
    x1: number,
    y: number,
    x2: number,
    shaftH: number,
    headW: number,
    headH: number,
    fill: string,
    stroke: string
  ) => {
    const xHeadStart = x2 - headW;
    ctx.beginPath();
    ctx.moveTo(x1, y - shaftH / 2);
    ctx.lineTo(xHeadStart, y - shaftH / 2);
    ctx.lineTo(xHeadStart, y - headH / 2);
    ctx.lineTo(x2, y);
    ctx.lineTo(xHeadStart, y + headH / 2);
    ctx.lineTo(xHeadStart, y + shaftH / 2);
    ctx.lineTo(x1, y + shaftH / 2);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  };

  const drawBlockArrowV = (
    x: number,
    y1: number,
    y2: number,
    shaftW: number,
    headW: number,
    headH: number,
    fill: string,
    stroke: string
  ) => {
    const yHeadStart = y2 - headH;
    ctx.beginPath();
    ctx.moveTo(x - shaftW / 2, y1);
    ctx.lineTo(x + shaftW / 2, y1);
    ctx.lineTo(x + shaftW / 2, yHeadStart);
    ctx.lineTo(x + headW / 2, yHeadStart);
    ctx.lineTo(x, y2);
    ctx.lineTo(x - headW / 2, yHeadStart);
    ctx.lineTo(x - shaftW / 2, yHeadStart);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  };

  const drawStageCardWithPill = (opts: {
    x: number;
    y: number;
    w: number;
    h: number;
    boxFill: string;
    boxStroke: string;
    titleColor: string;
    titleLine1: string;
    titleLine2: string;
    pillFill: string;
    pillStroke: string;
    pillTonnes: number;
    pillW?: number;
    pillH?: number;
    sections: { heading: string; items: string[] }[];
  }) => {
    const {
      x,
      y,
      w,
      h,
      boxFill,
      boxStroke,
      titleColor,
      titleLine1,
      titleLine2,
      pillFill,
      pillStroke,
      pillTonnes,
      pillW = 82,
      pillH = 132,
      sections
    } = opts;

    drawRoundedBox(x, y, w, h, 14, boxFill, boxStroke, 1.5);

    const pillX = x + w - pillW * 0.55;
    const pillY = y - 34;
    drawRoundedBox(pillX, pillY, pillW, pillH, 10, pillFill, pillStroke, 1.4);

    ctx.fillStyle = '#000000';
    ctx.font = '700 13.5px "Segoe UI", "Inter", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(fmtSpace(pillTonnes), pillX + pillW / 2, pillY + pillH / 2 - 8);
    ctx.fillText('tonnes', pillX + pillW / 2, pillY + pillH / 2 + 10);

    ctx.fillStyle = titleColor;
    ctx.font = '700 12.5px "Segoe UI", "Inter", Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText(titleLine1, pillX - 10, y + 12);
    ctx.fillText(titleLine2, pillX - 10, y + 28);

    let curY = y + 48;
    const lineStep = 13.2;
    sections.forEach((sec) => {
      if (curY > y + h - 14) return;
      ctx.fillStyle = '#000000';
      ctx.font = '700 11px "Segoe UI", "Inter", Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(sec.heading, x + 12, curY);
      curY += lineStep;

      ctx.font = 'italic 400 10.5px "Segoe UI", "Inter", Arial, sans-serif';
      sec.items.forEach((item) => {
        if (curY > y + h - 10) return;
        ctx.fillText(item, x + 28, curY);
        curY += lineStep;
      });
      curY += 5;
    });
  };

  // --- 1. GENERATED BOX ---
  const genRigidItems = dataset.card1.q1_2_streams
    .filter((s) => s.pvcType === 'Rigid PVC')
    .map((s) => `${s.wasteType} --> ${fmtSpace(s.pptxDiagramTonnes ?? s.quantityTonnes)} t`);
  const genFlexItems = dataset.card1.q1_2_streams
    .filter((s) => s.pvcType === 'Flexible PVC')
    .map((s) => `${s.wasteType} --> ${fmtSpace(s.pptxDiagramTonnes ?? s.quantityTonnes)} t`);

  drawStageCardWithPill({
    x: 22,
    y: 132,
    w: 342,
    h: 288,
    boxFill: '#d8effc',
    boxStroke: '#3898db',
    titleColor: '#006eb6',
    titleLine1: 'POSTCONSUMER PVC WASTE',
    titleLine2: 'GENERATED',
    pillFill: '#1488cc',
    pillStroke: '#0e6ba8',
    pillTonnes: dataset.card1.totalGenerated,
    pillW: 86,
    pillH: 150,
    sections: [
      {
        heading: `RIGID - ${fmtSpace(dataset.card1.totalRigidGenerated)} t`,
        items: genRigidItems
      },
      {
        heading: `FLEXIBLE - ${fmtSpace(dataset.card1.totalFlexibleGenerated)} t`,
        items: genFlexItems
      }
    ]
  });

  // Arrow 1 -> 2
  drawBlockArrowH(366, 272, 448, 16, 14, 30, '#e5edcf', '#eab308');

  // --- 2. COLLECTED BOX ---
  const colRigidItems = dataset.card2.q2_4_collectedStreams
    .filter((s) => s.pvcType === 'Rigid PVC')
    .map((s) => `${s.wasteType} --> ${fmtSpace(s.quantityTonnes)} t`);
  const colFlexItems = dataset.card2.q2_4_collectedStreams
    .filter((s) => s.pvcType === 'Flexible PVC')
    .map((s) => `${s.wasteType} --> ${fmtSpace(s.quantityTonnes)} t`);

  drawStageCardWithPill({
    x: 450,
    y: 162,
    w: 285,
    h: 232,
    boxFill: '#fcebd4',
    boxStroke: '#f5b000',
    titleColor: '#92400e',
    titleLine1: 'POSTCONSUMER PVC WASTE',
    titleLine2: 'COLLECTED',
    pillFill: '#f5b000',
    pillStroke: '#d97706',
    pillTonnes: dataset.card2.totalCollected,
    pillW: 74,
    pillH: 128,
    sections: [
      {
        heading: `RIGID - ${fmtSpace(dataset.card2.totalRigidCollected)} t`,
        items: colRigidItems
      },
      {
        heading: `FLEXIBLE - ${fmtSpace(dataset.card2.totalFlexibleCollected)} t`,
        items: colFlexItems
      }
    ]
  });

  // Arrow 2 -> 3
  drawBlockArrowH(736, 272, 818, 16, 14, 30, '#f3dec9', '#9333ea');

  // --- 3. PROCESSED BOX ---
  const procRigid = dataset.card3.q3_10_massBalance.filter((m) => m.pvcType === 'Rigid PVC');
  const procFlex = dataset.card3.q3_10_massBalance.filter((m) => m.pvcType === 'Flexible PVC');
  const procOther = dataset.card3.q3_10_massBalance.filter(
    (m) => m.pvcType === 'Both' || m.pvcType === 'Unknown'
  );
  const sumProcRigid = procRigid.reduce((a, b) => a + (b.totalQuantityTonnes || 0), 0);
  const sumProcFlex = procFlex.reduce((a, b) => a + (b.totalQuantityTonnes || 0), 0);
  const sumProcOther = procOther.reduce((a, b) => a + (b.totalQuantityTonnes || 0), 0);

  drawStageCardWithPill({
    x: 820,
    y: 154,
    w: 285,
    h: 232,
    boxFill: '#ebd5fc',
    boxStroke: '#a855f7',
    titleColor: '#3b0764',
    titleLine1: 'POSTCONSUMER PVC WASTE',
    titleLine2: 'PROCESSED',
    pillFill: '#d18cf8',
    pillStroke: '#9333ea',
    pillTonnes: dataset.card3.totalSortedProcessed,
    pillW: 74,
    pillH: 128,
    sections: [
      {
        heading: `RIGID - ${fmtSpace(sumProcRigid)} t`,
        items: procRigid.map((m) => `${m.wasteType} --> ${fmtSpace(m.totalQuantityTonnes)} t`)
      },
      {
        heading: `FLEXIBLE - ${fmtSpace(sumProcFlex)} t`,
        items: procFlex.map((m) => `${m.wasteType} --> ${fmtSpace(m.totalQuantityTonnes)} t`)
      },
      ...(sumProcOther > 0
        ? [
            {
              heading: `OTHER - ${fmtSpace(sumProcOther)} t`,
              items: []
            }
          ]
        : [])
    ]
  });

  // Arrow 3 -> 4
  drawBlockArrowH(1106, 272, 1185, 16, 14, 30, '#bbf7d0', '#15803d');

  // --- 4. RECYCLED BOX ---
  const recTechs = dataset.card4.q4_6_recyclingByTech;
  const recRigid = recTechs.filter((r) => r.pvcType === 'Rigid PVC');
  const recFlex = recTechs.filter((r) => r.pvcType === 'Flexible PVC');
  const recBoth = recTechs.filter((r) => r.pvcType === 'Both');

  drawStageCardWithPill({
    x: 1187,
    y: 154,
    w: 288,
    h: 232,
    boxFill: '#d8eed5',
    boxStroke: '#65b741',
    titleColor: '#1e3a8a',
    titleLine1: 'POSTCONSUMER PVC WASTE',
    titleLine2: 'RECYCLED',
    pillFill: '#7ac143',
    pillStroke: '#4d7c0f',
    pillTonnes: dataset.card4.totalRecycledOutput,
    pillW: 74,
    pillH: 128,
    sections: [
      {
        heading: `RIGID - ${fmtSpace(dataset.card4.totalRigidRecycled)} t`,
        items: recRigid.map((r) => `${r.wasteType} --> ${fmtSpace(r.inputOrOutputTonnes)} t`)
      },
      {
        heading: `FLEXIBLE - ${fmtSpace(dataset.card4.totalFlexibleRecycled)} t`,
        items: recFlex.map((r) => `${r.wasteType} --> ${fmtSpace(r.inputOrOutputTonnes)} t`)
      },
      ...(dataset.card4.totalMixedRecycled > 0
        ? [
            {
              heading: `BOTH - ${fmtSpace(dataset.card4.totalMixedRecycled)} t`,
              items: recBoth.map((r) => `${r.wasteType} --> ${fmtSpace(r.inputOrOutputTonnes)} t`)
            }
          ]
        : [])
    ]
  });

  // --- LOWER NODES BELOW COLLECTED & PROCESSED ---
  const exportsList = dataset.card2.q2_6_exports.filter((e) => (e.totalQuantityTonnes || 0) > 0);
  const exp1 = exportsList[1] || {
    destinationCountries: 'France',
    pvcType: 'Flexible PVC',
    wasteType: 'Advertising',
    totalQuantityTonnes: 99
  };
  const exp2 = exportsList[0] || {
    destinationCountries: 'Morocco, UK, Algeria, Turkey',
    pvcType: 'Flexible PVC',
    wasteType: 'Cables',
    totalQuantityTonnes: 11594
  };

  // Downward arrow to Export Circle 1
  drawBlockArrowV(522, 394, 462, 13, 24, 10, '#f5e1ce', '#d8b4fe');
  ctx.beginPath();
  ctx.arc(522, 522, 58, 0, Math.PI * 2);
  ctx.fillStyle = '#e9cef9';
  ctx.fill();
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = '#c084fc';
  ctx.stroke();
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';
  ctx.font = '700 11px "Segoe UI", Arial, sans-serif';
  ctx.fillText('Processing', 522, 494);
  ctx.fillText(`Export to ${exp1.destinationCountries.slice(0, 14)}`, 522, 508);
  ctx.fillText('FLEXIBLE', 522, 523);
  ctx.font = '400 10px "Segoe UI", Arial, sans-serif';
  ctx.fillText(exp1.wasteType.slice(0, 18), 522, 537);
  ctx.fillText(`${fmtSpace(exp1.totalQuantityTonnes)} t`, 522, 550);

  // Downward arrow to Export Circle 2
  drawBlockArrowV(672, 394, 462, 13, 24, 10, '#f5e1ce', '#d8b4fe');
  ctx.beginPath();
  ctx.arc(672, 526, 63, 0, Math.PI * 2);
  ctx.fillStyle = '#e9cef9';
  ctx.fill();
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = '#c084fc';
  ctx.stroke();
  ctx.fillStyle = '#000000';
  ctx.font = '700 11px "Segoe UI", Arial, sans-serif';
  ctx.fillText('Processing', 672, 492);
  ctx.fillText(`Export to ${exp2.destinationCountries.slice(0, 14)}`, 672, 506);
  if (exp2.destinationCountries.length > 14) {
    ctx.fillText(exp2.destinationCountries.slice(14, 32), 672, 519);
  }
  ctx.fillText('FLEXIBLE', 672, 533);
  ctx.font = '400 10px "Segoe UI", Arial, sans-serif';
  ctx.fillText(exp2.wasteType.slice(0, 18), 672, 547);
  ctx.fillText(`${fmtSpace(exp2.totalQuantityTonnes)} t`, 672, 560);

  // Long yellow arrow to Incineration Circle
  drawBlockArrowV(596, 394, 584, 13, 24, 10, '#fef08a', '#facc15');
  ctx.beginPath();
  ctx.arc(596, 656, 74, 0, Math.PI * 2);
  ctx.fillStyle = '#ffff00';
  ctx.fill();
  ctx.lineWidth = 1.3;
  ctx.strokeStyle = '#eab308';
  ctx.stroke();
  ctx.fillStyle = '#000000';
  ctx.font = '700 12px "Segoe UI", Arial, sans-serif';
  ctx.fillText('Incineration', 596, 612);
  ctx.fillText(`${fmtSpace(dataset.card5.totalIncineratedTonnes)} t`, 596, 628);
  ctx.font = '400 10.5px "Segoe UI", Arial, sans-serif';
  const incStreams = dataset.card5.q5_5_incineratedStreams.slice(0, 2);
  let incY = 645;
  incStreams.forEach((s) => {
    ctx.fillText(s.wasteType.slice(0, 22), 596, incY);
    ctx.fillText(`${fmtSpace(s.inputOrOutputTonnes)} t`, 596, incY + 13);
    incY += 28;
  });

  // Bent arrow from Collected + vertical arrow from Processed to Landfilling Circle
  ctx.beginPath();
  ctx.moveTo(720, 394);
  ctx.lineTo(732, 394);
  ctx.lineTo(732, 452);
  ctx.lineTo(786, 484);
  ctx.lineTo(778, 496);
  ctx.lineTo(720, 460);
  ctx.closePath();
  ctx.fillStyle = '#fde6d8';
  ctx.fill();
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 1.3;
  ctx.stroke();

  drawBlockArrowV(864, 386, 450, 14, 26, 10, '#f3d1f4', '#dc2626');

  ctx.beginPath();
  ctx.arc(870, 536, 86, 0, Math.PI * 2);
  ctx.fillStyle = '#f8d3cf';
  ctx.fill();
  ctx.lineWidth = 1.3;
  ctx.strokeStyle = '#dc2626';
  ctx.stroke();
  ctx.fillStyle = '#000000';
  ctx.font = '700 12.5px "Segoe UI", Arial, sans-serif';
  ctx.fillText('Landfilling', 870, 482);
  ctx.fillText(`${fmtSpace(dataset.card6.q6_4_totalLandfilledEstimateTonnes)} t`, 870, 498);
  ctx.font = '700 10px "Segoe UI", Arial, sans-serif';
  ctx.fillText('FLEXIBLE', 870, 520);
  ctx.font = '400 10px "Segoe UI", Arial, sans-serif';
  ctx.fillText('Cables', 870, 533);
  ctx.fillText(
    `${fmtSpace(dataset.card3.q3_10_massBalance[0]?.landfillingTonnes || 15000)} t`,
    870,
    546
  );
  ctx.font = '700 10px "Segoe UI", Arial, sans-serif';
  ctx.fillText('OTHER', 870, 568);
  ctx.font = '400 10px "Segoe UI", Arial, sans-serif';
  ctx.fillText(
    `${fmtSpace(dataset.card3.q3_10_massBalance[3]?.landfillingTonnes || 3000)} t`,
    870,
    581
  );

  // --- 5. CONVERTER rPVC UPTAKE BOX BELOW RECYCLED ---
  drawBlockArrowV(1330, 386, 458, 15, 28, 12, '#cffafe', '#06b6d4');

  const upRigid = dataset.card4.q4_11_uptake.filter((u) => u.pvcType === 'Rigid PVC');
  const upFlex = dataset.card4.q4_11_uptake.filter((u) => u.pvcType === 'Flexible PVC');
  const sumUpRigid = upRigid.reduce((a, b) => a + b.totalQuantityTonnes, 0);
  const sumUpFlex = upFlex.reduce((a, b) => a + b.totalQuantityTonnes, 0);

  drawStageCardWithPill({
    x: 1187,
    y: 462,
    w: 288,
    h: 234,
    boxFill: '#bef8fc',
    boxStroke: '#22d3ee',
    titleColor: '#1e1b4b',
    titleLine1: 'POSTCONSUMER rPVC UPTAKE',
    titleLine2: '',
    pillFill: '#2ef0ff',
    pillStroke: '#06b6d4',
    pillTonnes: dataset.card4.totalUptakeTonnes,
    pillW: 74,
    pillH: 128,
    sections: [
      {
        heading: `RIGID - ${fmtSpace(sumUpRigid)} t`,
        items: upRigid.flatMap((u) => [
          `${u.wasteType} --> ${fmtSpace(u.totalQuantityTonnes)} t`,
          ...u.products.map(
            (p) =>
              `   ${p.product} --> ${typeof p.tonnes === 'number' ? `${fmtSpace(p.tonnes)} t` : p.tonnes}`
          )
        ])
      },
      {
        heading: `FLEXIBLE - ${fmtSpace(sumUpFlex)} t`,
        items: upFlex.flatMap((u) => [
          `${u.wasteType} --> ${fmtSpace(u.totalQuantityTonnes)} t`,
          ...u.products.map(
            (p) =>
              `   ${p.product} --> ${typeof p.tonnes === 'number' ? `${fmtSpace(p.tonnes)} t` : p.tonnes}`
          )
        ])
      }
    ]
  });

  return canvas.toDataURL('image/png');
}

const COUNTRY_POLYGONS: Record<string, [number, number][][]> = {
  IT: [
    [
      [6.65, 45.12],
      [6.85, 45.78],
      [7.58, 45.95],
      [8.42, 46.42],
      [9.25, 46.48],
      [10.45, 46.85],
      [11.45, 46.98],
      [12.22, 47.08],
      [12.48, 46.68],
      [13.72, 46.52],
      [13.82, 45.65],
      [13.15, 45.68],
      [12.32, 45.42],
      [12.28, 44.45],
      [12.82, 43.92],
      [13.62, 43.55],
      [13.95, 42.85],
      [14.22, 42.42],
      [14.78, 42.08],
      [15.62, 41.92],
      [16.18, 41.88],
      [15.88, 41.52],
      [16.88, 41.15],
      [17.95, 40.65],
      [18.52, 40.15],
      [18.35, 39.82],
      [17.98, 40.12],
      [17.22, 40.48],
      [16.82, 40.15],
      [16.55, 39.48],
      [17.15, 39.05],
      [16.58, 38.75],
      [16.12, 37.95],
      [15.65, 38.02],
      [15.82, 38.55],
      [16.18, 38.92],
      [15.75, 39.95],
      [15.25, 40.02],
      [14.95, 40.42],
      [14.32, 40.62],
      [13.85, 41.02],
      [12.95, 41.25],
      [12.22, 41.75],
      [11.52, 42.32],
      [11.12, 42.65],
      [10.52, 43.02],
      [10.28, 43.75],
      [9.82, 44.12],
      [9.22, 44.35],
      [8.48, 44.32],
      [7.55, 43.78],
      [7.48, 44.25],
      [7.02, 44.32],
      [6.65, 45.12]
    ],
    [
      [12.42, 37.82],
      [13.38, 38.18],
      [14.52, 38.05],
      [15.62, 38.25],
      [15.22, 37.52],
      [15.12, 36.68],
      [14.42, 36.78],
      [13.52, 37.18],
      [12.55, 37.62],
      [12.42, 37.82]
    ],
    [
      [8.22, 41.15],
      [9.25, 41.25],
      [9.78, 40.58],
      [9.65, 39.82],
      [9.55, 39.15],
      [8.88, 38.88],
      [8.38, 39.05],
      [8.35, 39.85],
      [8.18, 40.65],
      [8.22, 41.15]
    ]
  ],
  DE: [
    [
      [6.0, 51.0],
      [7.2, 53.6],
      [9.9, 54.9],
      [14.2, 53.9],
      [14.9, 51.0],
      [13.0, 48.5],
      [10.2, 47.4],
      [7.6, 47.6],
      [6.1, 49.5],
      [6.0, 51.0]
    ]
  ],
  FR: [
    [
      [-1.8, 43.4],
      [-1.2, 46.2],
      [-4.7, 48.4],
      [1.6, 50.9],
      [2.6, 51.1],
      [8.2, 49.0],
      [7.6, 47.6],
      [6.8, 45.8],
      [7.5, 43.8],
      [3.2, 42.5],
      [-1.8, 43.4]
    ]
  ],
  UK: [
    [
      [-5.2, 50.1],
      [-3.1, 51.5],
      [-4.8, 55.0],
      [-5.0, 58.6],
      [-1.8, 57.5],
      [1.7, 52.5],
      [1.4, 51.1],
      [-5.2, 50.1]
    ]
  ],
  ES: [
    [
      [-9.2, 43.0],
      [-1.8, 43.4],
      [3.2, 42.4],
      [0.8, 40.7],
      [-0.4, 38.3],
      [-5.6, 36.0],
      [-7.4, 37.2],
      [-6.8, 41.9],
      [-8.8, 42.0],
      [-9.2, 43.0]
    ]
  ],
  PL: [
    [
      [14.2, 53.9],
      [18.6, 54.8],
      [23.5, 54.1],
      [24.1, 50.5],
      [22.5, 49.1],
      [18.9, 49.5],
      [15.0, 51.0],
      [14.2, 53.9]
    ]
  ],
  NL: [
    [
      [3.4, 51.4],
      [4.8, 53.0],
      [7.2, 53.4],
      [6.8, 51.8],
      [5.9, 50.8],
      [3.4, 51.4]
    ]
  ],
  BE: [
    [
      [2.6, 51.1],
      [3.4, 51.4],
      [5.9, 50.8],
      [6.1, 49.5],
      [4.2, 50.0],
      [2.6, 51.1]
    ]
  ],
  AT: [
    [
      [9.6, 47.5],
      [13.5, 48.6],
      [17.1, 48.0],
      [16.0, 46.6],
      [12.2, 46.7],
      [9.6, 47.0],
      [9.6, 47.5]
    ]
  ],
  SE: [
    [
      [11.2, 58.9],
      [12.8, 55.4],
      [16.5, 56.2],
      [19.0, 59.8],
      [24.1, 65.8],
      [20.5, 69.0],
      [14.5, 64.0],
      [11.2, 58.9]
    ]
  ],
  CH: [
    [
      [6.0, 46.2],
      [7.6, 47.6],
      [9.6, 47.5],
      [10.5, 46.8],
      [8.9, 45.9],
      [6.0, 46.2]
    ]
  ],
  NO: [
    [
      [5.0, 60.2],
      [7.5, 58.0],
      [11.2, 58.9],
      [14.5, 64.0],
      [20.5, 69.0],
      [28.0, 71.1],
      [18.0, 69.5],
      [5.0, 62.0],
      [5.0, 60.2]
    ]
  ]
};

/**
 * Slides 12, 15, 20, 26 — GIS Coordinate Map (matches image17.jpeg, image18.jpeg, image19.jpeg, image20.jpeg)
 */
export function renderFacilityGisMap(
  dataset: CountryPCWIDataset,
  stageFilter: 'Collection' | 'Sorting & Pretreatment' | 'Converting (rPVC)' | 'Landfill Operator',
  title: string
): string {
  const { canvas, ctx, width } = createHiDpiCanvas(820, 580, 2.5);

  let facs: FacilityEntity[] = dataset.facilities.filter((f) => f.stage === stageFilter);
  if (facs.length === 0) {
    facs = dataset.facilities.slice(0, 12);
  }

  ctx.fillStyle = '#000000';
  ctx.font = '400 20px "Segoe UI", "Inter", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(title, width / 2, 12);

  const code = dataset.countryCode === 'GB' ? 'UK' : dataset.countryCode;
  const polygons: [number, number][][] =
    code === 'EU'
      ? Object.values(COUNTRY_POLYGONS).flat()
      : COUNTRY_POLYGONS[code] || COUNTRY_POLYGONS.IT;

  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;

  polygons.forEach((poly) => {
    poly.forEach(([lng, lat]) => {
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    });
  });

  facs.forEach((f) => {
    if (f.lng < minLng) minLng = f.lng;
    if (f.lng > maxLng) maxLng = f.lng;
    if (f.lat < minLat) minLat = f.lat;
    if (f.lat > maxLat) maxLat = f.lat;
  });

  if (code === 'IT') {
    minLng = 6.3;
    maxLng = 18.8;
    minLat = 36.4;
    maxLat = 47.3;
  } else {
    const padLng = (maxLng - minLng) * 0.1 || 1.5;
    const padLat = (maxLat - minLat) * 0.1 || 1.2;
    minLng -= padLng;
    maxLng += padLng;
    minLat -= padLat;
    maxLat += padLat;
  }

  const plotX = 150;
  const plotY = 48;
  const plotW = 430;
  const plotH = 488;

  const project = (lng: number, lat: number): [number, number] => {
    const x = plotX + ((lng - minLng) / (maxLng - minLng)) * plotW;
    const y = plotY + plotH - ((lat - minLat) / (maxLat - minLat)) * plotH;
    return [x, y];
  };

  const latStep = maxLat - minLat > 16 ? 5 : 2;
  const lngStep = maxLng - minLng > 16 ? 5 : 2;

  ctx.font = '400 13.5px "Segoe UI", Arial, sans-serif';
  ctx.fillStyle = '#4d4d4d';

  const startLat = Math.ceil(minLat / latStep) * latStep;
  for (let lat = startLat; lat <= maxLat; lat += latStep) {
    const [, y] = project(minLng, lat);
    ctx.strokeStyle = '#ebebeb';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(plotX, y);
    ctx.lineTo(plotX + plotW, y);
    ctx.stroke();

    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${lat}°N`, plotX - 10, y);
  }

  const startLng = Math.ceil(minLng / lngStep) * lngStep;
  for (let lng = startLng; lng <= maxLng; lng += lngStep) {
    const [x] = project(lng, minLat);
    ctx.strokeStyle = '#ebebeb';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, plotY);
    ctx.lineTo(x, plotY + plotH);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const ew = lng >= 0 ? 'E' : 'W';
    ctx.fillText(`${Math.abs(lng)}°${ew}`, x, plotY + plotH + 8);
  }

  // Country silhouette polygons
  polygons.forEach((poly) => {
    if (poly.length < 3) return;
    ctx.beginPath();
    poly.forEach(([lng, lat], idx) => {
      const [x, y] = project(lng, lat);
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = '#e3e3e3';
    ctx.fill();
    ctx.strokeStyle = '#d4d4d4';
    ctx.lineWidth = 0.8;
    ctx.stroke();
  });

  const hasRigid = facs.some((f) => f.pvcType === 'Rigid PVC');
  const hasFlexible = facs.some((f) => f.pvcType === 'Flexible PVC');
  const hasBoth = facs.some((f) => f.pvcType === 'Both');

  // Plot facility dots (Rigid = Red #f50000, Flexible = Blue #0000f5, Both = Green #00e600)
  facs.forEach((f) => {
    const [x, y] = project(f.lng, f.lat);
    ctx.beginPath();
    ctx.arc(x, y, 4.8, 0, Math.PI * 2);
    if (f.pvcType === 'Rigid PVC') {
      ctx.fillStyle = '#f50000';
    } else if (f.pvcType === 'Flexible PVC') {
      ctx.fillStyle = '#0000f5';
    } else {
      ctx.fillStyle = '#00e600';
    }
    ctx.fill();
  });

  // Right-side Legend ("Type of PVC")
  const legX = plotX + plotW + 28;
  let legY = plotY + plotH * 0.42;

  ctx.fillStyle = '#000000';
  ctx.font = '400 16.5px "Segoe UI", Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('Type of PVC', legX, legY);
  legY += 28;

  const legendEntries: { label: string; color: string; show: boolean }[] = [
    {
      label:
        stageFilter === 'Sorting & Pretreatment' && !hasFlexible && !hasBoth
          ? 'Rigid'
          : 'Rigid PVC',
      color: '#f50000',
      show: hasRigid
    },
    {
      label: 'Flexible PVC',
      color: '#0000f5',
      show: hasFlexible
    },
    {
      label: 'Both',
      color: '#00e600',
      show: hasBoth
    }
  ];

  ctx.font = '400 13.5px "Segoe UI", Arial, sans-serif';
  legendEntries
    .filter((e) => e.show)
    .forEach((entry) => {
      ctx.beginPath();
      ctx.arc(legX + 10, legY, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = entry.color;
      ctx.fill();

      ctx.fillStyle = '#000000';
      ctx.fillText(entry.label, legX + 26, legY);
      legY += 24;
    });

  return canvas.toDataURL('image/png');
}
