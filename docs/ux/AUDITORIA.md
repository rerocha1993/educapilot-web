# Auditoria de telas (15/10/2026)

Navegação feita no ambiente local com a escola demo (Colégio Horizonte Azul), 1440 x 900, como diretora.
Reclamação original: telas rasas, com um objeto por linha (até os pequenos), espaço da tela mal usado, e o
Financeiro precisa acompanhar o conceito de carteira.

## Princípios para todas as telas

1. **O que se faz fica no alto.** Quem escreve, decide ou preenche vem primeiro; o que se consulta (dados da
   semana, histórico) fica ao lado ou recolhido. Nada de cartões de 440 px de altura quase vazios acima do trabalho.
2. **Objeto pequeno não ganha linha inteira.** Lista de itens curtos (alunos, itens de estoque, formulários,
   reuniões) vira grade de cartões compactos (3 a 5 por linha em tela larga) ou tabela densa com as colunas que
   importam. Linha inteira só quando há conteúdo para ela.
3. **Números antes de listas.** Toda lista longa começa com uma faixa de totais (previsto, recebido, atrasado...) que
   mudam com os filtros, e termina com o total do que está filtrado.
4. **Filtro e busca em toda lista com mais de 10 itens.** Busca por nome, filtros que a pessoa usa de verdade, e o
   filtro vale na URL (dá para mandar o link).
5. **Estado vazio ocupa pouco.** Uma linha com o motivo e a ação, nunca um cartão grande.
6. **Texto longo é recolhido.** "Ver mais" em vez de parede de texto.
7. **Nada de aviso de desenvolvedor na tela** ("ainda não suportado pelo backend — próxima etapa").
8. **Ação repetida por linha vira ação em lote** (selecionar várias e agir uma vez).

## Achados, tela por tela

### Rotina (visto)
| Tela | Problema | Solução |
|---|---|---|
| **Reuniões** | Quatro cartões iguais de 440 px (faltas, ocorrências, observação, planejamento) ocupam a primeira tela quase vazios e empurram "Como foi a reunião" e as demandas para baixo. O histórico é uma linha inteira por reunião (data + selo + "Expandir"). O estado vazio das demandas ocupa um cartão. | Duas colunas: à esquerda o trabalho (discussão e resumo lado a lado, demandas em tabela compacta); à direita a "Pauta da semana" em abas (Faltas · Ocorrências · Observação · Planejamento) com contador em cada aba. Faixa de resumo no alto ("1 falta · 2 ocorrências · observação enviada · planejamento feito"). Histórico em linha do tempo compacta, 2 colunas. |
| **Chamada** | Um aluno por linha em largura total, com 3 botões. Aviso de desenvolvedor no rodapé. | Grade de cartões (2 a 3 colunas): avatar, nome, três chips Presente/Falta/Atraso. Contador "X presentes · Y faltas" fixo no topo; "Marcar todos presentes" já existe. Tirar o aviso. |
| **Checklist** | Itens com linha inteira e pouca informação; sem progresso visual nem histórico. | Barra de progresso, itens em 2 colunas, e uma faixa "últimos 7 dias" por checklist/turma. |
| **Materiais** | Um item por linha com +/− nas pontas. | Grade de cartões com nível de estoque (barra), alerta de estoque baixo e filtro por categoria; edição de quantidade no cartão. |
| **Planejamento semanal** | Paredes de texto em cartões de dois lados; parece um documento colado. | Cartões com os campos em seções recolhidas, resumo de 2 linhas e "Ver planejamento". Semana atual em destaque. |
| **Relatórios** | Quatro cartões grandes e um vazio enorme embaixo. | Lista compacta de relatórios com filtros de período/turma ali mesmo e o último gerado. |
| **Calendário** | Mês bom. | Manter. Legenda de cores dos tipos e densidade de eventos no dia. |
| **Ocorrências** | Gráfico por turma largo demais para 1 barra (ajustado em 15/10). | Já tratado. |

### Financeiro (visto)
| Tela | Problema | Solução |
|---|---|---|
| **Receitas** | Lista chapada de todas as receitas do mês, um botão "Registrar recebimento" por linha. Sem totais, sem busca, sem filtro de **carteira**, status ou categoria; "Categoria" quase tudo "Outro". Duplica o que Cobranças (Relacionamento) já faz, mas com menos recursos. | Faixa de totais (previsto · recebido · atrasado · a vencer) que respeita os filtros; busca por aluno/responsável/descrição; filtros de carteira, situação, categoria e período; coluna **Carteira**; seleção em lote ("Registrar recebimento de N"); agrupar por dia de vencimento opcional. Receitas e Cobranças passam a ser duas vistas da mesma base, com os mesmos filtros. |
| **Contas** | Mistura conta bancária e carteira de recebimento; a configuração de recebimento fica atrás de botões pequenos. | Virar **Contas e carteiras**: cada cartão mostra saldo, a receber, em atraso da carteira, se o Asaas/Pix está conectado, última conciliação e atalho "Configurar recebimento" visível. Cartão resumo "Carteira padrão de mensalidades / de cobranças". |
| **Cobranças** (Relacionamento) | Filtros bons, mas a tabela não tem total do filtro e ações só por linha. | Rodapé com totais do filtro; ações em lote; coluna carteira clicável (leva ao filtro). |
| **Painel** | Bom. | Manter. |
| Despesas, Comprovantes, Recibos, Orçamento, Projetos, Precificação, Conciliação, Plano de contas, Fechamento, Configuração | Não vistos nesta rodada (servidor local lento). | Passar o mesmo roteiro. |

### Portaria (visto)
| Tela | Problema | Solução |
|---|---|---|
| **Relatórios › Multas por atraso** | Só lista saídas com multa, uma por linha. Não mostra o tempo total que cada criança ficou na escola nem soma por criança. | Novo relatório **Permanência por criança** (pedido em 15/10): por aluno e período, dias presentes, tempo total na escola, média por dia, minutos além do período contratado, dias com excesso, multa total e se já foi cobrada; ordenável, com exportação e botão para lançar a multa como cobrança. |
| Visitantes | Tabela vazia ocupa a tela; bom o resto. | Estado vazio em uma linha. |

### Fluxos / RH / Administração / Relacionamento (visto em parte)
| Tela | Problema | Solução |
|---|---|---|
| **Fluxos › Formulários** | Quatro formulários, cada um em linha de largura inteira com pouca informação. | Grade de cartões com respostas, última resposta, status, link/QR e ações; busca. |
| **RH › Funcionários** | Tabela correta, mas sem filtros, sem indicadores e sem foto. | Faixa de totais (ativos, em afastamento, contratos a vencer), filtros de cargo/departamento, avatar. |
| **Administração › Alunos** | Aviso de desenvolvedor no rodapé ("não suportados pelo backend"). Lista por turma boa. | Tirar o aviso; colunas de responsável e situação financeira quando existirem. |
| **Relacionamento › Famílias** | Tabela comprida, sem contadores. | Faixa de totais (famílias, com e-mail, sem acesso ao portal) e filtro "sem acesso". |
| Início, Eventos, Fluxos (quadro, equipe, automações), RH (demais), Relacionamento (avisos, atividades, mural, chat), Matrículas, Administração (demais) | Não vistos nesta rodada. | Passar o roteiro. |

## Ordem sugerida das melhorias
1. Reuniões (mais reclamada).
2. Financeiro: Receitas e Contas/Carteiras (carteira é o conceito novo).
3. Portaria: relatório de permanência por criança e multa.
4. Rotina: Chamada, Materiais, Planejamento semanal, Relatórios.
5. Fluxos (Formulários), RH (Funcionários), Administração, Famílias.
6. Segunda rodada de navegação nas telas não vistas.
