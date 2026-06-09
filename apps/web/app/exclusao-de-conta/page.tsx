import type { Metadata } from "next";

// Página PÚBLICA (sem login) exigida pelas lojas (Apple 5.1.1 / Google Data
// Safety): explica como excluir a conta e o que é apagado vs retido por lei.
export const metadata: Metadata = {
  title: "Excluir conta — Vero",
  description: "Como excluir sua conta Vero e o que acontece com seus dados.",
};

export default function ExclusaoDeContaPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-3xl font-bold text-vero-700">Excluir sua conta</h1>
      <p className="mt-2 text-slate-500">
        Esta página explica como excluir sua conta Vero e o que acontece com
        seus dados.
      </p>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold text-slate-800">
          Como excluir pelo aplicativo
        </h2>
        <ol className="list-decimal space-y-2 pl-5 text-slate-700">
          <li>
            Abra o app <strong>Vero</strong> (paciente) ou{" "}
            <strong>Vero Pro</strong> (profissional) e faça login.
          </li>
          <li>
            Na tela inicial, toque em <strong>“Excluir minha conta”</strong>.
          </li>
          <li>Confirme a exclusão. A ação é permanente.</li>
        </ol>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold text-slate-800">
          O que é apagado
        </h2>
        <p className="text-slate-700">
          Seus dados pessoais (nome, contato e documentos) são anonimizados e
          seu acesso é bloqueado — você não consegue mais entrar no app.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold text-slate-800">
          O que pode ser retido por lei
        </h2>
        <p className="text-slate-700">
          Registros que a clínica é legalmente obrigada a manter (por exemplo,
          prontuário e documentos fiscais) podem ser conservados pelo prazo
          previsto na legislação, de forma desvinculada da sua identidade quando
          possível.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold text-slate-800">
          Precisa de ajuda?
        </h2>
        <p className="text-slate-700">
          Se não conseguir excluir pelo app, escreva para{" "}
          <a
            href="mailto:privacidade@vero.com.br"
            className="font-medium text-vero-600 underline"
          >
            privacidade@vero.com.br
          </a>{" "}
          que processamos a exclusão.
        </p>
      </section>
    </main>
  );
}
