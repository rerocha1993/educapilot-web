"use client";

import { useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { Search, ChevronLeft, Inbox, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AttachmentLink } from "@/components/flow/attachment-link";
import { ContagemPorCampo } from "@/components/flow/contagem-por-campo";
import { ResumoDosEnvios, SEM_TURMA } from "@/components/flow/resumo-dos-envios";
import {
  SeletorDeFormularios,
  rotuloDaSelecao,
} from "@/components/flow/seletor-de-formularios";
import { AbasDeFormularios } from "@/components/flow/abas-de-formularios";
import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
import { EstadoVazio } from "@/components/padroes/estado-vazio";
import { BadgeDeSituacao } from "@/components/flow/badge-de-situacao";
import { Button, buttonVariants } from "@/components/ui/button";
import { useForms, type FormFieldDto } from "@/lib/flow/use-forms";
import { formatarData, formatarDataHora } from "@/lib/format/date";
import {
  useRespostasDosFormularios,
  useDeleteFormResponse,
  type FormResponseDto,
} from "@/lib/flow/use-form-responses";
import {
  CHOICE_FIELD_TYPES,
  decodeOpcoes,
  decodeFieldConfig,
} from "@/lib/flow/use-form-fields";
import { TagDoTipo } from "@/components/flow/tag-do-tipo";
import { ROTULO_DO_TIPO, tipoDoFormulario } from "@/lib/flow/tipo-do-formulario";

// Caixa de envios (2026-09).
//
// A tela de respostas que existia era uma tabela larga, uma coluna por campo: com 43 campos, ela
// só rolava para o lado e ninguém conseguia ler uma matrícula inteira. Aqui a lista traz o mínimo
// para achar a pessoa (nome, e-mail, situação, data) e a ficha abre com tudo, um campo embaixo do
// outro — que é como se confere uma matrícula de verdade.
//
// A tela não é mais organizada por "tipo" (matrícula/rematrícula): a escola escolhe quais
// formulários quer ver juntos, e cada bloco do resumo só aparece se os formulários escolhidos
// tiverem aquilo — dinheiro onde há campo de valor, turma onde há campo de turma. O tipo continua
// existindo como etiqueta de cada envio, que é para o que ele serve.

const TODAS = "todas";

// Contar por resposta só faz sentido onde a resposta é uma opção conhecida. Texto livre viraria
// uma lista de respostas únicas, e não uma contagem.
const TIPOS_CONTAVEIS: string[] = [...CHOICE_FIELD_TYPES, "sim_nao"];

/** Acha, entre as respostas, o valor de um campo cujo rótulo contenha um dos termos. */
function valorPorRotulo(
  resposta: FormResponseDto,
  rotulos: Map<string, string>,
  termos: string[]
): string | null {
  for (const item of resposta.itens ?? []) {
    const rotulo = (rotulos.get(item.fieldId) ?? "").toLowerCase();
    if (termos.some((t) => rotulo.includes(t)) && item.valor?.trim()) return item.valor.trim();
  }
  return null;
}

/** Iniciais para o quadradinho da lista — vêm do nome já exibido, não de um dado novo. */
function iniciaisDe(nome: string) {
  const partes = nome.split(/\s+/).filter(Boolean);
  return (partes[0]?.[0] ?? "") + (partes.length > 1 ? (partes[partes.length - 1][0] ?? "") : "");
}

/**
 * Ordem da progressão da escola: Berçário antes de Jardim, e não ordem alfabética.
 *
 * Turma fora da lista de opções (uma que só existe no ano que vem) vem depois; "Sem turma", por
 * último, porque é a que pede atenção.
 */
function compararTurmas(ordem: string[]) {
  return (a: string, b: string) => {
    const ia = ordem.indexOf(a);
    const ib = ordem.indexOf(b);
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    if (a === SEM_TURMA) return 1;
    if (b === SEM_TURMA) return -1;
    return a.localeCompare(b, "pt-BR");
  };
}

function ValorDoCampo({ tipo, valor }: { tipo?: string; valor: string | null }) {
  if (!valor?.trim()) return <span className="text-muted-foreground">—</span>;
  if (tipo === "anexo") return <AttachmentLink url={valor} />;
  if (tipo === "checkbox") return <>{decodeOpcoes(valor).join(", ")}</>;
  if (tipo === "contrato") return <>{valor.toLowerCase() === "aceito" ? "Aceito" : "Não aceito"}</>;
  if (tipo === "avaliacao") return <>{valor} ★</>;
  return <>{valor}</>;
}

/**
 * Converte o texto do campo de mensalidade em número.
 *
 * O valor chega formatado ("R$ 2.490,44") porque é assim que a família viu e assinou. Somar
 * exige desfazer a formatação brasileira: ponto é separador de milhar e vírgula é decimal — o
 * inverso do que Number() espera.
 */
function valorEmNumero(texto: string | null): number {
  if (!texto) return 0;
  const limpo = texto.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number(limpo);
  return Number.isFinite(n) ? n : 0;
}

export default function CaixaDeEnviosPage() {
  const { data: forms } = useForms();
  const formularios = forms ?? [];

  // Lista vazia = todos os formulários, que é o padrão da tela.
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [busca, setBusca] = useState("");
  const [turmaEscolhida, setTurmaEscolhida] = useState<string>(TODAS);
  const [campoContado, setCampoContado] = useState<string | null>(null);
  const [aberta, setAberta] = useState<string | null>(null);

  const idsAtivos = selecionados.length > 0 ? selecionados : formularios.map((f) => f.id);
  const { respostas, isLoading } = useRespostasDosFormularios(idsAtivos);

  const formPorId = new Map(formularios.map((f) => [f.id, f]));
  const camposDe = (id: string) =>
    [...(formPorId.get(id)?.campos ?? [])].sort((a, b) => a.ordem - b.ordem);

  const detalhe = respostas.find((r) => r.id === aberta);
  const excluir = useDeleteFormResponse(detalhe?.formId ?? "");

  async function handleExcluir(id: string) {
    try {
      await excluir.mutateAsync(id);
      toast.success("Resposta excluída.");
      setAberta(null);
    } catch (err) {
      // A mensagem do backend explica o motivo — em geral, contrato já assinado.
      toast.error(err instanceof Error ? err.message : "Não foi possível excluir.");
    }
  }

  // Os campos de valor e de turma são de cada formulário: numa seleção com vários, cada envio usa
  // os campos do formulário de onde veio, e o resumo soma tudo junto.
  const autoPreenchimentoDe = (c: { config: string | null }) =>
    decodeFieldConfig(c.config).autoPreenchimento as string | undefined;

  const campoValorDe = (id: string) =>
    camposDe(id).find(
      (c) =>
        autoPreenchimentoDe(c) === "valor_proximo_ano" ||
        c.label.toLowerCase().includes("mensalidade acordada")
    );

  // A turma vem do campo que o sistema preenche pela progressão (turma_proximo_ano), não de algo
  // que a família digitou: é a turma que a escola decidiu, e por isso dá para contar vaga com ela.
  const campoTurmaDe = (id: string) =>
    camposDe(id).find(
      (c) => autoPreenchimentoDe(c) === "turma_proximo_ano" || /turma em \d{4}/i.test(c.label)
    );

  const valorDoItem = (resposta: FormResponseDto, fieldId: string) =>
    (resposta.itens ?? []).find((i) => i.fieldId === fieldId)?.valor ?? null;

  const linhas = respostas
    .map((r) => {
      const origem = formPorId.get(r.formId);
      const rotulos = new Map(camposDe(r.formId).map((c) => [c.id, c.label]));
      const campoTurma = campoTurmaDe(r.formId);
      return {
        resposta: r,
        formNome: origem?.nome ?? "",
        tipo: origem ? tipoDoFormulario(origem) : null,
        nome:
          valorPorRotulo(r, rotulos, ["nome do responsável", "nome responsável"]) ??
          r.nomeReferencia ??
          valorPorRotulo(r, rotulos, ["nome do aluno", "nome completo"]) ??
          "Sem nome",
        email: valorPorRotulo(r, rotulos, ["e-mail", "email"]),
        temTurma: !!campoTurma,
        turma: campoTurma ? valorDoItem(r, campoTurma.id)?.trim() || null : null,
      };
    })
    .sort((a, b) => b.resposta.dataPreenchimento.localeCompare(a.resposta.dataPreenchimento));

  // O que a seleção tem. Cada bloco do resumo depende de uma destas listas não estar vazia: é o
  // que impede um "R$ 0,00" numa caixa que só tem autorização de passeio.
  const camposValor = idsAtivos.map(campoValorDe).filter((c): c is FormFieldDto => !!c);
  const camposTurma = idsAtivos.map(campoTurmaDe).filter((c): c is FormFieldDto => !!c);

  const rotulosUnicos = (campos: FormFieldDto[]) =>
    Array.from(new Set(campos.map((c) => c.label.trim()))).join(" · ");

  const ordemDasTurmas = Array.from(
    new Set(
      idsAtivos.flatMap((id) => [
        ...decodeOpcoes(camposDe(id).find((c) => autoPreenchimentoDe(c) === "turma_atual")?.opcoes),
        ...decodeOpcoes(campoTurmaDe(id)?.opcoes),
      ])
    )
  );

  // As turmas do filtro são as que realmente aparecem nos envios: uma opção que não devolve
  // ninguém só faz a lista sumir sem explicação.
  const turmasDisponiveis =
    camposTurma.length === 0
      ? []
      : Array.from(
          new Set(linhas.filter((l) => l.temTurma).map((l) => l.turma ?? SEM_TURMA))
        ).sort(compararTurmas(ordemDasTurmas));

  // Turma que saiu da seleção não pode esconder a lista inteira em silêncio.
  const turmaAtiva = turmasDisponiveis.includes(turmaEscolhida) ? turmaEscolhida : TODAS;

  const lista = linhas
    .filter((l) => turmaAtiva === TODAS || (l.temTurma && (l.turma ?? SEM_TURMA) === turmaAtiva))
    .filter(({ nome, email }) => {
      const termo = busca.trim().toLowerCase();
      if (!termo) return true;
      return nome.toLowerCase().includes(termo) || (email ?? "").toLowerCase().includes(termo);
    });

  // A mesma pergunta em dois formulários são dois campos com ids diferentes. Agrupar pelo rótulo é
  // o que faz "matrícula + rematrícula" darem um número só, e não dois contadores iguais.
  const camposContaveis = new Map<string, { rotulo: string; ids: Set<string>; opcoes: string[] }>();
  for (const id of idsAtivos) {
    for (const campo of camposDe(id)) {
      if (!TIPOS_CONTAVEIS.includes(campo.tipo)) continue;
      const chave = campo.label.trim().toLowerCase();
      const grupo = camposContaveis.get(chave) ?? {
        rotulo: campo.label.trim(),
        ids: new Set<string>(),
        opcoes: [] as string[],
      };
      grupo.ids.add(campo.id);
      for (const opcao of decodeOpcoes(campo.opcoes)) {
        if (!grupo.opcoes.includes(opcao)) grupo.opcoes.push(opcao);
      }
      camposContaveis.set(chave, grupo);
    }
  }

  const camposParaContar = Array.from(camposContaveis, ([chave, grupo]) => ({
    chave,
    rotulo: grupo.rotulo,
  }));
  const chaveContada =
    campoContado && camposContaveis.has(campoContado)
      ? campoContado
      : (camposParaContar[0]?.chave ?? null);
  const grupoContado = chaveContada ? camposContaveis.get(chaveContada) : undefined;

  const contagemDoCampo: [string, number][] = (() => {
    if (!grupoContado) return [];
    const mapa = new Map<string, number>();
    let semResposta = 0;

    for (const { resposta } of lista) {
      const valores = (resposta.itens ?? [])
        .filter((i) => grupoContado.ids.has(i.fieldId))
        .flatMap((i) => {
          const bruto = i.valor?.trim();
          if (!bruto) return [];
          // Checkbox guarda as marcadas num array JSON: cada opção conta uma vez.
          const marcadas = decodeOpcoes(bruto);
          return marcadas.length > 0 ? marcadas : [bruto];
        });

      if (valores.length > 0) {
        for (const valor of valores) mapa.set(valor, (mapa.get(valor) ?? 0) + 1);
      } else if (camposDe(resposta.formId).some((c) => grupoContado.ids.has(c.id))) {
        // Só entra em "sem resposta" quem tinha a pergunta para responder.
        semResposta += 1;
      }
    }

    const itens = Array.from(mapa).sort(([a, qa], [b, qb]) => {
      const ia = grupoContado.opcoes.indexOf(a);
      const ib = grupoContado.opcoes.indexOf(b);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return qb - qa;
    });
    if (semResposta > 0) itens.push(["Sem resposta", semResposta]);
    return itens;
  })();

  const concluidas = lista.filter(({ resposta }) => resposta.status === "Concluída");

  // Só as concluídas entram no dinheiro: somar pendente seria contar receita que a escola ainda
  // pode reprovar. Cada envio usa o campo de valor do formulário de onde veio — é essa a junção.
  const totalMensal = concluidas.reduce((soma, { resposta }) => {
    const campo = campoValorDe(resposta.formId);
    return soma + (campo ? valorEmNumero(valorDoItem(resposta, campo.id)) : 0);
  }, 0);

  const porTurma: [string, number][] =
    camposTurma.length === 0
      ? []
      : Array.from(
          concluidas
            .filter((l) => l.temTurma)
            .reduce((mapa, l) => {
              const turma = l.turma || SEM_TURMA;
              mapa.set(turma, (mapa.get(turma) ?? 0) + 1);
              return mapa;
            }, new Map<string, number>())
        ).sort(([a], [b]) => compararTurmas(ordemDasTurmas)(a, b));

  if (detalhe) {
    const linha = linhas.find((l) => l.resposta.id === detalhe.id);
    const valores = new Map((detalhe.itens ?? []).map((i) => [i.fieldId, i.valor]));

    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <button
          type="button"
          onClick={() => setAberta(null)}
          className="flex min-h-10 w-fit items-center gap-1 text-xs md:min-h-0 text-muted-foreground hover:underline"
        >
          <ChevronLeft className="size-3.5" /> Voltar para a lista
        </button>

        <CabecalhoDaPagina
          titulo={linha?.nome ?? "Resposta"}
          apoio={[linha?.email, linha?.formNome].filter(Boolean).join(" · ")}
          acoes={
            <>
              <TagDoTipo tipo={linha?.tipo ?? null} />
              <BadgeDeSituacao situacao={detalhe.status} />
              {/* Só na ficha aberta, nunca na lista: excluir de uma lista de dezenas de famílias é
                  clique errado esperando acontecer. Resposta com contrato assinado o servidor
                  recusa, e o motivo aparece no aviso. */}
              <Button
                variant="ghost"
                size="icon-sm"
                title="Excluir resposta"
                disabled={excluir.isPending}
                onClick={() => handleExcluir(detalhe.id)}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </>
          }
        />

        <p className="text-xs text-muted-foreground">
          Enviado em{" "}
          <span className="font-mono tabular-nums">{formatarDataHora(detalhe.dataPreenchimento)}</span>
        </p>

        {/* Todos os campos do formulário, na ordem em que a família preencheu — inclusive os que
            ficaram em branco. Esconder os vazios faria parecer que o campo não existe, quando o
            que aconteceu foi ninguém responder. */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
          {camposDe(detalhe.formId).map((campo) => (
            <div key={campo.id} className="border-b border-border px-4 py-3 last:border-b-0">
              <p className="text-xs text-muted-foreground">{campo.label}</p>
              <div className="mt-0.5 text-sm break-words">
                <ValorDoCampo tipo={campo.tipo} valor={valores.get(campo.id) ?? null} />
              </div>
            </div>
          ))}
        </div>

        {detalhe.observacoes && (
          <div className="rounded-xl border border-border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">Observações</p>
            <p className="mt-0.5 text-sm break-words">{detalhe.observacoes}</p>
          </div>
        )}
      </div>
    );
  }

  const opcoesDoSeletor = formularios.map((f) => {
    const tipo = tipoDoFormulario(f);
    return {
      id: f.id,
      nome: f.nome,
      sufixo: tipo === "matricula" || tipo === "rematricula" ? ROTULO_DO_TIPO[tipo] : null,
    };
  });

  const mostrarOrigem = idsAtivos.length > 1;
  const temFiltro = selecionados.length > 0 || turmaAtiva !== TODAS || busca.trim() !== "";

  function limparFiltros() {
    setSelecionados([]);
    setTurmaEscolhida(TODAS);
    setBusca("");
  }

  return (
    <div className="flex flex-col gap-4">
      <AbasDeFormularios />

      <CabecalhoDaPagina
        titulo="Caixa de envios"
        apoio="Escolha os formulários que quer acompanhar juntos. Clique para ver a ficha inteira."
        acoes={
          <>
            <Link href="/flow/relatorios" className={buttonVariants({ variant: "outline" })}>
              Baixar Excel em Relatórios
            </Link>
            <Link href="/admin/contratos" className={buttonVariants({ variant: "action" })}>
              Ir para Contratos
            </Link>
          </>
        }
      />

      {lista.length > 0 && (
        <ResumoDosEnvios
          escopo={rotuloDaSelecao(opcoesDoSeletor, selecionados)}
          total={lista.length}
          concluidas={concluidas.length}
          aguardando={lista.length - concluidas.length}
          dinheiro={
            camposValor.length > 0
              ? {
                  total: totalMensal,
                  rotulo: rotulosUnicos(camposValor),
                  formularios: camposValor.length,
                }
              : null
          }
          turmas={
            camposTurma.length > 0
              ? { rotulo: rotulosUnicos(camposTurma), itens: porTurma }
              : null
          }
        />
      )}

      <div className="flex flex-wrap items-center gap-2">
        <SeletorDeFormularios
          formularios={opcoesDoSeletor}
          selecionados={selecionados}
          onChange={setSelecionados}
        />

        {/* Filtro de turma só existe onde existe campo de turma. */}
        {turmasDisponiveis.length > 0 && (
          <Select value={turmaAtiva} onValueChange={(v) => v && setTurmaEscolhida(String(v))}>
            <SelectTrigger className="w-full md:w-52">
              <SelectValue>
                {() => (turmaAtiva === TODAS ? "Todas as turmas" : turmaAtiva)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODAS}>Todas as turmas</SelectItem>
              {turmasDisponiveis.map((turma) => (
                <SelectItem key={turma} value={turma}>
                  {turma}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <div className="relative w-full md:w-auto md:min-w-56 md:flex-1">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Buscar por nome ou e-mail"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        <span className="text-sm text-muted-foreground">
          <span className="font-mono tabular-nums">{lista.length}</span> envio(s)
        </span>
      </div>

      {chaveContada && (
        <ContagemPorCampo
          campos={camposParaContar}
          escolhido={chaveContada}
          onEscolher={setCampoContado}
          contagem={contagemDoCampo}
        />
      )}

      {(isLoading || !forms) && <Skeleton className="h-64 w-full" />}

      {!isLoading && forms && lista.length === 0 && (
        <EstadoVazio
          icone={<Inbox />}
          titulo={temFiltro ? "Nenhum envio com esses filtros." : "Nenhum envio ainda."}
          texto={temFiltro ? "Tente outra combinação de formulários, turma ou busca." : undefined}
          acao={
            temFiltro ? (
              <Button onClick={limparFiltros}>
                Limpar filtros
              </Button>
            ) : undefined
          }
        />
      )}

      {lista.length > 0 && (
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
          {lista.map(({ resposta, nome, email, tipo, formNome }) => (
            <button
              key={resposta.id}
              type="button"
              onClick={() => setAberta(resposta.id)}
              className="grid grid-cols-[38px_minmax(0,1fr)] items-center gap-x-3.5 gap-y-2 border-b border-border px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-muted/50 md:grid-cols-[38px_minmax(0,1fr)_auto]"
            >
              <span className="grid size-[38px] place-items-center self-start rounded-[11px] bg-accent text-xs font-bold text-accent-foreground md:self-center">
                {iniciaisDe(nome)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{nome}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                  {email && <span className="truncate">{email}</span>}
                  {email && mostrarOrigem && formNome && <span className="text-border">·</span>}
                  {mostrarOrigem && formNome && <span className="truncate">{formNome}</span>}
                </p>
              </div>
              <div className="col-start-2 flex flex-wrap items-center gap-2 md:col-start-3 md:justify-end">
                <TagDoTipo tipo={tipo} />
                <BadgeDeSituacao situacao={resposta.status} />
                <span className="font-mono text-xs whitespace-nowrap tabular-nums text-muted-foreground">
                  {formatarData(resposta.dataPreenchimento, {
                    day: "2-digit",
                    month: "short",
                  })}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
