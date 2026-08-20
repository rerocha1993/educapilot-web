# EducaPilot — relatório de entrega

Relação do que foi feito de diferente em relação ao wireframe/plano original, bugs
reais encontrados e corrigidos no backend, e decisões tomadas sem parar pra
perguntar (conforme pedido). Cobre o rebuild completo do frontend (Flutter →
Next.js/React) e **todo o escopo original**: os módulos **Rotina**
(R1–R13), **Financeiro** ($1–$5), **Formulários Dinâmicos** (F1–F5) e
**Eventos & Vendas** (E1–E5) por inteiro, e toda a área de
**Administração** (A1, A3–A5, A7–A10, exceto A6).

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
| 17 | Módulo Financeiro inteiro (`IExpenseRepository/Service`, `IRevenueEntryRepository/Service`, `IFinancialProjectionRepository/Service`) nunca registrado no DI | Todo endpoint de Despesa/Receita/Projeção dava "401 token inválido" (mesmo padrão do item 5 e 14) | Registrado no `Program.cs` |
| 18 | `ExpenseService.PatchExpenseAsync` usava reflection (`GetType().GetProperty(kvp.Key)`) num dicionário vindo direto do cliente | Pior que o item 8: qualquer nome de propriedade do C# (inclusive `TenantId`) podia ser sobrescrito via PATCH | Whitelist explícita de campos editáveis |
| 19 | `CreateRevenueEntryDto.EntryDate` era `DateTime` não anulável, enquanto a entidade real é `DateTime?` (540 das 648 linhas reais de produção têm esse campo nulo) | Todo `POST`/`PUT` de Receita quebrava com "token inválido" — o binding deixava `DateTime.MinValue` (0001-01-01), que estoura o range da coluna `datetime` do SQL Server | Campo trocado pra `DateTime?` |
| 20 | Módulo Formulários inteiro (`IReferenceDataRepository/Service`, `IFormFieldReferenceBindingRepository/Service`, `IReferenceDataQueryService`) nunca registrado no DI | Todo endpoint de "Dado de referência" (base do F1 e do F5) dava "401 token inválido" (mesmo padrão do item 5/14/17) | Registrado no `Program.cs` |
| 21 | Não existia `GET /api/Forms` — `IFormRepository.GetByTenantAsync` já existia mas nunca era exposto no service/controller | Impossível listar os formulários de um tenant (F1/F3/F4 não tinham como funcionar) | Adicionado `IFormService.GetAllAsync()` + `GET api/Forms` |
| 22 | `ReferenceDataRepository.GetRefDataAsync` quebrado em 3 camadas independentes: tabelas "permitidas" que o switch nunca implementava, um `case "Usuarios"` (maiúsculo) que nunca batia com a chave `"usuarios"` (minúsculo) num switch case-sensitive, e `EF.Property<string>(entidade, "id")` tentando ler `Student.Id`/`Class.Id` (int) e `User.Id` (Guid) como string (EF Core rejeita isso) | Mesmo com o DI corrigido, consultar qualquer tabela de referência (inclusive as "implementadas") sempre quebrava | Reescrito com projeção direta por tabela, sem propriedade dinâmica, pras 3 entidades reais (alunos/turmas/usuários) |
| 23 | Os dois endpoints `meta/tabelas`/`meta/colunas` (usados pra descobrir o que é consultável) retornavam nomes completamente diferentes (em inglês, com erro de digitação) dos que `GetRefDataAsync` de fato aceita | Descobrir a tabela via `meta/tabelas` e depois usá-la sempre resultava em "Tabela não permitida" | Alinhados às 3 tabelas reais |
| 24 | `ReferenceDataController` sem `[ApiExplorerSettings(GroupName = "Flow")]` (único controller do módulo faltando esse atributo) | Controller inteiro sumia do Swagger "Flow", quebrando a geração de tipos TypeScript mesmo com os endpoints funcionando | Atributo adicionado |
| 25 | 13 propriedades não anuláveis entre DTOs e entidades do Flow (`FormDto.Campos/Descricao/Status`, `FormFieldDto.Config/Opcoes`, `FormAutomationDto.Config`, `FormResponseDto.Itens/NomeReferencia/Observacoes/Status`, `FormResponseItemDto.Valor`, e as mesmas 7 do lado da entidade) | Mesmo padrão do item 7, mas em cadeia — cada POST/PUT de Formulário/Campo/Automação/Resposta quebrava um 400 de cada vez até todas serem corrigidas; as 7 do lado da entidade causavam algo pior: "Data is Null" ao *reler* um registro salvo com valor NULL num campo genuinamente opcional (mismatch entre o modelo do EF e o schema real) | Todas trocadas pra `Tipo?`, conferidas 1:1 contra `IS_NULLABLE` real do banco |
| 26 | `FormResponse.DataPreenchimento` sempre existiu e era preenchida certinho, mas nunca era exposta no DTO; `Status` era sempre hardcoded `"Ativo"` no Create, ignorando o que o cliente mandasse | Coluna "Enviado" do wireframe F3 não tinha campo pra vir; status Pendente/Revisar/Concluída do F3/F4 não existia de verdade | DTO/serviço corrigidos pra expor/respeitar os dois |
| 27 | `AppDbContext.SaveChangesAsync` (bug estrutural, não específico do Flow) — o filtro que auto-preenche `TenantId` usava `entry.Property("TenantId") != null`, mas `EntityEntry.Property(string)` **lança exceção** (não retorna null) pra qualquer entidade sem essa propriedade | Toda vez que uma entidade nova sem `TenantId` próprio (ex.: `FormField`, escopado indiretamente via `Form.TenantId`) era salva, a aplicação inteira quebrava com "The property 'X.TenantId' could not be found", mascarado como 401 | Trocado pra `entry.Metadata.FindProperty("TenantId")` (retorna null em vez de lançar) — zero mudança de comportamento pra entidades que já tinham TenantId |
| 28 | `ITenantService` só tinha `CreateTenantAdminAsync` — `ITenantRepository.GetAllAsync/GetByIdAsync` existiam mas nunca eram expostos | Painel master (A1) não tinha como listar as escolas existentes | Adicionado `GetAllAsync/GetByIdAsync` + `GET api/Admin/tenants` e `GET api/Admin/tenants/{id}` |
| 29 | `TenantModulesController.UpdateModules` (POST, usado pelo admin master pra trocar módulos de uma escola) lia o tenant-alvo do claim `TenantId` do *próprio* token do chamador — mas um token Master nunca carrega esse claim | Único consumidor pretendido (admin master) **sempre** recebia `UnauthorizedAccessException` — não existia forma nenhuma de trocar os módulos de uma escola pela API | Rota trocada pra receber o tenant-alvo explicitamente (`POST api/tenants/modules/{tenantId}`) |
| 30 | `IModuleMenuRepository`/`IModuleMenuService` nunca registrados no DI (mesmo padrão de sempre) | `ModuleController` inteiro (A4) sempre dava erro de ativação de serviço, mascarado como 401 | Registrado no `Program.cs` |
| 31 | `ModuleDto` nunca expunha `IsActive` em nenhum dos 5 pontos onde é montado (`ModuleService` × 4, `TenantModuleService` × 1) — mesmo `ModuleService.DeleteAsync` fazendo soft-delete via `IsActive=false` | A4 sempre mostrava "Inativo" pra todo módulo; A3 (que só lista módulos ativos pra oferecer contratação) sempre ficava vazia mesmo com o catálogo populado | Campo adicionado ao DTO e mapeado nos 5 pontos |
| 32 | `IAsaasPaymentService`/`ITenantAsaasConfigEventRepository` nunca registrados no DI (mesmo padrão recorrente) + faltava o `using` do namespace no `Program.cs` | `PaymentController` (checkout Pix, E7) sempre dava erro de ativação de serviço, mascarado como 401 | Registrado + `using` adicionado |
| 33 | `OrderEventHub.EntrarNoGrupo` (SignalR) — bug de segurança real: deixava qualquer cliente conectado entrar no grupo de **qualquer** tenant só informando o GUID, sem checar contra o tenant real da conexão autenticada | Um cliente malicioso podia se inscrever nos broadcasts de pedidos (nome do comprador, valor total) de qualquer escola só adivinhando/enumerando TenantIds | Validado contra o `TenantId` real da conexão antes de deixar entrar no grupo |
| 34 | `OrderProduct_event.DataCriacao` (DateTime não-anulável, sem default) nunca era preenchida no Create | Todo item de pedido gravava `DateTime.MinValue` — mesmo padrão de bug de datetime já visto várias vezes | Preenchida com a mesma data do pedido |
| 35 | `OrderEventRepository.GetAllPendingByTenantAsync` filtrava `Status == "Pendente"`, mas o Create real sempre grava `"Em Producao"` | Consulta sempre vazia (método ainda não chamado por nenhum controller, achado durante investigação — não estava quebrando nada em produção) | Filtro corrigido pra bater com o valor real gravado |
| 36 | `AppDbContext.SaveChangesAsync` (continuação do bug estrutural do item 27) sobrescrevia incondicionalmente o `TenantId` de toda entidade nova com o tenant **ambiente** da requisição, mesmo quando o próprio código já tinha definido um `TenantId` explícito por motivo legítimo | Um admin Master **nunca** conseguia criar um vínculo `TenantModule` novo pra uma escola (só reativar um que já existisse) — achado ao vivo contratando o módulo Events pela primeira vez pra um tenant real: "TenantId não encontrado no contexto." mesmo o service já setando o TenantId certo | Só carimba o TenantId ambiente quando a entidade ainda está em `Guid.Empty` — passa a respeitar um TenantId já definido deliberadamente pelo serviço |
| 37 | `Order_event.StatusPayment` (enum não-anulável, com default só pro C#) — a coluna real no banco é nullable e **15 dos 18 pedidos reais** do tenant de teste tinham `NULL` (criados antes desse campo existir/ser preenchido) | Assim que `StatusPayment` passou a ser exposto no DTO (item acima), todo `GET` de pedidos quebrava relendo esses 15 registros: "Data is Null" | Trocado pra `PaymentStatus?` — `null` vira um estado "não informado" explícito na tela, sem presumir Aguardando nem Pago pra dado histórico incerto |

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
- **Financeiro**: `Expense.CentroCusto`; `GET /api/FinancialProjection/series`
  (agregação de N meses — antes só existia `monthly-summary` pra um mês por
  vez, sem jeito de montar um gráfico de série temporal).
- **Formulários**: `GET /api/Forms` (listar formulários do tenant).
- **Administração**: `ITenantService.GetAllAsync/GetByIdAsync` + `GET api/Admin/tenants`
  e `GET api/Admin/tenants/{id}` (listar/ver escolas); catálogo de módulos ganhou a
  entrada `events` (não existia até esta sessão).
- **Eventos & Vendas**: `SalesGroup_event.Meta`/`Responsavel`, `Product_event.Estoque`
  (colunas novas via migration); `Ativo` de Produto/Subproduto e
  `StatusPayment`/`AsaasPaymentId` de Pedido passaram a ser expostos nos DTOs (já
  existiam nas entidades, nunca eram devolvidos pela API).

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
| Escolas (A1) | Subdomínio, plano, contagem de alunos |
| Criar escola (A2) | Seleção de módulos na criação (step 2 do wireframe — módulos são configurados depois, em A3); verificação de disponibilidade de subdomínio; endereço (backend exige, mas a tela não coleta — mandado vazio) |
| Módulos por escola (A3) | Estado "Roadmap" (só liga/desliga entre os módulos ativos do catálogo) |
| Catálogo de módulos (A4) | Versão, Depende |
| Importação em massa (A8) | Preview linha a linha, avisos, detecção de duplicado, "baixar erros" — o backend só devolve uma mensagem única de sucesso/erro no fim, sem relatório nenhum |
| Ficha do aluno (A10) | CPF, matrícula, turno, "autorizado a sair só"; aba Responsáveis inteira (sem entidade de responsável no backend); aba Frequência inteira (sem endpoint de histórico de presença por aluno); aba Documentos inteira (sem entidade de documento nem upload genérico) |
| Dashboard do evento (E1) | Não existe entidade "Evento" no backend (nome, prazo, badge de status) — o painel soma tudo que já foi vendido no tenant, sem recorte por campanha; "pré-pedidos sem confirmação" (todo pedido criado já é definitivo, não há rascunho) |
| Grupos de venda (E2) | — (Meta/Responsável foram adicionados via migration) |
| Produtos (E3) | — (Estoque/Ativo foram adicionados/expostos) |
| Pedidos (E4) | Status "Expirado" (só existem Aguardando/Pago/Cancelado no backend); "—" no lugar do status de pagamento em pedidos históricos sem esse dado gravado |
| Novo pedido / balcão (E5) | Pagamento Pix cria o pedido normalmente, mas QR/copia-e-cola e confirmação automática via webhook não estão conectados a nenhum pedido no backend (dois caminhos desconectados — gerar QR e criar pedido nunca se falam) |
| Pré-pedido do responsável / checkout Pix (E6/E7) | Não construídas como páginas públicas — `OrderEventController` exige autenticação de tenant; abrir criação de pedido para acesso anônimo é uma decisão de segurança que não tomei sem confirmar |
| Despesas ($1/$2) | Importar Excel (existe endpoint, mas layout de coluna fixo sem doc de formato) e anexo de comprovante (não existe upload de arquivo genérico em nenhum lugar do backend) |
| Receitas ($3) | Mesmas duas limitações de Despesas acima |
| Construtor de formulários (F1) | "Visível ao responsável" (não existe campo no backend); drag-and-drop real (reordena por setas, mesma simplificação do Checklist); "Fonte de dados" salva dentro de `FormField.Config` (JSON livre) em vez de via `FormFieldReferenceBindingService`, que existe mas não tem controller nenhum expondo ele |
| Automações (F2) | Regras são só configuração — não existe motor no backend que leia `FormAutomation` e execute alguma ação quando uma resposta é enviada |
| Respostas (F3/F4) | Linha "Automação disparada: X" do wireframe não tem dado nenhum por trás (nada nunca dispara); lista é por formulário (não existe endpoint de listar respostas de todos os formulários de uma vez) |
| Dados de referência (F5) | "+ Nova tabela" (não existe endpoint de criar tabela de referência); "usada em N formulários" (não existe essa contagem no backend); só 3 das 5 tabelas que o backend um dia chegou a listar como "permitidas" têm implementação de verdade (alunos/turmas/usuários) |

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
- **"Atrasado" em Despesas e "projeção" no Fluxo de caixa**: nenhum dos dois
  é uma flag do backend — calculados no cliente (data de vencimento passada
  + não paga = atrasado; mês ≥ mês atual = projeção, visualmente com
  opacidade reduzida no gráfico).
- **"Fonte de dados" de um campo de formulário**: salva dentro de
  `FormField.Config` (JSON livre já existente) em vez de via
  `FormFieldReferenceBindingService`, que existe no backend mas não tem
  controller nenhum expondo ele.
- **Importação em massa**: envio direto de arquivo com resultado em uma
  mensagem só, sem o assistente de 3 passos com preview/validação do
  wireframe — o backend não devolve nada além disso.
- **"Vendas por grupo" e KPIs do Dashboard de eventos**: calculados inteiramente no
  cliente (somando pedidos × itens × preço de produto por grupo) — não existe
  endpoint de agregação pronta no backend.
- **E6/E7 (pré-pedido/checkout Pix do responsável)**: não construídas como fluxo
  público — reframed como parte do balcão (E5), que já cobre criar pedido com
  pagamento Dinheiro ou Pix (Pix sem confirmação automática, ver seção 4).

---

## 6. Telas prontas

**Login/Autenticação** — L1 (o resto do fluxo L2-L4 ainda não construído).

**Administração** — índice, Turmas (A7), Alunos (A9, com seção de Saúde do
R5 embutida), Usuários (A5, sem matriz de permissões), Ficha do aluno (A10,
Dados/Ocorrências/Saúde reais — Responsáveis/Frequência/Documentos sem
suporte no backend), Importação em massa (A8, versão mínima sem
preview/validação). **Painel Master** (login e telas separadas, `/master`):
Escolas (A1), Módulos por escola (A3), Catálogo de módulos (A4) — todas
verificadas ao vivo com conta Master real. Criar escola (A2) tem o código
pronto mas não foi submetido ao vivo por mim (formulário de senha inicial,
ver seção 2). A6 (permissões) segue sem suporte no backend, não construída.

**Rotina — módulo completo (R1 a R13)**:
Chamada · Faltas · Checklist (config + preenchimento) · Materiais · Ocorrências
(registro + relatório) · Reuniões · Observação semanal · Planejamento semanal
(R11 reinterpretado, ver 4.1) · Central de notificações · Central de
relatórios.

**Financeiro — módulo completo ($1 a $5)**:
Fluxo de caixa (KPIs + gráfico entradas x saídas por mês, com projeção de
meses futuros) · Despesas (resumo a pagar/atrasado/pago + marcar pago) ·
Receitas (mesmo padrão + marcar recebido). Import de Excel e comprovante
fora de escopo (ver seção 4).

**Formulários Dinâmicos — módulo completo (F1 a F5)**:
Construtor (campos + reordenar + publicar/rascunho) · Automações (regras
Quando/Então + ativar/desativar, config-only) · Respostas (lista + detalhe
+ marcar como revisada) · Dados de referência (as 3 tabelas reais com
contagem). Motor de execução de automações, criação de tabela de
referência e anexo fora de escopo (ver seção 4).

**Eventos & Vendas — E1 a E5 (F1)**:
Dashboard (KPIs + vendas por grupo + pendências, calculados no cliente) ·
Grupos de venda (CRUD com meta/responsável) · Produtos (CRUD com
estoque/ativo + subprodutos/variações) · Pedidos (lista com filtro por
status de pagamento + finalizar) · Novo pedido/balcão (busca + carrinho +
Dinheiro/Pix). Módulo "events" criado no catálogo (não existia) e
contratado para o tenant de teste. E6/E7 (pré-pedido e checkout público do
responsável) não construídas como páginas públicas — ver seção 4. Foi o
módulo com mais bugs de backend da sessão (8 commits, incluindo um bug de
segurança real no hub SignalR e dois bugs estruturais no
`AppDbContext.SaveChangesAsync`).

## 7. Não iniciado

- A2 (criar escola) — código pronto e buildando limpo, mas a submissão não
  foi testada ao vivo por mim (formulário de senha inicial do admin, ver
  seção 2).
- A6 (permissões) — sem suporte no backend (sem conceito de Role/Permission).
- E6/E7 (pré-pedido e checkout Pix públicos, sem autenticação) — decisão de
  segurança não tomada unilateralmente, ver seção 4.

---

*Backend: `EducaPilot - core` (commits `88db476` → `fff0efa`, ver histórico
do git). Frontend: `educapilot-web` (commits `9591007` → `878e0dd`). Ambos
com push em dia na `main` de cada repositório no momento desta entrega.
Com isso, todos os módulos do escopo original (Rotina, Financeiro,
Formulários Dinâmicos, Administração e Eventos & Vendas) estão entregues.*
