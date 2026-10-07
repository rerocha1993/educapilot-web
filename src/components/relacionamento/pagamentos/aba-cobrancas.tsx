"use client";

import { useMemo, useState } from "react";
import { Check, Copy, ExternalLink, Link2, Plus, QrCode, Receipt, X } from "lucide-react";

import { EtiquetaDaCobranca, Numero } from "@/components/finance/projetos/comum";
import { DialogQrDoPix, copiarTexto } from "@/components/relacionamento/dialog-qr-do-pix";
import { CancelarCobranca, DialogMarcarPaga } from "@/components/relacionamento/pagamentos/dialogs-de-cobranca";
import { DialogNovaCobranca } from "@/components/relacionamento/pagamentos/dialog-nova-cobranca";
import { EstadoVazio } from "@/components/padroes/estado-vazio";
import { ErroDeCarga } from "@/components/rh/campo";
import { BotaoDeIcone, CartaoDaLista } from "@/components/rh/lista-movel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ROTULO_DA_COBRANCA, type StatusDaCobranca } from "@/lib/finance/use-projetos";
import { rotuloDaForma } from "@/lib/finance/use-recibos";
import { competenciaDeIso, formatarSoData, hojeIsoBrasilia } from "@/lib/format/date";
import { useClasses } from "@/lib/kernel/use-classes";
import { formatarMoeda } from "@/lib/rh/formatar";
import {
  STATUS_DA_COBRANCA,
  useCobrancasDaEscola,
  useResumoDeCobrancas,
  type Cobranca,
  type OrigemDaCobranca,
} from "@/lib/relacionamento/use-pagamentos";

const TODOS = "todos";
/** A tabela não pagina: acima disto o servidor mandou demais para caber numa tela útil. */
const LIMITE_DA_LISTA = 300;

const MESES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

type Dialogo =
  | { tipo: "nova" }
  | { tipo: "qr"; cobranca: Cobranca }
  | { tipo: "paga"; cobranca: Cobranca }
  | { tipo: "cancelar"; cobranca: Cobranca };

/**
 * Cobranças da escola: o resumo do mês, os filtros e, por cobrança, link, Pix, QR, baixa manual e
 * cancelamento. Cobrança de loja e de plano aparecem aqui também, com a origem na linha.
 */
export function AbaCobrancas() {
  const [status, setStatus] = useState<string>(TODOS);
  const [turma, setTurma] = useState<string>(TODOS);
  const [origem, setOrigem] = useState<string>(TODOS);
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [dialogo, setDialogo] = useState<Dialogo | null>(null);

  const { mes, ano } = competenciaDeIso(hojeIsoBrasilia());
  const resumo = useResumoDeCobrancas(mes, ano);

  const { data: classes } = useClasses();
  const turmas = useMemo(
    () =>
      (classes ?? [])
        .filter((c): c is typeof c & { id: number } => typeof c.id === "number")
        .map((c) => ({ id: c.id, nome: c.className ?? `Turma ${c.id}` }))
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
    [classes]
  );

  const periodoInvertido = de !== "" && ate !== "" && de > ate;
  const { data, isLoading, isError, refetch } = useCobrancasDaEscola({
    status: status === TODOS ? null : (status as StatusDaCobranca),
    classId: turma === TODOS ? null : Number(turma),
    de: periodoInvertido ? "" : de,
    ate: periodoInvertido ? "" : ate,
    origem: origem === TODOS ? null : (origem as OrigemDaCobranca),
  });

  const filtrando = status !== TODOS || turma !== TODOS || origem !== TODOS || de !== "" || ate !== "";
  const lista = (data ?? []).slice(0, LIMITE_DA_LISTA);
  const cortada = (data?.length ?? 0) > LIMITE_DA_LISTA;
  const turmaEscolhida = turmas.find((t) => String(t.id) === turma);

  function limpar() {
    setStatus(TODOS);
    setTurma(TODOS);
    setOrigem(TODOS);
    setDe("");
    setAte("");
  }

  return (
    <div className="grid gap-4">
      <section
        aria-label={`Resumo das cobranças de ${MESES[mes - 1]}`}
        className="grid gap-4 rounded-xl border border-border bg-card p-4 sm:grid-cols-[1fr_auto] sm:items-center"
      >
        {resumo.isError ? (
          <ErroDeCarga texto="Não foi possível carregar o resumo." onTentar={() => resumo.refetch()} />
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 lg:grid-cols-5">
            <Numero rotulo="Em aberto" valor={resumo.data ? String(resumo.data.emAberto) : "—"} />
            <Numero
              rotulo="Vencidas"
              valor={resumo.data ? String(resumo.data.vencidas) : "—"}
              tom={resumo.data && resumo.data.vencidas > 0 ? "danger" : undefined}
            />
            <Numero
              rotulo={`Pagas em ${MESES[mes - 1]}`}
              valor={resumo.data ? String(resumo.data.pagasNoMes) : "—"}
              tom={resumo.data && resumo.data.pagasNoMes > 0 ? "success" : undefined}
            />
            <Numero rotulo="A receber" valor={resumo.data ? formatarMoeda(resumo.data.valorEmAberto) : "—"} />
            <Numero
              rotulo={`Recebido em ${MESES[mes - 1]}`}
              valor={resumo.data ? formatarMoeda(resumo.data.valorPagoNoMes) : "—"}
              tom={resumo.data && resumo.data.valorPagoNoMes > 0 ? "success" : undefined}
            />
          </div>
        )}

        <Button variant="action" className="w-full sm:w-auto" onClick={() => setDialogo({ tipo: "nova" })}>
          <Plus />
          Nova cobrança única
        </Button>
      </section>

      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-[repeat(3,minmax(0,1fr))_auto_auto]">
        <Select value={status} onValueChange={(v) => v && setStatus(v)}>
          <SelectTrigger aria-label="Filtrar por situação" className="w-full">
            <SelectValue>{() => (status === TODOS ? "Todas as situações" : ROTULO_DA_COBRANCA[status as StatusDaCobranca])}</SelectValue>
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
            <SelectItem value={TODOS}>Todas as situações</SelectItem>
            {STATUS_DA_COBRANCA.map((s) => (
              <SelectItem key={s} value={s}>
                {ROTULO_DA_COBRANCA[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={turma} onValueChange={(v) => v && setTurma(v)}>
          <SelectTrigger aria-label="Filtrar por turma" className="w-full">
            <SelectValue>{() => (turmaEscolhida ? turmaEscolhida.nome : "Todas as turmas")}</SelectValue>
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
            <SelectItem value={TODOS}>Todas as turmas</SelectItem>
            {turmas.map((t) => (
              <SelectItem key={t.id} value={String(t.id)}>
                {t.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={origem} onValueChange={(v) => v && setOrigem(v)}>
          <SelectTrigger aria-label="Filtrar por origem" className="w-full">
            <SelectValue>{() => (origem === TODOS ? "Toda origem" : origem)}</SelectValue>
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
            <SelectItem value={TODOS}>Toda origem</SelectItem>
            <SelectItem value="Asaas">Asaas</SelectItem>
            <SelectItem value="Manual">Manual</SelectItem>
          </SelectContent>
        </Select>

        <label className="grid gap-1 text-xs text-muted-foreground">
          Vencimento de
          <Input type="date" value={de} onChange={(e) => setDe(e.target.value)} aria-invalid={periodoInvertido || undefined} />
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">
          até
          <Input type="date" value={ate} min={de || undefined} onChange={(e) => setAte(e.target.value)} aria-invalid={periodoInvertido || undefined} />
        </label>
      </div>
      {periodoInvertido && (
        <p role="alert" className="-mt-2 text-sm text-destructive">
          A data final vem antes da inicial; o período foi ignorado.
        </p>
      )}

      {isError ? (
        <ErroDeCarga texto="Não foi possível carregar as cobranças." onTentar={() => refetch()} />
      ) : isLoading ? (
        <div className="grid gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      ) : lista.length === 0 ? (
        <EstadoVazio
          icone={<Receipt />}
          titulo={filtrando ? "Nenhuma cobrança com esses filtros" : "Nenhuma cobrança ainda"}
          texto={
            filtrando
              ? undefined
              : "Crie uma cobrança única, um plano recorrente, ou aguarde o primeiro pedido da loja. Tudo aparece aqui."
          }
          textoClassName="max-w-[380px]"
          acao={
            filtrando ? (
              <Button variant="outline" onClick={limpar}>
                Limpar filtros
              </Button>
            ) : (
              <Button variant="action" onClick={() => setDialogo({ tipo: "nova" })}>
                <Plus />
                Nova cobrança única
              </Button>
            )
          }
        />
      ) : (
        <>
          <p aria-live="polite" className="text-xs text-muted-foreground">
            {cortada
              ? `Mostrando as primeiras ${LIMITE_DA_LISTA} de ${data?.length}. Use os filtros para chegar às demais.`
              : `${lista.length} ${lista.length === 1 ? "cobrança" : "cobranças"}`}
          </p>

          <div className="flex flex-col gap-2 md:hidden">
            {lista.map((x) => (
              <CartaoDaLista
                key={x.id}
                titulo={x.nomeDoResponsavel}
                subtitulo={[x.alunoNome, x.descricao].filter(Boolean).join(" · ")}
                etiquetas={<EtiquetaDaCobranca status={x.status} />}
                detalhes={
                  <>
                    <Linha rotulo="Valor" valor={formatarMoeda(x.valor)} forte />
                    <Linha rotulo="Vencimento" valor={formatarSoData(x.vencimento)} />
                    {x.status === "Paga" && (
                      <Linha rotulo="Pagamento" valor={`${formatarSoData(x.pagaEm)} · ${rotuloDaForma(x.formaDePagamento ?? undefined)}`} />
                    )}
                    <Linha rotulo="Origem" valor={x.plano ? `${x.origem} · ${x.plano}` : x.origem} />
                  </>
                }
                acoes={<Acoes cobranca={x} onDialogo={setDialogo} comTexto />}
              />
            ))}
          </div>

          <div className="hidden rounded-xl border border-border bg-card md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Aluno</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.map((x) => (
                  <TableRow key={x.id}>
                    <TableCell className="font-medium whitespace-normal">{x.nomeDoResponsavel}</TableCell>
                    <TableCell className="whitespace-normal">{x.alunoNome ?? "—"}</TableCell>
                    <TableCell className="max-w-56 whitespace-normal">{x.descricao || "—"}</TableCell>
                    <TableCell className="text-right font-mono text-sm tabular-nums">{formatarMoeda(x.valor)}</TableCell>
                    <TableCell className="font-mono text-sm tabular-nums">{formatarSoData(x.vencimento)}</TableCell>
                    <TableCell>
                      <div className="grid gap-0.5">
                        <EtiquetaDaCobranca status={x.status} />
                        {x.status === "Paga" && (
                          <span className="text-xs text-muted-foreground">
                            {formatarSoData(x.pagaEm)} · {rotuloDaForma(x.formaDePagamento ?? undefined)}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{x.origem}</TableCell>
                    <TableCell className="text-sm whitespace-normal text-muted-foreground">{x.plano ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-0.5">
                        <Acoes cobranca={x} onDialogo={setDialogo} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {dialogo?.tipo === "nova" && <DialogNovaCobranca onFechar={() => setDialogo(null)} />}
      {dialogo?.tipo === "qr" && (
        <DialogQrDoPix
          titulo={`Pix de ${dialogo.cobranca.nomeDoResponsavel}`}
          descricao={`${formatarMoeda(dialogo.cobranca.valor)} · vence em ${formatarSoData(dialogo.cobranca.vencimento)}. Aponte a câmera do banco para o QR.`}
          qrCodeBase64={dialogo.cobranca.pixQrCodeBase64}
          pixCopiaECola={dialogo.cobranca.pixCopiaECola}
          rotuloDaImagem={`QR code do Pix de ${dialogo.cobranca.nomeDoResponsavel}`}
          onFechar={() => setDialogo(null)}
        />
      )}
      {dialogo?.tipo === "paga" && <DialogMarcarPaga cobranca={dialogo.cobranca} onFechar={() => setDialogo(null)} />}
      {dialogo?.tipo === "cancelar" && <CancelarCobranca cobranca={dialogo.cobranca} onFechar={() => setDialogo(null)} />}
    </div>
  );
}

function Linha({ rotulo, valor, forte = false }: { rotulo: string; valor: string; forte?: boolean }) {
  return (
    <span className="flex justify-between gap-2">
      <span>{rotulo}</span>
      <span className={forte ? "font-mono font-semibold text-foreground tabular-nums" : "font-mono tabular-nums"}>{valor}</span>
    </span>
  );
}

/** Ações de uma cobrança. No desktop são ícones; no cartão do celular, botões com texto. */
function Acoes({
  cobranca: x,
  onDialogo,
  comTexto = false,
}: {
  cobranca: Cobranca;
  onDialogo: (d: Dialogo) => void;
  comTexto?: boolean;
}) {
  const emAberto = x.status === "Pendente" || x.status === "Vencida";
  const botoes: { chave: string; rotulo: string; icone: React.ReactNode; perigo?: boolean; fazer: () => void }[] = [];

  if (emAberto && x.asaasInvoiceUrl) {
    const url = x.asaasInvoiceUrl;
    botoes.push({ chave: "link", rotulo: "Copiar link", icone: <Link2 />, fazer: () => copiarTexto(url, "Link copiado.") });
  }
  if (emAberto && x.pixCopiaECola) {
    const pix = x.pixCopiaECola;
    botoes.push({ chave: "pix", rotulo: "Copiar Pix", icone: <Copy />, fazer: () => copiarTexto(pix, "Pix copia e cola copiado.") });
  }
  if (emAberto && x.pixQrCodeBase64) {
    botoes.push({ chave: "qr", rotulo: "Ver QR", icone: <QrCode />, fazer: () => onDialogo({ tipo: "qr", cobranca: x }) });
  }
  if (emAberto && x.boletoUrl) {
    const url = x.boletoUrl;
    botoes.push({
      chave: "boleto",
      rotulo: "Abrir boleto",
      icone: <ExternalLink />,
      fazer: () => window.open(url, "_blank", "noopener,noreferrer"),
    });
  }
  if (emAberto) {
    botoes.push({ chave: "paga", rotulo: "Marcar paga", icone: <Check />, fazer: () => onDialogo({ tipo: "paga", cobranca: x }) });
    botoes.push({
      chave: "cancelar",
      rotulo: "Cancelar",
      icone: <X />,
      perigo: true,
      fazer: () => onDialogo({ tipo: "cancelar", cobranca: x }),
    });
  }

  if (botoes.length === 0) return comTexto ? <span className="text-xs text-muted-foreground">Sem ações</span> : null;

  return (
    <>
      {botoes.map((b) =>
        comTexto ? (
          <Button key={b.chave} variant={b.perigo ? "destructive" : "outline"} size="sm" onClick={b.fazer}>
            {b.icone}
            {b.rotulo}
          </Button>
        ) : (
          <BotaoDeIcone key={b.chave} rotulo={b.rotulo} icone={b.icone} perigo={b.perigo} onClick={b.fazer} />
        )
      )}
    </>
  );
}
