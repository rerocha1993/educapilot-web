"use client";

import { useState } from "react";
import Image from "next/image";
import { Check, Copy, ExternalLink, Link2, Plus, QrCode, Receipt, X } from "lucide-react";
import { toast } from "sonner";

import { EtiquetaDaCobranca, Numero } from "@/components/finance/projetos/comum";
import { DialogGerarCobrancas } from "@/components/finance/projetos/dialog-gerar-cobrancas";
import { EstadoVazio } from "@/components/padroes/estado-vazio";
import { Campo, ErroDeCarga } from "@/components/rh/campo";
import { Confirmacao } from "@/components/rh/confirmacao";
import { CartaoDaLista, BotaoDeIcone } from "@/components/rh/lista-movel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatarSoData, hojeIsoBrasilia } from "@/lib/format/date";
import {
  useCancelarCobranca,
  useCobrancas,
  useMarcarPaga,
  type CobrancaDoProjeto,
  type ProjetoDetalhe,
  type StatusDaCobranca,
  ROTULO_DA_COBRANCA,
} from "@/lib/finance/use-projetos";
import { FORMAS_DE_PAGAMENTO, ROTULO_DA_FORMA, rotuloDaForma, type FormaDePagamento } from "@/lib/finance/use-recibos";
import { formatarMoeda } from "@/lib/rh/formatar";

type Filtro = StatusDaCobranca | "todas";
type Dialogo =
  | { tipo: "gerar" }
  | { tipo: "qr"; cobranca: CobrancaDoProjeto }
  | { tipo: "paga"; cobranca: CobrancaDoProjeto }
  | { tipo: "cancelar"; cobranca: CobrancaDoProjeto };

const STATUS: StatusDaCobranca[] = ["Pendente", "Vencida", "Paga", "Cancelada"];

async function copiar(texto: string, mensagem: string) {
  try {
    await navigator.clipboard.writeText(texto);
    toast.success(mensagem);
  } catch {
    toast.error("Não foi possível copiar. Copie manualmente pelo link da cobrança.");
  }
}

/** A imagem do QR pode vir só com o base64 ou já como data URL. */
function origemDoQr(base64: string): string {
  return base64.startsWith("data:") ? base64 : `data:image/png;base64,${base64}`;
}

/**
 * Cobranças das famílias: resumo, geração em lote e, por cobrança, o link, o Pix e a baixa
 * manual. Num projeto encerrado só a baixa continua — dinheiro que entra depois do evento
 * precisa poder ser registrado.
 */
export function AbaCobrancas({ projeto }: { projeto: ProjetoDetalhe }) {
  const { data, isLoading, isError, refetch } = useCobrancas(projeto.id);
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [dialogo, setDialogo] = useState<Dialogo | null>(null);

  const encerrado = projeto.status === "Encerrado";
  const aprovado = projeto.status === "Planejamento";
  const c = projeto.execucao.cobrancas;
  const lista = (data ?? []).filter((x) => filtro === "todas" || x.status === filtro);

  return (
    <div className="grid gap-4">
      <section
        aria-label="Resumo das cobranças"
        className="grid gap-4 rounded-xl border border-border bg-card p-4 sm:grid-cols-[1fr_auto] sm:items-center"
      >
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4 lg:grid-cols-7">
          <Numero rotulo="Cobranças" valor={String(c.total)} />
          <Numero rotulo="Pagas" valor={String(c.pagas)} tom={c.pagas > 0 ? "success" : undefined} />
          <Numero rotulo="Pendentes" valor={String(c.pendentes)} />
          <Numero rotulo="Vencidas" valor={String(c.vencidas)} tom={c.vencidas > 0 ? "danger" : undefined} />
          <Numero rotulo="Canceladas" valor={String(c.canceladas)} />
          <Numero rotulo="Arrecadado" valor={formatarMoeda(projeto.execucao.arrecadado)} />
          <Numero rotulo="A receber" valor={formatarMoeda(projeto.execucao.aReceber)} />
        </div>

        {!encerrado && (
          <div className="grid gap-1.5">
            <Button
              variant="action"
              className="w-full sm:w-auto"
              disabled={!aprovado}
              onClick={() => setDialogo({ tipo: "gerar" })}
            >
              <Plus />
              Gerar cobranças
            </Button>
            {!aprovado && (
              <p className="text-xs text-muted-foreground">Aprove o orçamento para cobrar as famílias.</p>
            )}
          </div>
        )}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-heading text-sm font-semibold">Cobranças</h3>
        <Select value={filtro} onValueChange={(v) => v && setFiltro(v as Filtro)}>
          <SelectTrigger aria-label="Filtrar por situação" className="w-full sm:w-44">
            <SelectValue>{() => (filtro === "todas" ? "Todas as situações" : ROTULO_DA_COBRANCA[filtro])}</SelectValue>
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
            <SelectItem value="todas">Todas as situações</SelectItem>
            {STATUS.map((s) => (
              <SelectItem key={s} value={s}>
                {ROTULO_DA_COBRANCA[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isError ? (
        <ErroDeCarga texto="Não foi possível carregar as cobranças." onTentar={() => refetch()} />
      ) : isLoading ? (
        <div className="grid gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      ) : lista.length === 0 ? (
        <EstadoVazio
          icone={<Receipt />}
          titulo={filtro === "todas" ? "Nenhuma cobrança gerada" : "Nenhuma cobrança nesta situação"}
          texto={
            filtro === "todas"
              ? "Gere as cobranças para as famílias das turmas do projeto. Cada uma recebe link e Pix."
              : undefined
          }
          textoClassName="max-w-[380px]"
          acao={
            filtro !== "todas" ? (
              <Button variant="outline" onClick={() => setFiltro("todas")}>
                Ver todas
              </Button>
            ) : !encerrado && aprovado ? (
              <Button variant="action" onClick={() => setDialogo({ tipo: "gerar" })}>
                <Plus />
                Gerar cobranças
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="flex flex-col gap-2 md:hidden">
            {lista.map((x) => (
              <CartaoDaLista
                key={x.id}
                titulo={x.nomeDoResponsavel}
                subtitulo={x.alunoNome ?? undefined}
                etiquetas={<EtiquetaDaCobranca status={x.status} />}
                detalhes={
                  <>
                    <Linha rotulo="Valor" valor={formatarMoeda(x.valor)} forte />
                    <Linha rotulo="Vencimento" valor={formatarSoData(x.vencimento)} />
                    {x.status === "Paga" && (
                      <Linha
                        rotulo="Pagamento"
                        valor={`${formatarSoData(x.pagaEm)} · ${rotuloDaForma(x.formaDePagamento)}`}
                      />
                    )}
                    <Linha rotulo="Origem" valor={x.origem === "Asaas" ? "Asaas" : "Manual"} />
                  </>
                }
                acoes={<Acoes cobranca={x} encerrado={encerrado} onDialogo={setDialogo} comTexto />}
              />
            ))}
          </div>

          <div className="hidden rounded-xl border border-border bg-card md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Aluno</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.map((x) => (
                  <TableRow key={x.id}>
                    <TableCell className="font-medium whitespace-normal">{x.nomeDoResponsavel}</TableCell>
                    <TableCell className="whitespace-normal">{x.alunoNome ?? "—"}</TableCell>
                    <TableCell className="text-right font-mono text-sm tabular-nums">{formatarMoeda(x.valor)}</TableCell>
                    <TableCell className="font-mono text-sm tabular-nums">{formatarSoData(x.vencimento)}</TableCell>
                    <TableCell>
                      <div className="grid gap-0.5">
                        <EtiquetaDaCobranca status={x.status} />
                        {x.status === "Paga" && (
                          <span className="text-xs text-muted-foreground">
                            {formatarSoData(x.pagaEm)} · {rotuloDaForma(x.formaDePagamento)}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{x.origem === "Asaas" ? "Asaas" : "Manual"}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-0.5">
                        <Acoes cobranca={x} encerrado={encerrado} onDialogo={setDialogo} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {dialogo?.tipo === "gerar" && <DialogGerarCobrancas projeto={projeto} onFechar={() => setDialogo(null)} />}
      {dialogo?.tipo === "qr" && <DialogQr cobranca={dialogo.cobranca} onFechar={() => setDialogo(null)} />}
      {dialogo?.tipo === "paga" && (
        <DialogMarcarPaga projetoId={projeto.id} cobranca={dialogo.cobranca} onFechar={() => setDialogo(null)} />
      )}
      {dialogo?.tipo === "cancelar" && (
        <CancelarCobranca projetoId={projeto.id} cobranca={dialogo.cobranca} onFechar={() => setDialogo(null)} />
      )}
    </div>
  );
}

function Linha({ rotulo, valor, forte = false }: { rotulo: string; valor: string; forte?: boolean }) {
  return (
    <span className="flex justify-between gap-2">
      <span>{rotulo}</span>
      <span className={forte ? "font-mono font-semibold text-foreground tabular-nums" : "font-mono tabular-nums"}>
        {valor}
      </span>
    </span>
  );
}

/** Ações de uma cobrança. No desktop são ícones; no cartão do celular, botões com texto. */
function Acoes({
  cobranca: x,
  encerrado,
  onDialogo,
  comTexto = false,
}: {
  cobranca: CobrancaDoProjeto;
  encerrado: boolean;
  onDialogo: (d: Dialogo) => void;
  comTexto?: boolean;
}) {
  const emAberto = x.status === "Pendente" || x.status === "Vencida";

  const botoes: { chave: string; rotulo: string; icone: React.ReactNode; perigo?: boolean; fazer: () => void }[] = [];

  if (emAberto && x.asaasInvoiceUrl) {
    const url = x.asaasInvoiceUrl;
    botoes.push({ chave: "link", rotulo: "Copiar link", icone: <Link2 />, fazer: () => copiar(url, "Link copiado.") });
  }
  if (emAberto && x.pixCopiaECola) {
    const pix = x.pixCopiaECola;
    botoes.push({ chave: "pix", rotulo: "Copiar Pix", icone: <Copy />, fazer: () => copiar(pix, "Pix copia e cola copiado.") });
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
    if (!encerrado) {
      botoes.push({
        chave: "cancelar",
        rotulo: "Cancelar",
        icone: <X />,
        perigo: true,
        fazer: () => onDialogo({ tipo: "cancelar", cobranca: x }),
      });
    }
  }

  if (botoes.length === 0) return comTexto ? <span className="text-xs text-muted-foreground">Sem ações</span> : null;

  return (
    <>
      {botoes.map((b) =>
        comTexto ? (
          <Button
            key={b.chave}
            variant={b.perigo ? "destructive" : "outline"}
            size="sm"
            onClick={b.fazer}
          >
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

function DialogQr({ cobranca: x, onFechar }: { cobranca: CobrancaDoProjeto; onFechar: () => void }) {
  return (
    <Dialog open onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Pix de {x.nomeDoResponsavel}</DialogTitle>
          <DialogDescription>
            {formatarMoeda(x.valor)} · vence em {formatarSoData(x.vencimento)}. Aponte a câmera do banco para o QR.
          </DialogDescription>
        </DialogHeader>
        <div className="grid justify-items-center gap-3">
          {x.pixQrCodeBase64 && (
            <Image
              src={origemDoQr(x.pixQrCodeBase64)}
              alt={`QR code do Pix de ${x.nomeDoResponsavel}`}
              width={240}
              height={240}
              unoptimized
              className="size-60 rounded-lg border border-border bg-white p-2"
            />
          )}
          {x.pixCopiaECola && (
            <Button variant="outline" onClick={() => copiar(x.pixCopiaECola ?? "", "Pix copia e cola copiado.")}>
              <Copy />
              Copiar Pix
            </Button>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onFechar}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DialogMarcarPaga({
  projetoId,
  cobranca: x,
  onFechar,
}: {
  projetoId: string;
  cobranca: CobrancaDoProjeto;
  onFechar: () => void;
}) {
  const marcar = useMarcarPaga(projetoId);
  const [data, setData] = useState(hojeIsoBrasilia());
  const [forma, setForma] = useState<FormaDePagamento>("Pix");

  async function confirmar(e: React.FormEvent) {
    e.preventDefault();
    if (!data) return void toast.error("Informe a data do pagamento.");
    try {
      await marcar.mutateAsync({ cobrancaId: x.id, data, formaDePagamento: forma });
      toast.success("Cobrança marcada como paga.");
      onFechar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível marcar a cobrança como paga.");
    }
  }

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && !marcar.isPending && onFechar()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Marcar como paga</DialogTitle>
          <DialogDescription>
            {x.nomeDoResponsavel} · {formatarMoeda(x.valor)}. Use quando a família pagou fora do link, em dinheiro por
            exemplo.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={confirmar} noValidate className="grid gap-3.5">
          <Campo id="paga-data" rotulo="Data do pagamento">
            <Input id="paga-data" type="date" value={data} max={hojeIsoBrasilia()} onChange={(e) => setData(e.target.value)} />
          </Campo>
          <Campo id="paga-forma" rotulo="Forma de pagamento">
            <Select value={forma} onValueChange={(v) => v && setForma(v as FormaDePagamento)}>
              <SelectTrigger id="paga-forma" className="w-full">
                <SelectValue>{() => ROTULO_DA_FORMA[forma]}</SelectValue>
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                {FORMAS_DE_PAGAMENTO.map((f) => (
                  <SelectItem key={f} value={f}>
                    {ROTULO_DA_FORMA[f]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Campo>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={marcar.isPending} onClick={onFechar}>
              Cancelar
            </Button>
            <Button type="submit" variant="action" disabled={marcar.isPending}>
              {marcar.isPending ? "Salvando..." : "Marcar como paga"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CancelarCobranca({
  projetoId,
  cobranca: x,
  onFechar,
}: {
  projetoId: string;
  cobranca: CobrancaDoProjeto;
  onFechar: () => void;
}) {
  const cancelar = useCancelarCobranca(projetoId);

  async function confirmar() {
    try {
      await cancelar.mutateAsync(x.id);
      toast.success("Cobrança cancelada.");
      onFechar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível cancelar a cobrança.");
    }
  }

  return (
    <Confirmacao
      titulo="Cancelar esta cobrança?"
      descricao={`A cobrança de ${formatarMoeda(x.valor)} para ${x.nomeDoResponsavel} deixa de valer e o link não aceita mais pagamento.`}
      rotuloConfirmar="Cancelar cobrança"
      perigosa
      pendente={cancelar.isPending}
      onConfirmar={confirmar}
      onFechar={onFechar}
    />
  );
}
