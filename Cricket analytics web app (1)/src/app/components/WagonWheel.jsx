import { useMemo, useState } from "react";
import "./WagonWheel.css";

const SIZE = 420;
const GROUND_MIN = 30;
const GROUND_MAX = 390;
const GROUND_SIZE = 360;
const CENTER = 210;
const DB_CENTER = 180;
const OUTER_RADIUS = 180;
const INNER_RADIUS = 92;
const PITCH_WIDTH = 12;
const PITCH_HEIGHT = 34;

const FIELD_SECTORS = [
  { key: "deep-fine-leg", name: "Deep fine leg", start: 66, end: 90, ring: "outer", labelX: 252, labelY: 104, textAngle: -24 },
  { key: "third-man", name: "Third Man", start: 90, end: 135, ring: "outer", labelX: 142, labelY: 104 },
  { key: "deep-backward-point", name: "Deep backward point", start: 135, end: 160, ring: "outer", labelX: 78, labelY: 150 },
  { key: "deep-point", name: "Deep point", start: 160, end: 180, ring: "outer", labelX: 64, labelY: 192 },
  { key: "deep-cover", name: "Deep cover", start: 180, end: 210, ring: "outer", labelX: 78, labelY: 238 },
  { key: "deep-extra-cover", name: "Deep extra cover", start: 210, end: 238, ring: "outer", labelX: 108, labelY: 292 },
  { key: "long-off", name: "Long off", start: 238, end: 264, ring: "outer", labelX: 168, labelY: 330 },
  { key: "straight-hit", name: "Straight hit", start: 264, end: 276, ring: "outer", labelX: 210, labelY: 332, textAngle: -90 },
  { key: "long-on", name: "Long on", start: 276, end: 302, ring: "outer", labelX: 252, labelY: 330 },
  { key: "cow-corner", name: "Cow corner", start: 302, end: 330, ring: "outer", labelX: 298, labelY: 296 },
  { key: "deep-mid-wicket", name: "Deep mid wicket", start: 330, end: 360, ring: "outer", labelX: 336, labelY: 248 },
  { key: "deep-square-leg", name: "Deep Square leg", start: 0, end: 22, ring: "outer", labelX: 340, labelY: 196 },
  { key: "deep-backward-square-leg", name: "Deep backward Square leg", start: 22, end: 45, ring: "outer", labelX: 330, labelY: 157 },
  { key: "long-leg", name: "Long leg", start: 45, end: 66, ring: "outer", labelX: 300, labelY: 116 },

  { key: "wicket-keeper", name: "Wicket keeper", start: 76, end: 100, ring: "inner", labelX: 224, labelY: 152, textAngle: -58 },
  { key: "slips-cordon", name: "slips\ncordon", start: 100, end: 120, ring: "inner", labelX: 190, labelY: 150 },
  { key: "short-third-man", name: "short third Man", start: 120, end: 135, ring: "inner", labelX: 174, labelY: 160, textAngle: 50 },
  { key: "backward-point", name: "backward point", start: 135, end: 160, ring: "inner", labelX: 163, labelY: 176, textAngle: 22 },
  { key: "point", name: "point", start: 160, end: 180, ring: "inner", labelX: 150, labelY: 200 },
  { key: "cover", name: "cover", start: 180, end: 210, ring: "inner", labelX: 156, labelY: 226 },
  { key: "extra-cover", name: "extra cover", start: 210, end: 238, ring: "inner", labelX: 176, labelY: 249, textAngle: -45 },
  { key: "mid-off", name: "mid off", start: 238, end: 264, ring: "inner", labelX: 192, labelY: 272 },
  { key: "mid-on", name: "mid on", start: 276, end: 302, ring: "inner", labelX: 228, labelY: 272 },
  { key: "mid-wicket", name: "mid wicket", start: 302, end: 360, ring: "inner", labelX: 252, labelY: 235 },
  { key: "square-leg", name: "square leg", start: 360, end: 22, ring: "inner", labelX: 270, labelY: 202 },
  { key: "backward-square-leg", name: "backward square leg", start: 22, end: 45, ring: "inner", labelX: 270, labelY: 180, textAngle: -26 },
  { key: "short-fine-leg", name: "short fine leg", start: 45, end: 66, ring: "inner", labelX: 247, labelY: 158, textAngle: -54 },
  { key: "leg-slip", name: "leg slip", start: 66, end: 76, ring: "inner", labelX: 238, labelY: 153, textAngle: -58 },
];

function normalizeAngle(angle) {
  return (angle + 360) % 360;
}

function isAngleBetween(angle, start, end) {
  const value = normalizeAngle(angle);
  const from = normalizeAngle(start);
  const to = normalizeAngle(end);
  return from <= to ? value >= from && value < to : value >= from || value < to;
}

function dbRadiusToSvg(radius) {
  return radius;
}

function polarToSvg(angleDeg, radius, handedness = "right") {
  const angle = (angleDeg * Math.PI) / 180;
  const dx = Math.cos(angle) * dbRadiusToSvg(radius);
  const dy = Math.sin(angle) * dbRadiusToSvg(radius);
  const mirror = handedness === "left" ? -1 : 1;
  return {
    x: CENTER + dx * mirror,
    y: CENTER - dy,
  };
}

function sectorMidpoint(start, end) {
  if (start <= end) return (start + end) / 2;
  return normalizeAngle((start + end + 360) / 2);
}

function describePoint(dbX, dbY, handedness = "right") {
  const rawDx = dbX - DB_CENTER;
  const dy = dbY - DB_CENTER;
  const dx = handedness === "left" ? -rawDx : rawDx;
  const radius = Math.sqrt(dx * dx + dy * dy);
  const angle = normalizeAngle((Math.atan2(dy, dx) * 180) / Math.PI);

  if (radius > OUTER_RADIUS) {
    return { fieldArea: "Outside field", fieldKey: "outside", distance: radius, angleDeg: angle, insideField: false };
  }

  if (radius <= 20) {
    return { fieldArea: "Pitch / striker", fieldKey: "pitch", distance: radius, angleDeg: angle, insideField: true };
  }

  const preferredRing = radius <= INNER_RADIUS ? "inner" : "outer";
  const sector =
    FIELD_SECTORS.find((item) => item.ring === preferredRing && isAngleBetween(angle, item.start, item.end)) ||
    FIELD_SECTORS.find((item) => isAngleBetween(angle, item.start, item.end));

  return {
    fieldArea: sector?.name || "Unknown field area",
    fieldKey: sector?.key || "unknown",
    distance: radius,
    angleDeg: angle,
    insideField: true,
  };
}

function svgPathForSector(start, end, innerRadius, outerRadius, handedness) {
  const steps = 18;
  const sweep = start <= end ? end - start : end + 360 - start;
  const outer = [];
  const inner = [];

  for (let i = 0; i <= steps; i += 1) {
    outer.push(polarToSvg(start + (sweep * i) / steps, outerRadius, handedness));
    inner.unshift(polarToSvg(start + (sweep * i) / steps, innerRadius, handedness));
  }

  const [first, ...rest] = outer;
  return [
    `M ${first.x.toFixed(2)} ${first.y.toFixed(2)}`,
    ...rest.map((point) => `L ${point.x.toFixed(2)} ${point.y.toFixed(2)}`),
    ...inner.map((point) => `L ${point.x.toFixed(2)} ${point.y.toFixed(2)}`),
    "Z",
  ].join(" ");
}

function getSvgPoint(event) {
  const svg = event.currentTarget;
  const point = svg.createSVGPoint();
  point.x = event.clientX;
  point.y = event.clientY;
  const transformed = point.matrixTransform(svg.getScreenCTM().inverse());

  const svgX = Math.max(0, Math.min(SIZE, transformed.x));
  const svgY = Math.max(0, Math.min(SIZE, transformed.y));
  const dbX = Math.round(Math.max(0, Math.min(GROUND_SIZE, svgX - GROUND_MIN)));
  const dbY = Math.round(Math.max(0, Math.min(GROUND_SIZE, GROUND_MAX - svgY)));
  return {
    svgX,
    svgY,
    dbX,
    dbY,
  };
}

export default function WagonWheel({
  batsmanHand = "right",
  selectedShots = [],
  onPointSelect,
  savePoint,
  stadiumEnd = "Pavilion End",
  className = "",
}) {
  const [hover, setHover] = useState(null);
  const [saving, setSaving] = useState(false);

  const sideLabels = useMemo(
    () => ({
      off: batsmanHand === "right" ? "OFF" : "LEG",
      leg: batsmanHand === "right" ? "LEG" : "OFF",
    }),
    [batsmanHand]
  );

  const handleClick = async (event) => {
    const point = getSvgPoint(event);
    const meta = describePoint(point.dbX, point.dbY, batsmanHand);
    const payload = {
      x: point.dbX,
      y: point.dbY,
      svgX: Number(point.svgX.toFixed(2)),
      svgY: Number(point.svgY.toFixed(2)),
      fieldArea: meta.fieldArea,
      fieldKey: meta.fieldKey,
      batsmanHand,
      distanceFromPitch: Number(meta.distance.toFixed(2)),
      angleDeg: Number(meta.angleDeg.toFixed(2)),
      insideField: meta.insideField,
      createdAt: new Date().toISOString(),
    };

    onPointSelect?.(payload);

    if (savePoint) {
      setSaving(true);
      try {
        await savePoint(payload);
      } finally {
        setSaving(false);
      }
    }
  };

  const handleMove = (event) => {
    const point = getSvgPoint(event);
    const meta = describePoint(point.dbX, point.dbY, batsmanHand);

    setHover({
      ...point,
      ...meta,
      clientX: event.clientX,
      clientY: event.clientY,
    });
  };

  const activeKey = hover?.insideField ? hover.fieldKey : null;

  return (
    <div className={`wagon-wheel ${className}`}>
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="img"
        aria-label="Interactive cricket wagon wheel"
        onPointerMove={handleMove}
        onPointerLeave={() => setHover(null)}
        onClick={handleClick}
      >
        <defs>
          <pattern id="wagon-grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.8" />
          </pattern>
        </defs>

        <rect width={SIZE} height={SIZE} className="wagon-bg" />
        <rect width={SIZE} height={SIZE} fill="url(#wagon-grid)" className="wagon-grid" />

        <g className="stadium-end">
          <path d="M 210 10 L 207 17 L 213 17 Z" fill="#1a2416" />
        </g>

        <text x="13" y="215" className="side-label">{sideLabels.off}</text>
        <text x="407" y="215" className="side-label">{sideLabels.leg}</text>

        {FIELD_SECTORS.filter((sector) => sector.ring === "outer").map((sector, index) => (
          <path
            key={sector.key}
            d={svgPathForSector(sector.start, sector.end, INNER_RADIUS, OUTER_RADIUS, batsmanHand)}
            className={`sector sector-outer ${index % 2 ? "sector-alt" : ""} ${activeKey === sector.key ? "sector-active" : ""}`}
          />
        ))}

        {FIELD_SECTORS.filter((sector) => sector.ring === "inner").map((sector, index) => (
          <path
            key={sector.key}
            d={svgPathForSector(sector.start, sector.end, 20, INNER_RADIUS, batsmanHand)}
            className={`sector sector-inner ${activeKey === sector.key ? "sector-active" : ""}`}
          />
        ))}


        <circle cx={CENTER} cy={CENTER} r={OUTER_RADIUS} className="boundary-circle" />

        <rect
          x={CENTER - PITCH_WIDTH / 2}
          y={CENTER - PITCH_HEIGHT / 2}
          width={PITCH_WIDTH}
          height={PITCH_HEIGHT}
          className="pitch"
        />

        {selectedShots.map((shot, index) => (
          <g key={`${shot.x}-${shot.y}-${index}`} className="shot-marker">
            <line x1={CENTER} y1={CENTER} x2={GROUND_MIN + shot.x} y2={GROUND_MAX - shot.y} />
            <circle cx={GROUND_MIN + shot.x} cy={GROUND_MAX - shot.y} r="4.5" />
          </g>
        ))}

        {hover?.insideField && <circle cx={hover.svgX} cy={hover.svgY} r="4" className="hover-dot" />}
      </svg>

      <div className="wagon-status">
        <span>{hover ? hover.fieldArea : ""}</span>
        <strong>{hover ? `X ${hover.dbX}, Y ${hover.dbY}` : ""}</strong>
        {saving && <em>Saving...</em>}
      </div>

      {hover && (
        <div className="wagon-tooltip" style={{ left: hover.clientX + 12, top: hover.clientY + 12 }}>
          <strong>{hover.fieldArea}</strong>
          <span>X {hover.dbX}, Y {hover.dbY}</span>
        </div>
      )}
    </div>
  );
}

export { describePoint };
