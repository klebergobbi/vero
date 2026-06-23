"use server";

import { type CrcTask } from "@vero/api-client";
import { serverApi } from "../../lib/api";

export async function syncCrcAction(): Promise<{
  tasks?: CrcTask[];
  created?: number;
  error?: string;
}> {
  try {
    const api = await serverApi();
    const { created } = await api.syncCrcTasks();
    const tasks = await api.listCrcTasks("OPEN");
    return { tasks, created };
  } catch {
    return { error: "Não foi possível sincronizar agora." };
  }
}

export async function doneCrcAction(
  id: string,
): Promise<{ tasks?: CrcTask[]; error?: string }> {
  try {
    const api = await serverApi();
    await api.markCrcTaskDone(id);
    return { tasks: await api.listCrcTasks("OPEN") };
  } catch {
    return { error: "Não foi possível concluir a tarefa." };
  }
}

export async function assignCrcAction(
  id: string,
  userId: string | null,
): Promise<{ tasks?: CrcTask[]; error?: string }> {
  try {
    const api = await serverApi();
    await api.assignCrcTask(id, userId);
    return { tasks: await api.listCrcTasks("OPEN") };
  } catch {
    return { error: "Não foi possível atribuir." };
  }
}

export async function createCrcAction(
  patientId: string,
  type: string,
  notes: string,
): Promise<{ tasks?: CrcTask[]; error?: string }> {
  if (!patientId) return { error: "Selecione um paciente." };
  try {
    const api = await serverApi();
    await api.createCrcTask({ patientId, type, ...(notes ? { notes } : {}) });
    return { tasks: await api.listCrcTasks("OPEN") };
  } catch {
    return { error: "Não foi possível criar a tarefa." };
  }
}
