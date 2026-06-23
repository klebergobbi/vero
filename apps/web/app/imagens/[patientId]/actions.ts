"use server";

import { type RecordImage } from "@vero/api-client";
import { serverApi } from "../../../lib/api";
import { apiBaseUrl } from "../../../lib/session";

function absolutize(img: RecordImage): RecordImage {
  return {
    ...img,
    url: `${apiBaseUrl}${img.url}`,
    thumbnailUrl: `${apiBaseUrl}${img.thumbnailUrl}`,
  };
}

export async function addImageAction(
  patientId: string,
  input: {
    filename: string;
    contentType: string;
    dataBase64: string;
    thumbnailBase64?: string;
  },
): Promise<{ images?: RecordImage[]; error?: string }> {
  try {
    const api = await serverApi();
    await api.addRecordImage(patientId, input);
    const images = (await api.listRecordImages(patientId)).map(absolutize);
    return { images };
  } catch {
    return { error: "Não foi possível salvar a imagem." };
  }
}
