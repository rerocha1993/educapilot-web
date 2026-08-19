# EducaPilot — relatório de entrega

Relação do que foi feito de diferente em relação ao wireframe/plano original, bugs
reais encontrados e corrigidos no backend, e decisões tomadas sem parar pra
perguntar (conforme pedido). Cobre o rebuild completo do frontend (Flutter →
Next.js/React) e o módulo **Rotina** por inteiro (R1–R13).

---

## 1. Mudança de stack

- Frontend recriado do zero em **Next.js 16 + TypeScript + Tailwind v4 + shadcn/ui
  (base-ui) + TanStack Query**, substituindo o Flutter — pedido explícito do
  cliente ("não quero reaproveitar o flutter quero que faça em node.js").
- Identidade visual (roxo `#5B4E86`, tipografia Plus Jakarta Sans/IBM Plex)
  aplicada a partir do pacote de design fornecido, usado como referência total.
- **Módulos vendidos separados por tenant**: menu e acesso por rota respeitam
  estritamente só os módulos contratados (`GET /api/tenants/modules`), sem tela
  unificada mostrando tudo — arquitetura em `src/lib/kernel/nav-items.ts` +
  `src/components/shell/module-gate.tsx`, com fail-closed (esconde por padrão
  enquanto carrega ou se a busca falhar).

---

## 2. Bugs reais de backend encontrados e corrigidos

Nenhum destes foi introduzido pelo trabalho de frontend — foram achados
testando cada tela contra o backend real, e corrigidos na hora.

| # | Bug | Efeito real | Correção |
|---|---|---|---|
| 1 | `AppDbContext` — filtro de tenant usava variável local em vez da propriedade da instância | Filtro multi-tenant "congelava" no primeiro tenant que rodasse a query | Referenciar `this.TenantId` |
| 2 | `TenantModuleRepository` ignorava `IsBlocked` | Módulo bloqueado continuava liberado | Query corrigida + dado real do banco corrigido |
| 3 | Segredos sem `[JsonIgnore]` (`PasswordHash`, `JwtSecret`, `AsaasApiKey`, `WebhookSecret`) | `Tenant.JwtSecret` (chave de assinatura JWT) vazava via `GET /api/Class` | `[JsonIgnore]` nos 5 campos |
| 4 | `ClassRepository.GetAllAsync` sem `Include` | Turmas sempre mostravam 0 alunos e nenhum professor | `Include(Students)` + `Include(UserClasses.User)` |
| 5 | `TenantModulesController` — `ITenantModuleService`/`ModuleService`/repositórios nunca registrados no DI | Todo `GET /api/tenants/modules` (base do module-gating) dava erro, mascarado como "401 token inválido" pelo middleware | Registrado no `Program.cs` |
| 6 | `Occurrence.Students` não configurado no EF | `GET /api/Student` inteiro quebrava com "Invalid column name 'OccurrenceId'" | `.Ignore()` no `OnModelCreating` |
| 7 | `Student.Class`, `User.Tenant`, `User.PasswordHash`, `Attendance.Absence`, `ChecklistResponse.Description`, `Occurrence.Teacher/Class` (já eram nullable) — várias entidades com propriedade de referência **não anulável** | `[ApiController]` inferia `[Required]` e todo POST/PUT devolvia 400 mesmo com dados corretos | Trocado pra `Tipo?` nos 5 casos reais |
| 8 | `UserController`/`AbsenceController`/`OccurrenceController`/`MeetingController`/`StudentController` — `Update` fazia `_context.X.Update(entity)` confiando no `TenantId` do corpo da requisição | PUT malicioso podia mover o registro pra outro tenant (safeguard global só cobre INSERT) | 5 repositórios corrigidos pra atualizar só campos editáveis |
| 9 | `UserController` — Create/Update/Delete sem `[Authorize(Roles=...)]` | Qualquer usuário logado (até Professor) podia criar/editar/excluir qualquer usuário, inclusive virar Admin | Restrito a Admin |
| 10 | `UserRepository.AddAsync` — `_context.TenantId = user.TenantId` | Reescrevia o filtro de tenant do contexto a partir de dado do cliente | Linha removida |
| 11 | `AttendanceRepository`/`AbsenceRepository` — sem `Include`, e um filtro comparando `o.Id` em vez de `o.ChildId` | Relatórios de falta/ocorrência por turma nunca traziam aluno/turma, ou nunca batiam | Includes + filtro corrigido |
| 12 | `OccurrenceRepository.AddAsync` — gravava vínculo aluno↔ocorrência via `Occurrence.Students` (já ignorado no EF pelo item 6) | **Toda criação normal de ocorrência (POST) quebrava** — regressão do próprio item 6, achada e corrigida na mesma sessão | Grava direto em `OccurrenceStudent` |
| 13 | `OccurrenceRepository.AddWeeklyReportAsync` — `teacher.Id` sem checar null | Turma sem professor vinculado derrubava com exceção não tratada (500 genérico) | Checagem + mensagem clara |
| 14 | `MeetingController` — `IStudentQueryService` nunca registrado no DI | Todo endpoint de Reunião (GET/POST/PUT) dava 401 | Registrado |
| 15 | `AbsenceController.Update` — `AttendanceId == null` numa coluna `int` não anulável | Checagem nunca era verdadeira (o compilador já avisava, nunca corrigido) | Trocado pra `<= 0` |
| 16 | Tabela `__EFMigrationsHistory` só tinha 1 linha — 6 migrations antigas nunca registradas apesar do schema já existir | `dotnet ef database update` tentava recriar tabelas existentes | Histórico sincronizado (sem re-rodar SQL) |

Todos confirmados ao vivo contra o LocalDB real, com dado de teste sempre
removido depois da verificação. 13/13 testes automatizados passando o tempo
todo.

---

## 3. Recursos de backend que não existiam e foram criados

Adicionados só quando genuinamente necessários pra uma tela funcionar, sempre
como migration aditiva (colunas novas nullable/com default, nunca alterando
dado existente):

- **Checklist da sala**: `Order`, `Tipo` (Sim/Não · Contagem), `Ativo` em
  `ChecklistItem`; `CountValue`, `CheckedAt` em `ChecklistResponseItem`; tabela
  `ChecklistTemplateClass` (escopo por turma); upsert de verdade no envio
  (antes duplicava a cada reenvio); endpoint combinado `GET .../fill`.
- **Ocorrências**: `Occurrence.Categoria` (Comportamento/Saúde/Pedagógica/
  Atraso); navegação `Occurrence.Student` (child ID virou relação de verdade);
  `GET /api/Occurrence/report` (agregação por turma + ranking de alunos —
  não existia nenhum endpoint assim).
- **Saúde do aluno**: `Allergies`, `ContinuousMedication`, `DietaryRestriction`,
  `HealthInsurance` em `Student`.
- **Notificações**: `Notification.IsRead`; `GET /api/Notifications` (minhas
  notificações), `PUT {id}/read`, `PUT read-all` — antes só existia enviar,
  nenhum jeito de listar ou marcar como lida.

---

## 4. Onde o wireframe pedia algo que o backend não tem — não foi fabricado

Em vez de inventar dado, cada tela avisa explicitamente o que falta:

| Tela | Falta no backend |
|---|---|
| Turmas (A7) | Etapa, turno, capacidade |
| Alunos (A9) | Matrícula, responsável, status |
| Usuários (A5) | Turmas por usuário (sem endpoint), lista de convites pendentes (sem endpoint) |
| Permissões (A6) | Não existe conceito de Role/Permission no backend — tela não construída |
| Chamada (R1) | Horário de chegada, observação por aluno |
| Faltas (R2) | Anexo de documento |
| Checklist (R3/R4) | — (só o que foi listado no item 3 acima) |
| Ocorrências (R8/R9) | "Severity" real — usei a categoria mais comum do aluno como sinal aproximado, deixado explícito na tela |
| Reuniões (R7) | Pauta, lista de participantes; "agendar" reunião futura (só abre/encerra na hora) |
| Observação semanal (R10) | Checklist de encaminhamentos |
| Saúde do aluno (R5) | Timeline de registros — os campos guardam só o estado atual |
| Relatórios (R13) | Geração customizada — backend só lista os tipos disponíveis (limitação documentada no próprio wireframe) |

## 4.1. Wireframe vs. backend: conceito diferente (não é campo faltando, é nome errado)

**R11 "Seminários semanais"** — o wireframe descreve eventos com tema,
responsável, local e status (Confirmado/Aberto/Rascunho). O recurso real do
backend chamado `WeeklySeminar` é, na prática, um **planejamento pedagógico
semanal** (objetivos gerais, dever de casa, atividades de caderno/portfólio,
desenvolvimento socioemocional, materiais necessários) — um conceito
completamente diferente. Não fabriquei tema/responsável/local/status que não
existem: construí a tela ("Planejamento semanal") em cima do que o backend
realmente é. Se "Seminários" no sentido do wireframe (evento com
responsável/local) for um recurso necessário de verdade, precisa ser
desenhado e construído do zero no backend.

---

## 5. Simplificações assumidas sem perguntar

- **Reordenar itens do Checklist**: setas ↑↓ em vez de arrastar (sem lib de
  drag-and-drop instalada; mais simples e acessível por teclado).
- **"Exportar PDF"** (relatório de ocorrências): `window.print()` com layout
  print-friendly, em vez de fingir um gerador de PDF que o backend não tem.
- **"Severity" em Ocorrências**: aproximada pela categoria mais comum do
  aluno no período, com aviso na tela de que não é um conceito real do
  backend.

---

## 6. Telas prontas

**Login/Autenticação** — L1 (o resto do fluxo L2-L4 ainda não construído).

**Administração** — índice (A1-A4/A6/A8/A10 pendentes), Turmas (A7), Alunos
(A9, com seção de Saúde do R5 embutida), Usuários (A5, sem matriz de
permissões).

**Rotina — módulo completo (R1 a R13)**:
Chamada · Faltas · Checklist (config + preenchimento) · Materiais · Ocorrências
(registro + relatório) · Reuniões · Observação semanal · Planejamento semanal
(R11 reinterpretado, ver 4.1) · Central de notificações · Central de
relatórios.

## 7. Não iniciado

- Eventos & Vendas (E1-E7) — módulo "events" nem existe no catálogo real do
  backend ainda.
- Formulários Dinâmicos (F1-F5).
- Financeiro ($1-$5).
- Telas de Administração restantes: A1-A4 (painel Master/tenants), A6
  (permissões — sem suporte no backend), A8 (importação em massa), A10
  (ficha do aluno).

---

*Backend: `EducaPilot - core` (commits `88db476` → `00d1781`, ver histórico
do git). Frontend: `educapilot-web` (commits `9591007` → `ef1969e`). Ambos
com push em dia na `main` de cada repositório no momento desta entrega.*
