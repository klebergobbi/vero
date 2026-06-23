import Link from "next/link";
import type { RecordImage } from "@vero/api-client";
import { serverApi } from "../../../lib/api";
import { apiBaseUrl } from "../../../lib/session";
import { ImageCapture } from "./image-capture";

export const dynamic = "force-dynamic";

/** Torna as URLs assinadas absolutas (o endpoint /records/images é @Public na API). */
function absolutize(img: RecordImage): RecordImage {
  return {
    ...img,
    url: `${apiBaseUrl}${img.url}`,
    thumbnailUrl: `${apiBaseUrl}${img.thumbnailUrl}`,
  };
}

export default async function ImagensPage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  const { patientId } = await params;
  const api = await serverApi();

  let images: RecordImage[] = [];
  try {
    images = (await api.listRecordImages(patientId)).map(absolutize);
  } catch {
    // fail-soft
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link
        href="/agenda"
        className="mb-6 inline-block text-sm text-vero-700 hover:underline"
      >
        ← Voltar
      </Link>
      <h1 className="mb-1 text-2xl font-bold text-vero-700">
        Imagens intraorais
      </h1>
      <p className="mb-6 text-sm text-slate-500">
        Capture pela câmera ou anexe um arquivo. As imagens ficam no prontuário,
        cifradas, e abrem por link temporário.
      </p>
      <ImageCapture patientId={patientId} initialImages={images} />
    </main>
  );
}
