import Link from "next/link";
import type {
  CrcTask,
  PatientSummary,
  ProfessionalSummary,
} from "@vero/api-client";
import { serverApi } from "../../lib/api";
import { CrcList } from "./crc-list";

export const dynamic = "force-dynamic";

export default async function CrcPage() {
  const api = await serverApi();

  let tasks: CrcTask[] = [];
  let professionals: ProfessionalSummary[] = [];
  let patients: PatientSummary[] = [];
  try {
    [tasks, professionals, patients] = await Promise.all([
      api.listCrcTasks("OPEN"),
      api.listProfessionals(),
      api.listPatients(),
    ]);
  } catch {
    // fail-soft: a tela renderiza vazia com aviso
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
        Central de Relacionamento
      </h1>
      <p className="mb-6 text-sm text-slate-500">
        Contatos do dia priorizados: retorno, pós-venda, reativação e
        aniversário. Atribua um responsável e marque como feito.
      </p>
      <CrcList
        initialTasks={tasks}
        professionals={professionals}
        patients={patients}
      />
    </main>
  );
}
