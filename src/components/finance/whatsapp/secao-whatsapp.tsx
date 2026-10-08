"use client";

import { useState } from "react";
import { Clock, Copy, MessageCircle, Pencil, Plus, RefreshCw, Trash2, UserX } from "lucide-react";
import { toast } from "sonner";

import { DialogRemetente } from "@/components/finance/whatsapp/dialog-remetente";
import { EstadoVazio } from "@/components/padroes/estado-vazio";
import { ErroDeCarga } from "@/components/rh/campo";
import { Confirmacao } from "@/components/rh/confirmacao";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { copiarTexto } from "@/lib/copiar";
import {
  ROTULO_DO_DESTINO,
  useDesativarRemetente,
  useNovoCodigoDoRemetente,
  useRemetentesDeWhatsApp,
  useRemoverRemetente,
  useStatusDoWhatsApp,
  type RemetenteDeWhatsApp,
} from "@/lib/finance/use-whatsapp-remetentes";
import { formatarData, formatarDataHora } from "@/lib/format/date";

/** Qual celular está sendo editado: `null` é um cadastro novo, ausente é o diálogo fechado. */
type Edicao = { remetente: RemetenteDeWhatsApp | null } | undefined;
type Pergunta = { tipo: "desativar" | "remover"; remetente: RemetenteDeWhatsApp } | undefined;

/**
 * Comprovantes pelo WhatsApp: o número do EducaPilot, o passo a passo e a lista de quem pode
 * mandar. A escola não configura número nenhum — o número é da plataforma; aqui ela só diz quem
 * pode usá-lo e para onde vão os comprovantes de cada pessoa.
 */
export function SecaoWhatsApp({ podeEscrever }: { podeEscrever: boolean }) {
  const { data: status, isLoading, isError, refetch } = useStatusDoWhatsApp();
  const configurado = !!status?.configurado;

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 md:p-5">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent text-primary">
          <MessageCircle className="size-[18px]" />
        </span>
        <div>
          <h2 className="font-heading text-[15.5px] font-semibold">Comprovantes pelo WhatsApp</h2>
          <p className="mt-0.5 text-[13px] leading-[1.55] text-muted-foreground">
            Quem compra pela escola tira a foto do comprovante e manda por WhatsApp. O sistema lê e coloca na
            Caixa de comprovantes.
          </p>
        </div>
      </div>

      {isError && <ErroDeCarga texto="Não foi possível carregar a configuração do WhatsApp." onTentar={() => refetch()} />}
      {isLoading && <Skeleton className="h-40 w-full rounded-xl" />}

      {status && !configurado && (
        <div
          role="status"
          className="rounded-xl border border-action-border bg-action-soft px-4 py-3 text-sm text-action-soft-foreground"
        >
          O número do EducaPilot ainda não está configurado; fale com o suporte.
        </div>
      )}

      {status && configurado && <Configurado numero={status.numeroExibido} podeEscrever={podeEscrever} />}
    </section>
  );
}

function Configurado({ numero, podeEscrever }: { numero: string | null; podeEscrever: boolean }) {
  const { data, isLoading, isError, refetch } = useRemetentesDeWhatsApp();
  const [edicao, setEdicao] = useState<Edicao>();
  const [pergunta, setPergunta] = useState<Pergunta>();
  const desativar = useDesativarRemetente();
  const remover = useRemoverRemetente();

  const lista = data ?? [];

  async function confirmarPergunta() {
    if (!pergunta) return;
    const { tipo, remetente } = pergunta;
    try {
      if (tipo === "desativar") await desativar.mutateAsync(remetente.id);
      else await remover.mutateAsync(remetente.id);
      toast.success(tipo === "desativar" ? "Celular desativado." : "Celular removido.");
      setPergunta(undefined);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível concluir.");
    }
  }

  return (
    <>
      {numero && (
        <div className="grid gap-3 rounded-xl border border-border bg-muted/60 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div className="min-w-0">
            <p className="text-[12.5px] font-medium text-muted-foreground">Número do EducaPilot (salve na agenda)</p>
            <p className="mt-1 font-heading font-mono text-[clamp(22px,5vw,28px)] leading-none font-semibold tracking-[-.02em] tabular-nums">
              {numero}
            </p>
          </div>
          <Button variant="outline" className="w-full sm:w-auto" onClick={() => copiarTexto(numero, "Número")}>
            <Copy />
            Copiar número
          </Button>
        </div>
      )}

      <ol className="grid gap-2 text-sm leading-[1.55]">
        <li className="flex gap-2.5">
          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent text-xs font-semibold text-primary">1</span>
          <span>Salve o número acima na agenda do celular e cadastre abaixo quem vai mandar comprovantes.</span>
        </li>
        <li className="flex gap-2.5">
          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent text-xs font-semibold text-primary">2</span>
          <span>Cada pessoa confirma o próprio celular: é só enviar para esse número o código de 6 números que aparece aqui.</span>
        </li>
        <li className="flex gap-2.5">
          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent text-xs font-semibold text-primary">3</span>
          <span>Depois é só mandar a foto ou o PDF do comprovante, com uma legenda se quiser. Ele aparece na Caixa de comprovantes para você conferir.</span>
        </li>
      </ol>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
        <h3 className="font-heading text-[14.5px] font-semibold">Quem pode mandar comprovantes</h3>
        {podeEscrever && (
          <Button variant="action" size="sm" onClick={() => setEdicao({ remetente: null })}>
            <Plus />
            Adicionar celular
          </Button>
        )}
      </div>

      {isError && <ErroDeCarga texto="Não foi possível carregar a lista." onTentar={() => refetch()} />}
      {isLoading && <Skeleton className="h-28 w-full rounded-xl" />}

      {!isLoading && !isError && lista.length === 0 && (
        <EstadoVazio
          icone={<MessageCircle />}
          titulo="Ninguém cadastrado ainda."
          texto="Adicione o celular de quem compra pela escola."
          textoClassName="max-w-[320px]"
        />
      )}

      {lista.length > 0 && (
        <ul className="grid gap-3">
          {lista.map((r) => (
            <li key={r.id}>
              <CartaoDoRemetente
                remetente={r}
                podeEscrever={podeEscrever}
                onEditar={() => setEdicao({ remetente: r })}
                onDesativar={() => setPergunta({ tipo: "desativar", remetente: r })}
                onRemover={() => setPergunta({ tipo: "remover", remetente: r })}
              />
            </li>
          ))}
        </ul>
      )}

      {edicao && (
        <DialogRemetente
          remetente={edicao.remetente}
          numeroDoEducaPilot={numero}
          onFechar={() => setEdicao(undefined)}
        />
      )}

      {pergunta && (
        <Confirmacao
          titulo={pergunta.tipo === "desativar" ? "Desativar este celular?" : "Remover este celular?"}
          descricao={
            pergunta.tipo === "desativar"
              ? `${pergunta.remetente.nome} deixa de poder mandar comprovantes por WhatsApp. Os comprovantes já recebidos continuam na Caixa.`
              : `${pergunta.remetente.nome} sai da lista. Os comprovantes já recebidos continuam na Caixa.`
          }
          rotuloConfirmar={pergunta.tipo === "desativar" ? "Desativar" : "Remover"}
          perigosa
          pendente={desativar.isPending || remover.isPending}
          onConfirmar={confirmarPergunta}
          onFechar={() => setPergunta(undefined)}
        />
      )}
    </>
  );
}

function CartaoDoRemetente({
  remetente: r,
  podeEscrever,
  onEditar,
  onDesativar,
  onRemover,
}: {
  remetente: RemetenteDeWhatsApp;
  podeEscrever: boolean;
  onEditar: () => void;
  onDesativar: () => void;
  onRemover: () => void;
}) {
  const novoCodigo = useNovoCodigoDoRemetente();

  async function gerarNovoCodigo() {
    try {
      await novoCodigo.mutateAsync(r.id);
      toast.success("Novo código gerado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível gerar um novo código.");
    }
  }

  const aguardando = r.ativo && !r.confirmado;
  const destino = r.destinoPadrao === "Projeto" && r.projetoPadraoNome
    ? `Projeto ${r.projetoPadraoNome}`
    : ROTULO_DO_DESTINO[r.destinoPadrao] ?? r.destinoPadrao;

  return (
    <article className="grid gap-3 rounded-xl border border-border bg-card p-3.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[15px] font-semibold break-words">{r.nome}</p>
          <p className="font-mono text-sm tabular-nums text-muted-foreground">{r.telefoneFormatado}</p>
        </div>
        {!r.ativo ? (
          <Badge variant="secondary">Desativado</Badge>
        ) : r.confirmado ? (
          <Badge variant="success">
            Confirmado{r.confirmadoEm ? ` em ${formatarData(r.confirmadoEm, { day: "2-digit", month: "2-digit" })}` : ""}
          </Badge>
        ) : (
          <Badge variant="pending">Aguardando código</Badge>
        )}
      </div>

      {aguardando && (
        <div className="grid gap-2 rounded-lg border border-action-border bg-action-soft px-3.5 py-3">
          <p className="text-[13px] text-action-soft-foreground">
            Peça para {r.nome} enviar este código para o número do EducaPilot:
          </p>
          {r.codigoDeConfirmacao ? (
            <div className="flex flex-wrap items-center gap-3">
              <p
                aria-label={`Código ${r.codigoDeConfirmacao}`}
                className="font-heading font-mono text-[32px] leading-none font-semibold tracking-[.18em] tabular-nums text-foreground"
              >
                {r.codigoDeConfirmacao}
              </p>
              <Button
                variant="outline"
                size="sm"
                aria-label="Copiar código"
                onClick={() => copiarTexto(r.codigoDeConfirmacao ?? "", "Código")}
              >
                <Copy />
                Copiar
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">O código venceu. Gere um novo para continuar.</p>
          )}
          {r.codigoExpiraEm && r.codigoDeConfirmacao && (
            <p className="flex items-center gap-1 text-[12.5px] text-muted-foreground">
              <Clock className="size-3.5" aria-hidden />
              Vale até {formatarDataHora(r.codigoExpiraEm)}
            </p>
          )}
          {podeEscrever && (
            <div>
              <Button variant="outline" size="sm" disabled={novoCodigo.isPending} onClick={gerarNovoCodigo}>
                <RefreshCw className={novoCodigo.isPending ? "animate-spin" : undefined} />
                {novoCodigo.isPending ? "Gerando..." : "Gerar novo código"}
              </Button>
            </div>
          )}
        </div>
      )}

      <dl className="grid gap-x-4 gap-y-1 text-[13px] sm:grid-cols-2">
        <div className="flex gap-1.5">
          <dt className="text-muted-foreground">Destino padrão:</dt>
          <dd className="font-medium">{destino}</dd>
        </div>
        <div className="flex gap-1.5">
          <dt className="text-muted-foreground">Último envio:</dt>
          <dd className="font-medium">{r.ultimoEnvioEm ? formatarDataHora(r.ultimoEnvioEm) : "ainda não enviou"}</dd>
        </div>
        {(r.contaPadraoNome || r.categoriaPadraoNome) && (
          <div className="flex gap-1.5 sm:col-span-2">
            <dt className="text-muted-foreground">Padrões:</dt>
            <dd className="font-medium">{[r.contaPadraoNome, r.categoriaPadraoNome].filter(Boolean).join(" · ")}</dd>
          </div>
        )}
      </dl>

      {podeEscrever && (
        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <Button variant="outline" size="sm" onClick={onEditar}>
            <Pencil />
            Editar
          </Button>
          {r.ativo && (
            <Button variant="outline" size="sm" onClick={onDesativar}>
              <UserX />
              Desativar
            </Button>
          )}
          <Button variant="destructive" size="sm" className="ml-auto" onClick={onRemover}>
            <Trash2 />
            Remover
          </Button>
        </div>
      )}
    </article>
  );
}
