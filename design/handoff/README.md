# Handoff: EducaPilot — Identidade visual + 34 telas (wireframes de fidelidade média)

## Visão geral
Pacote de design do **EducaPilot**, SaaS multi-tenant de gestão escolar (educação infantil e fundamental I).
Contém dois artefatos:

1. `EducaPilot Identidade Visual.dc.html` — guia de identidade: símbolo, paleta, tipografia, aplicação em UI e **tokens prontos em HSL para Tailwind + shadcn/ui**.
2. `EducaPilot Wireframes.dc.html` — board com **34 quadros** (31 telas do backend + 3 recortes mobile), agrupados em 6 áreas, cada quadro com um id (`R1`, `A3`, `E5`, `$4`, `M1`…).

## Sobre os arquivos de design (leia antes de codar)
Os arquivos `.dc.html` deste bundle são **referências de design escritas em HTML** — protótipos que mostram intenção de layout, hierarquia e conteúdo. **Não são código de produção e não devem ser copiados para o app.**

A tarefa é **recriar estes designs no ambiente do produto**: React + Next.js (App Router) com **Tailwind CSS + shadcn/ui**, usando os componentes e padrões já existentes no repositório. Estilo autoral do HTML (estilos inline, marcação de wireframe) deve ser descartado em favor dos componentes shadcn equivalentes.

### Linguagem/stack usada nos arquivos de design
- **HTML5 + CSS inline** (sem framework de CSS, sem classes utilitárias) e **JavaScript** simples para as listas de dados de exemplo.
- Tipografia via **Google Fonts**: `Plus Jakarta Sans` (títulos), `IBM Plex Sans` (texto/dados), `IBM Plex Mono` (rótulos, IDs, valores).
- Os arquivos abrem direto no navegador, sem build. **Não há React, Tailwind, TypeScript ou bundler neles** — a implementação é que usará React/Next/Tailwind/shadcn.
- Cada arquivo é um documento único: markup no topo e, no fim, um `<script>` com uma classe `Component` cujo método `renderVals()` retorna apenas os **dados de exemplo** (nomes de alunos, turmas, valores). Trate esse objeto como *fixture* — é a melhor fonte para montar mocks/seed de desenvolvimento.

## Fidelidade
- **Identidade visual: alta fidelidade.** Cores, tipografia, raios, badges e tokens são finais — reproduzir com exatidão.
- **Wireframes: fidelidade média (lo-fi/mid-fi).** Valem por **estrutura, hierarquia, densidade, conteúdo e estados**. Espaçamentos e tamanhos de fonte dos quadros são propositalmente compactos para caber no board: na implementação, aplicar a escala tipográfica do guia (corpo 15px, célula de tabela 14px, rótulo 13px, overline 11px mono) e linha de tabela de **44px**.
- Blocos cinza (`#E3E1DC`) são **placeholders** de avatar/imagem/ícone. Substituir por avatar real (iniciais) ou ícone da biblioteca do projeto (lucide-react).

## Design tokens (fonte da verdade)
### Marca
Logo: roxo `#3F2A8C` + laranja `#F58220` (arquivo `logo2.PNG`). O **laranja é exclusivo da marca** — não usar como cor de UI.

### Destaque de UI (roxo dessaturado, decisão do cliente)
```
--primary        #5B4E86   hsl(252 26% 42%)   botão primário, item ativo, links, séries de gráfico
--primary-hover  #4A3F70
--primary-soft   #EDEBF3   hsl(252 26% 94%)   fundo de badge/tag e hover suave
--primary-border #D9D4E6
--primary-dark   #B9AEDD   (uso em superfícies escuras: kernel, modo escuro)
--chart-2        #C4C0D4   série secundária (saídas / justificadas)
```

### Neutros (cinza quente)
```
#FFFFFF  superfície de card
#FAFAF9  fundo de topbar/rail/painel lateral
#F5F5F3  cabeçalho de tabela, chip inativo
#EDECE8  fundo do board (não é fundo de app; o app usa #FAFAF9)
#ECEAE6  borda interna / divisor forte
#F2F1EE  divisor de linha de tabela
#D9D7D2  borda de card e de input
#C4C4BE  borda de checkbox, tracejado, switch off
#9C9C95  texto placeholder / meta
#8C8C85  rótulo overline
#77776F  texto secundário
#5A5A54  texto de apoio
#43433E  texto em tabela
#2C2C29  texto padrão
#1D1D1B  títulos / superfície kernel
```

### Semânticas (par fundo/texto usado em badges)
```
sucesso   texto #22664A   fundo #E7F3EC   borda #BFE0CE   sólido #2E7D5B
alerta    texto #8A5A16   fundo #FBF2DF   borda #EBD8AC   sólido #B7791F
erro      texto #8F1F19   fundo #FBEAE8   borda #F0CCC8   sólido #B3261E
neutro    texto #5A5A54   fundo #F5F5F3   borda #DEDEDA
```
Modo escuro (do guia): sucesso `#5FBF92`, alerta `#E8B44A`, erro `#F08A82`; fundo `#1A1A18`, card `#232320`, borda `#35352F`, texto `#F5F5F3` / `#9C9C95`.

> O bloco `:root`/`.dark` completo em HSL, no formato shadcn, está na seção **05 — Tokens** de `EducaPilot Identidade Visual.dc.html`. **Atenção:** esse bloco está na paleta azul-ardósia da v1 do guia; para o produto, substituir `--primary` por `hsl(252 26% 42%)`, `--accent` por `hsl(252 26% 94%)` e `--chart-1/-2` pelos roxos acima. O resto (neutros, semânticas, raios) permanece.

### Tipografia
| Token | Fonte / peso | Tamanho / linha | Uso |
|---|---|---|---|
| display | Plus Jakarta Sans 800 | 40 / 44, -0.03em | herói de marketing |
| h1 | Plus Jakarta Sans 700 | 28 / 34, -0.02em | título de tela |
| h2 | Plus Jakarta Sans 700 | 20 / 28 | título de card |
| body | IBM Plex Sans 400 | 15 / 24 | texto, formulário |
| body-sm | IBM Plex Sans 400 | 14 / 20 | célula de tabela |
| label | IBM Plex Sans 600 | 13 / 18 | rótulo, badge |
| overline | IBM Plex Mono 500 | 11 / 16, 0.08em, uppercase | cabeçalho de coluna, meta |
| numérico | IBM Plex Mono / `font-variant-numeric: tabular-nums` | — | valores, matrículas, datas, R$ |

### Espaçamento, raio, sombra
- Escala: 4 / 6 / 8 / 10 / 12 / 14 / 16 / 24 / 32 px. Padding de card 14–16px; `gap` de coluna 10–14px.
- Raio: **8px** em controles (botão, input, chip retangular), **10–16px** em cards, **999px** em badges/pílulas, **22px** nos frames mobile.
- Sombra única: `0 1px 2px rgba(0,0,0,.04)` em card; `0 6px 18px rgba(0,0,0,.08)` em modal. Profundidade vem da **borda**, não do blur.
- **Layout sempre flex/grid com `gap`** — nunca margens entre irmãos.

## Mapeamento para shadcn/ui
| Padrão no wireframe | Componente shadcn |
|---|---|
| Botão roxo / contorno / fantasma | `Button` variant `default` / `outline` / `ghost` |
| Badge de status (pílula com ponto) | `Badge` variant custom por semântica |
| Tabela com cabeçalho mono uppercase | `Table` (+ `DataTable` TanStack para ordenar/paginar) |
| Card com topbar e título | `Card` + `CardHeader`/`CardContent` |
| Modal de 3 passos (A2) | `Dialog` + stepper próprio |
| Painel lateral de justificativa (R2), edição (A7) | `Sheet` ou coluna fixa |
| Chips de filtro | `ToggleGroup` ou `Badge` clicável |
| Select "▾" | `Select` / `Combobox` |
| Switch de módulo (A3, F2) | `Switch` |
| Abas da ficha do aluno (A10) | `Tabs` |
| Barra de progresso (R4, E1, E2) | `Progress` |
| Upload tracejado | `Input type=file` + dropzone |
| Gráfico de barras (R9, E1, $4) | `recharts` via shadcn `Chart`, cores `--chart-1/-2` |
| Notificações | `Popover` + lista, ou rota própria |

## Estrutura de navegação
Shell autenticado: **rail/sidebar à esquerda** (ícones + rótulo, item ativo em `--primary`) + **topbar** com nome do tenant, breadcrumb e avatar.
O menu é **montado dinamicamente** a partir dos módulos contratados pelo tenant (ver A3/A4) — não hardcodar itens.
Áreas: Rotina, Administração, Eventos & Vendas, Formulários (Flow), Financeiro, Configurações.
O **kernel/master** (L2, A4) usa superfície escura `#1D1D1B` com destaque `#B9AEDD` para deixar explícito que é ambiente de outro escopo.

## Telas
Legenda de ids conforme o board. Para cada tela: propósito, layout e observações de implementação.

### 🔐 Autenticação (L1–L4)
- **L1 Login (tenant)** — card 380px centrado, logo 52px, e-mail, senha com "mostrar", "manter conectado", link "esqueci a senha", botão primário full-width. Erro de credencial como **faixa acima do formulário** (não toast/alert). Subdomínio do tenant exibido sob o título.
- **L2 Login master (kernel)** — mesmo esqueleto em superfície escura `#1D1D1B`, borda `#35352F`; 4 campos de **2FA** (um dígito cada); botão `#B9AEDD` com texto escuro; aviso de auditoria de acesso.
- **L3 Esqueci a senha → Nova senha** — dois estados. (a) e-mail + botão + **mensagem neutra de sucesso** ("se existir uma conta…", sem revelar existência); (b) senha + confirmação, medidor de força em 3 segmentos, regra mínima 8 caracteres com 1 número.
- **L4 Aceitar convite / primeiro acesso** — mostra escola, papel e nº de turmas do convite; nome, e-mail, CPF, definir senha. **Validação inline** ao sair do campo (blur): e-mail duplicado → borda `#F0CCC8`, fundo `#FDF6F5`, ✕ e mensagem "Este e-mail já está em uso nesta escola"; CPF livre → borda `#BFE0CE`, fundo `#F5FBF7`, ✓ "CPF disponível". Endpoint de verificação é chamado por campo, com debounce; não é página própria.

### ⚙️ Administração / Kernel (A1–A10)
- **A1 Tenants — lista** — busca + filtro de status; colunas Escola (avatar 22px) / Subdomínio (mono) / Alunos (tabular) / Plano / Status. Status: Ativo, Implantação, Suspenso.
- **A2 Criar tenant** — `Dialog` 400px, stepper de 3 passos (Dados · Módulos · Admin); nome, subdomínio com validação de disponibilidade inline (sufixo `.educapilot.com` fixo), CNPJ, etapas de ensino; rodapé com Cancelar/Continuar.
- **A3 Módulos por tenant** — lista de módulos contratados com `Switch`; subtítulo explica que o menu do tenant é montado daqui; rótulo textual (Contratado / Não contratado / Roadmap).
- **A4 Catálogo de módulos (master)** — CRUD do que existe no sistema. Topbar escura. Colunas Chave (mono, roxo) / Nome / Escopo / Versão / Depende. **Distinto de A3** (contratação por escola).
- **A5 Usuários — lista + convites** — chips de contagem por papel (Todos / Professores / Coordenação / Convites pendentes); colunas Nome / E-mail / Papel / Turmas / Status; ações Importar e Convidar.
- **A6 Usuário — edição e permissões** — cabeçalho com avatar e papel; select de papel; turmas como tags removíveis + "+ turma"; **matriz de permissões** (linha = módulo, colunas Ver/Editar com checkbox); ações Reenviar convite / Salvar.
- **A7 Turmas — lista + edição** — lista à esquerda (nome, etapa · professor, nº alunos), painel de edição à direita (`#FAFAF9`): nome, etapa/turno, professor regente, capacidade.
- **A8 Importação (alunos e turmas)** — stepper Arquivo · Conferir · Confirmar; cartão do arquivo com contagem de linhas/avisos/duplicados; **tabela de pré-visualização** com coluna de validação semântica (ok / aviso / duplicado ignorado); ações Baixar erros e "Importar N alunos". Mesmo fluxo reaproveitado no Financeiro ($3).
- **A9 Alunos — lista com filtro por turma** — coluna esquerda 150px com turmas e contagens (item ativo roxo); busca por nome/matrícula/responsável; colunas Aluno / Matrícula (mono) / Turma / Responsável / Status.
- **A10 Ficha do aluno** — cabeçalho com avatar 44px, nome, matrícula · turma · idade, badge de pendência, botão Editar; **Tabs**: Dados, Responsáveis, Frequência, Ocorrências, Saúde, Documentos; grid de 3 colunas de campos; 3 cards-resumo (Frequência 30d, Ocorrências, Pendências — pendências em `#8A5A16`).

### 📋 Rotina Escolar / Diário (R1–R13)
- **R1 Chamada / frequência** (tela âncora da área) — shell completo (rail + topbar). Título "Chamada · 4º ano B", badge de data/turno, contador "24 alunos · 21 presentes", botão Salvar. Filtros: turma, data, "marcar todos presentes". Tabela Aluno / Presença / Chegada / Observação; presença como badge semântica (Presente/Ausente/Atrasado) — implementar como **grupo de 3 botões de toque**, linha de 44px, rodapé fixo com contador e salvar. Alvo tablet.
- **R2 Faltas + justificativa** — tabs "Não justificadas (7)" / "Justificadas (12)"; cards de falta (aluno, turma · data, status); painel direito de justificativa: motivo (select), anexo (dropzone), observação, botão Registrar.
- **R3 Checklist da sala — configuração** — itens reordenáveis (handle ⋮⋮), tipo (Sim/Não, Contagem), switch ativo; escopo por etapa/turmas; "+ Novo item".
- **R4 Checklist diário — preenchimento** — cabeçalho com turma · data, "4 de 6 concluídos" e `Progress`; itens com checkbox 18px e **hora do check** (mono). Concluídos ficam com texto `#9C9C95`.
- **R5 Saúde do aluno** — cabeçalho com aluno/turma/responsável + badge de alergia em vermelho; grid 2 colunas de campos (alergias, medicação contínua, restrição alimentar, convênio); timeline de registros recentes (borda esquerda 2px).
- **R6 Materiais** — catálogo **somente leitura** (backend sem CRUD): busca + lista com ícone, nome, categoria, quantidade. Badge "leitura" no topo; deixar espaço para ações futuras.
- **R7 Reuniões** — faixa destacada da reunião **em andamento** (fundo `#F7F5FB`, borda `#D9D4E6`) com "Abrir ata" e "Encerrar" (vermelho `#8F1F19`); tabela Pauta / Data / Participantes / Status (Agendada, Encerrada, Ata pendente); botão Agendar.
- **R8 Ocorrências — registro** — formulário: turma + aluno (selects), **categoria como chips de escolha única** (Comportamento, Saúde, Pedagógica, Atraso), descrição (textarea), checkbox "Notificar responsável", Cancelar/Registrar.
- **R9 Ocorrências — relatório semanal** — período no título; gráfico de barras por turma (`--primary`); painel direito "Alunos com mais registros" com contagem e ponto colorido por gravidade; Exportar PDF.
- **R10 Observação semanal por turma** — seletor de semana (chips), textarea da observação, checklist de encaminhamentos, botão "Enviar à coordenação".
- **R11 Seminários semanais** — cards com data em bloco 44px, tema, responsável · local, status (Confirmado / Aberto / Rascunho); "Novo seminário".
- **R12 Central de notificações** — lista com ponto de severidade, título, texto, horário; **fundo levemente tingido** por severidade nos não lidos (`#FCFAF4`, `#FDF6F5`); "Marcar todas como lidas".
- **R13 Central de relatórios** — grid 2 colunas de cards (nome, descrição, "Gerar ›"). Backend expõe apenas `GET available` — **sem geração customizada**; não prometer filtros avançados nesta versão.

### 🎪 Eventos & Vendas (E1–E7)
- **E1 Dashboard do evento** — nome do evento + badge "Vendas abertas" + prazo; 4 KPIs (Vendas confirmadas, Pedidos pagos, Aguardando Pix, Ticket médio); "Vendas por grupo" com barras de progresso; painel de pendências.
- **E2 Grupos de venda** — cards com meta, responsável, barra de progresso e % da meta; "Novo grupo".
- **E3 Produtos e subprodutos** — tabela Produto / Subprodutos / Preço / Estoque / Grupo. **Subproduto = variação sem preço próprio** (ex.: com/sem farofa) — afeta produção, não o total.
- **E4 Pedidos — lista** — chips (Todos / Aguardando Pix / Pagos); colunas Pedido (mono, roxo) / Comprador / Itens / Total / Pgto / Status (Pago, Aguardando, Expirado).
- **E5 Novo pedido (balcão)** — grid de produtos como cards clicáveis à esquerda; carrinho fixo à direita com itens, total em destaque, escolha Pix/Dinheiro, "Finalizar pedido". Otimizado para toque e uso rápido.
- **E6 Pré-pedido (responsável, mobile 300px)** — cabeçalho com logo e evento, prazo no título, cards de produto com stepper −/+ (alvos ≥ 26px, linha ≥ 44px), rodapé com nº de itens e total, CTA "Ir para pagamento", nota de retirada.
- **E7 Checkout Pix (mobile)** — pedido, valor, **contador de expiração**, QR code, campo de copia-e-cola com "Copiar", botão "Já paguei". Confirmação chega por **webhook Asaas**: a tela troca para "Pagamento confirmado" sem recarregar (polling/SSE).

### 🔀 Formulários Dinâmicos (F1–F5)
- **F1 Construtor** — 3 colunas: paleta de tipos de campo (Texto curto, Texto longo, Seleção, Sim/Não, Data, Anexo, **Dado de referência**), canvas com campos arrastáveis (handle, rótulo, tipo, obrigatoriedade) e zona tracejada de drop, inspetor do campo selecionado (rótulo, fonte de dados, obrigatório, visível ao responsável). Topbar com nome, badge Rascunho, Pré-visualizar, Publicar.
- **F2 Automações** — regras "Quando → Então" com switch de ativação; "+ Nova regra".
- **F3/F4 Respostas — lista e detalhe** — lista Quem / Formulário / Enviado / Status (Concluída, Revisar, Pendente); painel de detalhe com pares campo/valor, indicação da **automação disparada** e "Marcar como revisada".
- **F5 Dados de referência** — tabelas auxiliares com nº de registros e em quantos formulários são usadas; "+ Nova tabela".

### 💰 Financeiro ($1–$5)
- **$1 Despesas — lista** — 3 cards-resumo (A pagar, Atrasado em vermelho, Pago no mês); tabela Descrição / Categoria / Vence / Valor (mono tabular) / Status; Importar Excel + Nova despesa.
- **$2 Despesa — cadastro + confirmar pagamento** — descrição, valor, vencimento, categoria, centro de custo, comprovante (dropzone); bloco separado no rodapé: data do pagamento + **"Marcar como pago"** em verde `#22664A`.
- **$3 Receitas — lista + importação** — mesma estrutura de $1; faixa que abre o fluxo de importação de A8.
- **$4/$5 Fluxo de caixa / projeção** — seletor de período; 3 KPIs (Entradas, Saídas, Saldo projetado em verde); gráfico de barras duplas por mês (`--chart-1` entradas, `--chart-2` saídas) — **meses futuros como projeção** (barra tracejada/opacidade reduzida); painel "Resumo mensal" com valores +/− coloridos e linha de saldo.

### 📱 Mobile (M1–M3)
Recortes 300px de largura, raio 22px. **M1 Chamada**: lista com avatar 30px, nome e badge de presença como alvo de toque, CTA fixo. **M2 Notificações**: cards com ponto de severidade e fundo tingido. **M3 Checklist diário**: `Progress` + itens com checkbox 22px e hora. Regra: **nenhum alvo de toque abaixo de 44px**.

## Interações e comportamento
- **Estados de linha**: hover `#FAFAF9`; seleção com checkbox à esquerda quando houver ação em lote.
- **Validação inline** (L4, A2): dispara no blur, com debounce ~400ms; estados success/error pintam borda + fundo + ícone + mensagem de 10.5–11px.
- **Chamada (R1/M1)**: alteração otimista local, salvamento em lote no botão; avisar antes de sair com alterações não salvas; se a chamada do dia já existir, carregar em modo edição.
- **Importações (A8, $3)**: 3 passos com pré-visualização; duplicados são **ignorados**, não sobrescritos; oferecer download do relatório de erros.
- **Pix (E7)**: QR + copia-e-cola, expiração com contador; confirmação via webhook, sem recarregar; estado expirado permite gerar novo.
- **Notificações**: não lidos com fundo tingido e ponto; "marcar todas como lidas" é ação em massa.
- **Permissões**: itens de menu e ações escondidos (não apenas desabilitados) quando o módulo não é contratado (A3) ou o papel não permite (A6).
- **Transições**: 150ms ease-out em hover/opacidade; 200ms em abertura de sheet/dialog. Nada mais elaborado.
- **Responsivo**: ≥1280px o layout dos quadros vale como está; abaixo de 1024px tabelas viram cards empilhados (ver M1–M3 como referência de compressão).

## Estado / dados
Por tela, o mínimo necessário: filtros (turma, período, status), seleção de linha/registro, rascunho de formulário, e flags de carregando/erro/vazio. Cada lista precisa de **estado vazio** com uma frase e a ação primária (não desenhado nos quadros — criar seguindo o tom do produto).
Escopo de dados é **sempre por tenant**; `tenant_id` implícito em toda requisição. Papéis: master, diretor, coordenação, professor, responsável (futuro).

## Assets
- `logo2.PNG` — logo oficial (roxo + laranja), fornecido pelo cliente. Gerar SVG e favicons a partir dele; abaixo de ~20px usar apenas o símbolo.
- Blocos cinza nos wireframes = placeholders de avatar/imagem/ícone.
- Fontes: Google Fonts (Plus Jakarta Sans, IBM Plex Sans, IBM Plex Mono) — auto-hospedar via `next/font`.
- Ícones: usar **lucide-react** (padrão shadcn); nenhum ícone foi desenhado nos wireframes.

## Arquivos deste bundle
- `EducaPilot Wireframes.dc.html` — board das 34 telas (abrir no navegador; zoom livre).
- `EducaPilot Identidade Visual.dc.html` — guia de identidade e bloco de tokens `:root`/`.dark`.
- `logo2.PNG` — logo oficial.
- `support.js` — runtime dos arquivos de design. Existe apenas para os HTMLs abrirem/animarem localmente; **não é parte da entrega e não deve ir para o produto**.

## O que ainda não está definido
Estados vazios e de carregamento; textos de erro definitivos; portal do responsável além de E6/E7; geração customizada de relatórios (R13); modo escuro aplicado tela a tela (tokens existem, telas não foram desenhadas em dark).
