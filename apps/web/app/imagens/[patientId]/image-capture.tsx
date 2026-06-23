"use client";

import { useRef, useState, useTransition } from "react";
import type { RecordImage } from "@vero/api-client";
import { addImageAction } from "./actions";

const FULL_MAX = 1280;
const THUMB_MAX = 240;

/** Desenha a fonte (vídeo/imagem) num canvas redimensionado e devolve base64 (sem prefixo). */
function toBase64(
  source: CanvasImageSource & { width?: number; height?: number },
  maxW: number,
): string {
  const sw =
    (source as HTMLVideoElement).videoWidth ||
    (source as HTMLImageElement).naturalWidth ||
    Number(source.width) ||
    0;
  const sh =
    (source as HTMLVideoElement).videoHeight ||
    (source as HTMLImageElement).naturalHeight ||
    Number(source.height) ||
    0;
  const scale = maxW && sw > maxW ? maxW / sw : 1;
  const w = Math.max(1, Math.round(sw * scale));
  const h = Math.max(1, Math.round(sh * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")?.drawImage(source, 0, 0, w, h);
  return canvas.toDataURL("image/png").split(",")[1] ?? "";
}

export function ImageCapture({
  patientId,
  initialImages,
}: {
  patientId: string;
  initialImages: RecordImage[];
}) {
  const [images, setImages] = useState(initialImages);
  const [error, setError] = useState<string | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [pending, start] = useTransition();
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const save = (filename: string, full: string, thumb: string) => {
    setError(null);
    start(async () => {
      const res = await addImageAction(patientId, {
        filename,
        contentType: "image/png",
        dataBase64: full,
        thumbnailBase64: thumb,
      });
      if (res.error) setError(res.error);
      else if (res.images) setImages(res.images);
    });
  };

  const startCamera = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraOn(true);
      }
    } catch {
      setError("Não foi possível acessar a câmera.");
    }
  };

  const stopCamera = () => {
    const stream = videoRef.current?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((t) => t.stop());
    setCameraOn(false);
  };

  const capture = () => {
    const v = videoRef.current;
    if (!v) return;
    const full = toBase64(v, FULL_MAX);
    const thumb = toBase64(v, THUMB_MAX);
    save(`captura-${Date.now()}.png`, full, thumb);
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const img = new Image();
    img.onload = () => {
      const full = toBase64(img, FULL_MAX);
      const thumb = toBase64(img, THUMB_MAX);
      URL.revokeObjectURL(img.src);
      save(file.name, full, thumb);
    };
    img.onerror = () => setError("Arquivo de imagem inválido.");
    img.src = URL.createObjectURL(file);
    e.target.value = "";
  };

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-medium text-slate-700">Nova imagem</h2>

        <div className="overflow-hidden rounded-lg bg-slate-900">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video
            ref={videoRef}
            className={cameraOn ? "h-56 w-full object-contain" : "hidden"}
            playsInline
            muted
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {!cameraOn ? (
            <button
              type="button"
              onClick={startCamera}
              disabled={pending}
              className="rounded-lg border border-vero-500 px-3 py-2 text-sm font-medium text-vero-700 transition hover:bg-vero-50"
            >
              Abrir câmera
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={capture}
                disabled={pending}
                className="rounded-lg bg-vero-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-vero-700 disabled:opacity-60"
              >
                Capturar
              </button>
              <button
                type="button"
                onClick={stopCamera}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-50"
              >
                Fechar câmera
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={pending}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Anexar arquivo
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={onFile}
            className="hidden"
          />
        </div>

        {error ? (
          <p role="alert" className="mt-3 text-sm text-red-600">
            {error}
          </p>
        ) : null}
        {pending ? (
          <p className="mt-3 text-sm text-slate-400">Salvando…</p>
        ) : null}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-slate-700">
          Galeria ({images.length})
        </h2>
        {images.length === 0 ? (
          <p className="text-sm text-slate-400">Nenhuma imagem ainda.</p>
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {images.map((img) => (
              <a
                key={img.id}
                href={img.url}
                target="_blank"
                rel="noreferrer"
                className="block overflow-hidden rounded-lg border border-slate-200 bg-white"
                title={img.filename}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.thumbnailUrl}
                  alt={img.filename}
                  className="h-24 w-full object-cover"
                />
              </a>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
