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
import { ResumoAprovadas, SEM_TURMA } from "@/components/flow/resumo-aprovadas";
import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
import { EstadoVazio } from "@/components/padroes/estado-vazio";
import { BadgeDeSituacao } from "@/components/flow/badge-de-situacao";
import { Button, buttonVariants } from "@/components/ui/button";
import { useForms } from "@/lib/flow/use-forms";
import { formatarData, formatarDataHora } from "@/lib/format/date";
import {
  useRespostasDosFormularios,
  useDeleteFormResponse,
  type FormResponseDto,
} from "@/lib/flow/use-form-responses";
import { decodeOpcoes, decodeFieldConfig } from "@/lib/flow/use-form-fields";
import { TagDoTipo } from "@/components/flow/tag-do-tipo";
import { ROTULO_DO_TIPO, tipoDoFormulario } from "@/lib/flow/tipo-do-formulario";

// Caixa de envios (2026-09).
//
// A tela de respostas que existia era uma tabela larga, uma coluna por campo: com 43 campos, ela
// só rolava para o lado e ninguém conseguia ler uma matrícula inteira. Aqui a lista traz o mínimo
// para achar a pessoa (nome, e-mail, situação, data) e a ficha abre com tudo, um campo embaixo do
// outro — que é como se confere uma matrícula de verdade.

const TODOS = "todos";

const FILTRO_DE_TIPO = [
  { valor: TODOS, rotulo: "Todos os tipos" },
  { valor: "matricula", rotulo: "Matrícula" },
  { valor: "rematricula", rotulo: "Rematrícula" },
];

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

  // "Todos" junta os envios de todos os formulários, cada um com a tag do formulário de onde veio:
  // é como se acompanha matrícula e rematrícula ao mesmo tempo sem trocar de tela.
  const [formId, setFormId] = useState<string>(TODOS);
  const [tipoFiltro, setTipoFiltro] = useState<string>(TODOS);
  const todos = formId === TODOS;

  const { respostas, isLoading } = useRespostasDosFormularios(
    todos ? formularios.map((f) => f.id) : [formId]
  );
  const [busca, setBusca] = useState("");
  const [aberta, setAberta] = useState<string | null>(null);

  const formPorId = new Map(formularios.map((f) => [f.id, f]));
  const camposDe = (id: string) => [...(formPorId.get(id)?.campos ?? [])].sort((a, b) => a.ordem - b.ordem);

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


  const linhas = respostas
    .map((r) => {
      const origem = formPorId.get(r.formId);
      const rotulos = new Map(camposDe(r.formId).map((c) => [c.id, c.label]));
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
      };
    })
    .sort((a, b) => b.resposta.dataPreenchimento.localeCompare(a.resposta.dataPreenchimento));

  const lista = linhas
    .filter(({ tipo }) => tipoFiltro === TODOS || tipo === tipoFiltro)
    .filter(({ nome, email }) => {
      const termo = busca.trim().toLowerCase();
      if (!termo) return true;
      return nome.toLowerCase().includes(termo) || (email ?? "").toLowerCase().includes(termo);
    });

  // Os campos de valor e de turma são de cada formulário: em "Todos", cada envio usa os campos do
  // formulário de onde veio, e o resumo soma matrícula e rematrícula juntas.
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

  // Total do que ja foi aprovado. So as Concluidas entram: somar pendente seria contar receita
  // que a escola ainda pode reprovar. E so de formulario com campo de mensalidade: uma autorizacao
  // de passeio concluida nao e matricula.
  const aprovadas = lista.filter(
    ({ resposta }) => resposta.status === "Concluída" && !!campoValorDe(resposta.formId)
  );

  const campoValor = aprovadas.length > 0 ? campoValorDe(aprovadas[0].resposta.formId) : undefined;

  const totalMensal = aprovadas.reduce((soma, { resposta }) => {
    const campo = campoValorDe(resposta.formId);
    return soma + (campo ? valorEmNumero(valorDoItem(resposta, campo.id)) : 0);
  }, 0);

  const campoTurma = aprovadas.map(({ resposta }) => campoTurmaDe(resposta.formId)).find(Boolean);

  // Ordem da progressão, tirada das opções do campo da turma atual (juntando as dos formulários,
  // sem repetir). Lista na sequência em que a escola pensa — Berçário antes de Jardim —, e não em
  // ordem alfabética ou por quantidade.
  const ordemDasTurmas = Array.from(
    new Set(
      Array.from(new Set(aprovadas.map(({ resposta }) => resposta.formId))).flatMap((id) =>
        decodeOpcoes(camposDe(id).find((c) => autoPreenchimentoDe(c) === "turma_atual")?.opcoes)
      )
    )
  );

  const rotuloAprovadas =
    tipoFiltro === "matricula"
      ? "Matrículas aprovadas"
      : tipoFiltro === "rematricula"
        ? "Rematrículas aprovadas"
        : !todos && aprovadas[0]?.tipo === "matricula"
          ? "Matrículas aprovadas"
          : !todos && aprovadas[0]?.tipo === "rematricula"
            ? "Rematrículas aprovadas"
            : "Matrículas e rematrículas aprovadas";

  const porTurma: [string, number][] = campoTurma
    ? Array.from(
        aprovadas.reduce((mapa, { resposta }) => {
          const campo = campoTurmaDe(resposta.formId);
          const turma = (campo ? valorDoItem(resposta, campo.id)?.trim() : null) || SEM_TURMA;
          mapa.set(turma, (mapa.get(turma) ?? 0) + 1);
          return mapa;
        }, new Map<string, number>())
      ).sort(([a], [b]) => {
        const ia = ordemDasTurmas.indexOf(a);
        const ib = ordemDasTurmas.indexOf(b);
        if (ia !== -1 && ib !== -1) return ia - ib;
        if (ia !== -1) return -1;
        if (ib !== -1) return 1;
        // Turma fora da lista (uma que só existe no ano que vem) vem depois; "Sem turma", por
        // último, porque é a que pede atenção.
        if (a === SEM_TURMA) return 1;
        if (b === SEM_TURMA) return -1;
        return a.localeCompare(b, "pt-BR");
      })
    : [];

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

  const rotuloDoFormulario = (id: string) => {
    if (id === TODOS) return "Todos os formulários";
    const f = formPorId.get(id);
    if (!f) return "Escolha o formulário";
    const t = tipoDoFormulario(f);
    return t === "matricula" || t === "rematricula" ? `${f.nome} · ${ROTULO_DO_TIPO[t]}` : f.nome;
  };

  return (
    <div className="flex flex-col gap-4">
      <CabecalhoDaPagina
        titulo="Caixa de envios"
        apoio="Tudo o que as famílias enviaram. Clique para ver a matrícula inteira."
        acoes={
          <>
            <Link href="/flow/relatorios" className={buttonVariants({ variant: "outline" })}>
              Baixar Excel em Relatórios
            </Link>
            <Link href="/flow/contratos" className={buttonVariants({ variant: "action" })}>
              Ir para Contratos
            </Link>
          </>
        }
      />

      {campoValor && aprovadas.length > 0 && (
        <ResumoAprovadas
          totalMensal={totalMensal}
          aprovadas={aprovadas.length}
          porTurma={porTurma}
          rotuloValor={campoValor.label}
          rotuloTurma={campoTurma?.label ?? null}
          rotuloAprovadas={rotuloAprovadas}
        />
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Select value={formId} onValueChange={(v) => v && setFormId(String(v))}>
          <SelectTrigger className="w-full md:w-72">
            <SelectValue>{() => rotuloDoFormulario(formId)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todos os formulários</SelectItem>
            {formularios.map((f) => (
              <SelectItem key={f.id} value={f.id}>
                {rotuloDoFormulario(f.id)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={tipoFiltro} onValueChange={(v) => v && setTipoFiltro(String(v))}>
          <SelectTrigger className="w-full md:w-44">
            <SelectValue>{() => FILTRO_DE_TIPO.find((t) => t.valor === tipoFiltro)?.rotulo}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {FILTRO_DE_TIPO.map((t) => (
              <SelectItem key={t.valor} value={t.valor}>
                {t.rotulo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

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

      {isLoading && <Skeleton className="h-64 w-full" />}

      {!isLoading && lista.length === 0 && (
        <EstadoVazio
          icone={<Inbox />}
          titulo="Nenhum envio ainda."
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
                  {email && todos && formNome && <span className="text-border">·</span>}
                  {todos && formNome && <span className="truncate">{formNome}</span>}
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
