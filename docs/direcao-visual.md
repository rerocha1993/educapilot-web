# Direção visual (2026-09)

Referência da entrega de design "EducaPilot Sistema" (arquivo `educapilot-sistema.html`, tela
**Guia de aplicação**). O que está aqui já vive em `src/app/globals.css` e nos componentes de
`src/components/ui` — esta página existe para explicar **quando** usar cada coisa.

## A regra que decide tudo

| Cor | Papel | Onde |
|---|---|---|
| Roxo `#5C4B8C` (`primary`) | **Estrutura** | navegação, dados neutros, ações estruturais (salvar, editar, criar) |
| Laranja `#B85C00` (`action`) / `#F5851F` (`action-brand`) | **Ação** | o CTA principal da tela, o item ativo do menu, pendência, foco de campo |
| Verde `#2E6B4F` (`success`), vermelho `#A8321F` (`destructive`) | **Situação do dado** | concluído, atraso |

Laranja **nunca é decoração**: é sempre onde existe uma decisão para tomar. Uma tela tem no
máximo um botão laranja.

## Classes a usar

- Botões: `<Button>` (roxo, padrão), `<Button variant="action">` (o CTA da tela),
  `variant="outline"` (secundário), `variant="ghost"`, `variant="destructive"`.
- Etiquetas de situação: `<Badge variant="success|pending|waiting|overdue">`
  (concluída, pendente, aguardando, vencida).
- Cartão: `<Card>` — fundo branco, borda `border` (#E9E5DF), raio 16px. Sem sombra;
  sombra só no CTA e em cartão flutuante.
- Campo: `<Input>`/`<Select>` — borda `input` (#E4DFD8), raio 10px, foco laranja (vem do `--ring`).

## Tipografia

| Uso | Como |
|---|---|
| Título de tela | `font-heading text-[clamp(24px,3vw,32px)] font-semibold tracking-[-.03em]` |
| Título de cartão | `font-heading text-[15.5px] font-semibold` |
| Corpo e linha de tabela | padrão (Plus Jakarta Sans) `text-sm` |
| Cabeçalho de coluna | `text-[11px] font-bold uppercase tracking-[.1em] text-muted-foreground` |
| **Todo número** | `font-mono tabular-nums` — dinheiro, datas, horas, contagens, percentuais |

O último item é o mais visível da entrega: valores, datas e horários em IBM Plex Mono. Existe a
classe utilitária `.font-numeric` (mono + tabular-nums) em `globals.css`.

## Padrões de tela

**Cabeçalho da página**: eyebrow opcional em maiúsculas (`text-[11.5px] uppercase tracking-[.16em]
text-action font-bold`), título, uma linha de apoio em `text-muted-foreground`, e à direita os
botões — secundário(s) `outline` + um `action`.

**Abas de sub-navegação**: pílulas — o item ativo é branco com sombra leve
(`bg-card shadow-[0_1px_3px_rgba(42,37,48,.12)] font-semibold`), os demais são texto
`text-muted-foreground`, tudo dentro de uma faixa `bg-muted rounded-lg p-1`.

**Tabela**: cabeçalho com o estilo de coluna acima, linhas com `border-b border-border`, números
alinhados à direita em mono. No celular vira lista de cartões (já implementado nas telas).

**Estado vazio**: cartão com borda tracejada (`border border-dashed border-[#E0DAD2]`), ícone num
quadrado `bg-muted` de 40px, título em `font-heading`, texto curto e um botão roxo com a ação.

**Estatística**: rótulo pequeno em `text-muted-foreground`, número grande
(`font-heading text-[30px] font-semibold tracking-[-.03em] font-numeric`), total ao lado em
cinza, barra de progresso fina (6px, `bg-muted`, preenchimento roxo — laranja quando for pouco).

## O modelo

Os arquivos ficam fora do repositório (entrega do designer). Para abrir:

```bash
python -m http.server 8123 --bind 127.0.0.1
```

na pasta da entrega, e abrir `educapilot-sistema.html`. Telas desenhadas: Início, Rotina·Chamada,
Portaria·Hoje, Formulários (Caixa de envios e Editor de campos), Financeiro, Administração,
Eventos & vendas e o Guia de aplicação.
