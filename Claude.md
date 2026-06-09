\# CLAUDE.md — Vero · App de gestão para clínicas odontológicas



> Memória e constituição do projeto. \*\*Toda sessão de Claude Code lê este arquivo primeiro\*\* e o atualiza ao final (§11). Não inicie sessão sem ler §1–§9.

>

> Princípio mestre: \*\*deny-by-default, fail-closed · thin client, fat server · 1 sessão = 1 feature = 3–5 arquivos.\*\*



\---



\## 0. MARCA



\*\*Nome:\*\* Vero — do latim/italiano "verdadeiro, genuíno". Posicionamento: \*a clínica em que o paciente confia e o dono tem controle de verdade.\* Tom: confiante, premium, gênero-neutro.



\*\*Apps e identificadores (sugestão — exigem domínio próprio correspondente):\*\*

\- App do Paciente → nome na loja \*\*"Vero"\*\* · bundle/package `br.com.vero.paciente`

\- App do Profissional → nome na loja \*\*"Vero Pro"\*\* · bundle/package `br.com.vero.pro`

\- Web de gestão → `app.vero.com.br` (sugerido) · API → `api.vero.com.br`



\*\*Taglines:\*\*

\- Marca: \*"Gestão de verdade pra sua clínica."\*

\- App do Paciente: \*"Sua clínica, sempre com você."\*

\- App Pro: \*"Sua clínica inteira, de verdade, num app."\*



\*\*Conceito de ícone:\*\* monograma \*\*"V"\*\* cuja diagonal direita termina como um \*\*check (✓)\*\* — funde \*verdade/confiança\* com a inicial da marca. Paleta confiante de saúde: índigo/teal profundo como base, com um acento fresco (verde-menta ou ciano) no traço do check. App do Paciente em variação mais clara/calorosa; App Pro em variação mais sólida/escura. Mesmo símbolo nos dois, diferenciando só o peso/cor — reforça que são a mesma marca.



> Pendência de marca antes do lançamento: confirmar os 3 portões (INPI classes 9/42/44; domínios vero.com.br / app.vero.com.br; reserva do nome "Vero" e "Vero Pro" no App Store Connect e Play Console). Registrar como ADR em /docs/adr ao decidir.



\---



\## 1. O QUE ESTAMOS CONSTRUINDO



SaaS de gestão para clínicas odontológicas e de estética, multi-tenant e multi-unidade. Cobre a jornada inteira: captar lead → agendar → atender → orçar → fechar tratamento → executar → cobrar → receber → analisar. Posicionamento: \*\*máquina de lucratividade\*\* (reduzir falta, reduzir inadimplência, aumentar conversão de orçamento).



Quatro superfícies sobre \*\*uma única API\*\*:



| Superfície | App | Tecnologia | Loja? |

|---|---|---|---|

| Gestão da clínica | `apps/web` | Next.js 15 (desktop/tablet) | Não |

| App do Paciente | `apps/mobile-patient` | Expo (React Native) | \*\*App Store + Play\*\* |

| App do Profissional | `apps/mobile-pro` | Expo (React Native) | \*\*App Store + Play\*\* |

| Backend único | `apps/api` | NestJS | — |



Prioridade: \*\*mobile (paciente + profissional) + web\*\*, com os dois apps mobile prontos para publicação \*\*desde a primeira sessão\*\*.



\---



\## 2. ARQUITETURA E ESTRUTURA DO MONOREPO



Monorepo \*\*Turborepo + pnpm workspaces\*\*. Regra de ouro: \*\*thin client, fat server\*\* — o frontend captura intenção e exibe resultado; o backend detém segredos, calcula tudo e é o proxy de toda integração externa.



```

vero/

├── apps/

│   ├── api/                # NestJS — única fonte de verdade e de segredos

│   ├── web/                # Next.js 15 — gestão da clínica (desktop/tablet)

│   ├── mobile-patient/     # Expo — App do Paciente (consumer, loja)

│   └── mobile-pro/         # Expo — App do Profissional (B2B, loja)

├── packages/

│   ├── types/              # tipos + schemas Zod compartilhados (front+back)

│   ├── api-client/         # client HTTP tipado do backend

│   ├── ui/                 # design tokens / componentes compartilhados

│   └── config/             # eslint, tsconfig, tailwind, prettier presets

├── infra/                  # Terraform (DigitalOcean) — infra como código

├── .github/workflows/      # CI/CD com gates

└── CLAUDE.md

```



Regras de arquitetura (não-negociáveis):

\- \*\*Separação de responsabilidades\*\*: um módulo NestJS por bounded context (§6); editar um não pode quebrar outro.

\- \*\*Validação em 3 camadas\*\*: Zod no form (UX) → class-validator no DTO (segurança, rejeita 400) → constraint no banco (integridade). Nunca confie no front como barreira.

\- \*\*Schemas Zod em `packages/types`\*\*, reusados nos 4 apps. Tipos derivam de Prisma + Zod, nunca duplicados à mão.

\- \*\*Multi-tenant\*\*: TODA tabela de negócio tem `tenantId` (e `unitId` quando aplicável). Guard injeta o tenant do JWT; nenhuma query roda sem filtro de tenant.



\---



\## 3. STACK E VERSÕES (alinhadas às lojas — jun/2026)



\- \*\*Backend\*\*: NestJS · Prisma · PostgreSQL · Redis · BullMQ.

\- \*\*Web\*\*: Next.js 15 (App Router) · React 19 · TailwindCSS. \[atualizado na S7a: era Next 14; subiu p/ 15 por 6 CVEs HIGH sem patch no 14.x — §4 prevalece. ADR pendente.\]

\- \*\*Mobile\*\*: Expo (SDK estável mais recente) · EAS Build/Submit/Update · Expo Router · Expo Notifications.

\- \*\*Infra\*\*: DigitalOcean (App Platform/Droplets + Managed Postgres + Managed Redis + Spaces) · Terraform.



\*\*Targets obrigatórios de loja (reconferir a cada release):\*\*

\- \*\*Android\*\*: `targetSdkVersion = 36` (Android 16) — exigido para apps novos/updates a partir de \*\*31/08/2026\*\*. Distribuir em \*\*AAB\*\*.

\- \*\*iOS\*\*: build com \*\*SDK do iOS 26+\*\* (exigência desde abr/2026). Universal iPhone/iPad, 64-bit.

\- Manter Expo SDK atualizado para satisfazer ambos.



\---



\## 4. SEGURANÇA — NÃO-NEGOCIÁVEL (OWASP Top 10:2025)



Aplicar em TODA sessão; prevalece sobre velocidade.



\*\*A01 — Controle de acesso (#1):\*\* deny-by-default; autorização SEMPRE no servidor antes da operação (`ForbiddenException`); \*\*anti-IDOR\*\* (`WHERE id=:id AND tenantId=:tenantId` e `ownerId` quando aplicável); CORS allowlist (nunca `\*` com credenciais); \*\*anti-SSRF\*\* em fetch de URL externa (allowlist de domínio, bloqueio de IP interno/metadados 169.254/10.x/127.x, timeout).



\*\*A02 — Config segura (#2):\*\* Helmet (CSP, HSTS, X-Content-Type-Options, X-Frame-Options); em produção Swagger/debug/logs verbosos OFF; sem defaults; cookies `httpOnly`+`secure`+`sameSite`; menor privilégio; containers não-root, base mínima, multi-stage.



\*\*Injeção/cripto/segredos:\*\* NUNCA segredo no código/front/comentário (vazou → rotacione já); Prisma parametrizado (nunca `$queryRawUnsafe` com input); sanitizar input; rate limit em endpoints públicos (login mais restrito); HTTPS sempre; dado sensível cifrado em repouso; senha com \*\*argon2/bcrypt\*\*; segredos via env/secrets manager, `.env` nunca commitado.



\*\*A07 — Auth/sessão:\*\* senha forte + anti-brute-force; MFA para admin; JWT access curto + \*\*refresh rotativo revogável no Redis\*\*; logout invalida; erro de login genérico.



\*\*Erro/resiliência:\*\* \*\*fail-closed\*\*; nunca expor stack trace (genérico fora, detalhe no log); tratar timeout/falha de dependência; BullMQ jobs \*\*idempotentes\*\* + retry/backoff + DLQ; graceful shutdown.



\*\*Observabilidade (A09):\*\* log JSON com trace id; registrar evento de segurança (login, authz negada, mudança de permissão, acesso a dado sensível); nunca logar segredo/PII; alertas para 5xx/falha de auth/indisponibilidade; healthcheck.



\*\*Supply chain (A06/A08):\*\* lockfile commitado; `pnpm audit`/SCA no pipeline; versões fixas em libs críticas.



\---



\## 5. REQUISITOS DE LOJA — EMBUTIR DESDE A SESSÃO 1



Parte do "Definition of Done" de qualquer feature mobile. Causa #1 de rejeição Apple = app incompleto (Guideline 2.1).



\- \*\*Exclusão de conta in-app\*\* (`DELETE /me` + URL web pública), respeitando guarda legal do prontuário (Apple 5.1.1 + Google).

\- \*\*Privacy Policy + Termos\*\* em URL pública, acessíveis no app, antes da 1ª submissão; linkados no App Store Connect e Play Console.

\- \*\*App Privacy Labels / Data Safety\*\* honestos: coletamos \*\*dado de saúde\*\* (sensível) e \*\*financeiro\*\*; consentimento explícito; nunca para tracking/ads.

\- \*\*Conta demo\*\* para revisor, documentada nas notas de revisão.

\- \*\*Permissões mínimas\*\*, justificadas; iOS usage strings claras; sem APIs privadas.

\- \*\*Push\*\* via Expo Notifications (APNs+FCM).

\- \*\*Sem segredos no bundle\*\* (thin client).

\- \*\*Crash reporting\*\* (Sentry); zero placeholder/link quebrado na submissão.

\- \*\*Disclosure de IA\*\* se a feature usa IA/automação.

\- Versionar `version` + `versionCode`/`buildNumber` a cada submissão; OTA (EAS Update) só p/ JS, nunca muda propósito do app.

\- Pipeline: EAS Build → trilha interna (TestFlight/Internal) → revisão → produção.



\---



\## 6. MODELO DE DOMÍNIO (referência para módulos e schema)



Tudo com `tenantId`. Bounded contexts:

\- \*\*Org/Acesso\*\*: `Tenant`→`Clinic`→`Unit`→`Room`; `User`↔`Role`↔`Permission`; `Professional`(CRO, especialidades, comissão).

\- \*\*Paciente/Clínico\*\*: `Patient`(origem, indicado\_por); `Anamnesis`/`AnamnesisTemplate`; `MedicalRecord`→`RecordEntry`,`Attachment`,`Odontogram`,`ToothCondition`; `SpecialtyForm`; `Consent/Signature`; `AlignerCase`→`AlignerStep`.

\- \*\*Agenda\*\*: `Appointment`(status, marcadores); `Availability`; `ConfirmationEvent`; `WaitList`; `ReturnAlert`.

\- \*\*Comercial/Financeiro\*\*: `Procedure`/`PriceTable`/`Plan`; `Budget`→`BudgetItem`; `Contract`; `TreatmentPlan`→`TreatmentItem`→`ExecutionLog`; `Charge`→`Installment`; `Invoice`(NFS-e),`Receipt`,`Boleto`,`PixCharge`,`CardTransaction`; `Payment`→`Reconciliation`; `CollectionRule`→`CollectionEvent`; `CreditCheck`(SPC).

\- \*\*Operacional/Gestão\*\*: `Account`(pagar/receber),`CashFlow`,`BankReconciliation`; `Inventory`→`Item`,`StockMovement`,`Batch`; `Commission`; `Goal`; `Royalty`; `CRMLead`→`LeadSource`,`Referral`,`CRCTask`; `Notification`,`MessageLog`; `AuditLog`.



\---



\## 7. INTEGRAÇÕES (todas via backend, nunca no client)



WhatsApp \*\*Evolution API\*\* · Pagamentos \*\*Asaas\*\* (PIX/boleto/cartão/recorrência/split p/ royalties) · NFS-e via \*\*integrador\*\* (PlugNotas/Focus/eNotas) · Crédito \*\*SPC/Serasa\*\* · Assinatura \*\*ICP-Brasil\*\* (Clicksign/D4Sign/BirdID, com trilha: IP+timestamp+hash) · Storage \*\*DO Spaces\*\* (URLs assinadas) · \*\*Sentry\*\*.



Filas BullMQ: `confirmation-sender`, `collection-ruler`, `payment-reconciler`, `nfse-emitter`, `return-alert-scheduler`, `report-builder`, `spc-query`, `push-sender`.



\---



\## 8. CONVENÇÕES DE CÓDIGO



TS estrito (sem `any` injustificado) · \*\*solução mais simples possível, nada além dos critérios de aceitação\*\* · antes de criar helper, "já existe algo similar?" e reusar de `packages/` · ler arquivo inteiro antes de editar · teste para toda feature · remover debug antes do commit · commits pequenos · migrations revisadas com rollback/backup (nunca destrutiva sem backup) · ADR curto em `/docs/adr`.



\---



\## 9. WORKFLOW DE SESSÃO



\- \*\*1 sessão = 1 feature = 1 módulo = máx. 3–5 arquivos.\*\* Mais que isso → quebre em sub-tarefas sequenciais.

\- Antes de implementar: pesquisar padrões/imports existentes e colar exemplos reais.

\- Especificar exatamente os arquivos a criar/modificar.

\- CLAUDE.md acumula contexto; nunca recomeça.



\*\*Definition of Done (ao fim de cada sessão):\*\* (1) aceite atendido; (2) testes passando; (3) sem debug/segredo, `.env` fora do git; (4) `pnpm audit` sem high/critical; (5) deny-by-default + anti-IDOR verificados; (6) fail-closed sem vazar stack trace; (7) nada anterior quebrou; (8) regras de loja (§5) se mobile; (9) migration com rollback/backup, pipeline verde; (10) \*\*§11 atualizado\*\* e `\[x]` marcado em §10.



\---



\## 10. BACKLOG DETALHADO DE SESSÕES



Cada sessão é uma mini-spec. As regras transversais de §4 e §5 valem sempre; abaixo só anoto o que é \*\*específico\*\* de cada sessão. `\[ ]` → marque `\[x]` ao concluir.



\### FASE 0 — Fundação



\#### \[x] S0 — Scaffold do monorepo

\*\*Depende de:\*\* —

\*\*Objetivo:\*\* Esqueleto Turborepo + pnpm que builda vazio, com presets compartilhados.

\*\*Arquivos:\*\*

\- `pnpm-workspace.yaml` — declara `apps/\*` e `packages/\*`.

\- `turbo.json` — pipelines `build`, `lint`, `test`, `dev` com cache.

\- `package.json` (raiz) — scripts orquestradores, engines (node/pnpm fixos).

\- `packages/config/` — presets `eslint`, `tsconfig.base.json`, `prettier`, `tailwind`.

\- `.gitignore` + `.env.example` (sem segredo real) + `README` curto.

\*\*Específico de segurança:\*\* `.env` no `.gitignore` desde já; nenhum segredo no `.env.example`.

\*\*Aceite:\*\* `pnpm install` resolve; `pnpm build` e `pnpm lint` passam com workspaces vazios; lockfile commitado.



\#### \[x] S1 — Base do backend (NestJS endurecido)

\*\*Depende de:\*\* S0

\*\*Objetivo:\*\* API que sobe com config validada, segura por padrão e observável.

\*\*Arquivos:\*\*

\- `apps/api/src/main.ts` — Helmet (CSP/HSTS), CORS allowlist via env, rate limit global, `enableShutdownHooks`, logger JSON.

\- `apps/api/src/app.module.ts` — ConfigModule global + ThrottlerModule + PrismaModule + HealthModule.

\- `apps/api/src/config/env.validation.ts` — schema Zod das envs (DATABASE\_URL, REDIS\_URL, JWT\_SECRET, CORS\_ORIGINS, NODE\_ENV); falha na inicialização se faltar.

\- `apps/api/src/prisma/prisma.service.ts` — conexão + shutdown hooks.

\- `apps/api/src/health/health.controller.ts` — `GET /health` (checa db/redis).

\*\*Específico de segurança:\*\* Swagger/debug só fora de produção; erro genérico ao cliente; trace id por request.

\*\*Aceite:\*\* `/health` 200 com status das dependências; subir sem uma env obrigatória aborta com mensagem clara; testes do health e da validação de env.



\#### \[x] S2 — Schema núcleo multi-tenant + seed

\*\*Depende de:\*\* S1

\*\*Objetivo:\*\* Fundação de dados Org/Acesso com conta demo de revisor de loja.

\*\*Arquivos:\*\*

\- `apps/api/prisma/schema.prisma` — Tenant, Clinic, Unit, User, UserUnit, Role, Permission, RolePermission, AuditLog (ver schema.prisma já entregue).

\- `apps/api/prisma/seed.ts` — idempotente: 1 tenant demo, papéis de sistema (GESTOR/DENTISTA/RECEPCAO/FINANCEIRO), catálogo de permissions, \*\*conta demo de revisor\*\* (senha argon2).

\- `apps/api/package.json` — script `prisma:seed` + config.

\- `packages/types/src/\*` — exporta enums/tipos derivados.

\*\*Específico de segurança:\*\* senha do seed com argon2; nada de PII no AuditLog; email único por tenant (não global).

\*\*Aceite:\*\* `prisma migrate dev` aplica; `prisma:seed` cria tudo e roda 2x sem duplicar; teste de idempotência.



\#### \[x] S3 — Autenticação

\*\*Depende de:\*\* S1, S2

\*\*Objetivo:\*\* Login/refresh/logout com JWT seguro e sessão revogável.

\*\*Arquivos:\*\*

\- `auth/auth.module.ts` — wiring (JWT, Redis, Throttler do login).

\- `auth/auth.service.ts` — verify argon2; access curto (\~15min); refresh rotativo com `jti` no Redis; logout revoga `jti`.

\- `auth/auth.controller.ts` — `POST /auth/login|refresh|logout`; rate limit reforçado no login (ex.: 5/min/IP).

\- `auth/strategies/jwt.strategy.ts` — valida access e popula `req.user` (userId, tenantId, roleId).

\- `auth/dto/\*` — class-validator.

\*\*Específico de segurança:\*\* erro de login genérico (não revela usuário vs senha); nunca logar senha/token; lockout/anti-brute-force.

\*\*Aceite:\*\* login válido → access+refresh; inválido → 401 genérico; refresh rotaciona (anterior para de funcionar); logout revoga; 4 testes.



\#### \[x] S4 — RBAC + tenant guard + anti-IDOR

\*\*Depende de:\*\* S3

\*\*Objetivo:\*\* O controle de acesso que impede um tenant de ver dado de outro (risco #1).

\*\*Arquivos:\*\*

\- `common/guards/tenant.guard.ts` — injeta `tenantId` do JWT no contexto; sem tenant → 401.

\- `common/decorators/permissions.decorator.ts` + `permissions.guard.ts` — deny-by-default por permission key.

\- `common/repositories/tenant-scoped.helper.ts` — wrapper que força `where: { tenantId }` (e `ownerId` quando aplicável).

\- `common/audit/audit.service.ts` — registra `AUTHZ\_DENIED`, `SENSITIVE\_READ`, `PERMISSION\_CHANGED`.

\*\*Específico de segurança:\*\* É a sessão-âncora do anti-IDOR; toda query de registro do usuário passa pelo helper.

\*\*Aceite:\*\* teste prova que usuário do tenant A recebe 403 ao ler/alterar recurso do tenant B; toda negação gera AuditLog; rota sem permission decorator é negada por padrão.



\### FASE 1 — MVP de valor + apps nas lojas



\#### \[x] S5 — Módulo Patient

\*\*Depende de:\*\* S4

\*\*Objetivo:\*\* Cadastro de paciente com origem de lead, tenant-scoped.

\*\*Arquivos:\*\* schema (+`Patient`: dados, `leadSource`, `referredById`), `patient/{module,service,controller}.ts`, `patient/dto/\*`.

\*\*Específico:\*\* cadastro rápido de 1ª consulta (só essencial); soft-delete preparado.

\*\*Aceite:\*\* CRUD tenant-scoped; teste anti-IDOR (tenant A não acessa paciente de B); validação de telefone/CPF.



\#### \[x] S6 — Appointment + Availability (backend)

\*\*Depende de:\*\* S5

\*\*Objetivo:\*\* Núcleo da agenda com regras de horário e conflito.

\*\*Arquivos:\*\* schema (+`Appointment` status/marcadores, +`Availability`), `appointment/{module,service,controller}.ts`, `appointment/dto/\*`.

\*\*Específico:\*\* checagem de conflito de horário por profissional/sala; timezone da unidade.

\*\*Aceite:\*\* criar/mover/cancelar; tentar marcar em horário ocupado → 409; teste de conflito.



\#### \[x] S7 — Web base + agenda  ·  \*(S7a scaffold/auth + S7b tela de agenda)\*

\*\*Depende de:\*\* S6

\*\*Objetivo:\*\* Primeira tela útil de gestão (desktop/tablet).

\*\*Arquivos:\*\* `apps/web` (App Router, login consumindo auth, layout, guard de rota), `packages/api-client` (client tipado + interceptor de refresh), tela de agenda (listar/criar).

\*\*Específico:\*\* token em cookie httpOnly/secure; nenhum segredo no front.

\*\*Aceite:\*\* logar no web, ver e criar agendamento; refresh transparente ao expirar access.



\#### \[x] S8 — mobile-patient base + EAS  ·  \*DIVIDIDA: \[x] S8a (auth do paciente — backend) · \[x] S8b (/me/consultas + faixa de guard) · \[x] S8c (casca Expo+EAS) · \[x] S8d (login + minhas consultas)\*

\*\*Depende de:\*\* S6

\*\*Objetivo:\*\* App do Paciente nativo, pronto para trilha de loja.

\*\*Arquivos:\*\* `apps/mobile-patient` (Expo Router, login, tela "minhas consultas"), `app.config.ts` (bundleId/package, ícone, splash, permissões mínimas + iOS usage strings), `eas.json` (perfis dev/preview/production), init Sentry.

\*\*Específico (loja, §5):\*\* targetSdk 36 / iOS SDK 26; sem segredo no bundle; permissões justificadas.

\*\*Aceite:\*\* build EAS (dev) roda em device físico; paciente loga e vê só as próprias consultas (anti-IDOR).



\#### \[ ] S9 — mobile-pro base + EAS

\*\*Depende de:\*\* S6

\*\*Objetivo:\*\* App do Profissional nativo, mesmo padrão de loja.

\*\*Arquivos:\*\* `apps/mobile-pro` (Expo Router, login, agenda do dia read-only), `app.config.ts` (bundleId próprio), `eas.json`, Sentry.

\*\*Específico (loja, §5):\*\* listagem B2B distinta; permissões mínimas próprias.

\*\*Aceite:\*\* build EAS roda em device; profissional vê a agenda do dia da sua unidade.



\#### \[ ] S10 — Exclusão de conta (requisito de loja)

\*\*Depende de:\*\* S3, S8, S9

\*\*Objetivo:\*\* Atender Apple 5.1.1 + Google: usuário apaga a própria conta.

\*\*Arquivos:\*\* `auth/account.controller.ts` (`DELETE /me` → soft-delete + anonimização, respeitando guarda legal do prontuário), tela de exclusão nos dois apps, página web pública de exclusão.

\*\*Específico (loja):\*\* confirma intenção; explica o que é apagado vs retido por lei; auditado.

\*\*Aceite:\*\* fluxo completo anonimiza dados pessoais e bloqueia login; URL pública responde; teste do soft-delete + retenção legal.



\#### \[ ] S11 — Confirmação de consulta

\*\*Depende de:\*\* S6, S8

\*\*Objetivo:\*\* Paciente confirma presença pelo app; status reflete na agenda.

\*\*Arquivos:\*\* schema (+`ConfirmationEvent`), `appointment/confirmation.service.ts`, endpoint de confirmação, telas mobile.

\*\*Específico:\*\* idempotência (confirmar 2x não duplica evento).

\*\*Aceite:\*\* confirmar no mobile muda status no web; histórico de eventos registrado.



\#### \[ ] S12 — WhatsApp (Evolution) — fila de confirmação

\*\*Depende de:\*\* S11

\*\*Objetivo:\*\* Disparo e recebimento de confirmação por WhatsApp.

\*\*Arquivos:\*\* `integrations/whatsapp/whatsapp.service.ts` (proxy backend, anti-SSRF), fila `confirmation-sender` (idempotente/backoff/DLQ), `whatsapp.webhook.controller.ts`, config/env.

\*\*Específico:\*\* segredos da Evolution só no backend; webhook valida assinatura/origem.

\*\*Aceite:\*\* job envia confirmação D-1; resposta do paciente via webhook atualiza status; reprocesso não duplica; falha vai para DLQ.



\#### \[ ] S13 — Push notifications

\*\*Depende de:\*\* S8, S9

\*\*Objetivo:\*\* Lembretes nativos nos dois apps.

\*\*Arquivos:\*\* schema (+`Notification`, token de device), `integrations/push/push.service.ts` (Expo Notifications), fila `push-sender`, registro de token nos apps.

\*\*Específico (loja):\*\* APNs+FCM; pedir permissão de push com contexto; opt-out respeitado.

\*\*Aceite:\*\* registrar device e receber push de lembrete em device real; opt-out interrompe envio.



\#### \[ ] S14 — Self check-in

\*\*Depende de:\*\* S6, S8

\*\*Objetivo:\*\* Paciente faz check-in pelo app ao chegar.

\*\*Arquivos:\*\* schema (+`WaitList`), `appointment/checkin.service.ts`, endpoint, tela no app do paciente, indicador na agenda web.

\*\*Específico:\*\* check-in só dentro de janela/raio configurável (opcional); idempotente.

\*\*Aceite:\*\* check-in pelo app coloca paciente na fila de espera visível no web em tempo real.



\#### \[ ] S15 — Agendamento online

\*\*Depende de:\*\* S6

\*\*Objetivo:\*\* Paciente marca sozinho dentro das regras da clínica.

\*\*Arquivos:\*\* `appointment/availability.service.ts` (regras), endpoint público de slots (rate limit), tela pública de booking (web) + fluxo no app.

\*\*Específico:\*\* endpoint público com rate limit forte; não vaza agenda interna além dos slots livres.

\*\*Aceite:\*\* paciente agenda em slot livre; respeita conflito, janela e antecedência mínima; slot some após marcado.



\### FASE 2 — Motor de lucratividade (comercial + financeiro + clínico)



\#### \[ ] S16 — Procedure / PriceTable / Plan

\*\*Depende de:\*\* S4

\*\*Objetivo:\*\* Catálogo de procedimentos, tabelas de preço e convênios.

\*\*Arquivos:\*\* schema (+`Procedure`,`PriceTable`,`Plan`), `catalog/{module,service,controller}.ts`, tela web de cadastro.

\*\*Aceite:\*\* cadastrar procedimento/tabela/convênio tenant-scoped; preço por convênio.



\#### \[ ] S17 — Orçamento (Budget)

\*\*Depende de:\*\* S16

\*\*Objetivo:\*\* Montar e acompanhar orçamentos.

\*\*Arquivos:\*\* schema (+`Budget`,`BudgetItem`, status), `budget/{module,service,controller}.ts`, tela web.

\*\*Específico:\*\* total calculado no backend (nunca confiar em total do front).

\*\*Aceite:\*\* gerar orçamento com itens e total correto; mudar status (aberto/aprovado/recusado); conversão registrada para relatório.



\#### \[ ] S18 — Contrato + Termos + assinatura eletrônica

\*\*Depende de:\*\* S17

\*\*Objetivo:\*\* Fechar o orçamento com documento assinado e válido.

\*\*Arquivos:\*\* schema (+`Contract`,`Consent`), `integrations/esign/esign.service.ts` (ICP, trilha IP+timestamp+hash), endpoint, tela de assinatura.

\*\*Específico:\*\* evidência jurídica completa; documento imutável após assinado (hash).

\*\*Aceite:\*\* gerar contrato a partir do orçamento aprovado; paciente assina; evidência registrada e verificável.



\#### \[ ] S19 — Charge/Installment + Asaas

\*\*Depende de:\*\* S17

\*\*Objetivo:\*\* Transformar venda em cobranças (PIX/boleto/cartão).

\*\*Arquivos:\*\* schema (+`Charge`,`Installment`,`PixCharge`,`Boleto`,`CardTransaction`), `integrations/asaas/asaas.service.ts` (proxy backend), `billing/{module,service,controller}.ts`.

\*\*Específico:\*\* segredos Asaas só no backend; valores conferidos no servidor.

\*\*Aceite:\*\* aprovar orçamento gera parcelas + cobrança PIX/boleto via Asaas (sandbox); status persistido.



\#### \[ ] S20 — Baixa automática (reconciler)

\*\*Depende de:\*\* S19

\*\*Objetivo:\*\* Conciliar pagamento recebido automaticamente.

\*\*Arquivos:\*\* `billing/asaas.webhook.controller.ts` (valida assinatura), fila `payment-reconciler` (idempotente), schema (+`Payment`,`Reconciliation`).

\*\*Específico:\*\* webhook idempotente por id de evento; fail-closed se assinatura inválida.

\*\*Aceite:\*\* webhook de pagamento dá baixa na parcela; reprocesso do mesmo evento não dá baixa dupla; teste.



\#### \[ ] S21 — App do Paciente: financeiro

\*\*Depende de:\*\* S19, S8

\*\*Objetivo:\*\* Paciente vê e paga a própria parcela pelo app.

\*\*Arquivos:\*\* endpoint "minhas parcelas" (tenant+owner scoped), telas mobile (ver parcela, copiar PIX copia-e-cola / código de barras do boleto).

\*\*Específico (anti-IDOR):\*\* paciente só enxerga as próprias cobranças.

\*\*Aceite:\*\* ver próxima parcela e copiar PIX/boleto; teste de que não acessa parcela de outro paciente.



\#### \[ ] S22 — Régua de cobrança

\*\*Depende de:\*\* S19, S12

\*\*Objetivo:\*\* Lembretes/cobranças automáticos escalonados.

\*\*Arquivos:\*\* schema (+`CollectionRule`,`CollectionEvent`), fila `collection-ruler` (cron diário), `collection/service.ts`.

\*\*Específico:\*\* jobs idempotentes por (parcela, etapa); respeitar opt-out.

\*\*Aceite:\*\* parcela vencendo dispara D-3/D0/D+X via WhatsApp; eventos logados; não reenvia etapa já enviada.



\#### \[ ] S23 — NFS-e

\*\*Depende de:\*\* S20

\*\*Objetivo:\*\* Emissão fiscal integrada ao pagamento.

\*\*Arquivos:\*\* `integrations/nfse/nfse.service.ts` (integrador), fila `nfse-emitter`, schema (+`Invoice`), endpoint.

\*\*Específico:\*\* retry com backoff (prefeituras instáveis); status e retorno persistidos.

\*\*Aceite:\*\* emitir NFS-e (homologação) a partir de um pagamento; status refletido; falha vai para DLQ com motivo.



\#### \[ ] S24 — Recibos

\*\*Depende de:\*\* S20

\*\*Objetivo:\*\* Comprovante PDF de pagamento.

\*\*Arquivos:\*\* `receipt/receipt.service.ts` (gera PDF), endpoint, upload p/ Spaces (URL assinada).

\*\*Aceite:\*\* gerar recibo PDF de um pagamento, acessível por URL assinada de expiração curta.



\#### \[ ] S25 — SPC consulta + inclusão

\*\*Depende de:\*\* S5, S19

\*\*Objetivo:\*\* Avaliar e cobrar inadimplência via bureau.

\*\*Arquivos:\*\* `integrations/spc/spc.service.ts` (anti-SSRF, fila `spc-query`), schema (+`CreditCheck`), endpoints de consulta e inclusão.

\*\*Específico:\*\* consentimento/base legal; tudo auditado; segredos no backend.

\*\*Aceite:\*\* consultar score (sandbox) antes de parcelar; inclusão de inadimplente registrada e auditada.



\#### \[ ] S26 — Prontuário (MedicalRecord) + anexos

\*\*Depende de:\*\* S5

\*\*Objetivo:\*\* Registro clínico seguro com imagens/exames.

\*\*Arquivos:\*\* schema (+`MedicalRecord`,`RecordEntry`,`Attachment`), `record/{module,service,controller}.ts`, upload p/ Spaces (URL assinada), cifra em repouso.

\*\*Específico:\*\* acesso a dado de saúde gera `SENSITIVE\_READ` no AuditLog; criptografia em repouso.

\*\*Aceite:\*\* criar entrada e anexar imagem; todo acesso auditado; anti-IDOR no acesso ao prontuário.



\#### \[ ] S27 — Odontograma

\*\*Depende de:\*\* S26

\*\*Objetivo:\*\* Mapa dental interativo vinculado ao prontuário.

\*\*Arquivos:\*\* schema (+`Odontogram`,`ToothCondition`), `odontogram/service.ts`, componente SVG interativo (web).

\*\*Aceite:\*\* marcar condição por dente/face e persistir vinculado ao prontuário; render correto ao reabrir.



\#### \[ ] S28 — Anamnese digital

\*\*Depende de:\*\* S26, S18

\*\*Objetivo:\*\* Anamnese personalizável preenchida e assinada remotamente.

\*\*Arquivos:\*\* schema (+`Anamnesis`,`AnamnesisTemplate`), `anamnesis/service.ts`, link de preenchimento + assinatura (reusa esign da S18), tela no app do paciente.

\*\*Específico:\*\* template por procedimento; link com token de uso único/expiração.

\*\*Aceite:\*\* enviar anamnese por link; paciente preenche/assina remoto; fica no prontuário com evidência.



\### FASE 3 — Execução, clínico avançado e fidelização



\#### \[ ] S29 — Fichas por especialidade

\*\*Depende de:\*\* S26

\*\*Objetivo:\*\* Ficha clínica específica por área (Orto, Implanto, Endo, HOF, Alinhadores, Estética).

\*\*Arquivos:\*\* schema (+`SpecialtyForm`, campos por tipo), `specialty/service.ts`, render dinâmico (web).

\*\*Aceite:\*\* cada profissional usa a ficha da sua especialidade; campos persistidos e versionados.



\#### \[ ] S30 — Plano de tratamento + execução

\*\*Depende de:\*\* S17, S26

\*\*Objetivo:\*\* Converter orçamento em plano executável por sessão.

\*\*Arquivos:\*\* schema (+`TreatmentPlan`,`TreatmentItem`,`ExecutionLog`), `treatment/{module,service,controller}.ts`, telas web.

\*\*Aceite:\*\* gerar plano a partir do orçamento; registrar execução por sessão com data/profissional.



\#### \[ ] S31 — Casos de alinhadores

\*\*Depende de:\*\* S30, S8

\*\*Objetivo:\*\* Acompanhamento por etapas, com visão no app do paciente.

\*\*Arquivos:\*\* schema (+`AlignerCase`,`AlignerStep`), `aligner/service.ts`, tela de acompanhamento no app do paciente.

\*\*Aceite:\*\* criar caso com N etapas; paciente vê etapa atual e próxima troca no app.



\#### \[ ] S32 — Atestados/Receituários + certificado digital

\*\*Depende de:\*\* S26

\*\*Objetivo:\*\* Documentos clínicos assinados digitalmente (ICP) com validade jurídica.

\*\*Arquivos:\*\* `document/document.service.ts` (gera PDF), assinatura digital ICP do profissional (reusa esign), endpoint, tela.

\*\*Específico:\*\* certificado do profissional nunca trafega/armazena no client.

\*\*Aceite:\*\* emitir receituário/atestado assinado digitalmente (homologação) com verificação de validade.



\#### \[ ] S33 — Alerta de retorno

\*\*Depende de:\*\* S6, S12

\*\*Objetivo:\*\* Gerar receita recorrente trazendo o paciente de volta.

\*\*Arquivos:\*\* schema (+`ReturnAlert`), fila `return-alert-scheduler`, `return/service.ts`.

\*\*Aceite:\*\* ao fim da consulta, agenda alerta; no prazo definido vira tarefa de reagendamento (e/ou mensagem).



\#### \[ ] S34 — CRC (Central de Relacionamento)

\*\*Depende de:\*\* S33

\*\*Objetivo:\*\* Fila de tarefas de relacionamento do dia.

\*\*Arquivos:\*\* schema (+`CRCTask`), `crc/{module,service,controller}.ts`, tela web (lista priorizada).

\*\*Aceite:\*\* lista de contatos do dia (retorno, pós-venda, reativação, aniversário) com marcar-como-feito e atribuição.



\#### \[ ] S35 — Controle protético

\*\*Depende de:\*\* S30

\*\*Objetivo:\*\* Rastrear envio/retorno de laboratório.

\*\*Arquivos:\*\* schema (+`ProstheticOrder`), `prosthetic/service.ts`, tela, vínculo ao tratamento.

\*\*Aceite:\*\* registrar envio ao laboratório e retorno com prazos e status; alerta de atraso.



\#### \[ ] S36 — Câmera intraoral / Image2Doc

\*\*Depende de:\*\* S26

\*\*Objetivo:\*\* Anexar imagem intraoral ao documento clínico.

\*\*Arquivos:\*\* `record/image.service.ts` (upload Spaces + URL assinada), integração de captura (web), anexo ao prontuário.

\*\*Aceite:\*\* anexar imagem intraoral ao registro do paciente; thumbnail e visualização com URL assinada.



\### FASE 4 — Financeiro da clínica + gestão estratégica



\#### \[ ] S37 — Contas a pagar/receber

\*\*Depende de:\*\* S20

\*\*Objetivo:\*\* Lançamentos financeiros da clínica.

\*\*Arquivos:\*\* schema (+`Account` tipo/vencimento/status), `finance/account.service.ts`, telas.

\*\*Aceite:\*\* lançar conta a pagar/receber com vencimento, categoria e status; baixa manual.



\#### \[ ] S38 — Fluxo de caixa + conciliação

\*\*Depende de:\*\* S37, S20

\*\*Objetivo:\*\* Visão de caixa e conciliação bancária.

\*\*Arquivos:\*\* schema (+`CashFlow`,`BankReconciliation`), `finance/cashflow.service.ts`, tela com entradas/saídas.

\*\*Aceite:\*\* visão diária/mensal de caixa; conciliar lançamento com pagamento (auto da S20 + manual).



\#### \[ ] S39 — Estoque

\*\*Depende de:\*\* S16

\*\*Objetivo:\*\* Controle de insumos com validade e custo.

\*\*Arquivos:\*\* schema (+`Inventory`,`Item`,`StockMovement`,`Batch`), `inventory/{module,service}.ts`, alertas.

\*\*Aceite:\*\* entrada/saída, baixa por procedimento, alerta de validade e de estoque mínimo.



\#### \[ ] S40 — Comissões

\*\*Depende de:\*\* S30, S20

\*\*Objetivo:\*\* Calcular comissão por profissional.

\*\*Arquivos:\*\* schema (+`Commission`), `commission/service.ts` (regra por procedimento/percentual), relatório.

\*\*Aceite:\*\* calcular comissão de procedimento executado/pago; relatório por profissional e período.



\#### \[ ] S41 — Metas

\*\*Depende de:\*\* S42 (ou paralelo)

\*\*Objetivo:\*\* Definir e acompanhar metas.

\*\*Arquivos:\*\* schema (+`Goal`), `goal/service.ts`, acompanhamento meta vs realizado.

\*\*Aceite:\*\* definir meta por clínica/profissional/período e ver progresso atualizado.



\#### \[ ] S42 — Dashboard analítico

\*\*Depende de:\*\* S6, S19

\*\*Objetivo:\*\* Indicadores-chave num só lugar.

\*\*Arquivos:\*\* `analytics/dashboard.service.ts` (agrega + cache Redis), tela web com gráficos (ocupação, receita, faturamento, conversão).

\*\*Específico:\*\* consultas agregadas otimizadas; cache invalidado por eventos.

\*\*Aceite:\*\* dashboard do tenant carrega indicadores em <2s via cache; números batem com relatórios.



\#### \[ ] S43 — Engine de relatórios

\*\*Depende de:\*\* S42

\*\*Objetivo:\*\* Catálogo de relatórios exportáveis.

\*\*Arquivos:\*\* `reports/report.service.ts`, fila `report-builder` (pesados em background), export CSV/PDF.

\*\*Aceite:\*\* gerar relatório de faturamento e de faltas/desmarcações com filtro de período; export funciona.



\#### \[ ] S44 — CRM: origem, indicação e demografia

\*\*Depende de:\*\* S5

\*\*Objetivo:\*\* Ligar marketing a faturamento.

\*\*Arquivos:\*\* schema (+`CRMLead`,`LeadSource`,`Referral`), `crm/service.ts`, relatórios (origem, faixa etária, localização).

\*\*Aceite:\*\* rastrear lead da origem ao agendamento/fechamento; relatório de ROI por canal; quem indicou quem.



\### FASE 5 — Rede/franquia + IA



\#### \[ ] S45 — Central de acessos multi-unidade

\*\*Depende de:\*\* S4

\*\*Objetivo:\*\* Um login navega entre unidades autorizadas.

\*\*Arquivos:\*\* contexto de unidade no JWT/sessão, `network/access.service.ts`, seletor de unidade (web).

\*\*Específico (anti-IDOR):\*\* troca de unidade revalida autorização no servidor.

\*\*Aceite:\*\* usuário navega só entre unidades autorizadas; toda query permanece tenant+unit scoped.



\#### \[ ] S46 — Gestão + ranking de unidades

\*\*Depende de:\*\* S42, S45

\*\*Objetivo:\*\* Comparar performance entre unidades (franqueador).

\*\*Arquivos:\*\* `network/units.service.ts`, dashboard consolidado, ranking.

\*\*Aceite:\*\* franqueador vê comparativo (faturamento/ocupação/conversão) e ranking entre unidades.



\#### \[ ] S47 — Royalties

\*\*Depende de:\*\* S20, S46

\*\*Objetivo:\*\* Calcular e cobrar royalties por unidade.

\*\*Arquivos:\*\* schema (+`Royalty`), `network/royalty.service.ts` (cálculo sobre faturamento), cobrança via split Asaas.

\*\*Aceite:\*\* calcular royalty do período por unidade e gerar cobrança; conciliação do recebimento.



\#### \[ ] S48 — Central de agendamentos

\*\*Depende de:\*\* S45, S6

\*\*Objetivo:\*\* Operar agenda de múltiplas unidades de um ponto.

\*\*Arquivos:\*\* `network/scheduling-center.service.ts`, visão consolidada, roteamento de marcação.

\*\*Aceite:\*\* operador agenda em qualquer unidade autorizada a partir de uma central.



\#### \[ ] S49 — API pública + white-label

\*\*Depende de:\*\* S4

\*\*Objetivo:\*\* Integração de terceiros e personalização por tenant.

\*\*Arquivos:\*\* `public-api/` (API key por tenant, escopos, rate limit), webhooks de saída, tema/branding por tenant.

\*\*Específico:\*\* chave escopada com menor privilégio; rate limit por chave; logs de uso.

\*\*Aceite:\*\* terceiro consome API com chave escopada; webhook de saída entrega evento; branding por tenant aplica no web/app.



\#### \[ ] S50 — IA: agente de agendamento (WhatsApp)

\*\*Depende de:\*\* S12, S15

\*\*Objetivo:\*\* Agendar/confirmar por conversa, com guardrails.

\*\*Arquivos:\*\* `ai/agent.service.ts`, orquestração com Evolution, validações de backend.

\*\*Específico (loja §5):\*\* disclosure de IA; agente nunca decide dado sensível sozinho — só propõe e o backend valida.

\*\*Aceite:\*\* agente agenda/confirma via conversa respeitando regras de disponibilidade; ação efetivada só após validação no backend.



\#### \[ ] S51 — IA: insights

\*\*Depende de:\*\* S42, S44

\*\*Objetivo:\*\* Sugestões acionáveis a partir dos dados do tenant.

\*\*Arquivos:\*\* `ai/insights.service.ts` (lê dados agregados), painel de sugestões (web).

\*\*Específico:\*\* opera sobre dados agregados/anonimizados quando possível; disclosure de IA.

\*\*Aceite:\*\* gerar insight de conversão/inadimplência/ocupação com explicação; nada de PII enviada a terceiros sem base legal.



\### FASE 6 — Produção, loja e hardening



\#### \[ ] S52 — CI/CD com gates

\*\*Depende de:\*\* features estáveis

\*\*Objetivo:\*\* Pipeline que impede merge ruim.

\*\*Arquivos:\*\* `.github/workflows/ci.yml` (lint+test+build+SCA), gitleaks (bloqueia segredo), branch protection.

\*\*Aceite:\*\* PR com segredo, lint quebrado ou teste falhando é bloqueado; pipeline verde obrigatório para merge.



\#### \[ ] S53 — Infra como código

\*\*Depende de:\*\* S52

\*\*Objetivo:\*\* Infra reproduzível na DigitalOcean.

\*\*Arquivos:\*\* `infra/\*.tf` (Managed Postgres/Redis, Spaces, App/Droplet, ambientes dev/staging/prod com segredos distintos).

\*\*Aceite:\*\* `terraform plan` reproduz a infra; ambientes separados; nada criado por clique manual.



\#### \[ ] S54 — Hardening de produção

\*\*Depende de:\*\* S53

\*\*Objetivo:\*\* Endurecer config e garantir recuperação.

\*\*Arquivos:\*\* config prod (Swagger/debug off, cookies seguros, HTTPS, cifra em repouso), rotina de backup testada.

\*\*Aceite:\*\* checklist de produção do guia (itens 24–26) verde; restore de backup testado de verdade.



\#### \[ ] S55 — Observabilidade + alertas

\*\*Depende de:\*\* S53

\*\*Objetivo:\*\* Saber quando algo quebra antes do cliente.

\*\*Arquivos:\*\* Sentry nos 4 apps, métricas + alertas (5xx, falha de auth, indisponibilidade), healthchecks liveness/readiness.

\*\*Aceite:\*\* erro em prod gera alerta acionável; painel de saúde ativo; logs estruturados sem PII.



\#### \[ ] S56 — Submissão Apple/Google (App do Paciente)

\*\*Depende de:\*\* S10, S13, fases 1–2 estáveis

\*\*Objetivo:\*\* Paciente em trilha de loja sem rejeição de completude.

\*\*Arquivos:\*\* metadados/descrição, screenshots, App Privacy (iOS) + Data Safety (Google) honestos (dado de saúde/financeiro), notas de revisão com \*\*conta demo\*\*, `eas submit`.

\*\*Aceite:\*\* app do paciente publicado em TestFlight/Internal sem rejeição de completude (Guideline 2.1); fluxo de exclusão de conta validado pelo revisor.



\#### \[ ] S57 — Submissão Apple/Google (Profissional) + produção

\*\*Depende de:\*\* S56

\*\*Objetivo:\*\* Profissional na loja e promoção dos dois apps a produção.

\*\*Arquivos:\*\* idem para `mobile-pro`, promoção trilha interna → produção dos dois apps, monitoramento pós-launch.

\*\*Aceite:\*\* ambos os apps aprovados/publicados; versão/buildNumber corretos; crash-free monitorado.



\---



\## 11. LOG DE SESSÕES (atualizar ao FIM de cada sessão)



> Formato por entrada: data · sessão · o que foi feito · arquivos tocados · decisões/ADR · pendências para a próxima.



\- \*\*2026-06-06 · S0 — Scaffold do monorepo\*\*

  \- \*O que foi feito:\* esqueleto Turborepo + pnpm workspaces que builda/linta vazio; presets compartilhados em `packages/config` (eslint, tsconfig.base, prettier, tailwind com paleta da marca §0). `pnpm install` resolve (lockfile gerado), `pnpm build` e `pnpm lint` passam, `pnpm audit` sem vulnerabilidades, `pnpm format:check` limpo.

  \- \*Arquivos tocados:\* `pnpm-workspace.yaml`, `turbo.json`, `package.json` (raiz), `.gitignore`, `.prettierignore`, `.env.example`, `README.md`, `packages/config/{package.json,tsconfig.base.json,eslint-preset.js,prettier-preset.js,tailwind-preset.js}`.

  \- \*Decisões:\* Node `>=20` + pnpm fixado em `8.15.6` via `packageManager` (corepack). Turbo 2.x → chave `tasks` (não mais `pipeline`). ESLint 8 (`.eslintrc`-style) para máxima compatibilidade dos presets. tsconfig estrito (noUncheckedIndexedAccess, exactOptionalPropertyTypes). `.env*` ignorado desde já; `.env.example` sem segredos.

  \- \*Pendências p/ próxima:\* repositório \*\*git ainda não inicializado\*\* (usuário optou por adiar) — antes da S1 rodar `git init` e commitar o lockfile (§4 exige lockfile commitado). Próxima sessão: \*\*S1 — Base do backend (NestJS endurecido)\*\*.

\- \*\*2026-06-06 · S1 — Base do backend (NestJS endurecido)\*\*

  \- \*O que foi feito:\* `apps/api` (NestJS 11) sobe com config validada por Zod (aborta com mensagem clara se faltar env), Helmet (CSP/HSTS), CORS por allowlist via env, rate limit global (Throttler 100/15min), logger JSON (nestjs-pino) com trace id por request e redact de authorization/cookie, `enableShutdownHooks`, ValidationPipe global (whitelist). `GET /health` checa Postgres + Redis e responde 503 fail-closed se algo cair. Filtro global de exceções: HttpException repassa payload seguro, erro inesperado vira 500 genérico (stack só no log). git inicializado e S0 commitada.

  \- \*Arquivos tocados:\* `apps/api/{package.json,tsconfig.json,tsconfig.build.json,nest-cli.json,jest.config.js,.eslintrc.cjs,.env.example}`, `apps/api/prisma/schema.prisma` (só generator+datasource), `src/main.ts`, `src/app.module.ts`, `src/config/env.validation.ts`, `src/prisma/{prisma.service,prisma.module}.ts`, `src/redis/{redis.service,redis.module}.ts`, `src/health/{health.controller,health.module}.ts`, `src/common/filters/all-exceptions.filter.ts`, testes `test/{env.validation,health.controller}.spec.ts`; raiz: `.gitattributes` (LF).

  \- \*Decisões:\* NestJS 11 + @nestjs/config 4 + throttler 6 + nestjs-pino 4 + ioredis 5 + Prisma 6. `tsconfig` da api sobrescreve base para CommonJS/Node + decorators. `exactOptionalPropertyTypes` exigiu omitir a chave `transport` do pino em prod (não setar `undefined`). ESLint preset referenciado via `require.resolve` (resolução de subpath do ESLint 8 falha sem isso). PrismaModule/RedisModule são `@Global`. Helmet com defaults (CSP/HSTS on).

  \- \*Verificação:\* `pnpm build`/`lint`/`test` (7 testes) verdes, `pnpm audit` sem vulnerabilidades, `format:check` limpo. \*\*Não\*\* validei `GET /health` 200 em runtime — exige Postgres+Redis de pé (sem docker-compose ainda); a lógica está coberta por testes unitários.

  \- \*Pendências p/ próxima:\* criar `docker-compose.yml` (Postgres+Redis) para subir a API localmente e validar `/health` 200 de verdade. Próxima sessão: \*\*S2 — Schema núcleo multi-tenant + seed\*\* (modelos entram em `schema.prisma`).

\- \*\*2026-06-07 · S2 — Schema núcleo multi-tenant + seed\*\*

  \- \*O que foi feito:\* schema Prisma do núcleo Org/Acesso com 9 modelos multi-tenant (`Tenant, Clinic, Unit, User, UserUnit, Role, Permission, RolePermission, AuditLog`) + enum `AuditAction`. Todos com `tenantId` (regra §2), exceto `Permission` (catálogo global de sistema — exceção documentada). Anti-IDOR de base: email único POR TENANT (`@@unique([tenantId,email])`), índices em `tenantId`. Novo pacote `@vero/types` (compila CommonJS p/ runtime NestJS/ts-node) como FONTE ÚNICA do catálogo de 18 permissions, dos 4 papéis de sistema com mapeamento papel→permission, e das ações de auditoria (const + Zod). Seed IDEMPOTENTE (upsert / ids determinísticos) cria tenant demo + clínica + unidade, papéis, permissions e a CONTA DEMO DE REVISOR de loja (§5) com senha argon2 (de `SEED_DEMO_PASSWORD`; default só fora de produção). Validado AO VIVO contra Postgres efêmero (docker): `migrate dev` aplicou (migration 100% aditiva, não-destrutiva), `prisma db seed` rodou 2x sem duplicar, e o teste de idempotência (2 casos: contagens estáveis + senha demo confere) passou.

  \- \*Arquivos tocados:\* `packages/types/{package.json,tsconfig.json,.eslintrc.cjs,src/index.ts,src/rbac.ts}` (novo pacote); `apps/api/prisma/schema.prisma` (9 modelos + enum), `apps/api/prisma/seed.ts` (novo), `apps/api/prisma/migrations/20260607084705_s2_core_multitenant/` (gerada); `apps/api/package.json` (deps `argon2`+`@vero/types`, config `prisma.seed`, scripts `prisma:seed`/`prisma:migrate`/`test:int`); `apps/api/test/seed.idempotency.spec.ts` (novo, gated por `RUN_DB_TESTS`); `apps/api/.env.example` (sem alteração nesta sessão). Lockfile atualizado.

  \- \*Decisões:\* `@vero/types` compila para CommonJS (`module: CommonJS`) — NestJS/ts-node consomem JS, não TS-source; `main`→`dist/index.js`, build via `tsc` (turbo `^build` garante ordem antes da api). `Role.key`/`Permission.key` como String (não enum Prisma) → permite papéis customizados sem migration de enum; `AuditAction` é enum Prisma (set fixo, integridade no banco) espelhado em `@vero/types` (Prisma exige o enum no DSL — única duplicação aceita, comentada nos dois lados). `UserUnit`/`RolePermission` carregam `tenantId` (consistência com o tenant-scoped helper da S4). Soft-delete (`deletedAt`) preparado em Tenant/Clinic/Unit/User. Teste de idempotência é INTEGRAÇÃO (exige Postgres), gated por `RUN_DB_TESTS=1` (`pnpm --filter @vero/api test:int`) p/ manter `pnpm test`/CI verdes sem banco — o CI ganha serviço Postgres na S52. Aviso do Prisma 6 sobre migrar `package.json#prisma`→`prisma.config.ts` (obrigatório só no Prisma 7) anotado, não migrado agora.

  \- \*Verificação:\* `pnpm lint`/`test`/`build`/`format:check`/`audit` todos verdes. AO VIVO (Postgres efêmero): `migrate dev` OK, seed 2x sem duplicar (18 permissions, 4 papéis, 1 tenant/clínica/unidade, 1 revisor), teste de idempotência 2/2 passou. Container efêmero derrubado ao fim (nada commitado de docker).

  \- \*Pendências p/ próxima:\* (1) ainda falta `docker-compose.yml` (Postgres+Redis) — herdado da S1, necessário p/ dev local sem docker manual e p/ validar `/health` 200. (2) Conta demo de revisor: `revisor.demo@vero.com.br` / senha `VeroDemo!2026` (dev) — documentar nas notas de revisão de loja e trocar via `SEED_DEMO_PASSWORD` em prod. Próxima sessão: \*\*S3 — Autenticação\*\* (login/refresh/logout, JWT + refresh rotativo no Redis).

\- \*\*2026-06-07 · S3 — Autenticação\*\*

  \- \*O que foi feito:\* módulo `auth` completo. `POST /auth/login` valida `tenantSlug`+`email`+`password` (argon2.verify) e emite par de tokens; `POST /auth/refresh` rotaciona (consome o `jti` antigo via Redis `GETDEL` — reuso do refresh antigo → 401); `POST /auth/logout` revoga o `jti` (204, idempotente). Access JWT curto (15min) + refresh longo (7d) revogável: a sessão só vale enquanto o `jti` existir no Redis (whitelist `auth:refresh:{jti}` com TTL). Erro de credencial SEMPRE genérico (`Credenciais inválidas`, 401) — não revela usuário vs senha. Rate limit reforçado anti-brute-force no login: 5/min/IP (`@Throttle` sobrepondo o throttler global só na rota). `JwtStrategy` (passport-jwt) valida access e popula `req.user` (userId/tenantId/roleId) — pronto para os guards da S4; rejeita token tipo `refresh` em rota protegida. DTOs com class-validator (rejeita 400). Validado AO VIVO (Postgres+Redis efêmeros, API real): login 200, login inválido 401 genérico, refresh 200 + reuso do antigo 401, logout 204 + refresh pós-logout 401. `GET /health` também respondeu 200 em runtime (fecha a verificação pendente da S1).

  \- \*Arquivos tocados:\* `apps/api/src/auth/{auth.module,auth.service,auth.controller}.ts`, `apps/api/src/auth/strategies/jwt.strategy.ts`, `apps/api/src/auth/dto/{login.dto,refresh.dto}.ts`, `apps/api/src/app.module.ts` (importa `AuthModule`), `apps/api/package.json` (deps `@nestjs/jwt`+`@nestjs/passport`+`passport`+`passport-jwt`+`class-validator`+`class-transformer`, dev `@types/passport-jwt`), teste `apps/api/test/auth.service.spec.ts` (4 casos). Lockfile atualizado.

  \- \*Decisões:\* login multi-tenant exige `tenantSlug` (email único só por tenant). Refresh ROTATIVO com whitelist no Redis (não blacklist): `GETDEL` consome o jti atomicamente → rotação e detecção de reuso num passo. Access e refresh assinados com o MESMO `JWT_SECRET`, diferenciados pelo claim `type` (`access`/`refresh`) + expiração; jti só no refresh. TTLs como constantes na `AuthService` (15m/7d) — não viraram env (simplicidade §8). `logout` é best-effort/silencioso em token inválido (não vaza). Anti-brute-force via throttler por IP (5/min); lockout por conta ficou fora de escopo (throttler cobre o aceite). 4 testes são UNITÁRIOS (mock de Prisma/Redis/JWT/argon2) → `pnpm test` verde sem DB; o fluxo real foi coberto pelo smoke test ao vivo.

  \- \*Verificação:\* `pnpm lint`/`test` (17 testes; 4 novos de auth)/`build`/`format:check`/`audit` verdes. AO VIVO: 6/6 casos do aceite (login ok/erro, refresh+reuso, logout+pós-logout) com status HTTP corretos; `/health` 200. Containers efêmeros derrubados ao fim (nada de docker commitado).

  \- \*Pendências p/ próxima:\* (1) `start` do `apps/api/package.json` aponta `node dist/main.js`, mas `nest build` emite em `dist/src/main.js` (rootDir `.` inclui src+test) — mismatch pré-existente da S1, corrigir ao mexer no build/Dockerfile. (2) `docker-compose.yml` (Postgres+Redis) ainda pendente. (3) Considerar lockout por conta além do rate limit por IP. Próxima sessão: \*\*S4 — RBAC + tenant guard + anti-IDOR\*\* (a `JwtStrategy` já entrega tenantId/roleId em `req.user`).

\- \*\*2026-06-07 · S4 — RBAC + tenant guard + anti-IDOR\*\*

  \- \*O que foi feito:\* cadeia de controle de acesso GLOBAL, deny-by-default (CLAUDE.md §4 A01 — risco #1). Ordem dos APP_GUARD: `ThrottlerGuard` → `JwtAuthGuard` (authn passport-jwt, respeita `@Public`) → `TenantGuard` (exige tenantId do JWT, injeta `req.tenantId`, 401 se faltar) → `PermissionsGuard` (deny-by-default: rota sem `@Permissions` e não `@Public` é NEGADA; checa se o papel tem TODAS as permissions exigidas; cacheia permissions do papel no Redis `rbac:perms:{roleId}` TTL 300s, carregando do DB tenant-scoped). Toda negação grava `AUTHZ_DENIED` no AuditLog (sem PII — só ids/ação/metadata). `@Public()` aplicado em `AuthController` e `HealthController`. `TenantScope` (helper anti-IDOR): `where()`/`ownerWhere()` forçam `tenantId` (+`ownerId`) no filtro Prisma; `ensureOwned()` lança Forbidden quando o registro não está no escopo (não vaza existência cross-tenant). `AuditService` (@Global) grava eventos de segurança fail-open no log (auditoria nunca derruba a request). Decorators `@Permissions(...keys)` type-safe (PermissionKey de @vero/types) e `@Public()`.

  \- \*Arquivos tocados:\* `apps/api/src/common/decorators/{public,permissions}.decorator.ts`, `apps/api/src/common/guards/{jwt-auth,tenant,permissions}.guard.ts`, `apps/api/src/common/repositories/tenant-scoped.helper.ts`, `apps/api/src/common/audit/{audit.service,audit.module}.ts`, `apps/api/src/app.module.ts` (importa AuditModule + registra os 3 guards globais), `apps/api/src/auth/auth.controller.ts` (+`@Public`), `apps/api/src/health/health.controller.ts` (+`@Public`), teste `apps/api/test/access-control.spec.ts` (9 casos).

  \- \*Decisões:\* cadeia GLOBAL (não por-controller) → API inteira nasce deny-by-default; rotas existentes marcadas `@Public`. Adicionados `JwtAuthGuard`+`@Public` (não listados na spec, mas necessários para a authn global respeitar rotas públicas sem quebrar S3/health). PermissionsGuard cacheia permissions por papel no Redis (evita hit no DB por request); invalidação em PERMISSION_CHANGED virá quando houver edição de papéis. `TenantScope.ensureOwned` lança Forbidden (403) por fidelidade ao aceite (vs 404). Sessão excedeu os 5 arquivos nominais porque o núcleo de acesso é atômico (deixar metade quebra a postura de segurança) — a própria spec da S4 agrupa estes componentes.

  \- \*Verificação:\* `pnpm lint`/`test` (29 testes; 9 novos)/`build`/`format:check`/`audit` verdes. Validado AO VIVO com rota-sonda TEMPORÁRIA (criada, testada e REMOVIDA antes do commit — sem resíduo): sem token→401, com token sem `@Permissions`→403 (deny-by-default), com token + permission do papel→200, públicas (/health, /auth/login)→200. Confirmado no Postgres que o 403 gravou linha `AUTHZ_DENIED` no AuditLog com actorId e `metadata.required`, sem PII. Containers efêmeros derrubados.

  \- \*Pendências p/ próxima:\* (1) invalidar cache `rbac:perms:{roleId}` ao alterar permissões de um papel (PERMISSION_CHANGED). (2) mismatch `start`→`dist/src/main.js` (S1) ainda aberto. (3) `docker-compose.yml` ainda pendente. (4) lockout por conta. Próxima sessão: \*\*S5 — Módulo Patient\*\* (1º recurso tenant-scoped real; usar `@Permissions('patient:*')` + `TenantScope` no service; teste anti-IDOR tenant A↔B).

\- \*\*2026-06-07 · S5 — Módulo Patient\*\*

  \- \*O que foi feito:\* 1º recurso de negócio tenant-scoped — CRUD de paciente usando a infra da S4. Modelo `Patient` (name/phone obrigatórios + leadSource; cpf/email/birthDate/referredById/notes opcionais — "cadastro rápido de 1ª consulta"), auto-relação `referredBy` (indicação), `@@unique([tenantId, cpf])`, soft-delete (`deletedAt`). Enum `LeadSource`. `PatientService` faz TODA query via `TenantScope` (anti-IDOR): `findOne/update/remove` chamam `ensureOwned` → 403 em recurso de outro tenant; `assertReferrer` valida que o indicador é do mesmo tenant. `remove` é soft-delete. Controller com `@Permissions('patient:read|write|delete')` por rota (deny-by-default herdado da S4) e novo param decorator `@TenantId()` (lê `req.tenantId` posto pelo TenantGuard). Validação de CPF (dígitos verificadores) e telefone BR (DDD + 10/11 díg.) como fonte única em `@vero/types`, reusada no DTO via custom validators class-validator (`@IsCpf`/`@IsBrazilianPhone`). `UpdatePatientDto` via `PartialType` (@nestjs/mapped-types). phone/cpf normalizados (só dígitos) ao persistir.

  \- \*Arquivos tocados:\* `packages/types/src/patient.ts` (+export no index — LeadSource, isValidCpf, isValidBrazilianPhone, normalizeDigits), `apps/api/prisma/schema.prisma` (+Patient +enum LeadSource +Tenant.patients), `apps/api/prisma/migrations/20260607172126_s5_patient/` (gerada, aditiva), `apps/api/src/patient/{patient.module,patient.service,patient.controller}.ts`, `apps/api/src/patient/dto/{create-patient.dto,update-patient.dto,validators}.ts`, `apps/api/src/common/decorators/tenant-id.decorator.ts`, `apps/api/src/app.module.ts` (+PatientModule), `apps/api/package.json` (+@nestjs/mapped-types), teste `apps/api/test/patient.service.spec.ts` (8 casos). Lockfile atualizado.

  \- \*Decisões:\* CPF/telefone validados em @vero/types (fonte única front+back, §2) e expostos ao DTO por custom decorators (class-validator no DTO = barreira real, §4). `ensureOwned` retorna 403 (não 404) por fidelidade ao aceite. `referredById` validado contra o mesmo tenant (anti-IDOR + integridade). CPF único por tenant (nullable → múltiplos nulls OK no Postgres). Busca simples (`q` por nome/telefone, take 50) — sem paginação avançada (§8, só o essencial). Lembrete: o Prisma Client precisa de `prisma generate` após mexer no schema (o `nest build` direto não roda o prebuild) — gerar antes de buildar.

  \- \*Verificação:\* `pnpm lint`/`test` (36 testes; 8 novos)/`build`/`format:check`/`audit` verdes. Validado AO VIVO (PG+Redis efêmeros + API real): CREATE 201 (phone/cpf normalizados), GET/LIST/PATCH 200, CPF inválido e telefone inválido → 400 com mensagem; \*\*anti-IDOR real\*\*: inserido paciente sob outro tenant via SQL → GET/PATCH como tenant demo → 403, listagem do demo não o vê; soft-delete → DELETE 204, GET pós-delete 403, linha preservada com `deletedAt`. Containers derrubados.

  \- \*Pendências p/ próxima:\* (1) invalidar cache `rbac:perms` no PERMISSION_CHANGED. (2) mismatch `start`→`dist/src/main.js` (S1). (3) `docker-compose.yml` pendente. (4) lockout por conta. Próxima sessão: \*\*S6 — Appointment + Availability\*\* (núcleo da agenda: checagem de conflito por profissional/sala, timezone da unidade; tentar marcar em horário ocupado → 409).

\- \*\*2026-06-07 · S6 — Appointment + Availability (backend)\*\*

  \- \*O que foi feito:\* núcleo da agenda. Modelo `Appointment` (FK profissional=User/paciente/unidade, `roomId?`, `startsAt`/`endsAt` como instantes UTC, enum `AppointmentStatus`, `markers String[]`, soft-delete) + `Availability` (janela por profissional/unidade/dia-da-semana, minutos do dia no fuso da unidade). `AppointmentService`: create/findOne/findAll/move/cancel + createAvailability/listAvailability, TODO via `TenantScope` (anti-IDOR 403). \*\*Conflito (409)\*\* por profissional E por sala (overlap de instantes `startsAt < :end AND endsAt > :start`, ignorando status CANCELLED/NO_SHOW); `move` exclui o próprio id do conflito. \*\*Disponibilidade\*\* enforce-if-defined: se há janela definida p/ o dia, o horário deve caber — convertendo o instante UTC p/ o fuso da unidade via `Intl` (util pura `localDayAndMinute`, sem dep nova). Controller com `@Permissions('appointment:read|write|cancel')` por rota, reusando `@TenantId()` (S5). Validações: `startsAt<endsAt`, profissional/paciente/unidade existem no tenant.

  \- \*Arquivos tocados:\* `packages/types/src/appointment.ts` (+export — APPOINTMENT_STATUSES, FREEING_STATUSES), `apps/api/prisma/schema.prisma` (+Appointment +AppointmentStatus +Availability +back-relations em Tenant/Unit/User/Patient), `apps/api/prisma/migrations/20260607192813_s6_appointment/` (aditiva), `apps/api/src/appointment/{appointment.module,appointment.service,appointment.controller,agenda.util}.ts`, `apps/api/src/appointment/dto/{create-appointment,move-appointment,create-availability,list-appointments}.dto.ts`, `apps/api/src/app.module.ts` (+AppointmentModule), teste `apps/api/test/appointment.service.spec.ts` (8 casos). \*\*Sem dep nova\*\* (timezone via Intl).

  \- \*Decisões:\* tempos como instantes UTC (conflito é tz-agnóstico — overlap de instantes); o fuso da unidade só rege a disponibilidade (Availability em minutos locais + dayOfWeek 0=dom). Profissional = `User` (sem modelo `Professional` dedicado ainda — §6 lista, fica p/ depois). `roomId` é string opcional (modelo `Room` não existe ainda) — conflito de sala já funciona. Disponibilidade enforce-if-defined (sem janela → não bloqueia) p/ não travar o fluxo básico nem os testes de conflito. `Intl.DateTimeFormat` p/ converter UTC→local sem luxon/dep.

  \- \*Verificação:\* `pnpm lint`/`test` (39 testes; 8 novos)/`build`/`format:check`/`audit` verdes. Validado AO VIVO (PG+Redis efêmeros + API real): criar 201, \*\*conflito de horário 409\*\* (no create e no move), agendamento adjacente 201, mover p/ slot livre 200, cancelar 200 + recriar no slot liberado 201, disponibilidade DENTRO 201 / FORA 400 (conversão de fuso SP correta: 16:00Z→13:00 local fora da janela 09–12), anti-IDOR cross-tenant 403. Bônus: o rate limit do login (5/min, S3) disparou de verdade durante a bateria. Containers efêmeros derrubados (Docker Desktop instável durante a sessão — reiniciado 1x; possíveis containers `vero-s6-*` órfãos a limpar quando o daemon voltar).

  \- \*Pendências p/ próxima:\* (1) modelo `Professional` e `Room` dedicados (hoje profissional=User, room=string). (2) invalidar cache `rbac:perms` no PERMISSION_CHANGED. (3) mismatch `start`→`dist/src/main.js` (S1). (4) `docker-compose.yml` pendente. (5) lockout por conta. Próxima sessão: \*\*S7 — Web base + agenda\*\* (1ª tela de gestão: `apps/web` Next.js 14 + `packages/api-client` tipado com refresh transparente; logar e ver/criar agendamento; token em cookie httpOnly).

\- \*\*2026-06-08 · S7a — Web base (scaffold + auth + guard)\*\*  ·  \*S7 dividida em S7a (esta) + S7b (tela de agenda, pendente)\*

  \- \*O que foi feito:\* 1ª superfície frontend. `packages/api-client` (client HTTP tipado, thin — recebe baseUrl/token, sem segredos). `apps/web` Next.js (App Router) com padrão \*\*BFF\*\*: o browser só fala com o Next; login via \*\*Server Action\*\* troca credenciais na API e grava tokens em \*\*cookie httpOnly\*\* (`vero_at`/`vero_rt`); `middleware.ts` faz guard deny-by-default (rota protegida sem sessão → /login) e \*\*refresh transparente\*\* (quando o cookie de access de 15min expira, renova no backend usando o refresh e regrava os cookies antes de renderizar). `lib/session.ts` centraliza os cookies (Next 15: `cookies()` async). Página `/login` (form client + `useActionState`, erro genérico) e `/agenda` mínima protegida (lista/criação são da S7b). Tailwind com a paleta da marca (preset compartilhado). CORS nem se aplica (chamadas server-side).

  \- \*Arquivos tocados:\* `packages/api-client/{package.json,tsconfig.json,.eslintrc.cjs,src/index.ts}`; `apps/web/{package.json,tsconfig.json,next.config.mjs,postcss.config.mjs,tailwind.config.ts,.eslintrc.cjs,.env.example}`, `apps/web/app/{layout.tsx,page.tsx,globals.css,login/{page.tsx,actions.ts},agenda/page.tsx}`, `apps/web/lib/session.ts`, `apps/web/middleware.ts`; raiz: `.gitignore`+`.prettierignore` (+`next-env.d.ts`), `package.json` (pnpm.overrides postcss).

  \- \*Decisões (IMPORTANTE):\* \*\*subimos para Next.js 15 + React 19\*\* (era Next 14 no §3). Motivo: o Next 14 tinha \*\*6 vulnerabilidades HIGH\*\* (DoS/SSRF/bypass de middleware) SEM patch no 14.x — só corrigidas no 15 (`>=15.5.16`). §4 (segurança) prevalece sobre o pin do §3; \*\*§3 atualizado p/ Next 15\*\*. \*\*ADR pendente\*\* em `/docs/adr` registrando o desvio. Também: `postcss>=8.5.10` via `pnpm.overrides` (corrige 1 moderate XSS). Migração 14→15: `cookies()`/`headers()` async, `useFormState`→`useActionState`. Auth via BFF/Server Actions (cookie httpOnly só pode ser setado em Action/Route Handler/middleware, nunca em render de Server Component) — por isso o refresh transparente vive no \*\*middleware\*\* (que pode setar cookie na response), e Server Components só LEEM.

  \- \*Verificação:\* `pnpm lint`/`build` (Next 15 buildou: /login estático, /agenda dinâmico, middleware ~35kB)/`test` (39)/`format:check`/`audit` \*\*zero vulnerabilidades\*\* (6 high + 1 moderate resolvidos). AO VIVO (`next start`, sem API/DB): guard de rota OK — `/agenda` e `/` sem cookie → \*\*307 → /login\*\*, `/login` → 200 e renderiza o form. O fluxo completo \*login→cookie→agenda\* (precisa da API+DB+Redis) NÃO foi exercido por browser nesta sessão (Docker Desktop instável + disco a 98%); coberto por: build type-checkando o BFF + auth da API já validada ao vivo na S3. Fica p/ a S7b (com Playwright/webapp-testing) ou verificação manual.

  \- \*Incidentes/ambiente:\* disco encheu (\*\*ENOSPC\*\*) e \*\*truncou `apps/web/package.json` para 0 bytes\*\* — reescrito; conferir integridade de arquivos após ENOSPC. Docker Desktop caiu várias vezes (daemon trava o pipe). Containers `vero-s6-*` podem estar órfãos.

  \- \*Pendências p/ próxima:\* (1) \*\*S7b — tela de agenda\*\* (listar/criar agendamento consumindo a API via BFF; e2e de login com Playwright). (2) criar o \*\*ADR do Next 15\*\* em `/docs/adr`. (3) liberar disco / limpar `.vhdx` do Docker. (4) demais pendências herdadas (Professional/Room, cache rbac, `start` path, docker-compose, lockout).

\- \*\*2026-06-08 · S7b — Tela de agenda (listar + criar via BFF)\*\*  ·  \*fecha a S7\*

  \- \*O que foi feito:\* 1ª tela de gestão útil. `packages/api-client` ganhou os métodos de negócio prometidos na S7a — `listPatients`, `listAppointments(params)`, `createAppointment(input)` — com tipos `Appointment`/`PatientSummary`/`CreateAppointmentInput` (status tipado via `@vero/types`). `apps/web/lib/api.ts` (`serverApi()`) monta o client autenticado a partir do cookie httpOnly de access (lido server-side; o middleware da S7a já o renovou de forma transparente). `app/agenda/page.tsx` virou Server Component que busca agendamentos + pacientes em paralelo (fail-soft: erro de dependência mostra aviso, não derruba a UI) e renderiza lista + form. `app/agenda/actions.ts` é a Server Action de criação: converte `datetime-local`→ISO, valida UX e traduz erros do backend em mensagens seguras (409→conflito, 400→inválido/fora da disponibilidade, 403→sem permissão), com `revalidatePath`. `app/agenda/appointment-form.tsx` é o form client (`useActionState`) com dropdown de paciente (da API) e IDs de unidade/profissional como texto (sem endpoint de listagem ainda). Criado o \*\*ADR 0001\*\* (`docs/adr/0001-next15-upgrade.md`) registrando o desvio §3 (Next 14→15) — pendência da S7a fechada.

  \- \*Arquivos tocados:\* `packages/api-client/src/index.ts` (tipos + 3 métodos), `apps/web/lib/api.ts` (novo), `apps/web/app/agenda/{page.tsx (reescrita),actions.ts (novo),appointment-form.tsx (novo)}`, `docs/adr/0001-next15-upgrade.md` (novo). Sem dep nova.

  \- \*Decisões:\* mantido o padrão BFF da S7a — toda chamada à API sai do servidor do Next com o token do cookie; nada de token/segredo no browser (§2/§5). Os métodos de negócio entraram no `api-client` (e não inline no web) porque é a fonte única de contrato HTTP (§8) e o próprio comentário da S7a já reservava o espaço. Unidade/profissional como input de texto (não dropdown) porque \*\*não há endpoint de listagem de Unit/User\*\* ainda — criar um expandiria o escopo para a API; fica para sessão futura (junto de Professional/Room dedicados). `page.tsx` é `force-dynamic` (dados por sessão). `next dev` no teste ao vivo (não `next start`) porque em produção o cookie vira `secure` e não trafega sobre http local.

  \- \*Verificação:\* `pnpm lint`/`test` (37, 2 skip de DB)/`build` (Next 15: /agenda dinâmico ~103kB)/`format:check`/`audit` \*\*zero vulnerabilidades\*\* — todos verdes. \*\*E2E AO VIVO\*\* (PG+Redis efêmeros nas portas 5455/6395 p/ não colidir com outros projetos, API + web reais): contrato exato do api-client batido por curl contra o backend (login → `listPatients` → `createAppointment` 201 → conflito \*\*409\*\* → `listAppointments` mostra). E pelo \*\*navegador (Playwright)\*\*: login no web grava cookie httpOnly e redireciona p/ /agenda, a lista renderiza o agendamento (busca server-side com o token do cookie), o form cria um 2º agendamento ("Agendamento criado.") que aparece como "Agendamentos (2)" — screenshot confirmou o render (paleta da marca, badge de status). Ambiente efêmero 100% derrubado ao fim (containers removidos, `.env` e temporários apagados; árvore limpa — só os 6 arquivos da sessão).

  \- \*Pendências p/ próxima:\* (1) endpoints de listagem de \*\*Unit\*\* e \*\*User/Professional\*\* p/ trocar os inputs de ID por seletores na agenda (+ modelos `Professional`/`Room` dedicados — §6). (2) editar/mover/cancelar agendamento pela UI (backend da S6 já expõe). (3) invalidar cache `rbac:perms` no PERMISSION_CHANGED. (4) mismatch `start`→`dist/src/main.js` (S1). (5) `docker-compose.yml` ainda pendente (subi containers manuais de novo). (6) lockout por conta. Próxima sessão: \*\*S8 — mobile-patient base + EAS\*\* (App do Paciente Expo; build EAS dev em device; paciente vê só as próprias consultas — anti-IDOR; regras de loja §5).

\- \*\*2026-06-08 · S8a — Autenticação do paciente (backend)\*\*  ·  \*S8 DIVIDIDA em S8a–S8d (ver §10)\*

  \- \*O que foi feito:\* destravou o App do Paciente — descoberta a lacuna de que a auth da S3 é \*\*só de equipe\*\* (`User`), sem nenhuma credencial/login de paciente. Decisão do usuário: \*\*auth por senha\*\* (CPF/e-mail + senha), reusando a infra da S3. Entregue `PatientAuthService` (espelha a `AuthService`): login por `tenantSlug` + `identifier` (CPF \*ou\* e-mail) + senha (argon2), access 15min + refresh rotativo 7d revogável no Redis, logout idempotente. Tokens com type \*\*PRÓPRIO\*\* (`patient-access`/`patient-refresh`) e namespace de refresh \*\*separado\*\* (`auth:patient-refresh:{jti}`). `PatientAuthController` em `POST /auth/patient/{login,refresh,logout}` (@Public, login com rate limit 5/min/IP). Schema: `Patient.passwordHash String?` (null = paciente ainda sem acesso ao app), migration aditiva. Seed ganhou \*\*paciente demo de loja\*\* (§5): `paciente.demo@vero.com.br` / CPF `390.533.447-05` / senha `VeroDemo!2026`.

  \- \*Arquivos tocados:\* `apps/api/prisma/schema.prisma` (+`passwordHash`), `apps/api/prisma/migrations/20260608232048_s8a_patient_password/` (aditiva), `apps/api/prisma/seed.ts` (+paciente demo), `apps/api/src/auth/{patient-auth.service,patient-auth.controller}.ts` (novos), `apps/api/src/auth/dto/patient-login.dto.ts` (novo), `apps/api/src/auth/auth.module.ts` (wiring), teste `apps/api/test/patient-auth.service.spec.ts` (5 casos). Reusou `RefreshDto` e `normalizeDigits` (@vero/types).

  \- \*Decisões (SEGURANÇA):\* a S8a \*\*não\*\* toca `JwtStrategy`/guards de propósito. Como a `JwtStrategy` de equipe rejeita qualquer type ≠ `access`, um token de paciente é \*\*barrado por padrão em toda rota protegida de equipe\*\* — provado ao vivo (401 em /appointments e /patients). \*\*Latente importante p/ a S8b:\*\* a `PermissionsGuard` faz `rolePermission.findMany({ where: { tenantId, roleId } })`; se um principal de paciente (sem `roleId`) algum dia passar pela strategy, `roleId: undefined` faz o Prisma \*\*omitir o filtro\*\* e retornar TODAS as permissions do tenant → a S8b DEVE adicionar uma faixa explícita (negar quando `kind !== 'staff'`/sem roleId) ANTES de fazer a `JwtStrategy` aceitar `patient-access`. Identificador: CPF é único por tenant (`@@unique([tenantId,cpf])`); \*\*e-mail não é único\*\* → login por e-mail só autentica se casar com EXATAMENTE 1 paciente (senão erro genérico, sem vazar). `tenantSlug` exigido no login (identificador só é único dentro do tenant) — UX a melhorar (seleção de clínica/white-label) no futuro.

  \- \*Verificação:\* `pnpm lint`/`test` (44; 5 novos, 2 skip de DB)/`build`/`format:check`/`audit` \*\*zero vulns\*\* — verdes. \*\*AO VIVO\*\* (PG+Redis efêmeros 5455/6395, API real): 8/8 — login por CPF 200, por e-mail 200, senha errada 401 genérico, \*\*token de paciente barrado (401) em /appointments e /patients\*\*, refresh rotaciona 200, reuso do antigo 401, logout 204, refresh pós-logout 401. Ambiente efêmero derrubado; `.env`/temporários removidos; árvore limpa.

  \- \*Pendências p/ próxima (S8b):\* (1) \*\*`GET /me/appointments`\*\* owner+tenant-scoped (anti-IDOR: paciente só vê as próprias consultas) + faixa de guard do paciente: `@Patient` decorator, `JwtStrategy` aceitando `patient-access` (com `kind:'patient'`), e o \*\*endurecimento da `PermissionsGuard`\*\* descrito acima. (2) depois: \*\*S8c\*\* (scaffold Expo + EAS + app.config + Sentry, §5) e \*\*S8d\*\* (telas login + "minhas consultas"). Herdadas: Unit/Professional listagem, editar/mover/cancelar na UI, cache `rbac:perms`, `start` path, docker-compose, lockout. Conta demo do app do paciente documentar nas notas de revisão de loja (§5).

\- \*\*2026-06-08 · S8b — `/me/appointments` (anti-IDOR) + faixa de guard do paciente\*\*

  \- \*O que foi feito:\* o paciente autenticado passa a enxergar SÓ as próprias consultas, sem abrir brecha no RBAC de equipe. `JwtStrategy` agora discrimina por `type` e devolve um \*\*principal tipado\*\* (`Principal = AuthenticatedUser{kind:'staff'} | AuthenticatedPatient{kind:'patient'}`): `access`→equipe, `patient-access`→paciente, qualquer outro→401. Novo `@Patient()` (marca rota do app do paciente) + `@PatientId()` (injeta o patientId do principal, fail-closed). `PermissionsGuard` ganhou \*\*duas faixas\*\*: rota `@Patient` exige principal de paciente (sem checar papel); rota de equipe agora \*\*nega explicitamente\*\* quando `!user || kind==='patient' || !roleId` ANTES de qualquer query — \*\*fecha o latente da S8a\*\* (roleId ausente faria o Prisma omitir o filtro e vazar todas as permissions do tenant). `recordDenial` lida com o union (actorId = patientId|userId; metadata sem PII). Módulo `me`: `MeController` (`@Patient`, `GET /me/appointments`) + `MeService` (query via `TenantScope.ownerWhere(patientId, …, 'patientId')` — tenant+owner).

  \- \*Arquivos tocados:\* `apps/api/src/common/decorators/patient.decorator.ts` (novo: `@Patient`+`@PatientId`), `apps/api/src/auth/strategies/jwt.strategy.ts` (principal discriminado), `apps/api/src/common/guards/permissions.guard.ts` (2 faixas + endurecimento + recordDenial union), `apps/api/src/common/guards/tenant.guard.ts` (tipo→`Principal`), `apps/api/src/me/{me.controller,me.service,me.module}.ts` (novos), `apps/api/src/app.module.ts` (+MeModule), teste `apps/api/test/access-control.spec.ts` (+4 casos da faixa do paciente). \*\*Sem migration\*\* (S8a já criou `passwordHash`).

  \- \*Decisões:\* o endurecimento testa `!roleId`/`kind==='patient'` (não exige `kind==='staff'` literal) → os mocks legados de staff (sem `kind`, com `roleId`) seguem passando. `MeService` usa o helper anti-IDOR da S4 (não duplica lógica). `tenantId` continua vindo do `TenantGuard` (paciente também tem `tenantId` no JWT, então a cadeia global vale sem exceção). Mantida a ordem dos guards (Throttler→Jwt→Tenant→Permissions).

  \- \*Verificação:\* `pnpm lint`/`test` (46; 4 novos, 2 skip)/`build`/`format:check`/`audit` \*\*zero vulns\*\* — verdes. \*\*AO VIVO\*\* (PG+Redis efêmeros 5455/6395): cenário com paciente demo + paciente B, cada um com 1 consulta. (6) `GET /me/appointments` como paciente demo → \*\*count=1, só `demo-patient`\*\* (NÃO vê a de B) — anti-IDOR provado. (7) token de equipe em `/me/appointments` → \*\*403\*\*. (8) token de paciente em `/appointments` e `/patients` → \*\*403\*\* (endurecimento; antes vazaria). AuditLog conferido no Postgres: negações gravaram `AUTHZ_DENIED` corretas (paciente→actorId=patientId+`kind:patient`; staff→actorId=userId+roleId), sem PII. Ambiente efêmero derrubado; `.env`/temporários removidos; árvore limpa.

  \- \*Pendências p/ próxima:\* \*\*S8c\*\* — scaffold `apps/mobile-patient` (Expo Router) + `app.config.ts` (bundle `br.com.vero.paciente`, ícone/splash, permissões mínimas + iOS usage strings, targetSdk 36/iOS 26) + `eas.json` (dev/preview/production) + Sentry (§5). Depois \*\*S8d\*\* (telas login + "minhas consultas" consumindo `/auth/patient/login` e `/me/appointments`). \*Nota:\* `eas build` exige conta Expo/EAS + device — verificação do build em device é do usuário (não tenho como rodar). Herdadas: Unit/Professional listagem + seletores na agenda, editar/mover/cancelar na UI, cache `rbac:perms` no PERMISSION_CHANGED, `start`→`dist/src/main.js`, `docker-compose.yml`, lockout por conta.

\- \*\*2026-06-08 · S8c — mobile-patient base (scaffold Expo + EAS + Sentry)\*\*

  \- \*O que foi feito:\* nasceu o \*\*App do Paciente\*\* (`apps/mobile-patient`), 4ª superfície. Scaffold via `create-expo-app` (registry como fonte de verdade das versões → \*\*Expo SDK 56\*\*: react 19.2.3, react-native 0.85.3, expo-router 56.2.9, @sentry/react-native 7.11), convertido para \*\*Expo Router\*\* (`app/_layout.tsx` com `Sentry.init`+`Sentry.wrap`+`Stack`; `app/index.tsx` tela base da marca). `app.config.ts` (config dinâmica, FONTE ÚNICA — removido o `app.json` redundante): name \*\*Vero\*\*, scheme `vero`, bundle/package \*\*`br.com.vero.paciente`\*\* (§0), ícone/splash (assets reais do template), plugins expo-router/expo-splash-screen/expo-build-properties/@sentry, e \*\*targets de loja (§3)\*\* via expo-build-properties: Android `targetSdkVersion/compileSdkVersion 36` + iOS `deploymentTarget 16.4` (mínimo do SDK 56; o SDK do iOS 26 é da imagem de build do EAS). `eas.json` com perfis dev(APK/internal)/preview/production(AAB, autoIncrement) + submit. Sentry: DSN é chave PÚBLICA de cliente via `EXPO_PUBLIC_SENTRY_DSN` (não segredo, §5 "sem segredo no bundle" respeitado). `metro.config.js` para monorepo (watchFolders + nodeModulesPaths). `.env.example` só com `EXPO_PUBLIC_*` não-secretos. Permissões mínimas: o app base não pede câmera/localização/push (push é S13), sem usage strings desnecessárias.

  \- \*Arquivos tocados:\* `apps/mobile-patient/{package.json,app.config.ts,eas.json,babel.config.js,metro.config.js,tsconfig.json,.env.example,.gitignore,app/_layout.tsx,app/index.tsx,assets/*}` (novos); raiz `package.json` (override `uuid@<11.1.1`→`>=11.1.1` p/ zerar 1 moderate transitiva do Expo) + `pnpm-lock.yaml`.

  \- \*Decisões (IMPORTANTE — monorepo/pnpm):\* tentei `node-linker=hoisted` (recomendação oficial Expo p/ RN) MAS isso, somado a forçar `react`/`react-dom` 19.2.3 no workspace todo, \*\*quebrou o build do web\*\* (Next 15.5.19 com React 19.2.3 → `useContext` null no prerender de /404). \*\*Revertido:\* mantido o linker pnpm \*\*isolado\*\* (web/api intactos, já provados) + \*\*sem\*\* override de react — no modo isolado o mobile recebe seu próprio React 19.2.3 aninhado, sem colidir com o ^19.0.0 do web.\* TypeScript do mobile \*\*pinado em `^5.6.3`\*\* (não o ~6.0.3 que o SDK sugere) p/ o monorepo ficar num único TS major; o desvio está declarado em `expo.install.exclude:["typescript"]` (expo-doctor não reclama). \*Nota de device-build:\* peer warning `react-native-worklets@0.9.1` vs `^0.7.4||^0.8.0` (esperado por `expo-modules-core`) — não-fatal, expo-doctor 21/21; verificar no 1º build em device.

  \- \*Verificação:\* `pnpm lint` (inclui `tsc --noEmit` do mobile)/`test` (46)/`build` (web+api)/`format:check`/`audit` \*\*zero vulns\*\* — todos verdes. `npx expo config --json` avalia limpo (name Vero, bundle correto, 4 plugins, apiBaseUrl). \*\*`expo-doctor` 21/21\*\*. \*\*NÃO\*\* há como eu rodar `eas build`/abrir em device aqui (exige conta Expo/EAS + aparelho) — \*\*verificação do build em device físico é do usuário\*\* (aceite original da S8). Nada efêmero a derrubar nesta sessão (só install).

  \- \*Pendências p/ próxima:\* \*\*S8d\*\* — telas de \*\*login\*\* (consumindo `POST /auth/patient/login`, guardar tokens com `expo-secure-store`) e \*\*"minhas consultas"\*\* (`GET /me/appointments`, anti-IDOR já garantido no backend). Sugiro um `lib/api` no app reusando os contratos (ou um client leve). Para testar ao vivo em device, a API precisa do IP da máquina (não `localhost`). \*\*S8 fecha na S8d.\*\* Herdadas: device-build (usuário), worklets peer, Unit/Professional listagem, cache `rbac:perms`, `start` path, docker-compose, lockout.

\- \*\*2026-06-08 · S8d — App do Paciente: login + "minhas consultas" (FECHA a S8)\*\*

  \- \*O que foi feito:\* completou o aceite da S8 — o paciente loga e vê só as próprias consultas. `lib/api.ts` (client fetch self-contained — NÃO importa pacote do workspace, p/ evitar resolução de symlink no Metro): `login`/`refresh`/`logout` (`/auth/patient/*`) + `myAppointments` (`/me/appointments`); baseUrl de `EXPO_PUBLIC_API_URL`. `lib/auth.tsx` (AuthProvider/`useAuth`): tokens em \*\*`expo-secure-store`\*\* (Keychain/Keystore — §5), `signIn/signOut/refresh`; refresh rotativo, e em falha de refresh faz signOut (fail-closed). `app/_layout.tsx`: AuthProvider + \*\*AuthGate\*\* (deny-by-default: sem sessão→/login; logado em /login→/) + Sentry. `app/login.tsx` (tenantSlug + CPF/e-mail + senha; erro genérico espelhando o backend §4). `app/index.tsx` ("minhas consultas": lista de `/me/appointments`, refresh-on-401 com retry único, botão Sair, estados loading/erro/vazio).

  \- \*Arquivos tocados:\* `apps/mobile-patient/lib/{api.ts,auth.tsx}` (novos), `apps/mobile-patient/app/{_layout.tsx,login.tsx,index.tsx}` (login novo; _layout/index reescritos), `apps/mobile-patient/app.config.ts` (+plugin `expo-secure-store`), `apps/mobile-patient/package.json` (+`expo-secure-store`) + `pnpm-lock.yaml`.

  \- \*Decisões:\* client HTTP \*\*self-contained\*\* no app (não reusa `@vero/api-client`) — de propósito, p/ não arrastar resolução de pacote do workspace pelo Metro (área frágil no pnpm isolado) e porque o api-client não tem o fluxo de paciente. `expo-secure-store` (não AsyncStorage) p/ os tokens (§5). Padrão de auth-gate do Expo Router via `useSegments`+`useRouter`. Refresh-on-401 simples (1 retry) — sem interceptor global (§8 simplicidade).

  \- \*Verificação:\* `pnpm lint` (inclui `tsc --noEmit` do mobile)/`test` (46)/`build` (web+api)/`format:check`/`audit` \*\*zero vulns\*\* — verdes. \*\*`expo-doctor` 21/21\*\*. \*\*Verificação forte sem device:\* `npx expo export --platform android` EMPACOTOU o app inteiro pelo Metro (bundle 5.1MB) — prova que TODOS os imports resolvem no pnpm isolado e que o app compila (telas + lib/api + lib/auth + secure-store + sentry + router).\* Os endpoints consumidos (`/auth/patient/login`, `/me/appointments`) já tinham sido validados AO VIVO nas S8a/S8b. \*\*Falta só (do usuário):\* abrir em device/simulador via `expo start`/EAS e logar contra a API (precisa do IP da máquina, não `localhost`) — não tenho device/conta Expo p/ isso.\*

  \- \*Pendências p/ próxima:\* \*\*S8 COMPLETA.\*\* Próxima no backlog: \*\*S9 — mobile-pro base + EAS\*\* (App do Profissional; mesmo padrão de loja; agenda do dia read-only da unidade). Considerar extrair o que é comum (client/auth/secure-store, tema) p/ um pacote compartilhável quando o mobile-pro chegar. Herdadas: device-build do paciente (usuário), worklets peer, exclusão de conta (S10, é requisito de loja antes de submeter), Unit/Professional listagem + seletores na agenda web, cache `rbac:perms`, `start`→`dist/src/main.js`, `docker-compose.yml`, lockout.



\---



\## 12. BIBLIOTECA DE INSTRUÇÕES PRONTAS (colar nos prompts de sessão)



\- "Valide com Zod no formulário para UX, mas nunca confie nesta validação."

\- "Use class-validator no DTO. Rejeite com 400 se inválido."

\- "Aplique deny-by-default e verifique posse do recurso (tenantId/ownerId) antes de qualquer operação. Lance ForbiddenException se falhar."

\- "Use Prisma parametrizado. Nunca $queryRawUnsafe com interpolação de input."

\- "Adicione rate limiting de 100 req/15min em todos os endpoints públicos."

\- "Configure Helmet com CSP e HSTS. Desabilite Swagger e debug em produção."

\- "Falhe fechado: se a checagem de segurança falhar ou der timeout, negue."

\- "Nunca exponha stack trace ao cliente. Erro genérico fora, detalhe no log."

\- "Para endpoint que faz fetch de URL externa, use allowlist e bloqueie IPs internos (anti-SSRF)."

\- "JWT com access curto + refresh rotativo revogável no Redis."

\- "Logging estruturado em JSON; nunca logue segredos ou PII."

\- "Use a solução mais simples possível, mesmo que menos elegante."

\- "Não adicione funcionalidades além das listadas nos critérios de aceitação."

\- "Já existe algo similar no projeto antes de criar isto?"



\---



\## 13. COMO USAR ESTE ARQUIVO PARA DISPARAR UMA SESSÃO



Modelo de prompt (preencha com a sessão alvo):



> "Leia o CLAUDE.md. Implemente a sessão \*\*Sxx\*\* (§10). Siga objetivo, arquivos e critérios de aceitação descritos. Aplique as regras de §4 (deny-by-default, anti-IDOR por tenantId, Prisma parametrizado, fail-closed) e, se for mobile, as de §5 (loja). Máximo 3–5 arquivos; se passar disso, pare e proponha sub-sessões. Antes de criar helper, verifique se já existe em packages/. Ao terminar, rode o Definition of Done (§9), atualize o §11 e marque a Sxx no §10."

