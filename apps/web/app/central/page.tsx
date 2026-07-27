import { serverApi } from "../../lib/api";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SchedulingCenter } from "./scheduling-center";

export const dynamic = "force-dynamic";

export default async function CentralPage() {
  const api = await serverApi();
  if (!api) redirect("/login");

  const [units, appointments, professionals, patients] =
    await Promise.allSettled([
      api.centralSchedulingUnits(),
      api.centralAppointments(),
      api.listProfessionals(),
      api.listPatients(),
    ]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-indigo-700">
            Central de Agendamentos
          </h1>
          <p className="text-sm text-gray-500">
            Agende e visualize em todas as unidades autorizadas
          </p>
        </div>
        <Link
          href="/agenda"
          className="text-sm text-indigo-600 hover:underline"
        >
          ← Voltar à agenda
        </Link>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <SchedulingCenter
          units={units.status === "fulfilled" ? units.value : []}
          appointments={
            appointments.status === "fulfilled" ? appointments.value : []
          }
          professionals={
            professionals.status === "fulfilled" ? professionals.value : []
          }
          patients={patients.status === "fulfilled" ? patients.value : []}
        />
      </main>
    </div>
  );
}
