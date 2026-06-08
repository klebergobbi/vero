import { logoutAction } from "../login/actions";

// Protegida pelo middleware (refresh transparente). A lista/criação chegam na S7b.
export const dynamic = "force-dynamic";

export default function AgendaPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-vero-700">Agenda</h1>
          <p className="text-sm text-slate-500">
            Você está autenticado. (lista e criação de agendamentos chegam na
            S7b)
          </p>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            Sair
          </button>
        </form>
      </header>

      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-400">
        Agenda em construção — S7b.
      </div>
    </main>
  );
}
