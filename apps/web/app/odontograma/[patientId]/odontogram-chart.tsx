"use client";

import { useMemo, useState, useTransition } from "react";
import type { ToothCondition } from "@vero/api-client";
import { FDI_PERMANENT_TEETH, TOOTH_CONDITIONS } from "@vero/types";
import { setToothConditionAction } from "./actions";

const S = 36; // lado do dente
const T = S / 3; // espessura das faces
const GAP = 6;
const PER_ARCH = 16;

const COLOR: Record<string, string> = Object.fromEntries(
  TOOTH_CONDITIONS.map((c) => [c.key, c.color]),
);

// Faces que pintam o dente inteiro (clique no número aplica WHOLE).
type FacePolys = { face: string; points: string }[];
const FACES: FacePolys = [
  { face: "VESTIBULAR", points: `0,0 ${S},0 ${S - T},${T} ${T},${T}` },
  {
    face: "LINGUAL",
    points: `0,${S} ${S},${S} ${S - T},${S - T} ${T},${S - T}`,
  },
  { face: "MESIAL", points: `0,0 0,${S} ${T},${S - T} ${T},${T}` },
  {
    face: "DISTAL",
    points: `${S},0 ${S},${S} ${S - T},${S - T} ${S - T},${T}`,
  },
  {
    face: "OCCLUSAL",
    points: `${T},${T} ${S - T},${T} ${S - T},${S - T} ${T},${S - T}`,
  },
];

function key(tooth: number, face: string): string {
  return `${tooth}-${face}`;
}

export function OdontogramChart({
  patientId,
  initial,
}: {
  patientId: string;
  initial: ToothCondition[];
}) {
  const [conditions, setConditions] = useState<ToothCondition[]>(initial);
  const [active, setActive] = useState<string>("CARIES");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const byKey = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of conditions) m.set(key(c.toothNumber, c.face), c.condition);
    return m;
  }, [conditions]);

  const apply = (toothNumber: number, face: string) => {
    setError(null);
    start(async () => {
      const res = await setToothConditionAction(patientId, {
        toothNumber,
        face,
        condition: active,
      });
      if ("error" in res) setError(res.error);
      else setConditions(res.conditions);
    });
  };

  const upper = FDI_PERMANENT_TEETH.slice(0, PER_ARCH);
  const lower = FDI_PERMANENT_TEETH.slice(PER_ARCH);
  const width = PER_ARCH * (S + GAP);

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {TOOTH_CONDITIONS.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => setActive(c.key)}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
              active === c.key
                ? "border-vero-600 bg-vero-50 text-vero-700"
                : "border-slate-300 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <span
              className="inline-block h-3 w-3 rounded-full border border-slate-300"
              style={{ backgroundColor: c.color }}
            />
            {c.label}
          </button>
        ))}
      </div>

      {error ? (
        <p role="alert" className="mb-2 text-sm text-red-600">
          {error}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-4">
        <svg
          width={width}
          height={2 * (S + 22) + 12}
          className={pending ? "opacity-70" : ""}
        >
          {upper.map((tooth, i) => (
            <Tooth
              key={tooth}
              tooth={tooth}
              x={i * (S + GAP)}
              y={0}
              labelBelow
              byKey={byKey}
              onFace={apply}
            />
          ))}
          {lower.map((tooth, i) => (
            <Tooth
              key={tooth}
              tooth={tooth}
              x={i * (S + GAP)}
              y={S + 22 + 12}
              labelBelow={false}
              byKey={byKey}
              onFace={apply}
            />
          ))}
        </svg>
      </div>
    </div>
  );
}

function Tooth({
  tooth,
  x,
  y,
  labelBelow,
  byKey,
  onFace,
}: {
  tooth: number;
  x: number;
  y: number;
  labelBelow: boolean;
  byKey: Map<string, string>;
  onFace: (tooth: number, face: string) => void;
}) {
  const whole = byKey.get(key(tooth, "WHOLE"));
  const gy = labelBelow ? y : y + 22;
  const labelY = labelBelow ? gy + S + 14 : y + 14;
  return (
    <g>
      <g transform={`translate(${x}, ${gy})`}>
        <rect
          width={S}
          height={S}
          fill={whole ? COLOR[whole] : "#f8fafc"}
          stroke="#cbd5e1"
        />
        {FACES.map((f) => {
          const cond = byKey.get(key(tooth, f.face));
          return (
            <polygon
              key={f.face}
              points={f.points}
              fill={cond ? COLOR[cond] : "transparent"}
              stroke="#e2e8f0"
              strokeWidth={0.5}
              className="cursor-pointer"
              onClick={() => onFace(tooth, f.face)}
            />
          );
        })}
      </g>
      <text
        x={x + S / 2}
        y={labelY}
        textAnchor="middle"
        className="cursor-pointer fill-slate-500 text-[10px] font-medium hover:fill-vero-700"
        onClick={() => onFace(tooth, "WHOLE")}
      >
        {tooth}
      </text>
    </g>
  );
}
