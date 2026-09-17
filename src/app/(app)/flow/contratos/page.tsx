"use client";

import Link from "next/link";
import { Link2, MessageCircle, Settings, Trash2, TriangleAlert } from "lucide-react";

import { Fragment, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  useApproveContract,
  useContracts,
  useContractsAwaitingApproval,
  useRejectContract,
  useDeleteContract,
  type Contract,
} from "@/lib/contracts/use-contracts";
import { formatarData, formatarDataHora } from "@/lib/format/date";

/**
 * Fila de conferência da gestão e acompanhamento dos contratos.
 *
 * O responsável assina na mesma sessão em que preenche o formulário. A gestão confere depois, e a
 * aprovação libera o envio da via assinada para a família — não altera o contrato, que já foi
 * assinado.
 */
export default function ContratosPage() {
  const { data: fila, isLoading, isError, error } = useContractsAwaitingApproval();
  const { data: todos } = useContracts();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-4">
        <div>
          <h1 className="font-heading text-xl font-bold">Contratos</h1>
          <p className="text-sm text-muted-foreground">
            Contratos assinados pelas famílias aguardando conferência. Aprovar envia a via assinada
            por e-mail; o contrato em si já foi assinado e não muda.
          </p>
        </div>
        <Link
          href="/flow/contratos/configuracao"
          className="inline-flex w-fit shrink-0 items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium transition-colors hover:bg-accent/50"
        >
          <Settings className="size-4" />
          Configuração
        </Link>
      </div>

      {isLoading && <Skeleton className="h-40 w-full rounded-lg" />}

      {isError && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm">
          {error instanceof Error ? error.message : "Não foi possível carregar a fila."}
        </div>
      )}

      {!isLoading && !isError && (fila?.length ?? 0) === 0 && (
        <div className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          Nenhum contrato aguardando conferência.
        </div>
      )}

      {/* Dois por linha a partir de telas medias: a fila de aprovacao chega em rajada na janela
          de matricula, e um por linha obrigava a rolar a pagina inteira para ver quantos faltam. */}
      <div className="grid gap-4 md:grid-cols-2">
        {(fila ?? []).map((c) => (
          <CartaoAprovacao key={c.id} contrato={c} />
        ))}
      </div>

      {(todos?.length ?? 0) > 0 && <Historico contratos={todos!} />}
    </div>
  );
}

function CartaoAprovacao({ contrato }: { contrato: Contract }) {
  const aprovar = useApproveContract();
  const reprovar = useRejectContract();

  const [descontoPercentual, setDescontoPercentual] = useState("");
  const [vigenciaDesconto, setVigenciaDesconto] = useState("");
  const [motivo, setMotivo] = useState("");
  const [reprovando, setReprovando] = useState(false);

  const responsavel = contrato.signatarios.find((s) => s.papel === 0);

  async function handleAprovar() {
    try {
      await aprovar.mutateAsync({
        id: contrato.id,
        valores: {
          // Em branco vira "não se aplica" no contrato: é uma decisão consciente da escola,
          // diferente de um marcador que o formulário nunca preencheu.
          percentual_desconto: descontoPercentual.trim() || "não se aplica",
          vigencia_desconto: vigenciaDesconto.trim() || "não se aplica",
        },
      });
      toast.success("Contrato aprovado. A via assinada será enviada à família.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao aprovar.");
    }
  }

  async function handleReprovar() {
    if (!motivo.trim()) {
      toast.error("Informe o motivo da reprovação.");
      return;
    }
    try {
      await reprovar.mutateAsync({ id: contrato.id, motivo });
      toast.success("Contrato reprovado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao reprovar.");
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="font-heading text-base font-bold break-words">{contrato.titulo}</h2>
          <p className="text-sm break-words text-muted-foreground">
            {responsavel?.nome} · {responsavel?.email}
          </p>
          {responsavel?.assinadoEm && (
            <p className="text-xs text-muted-foreground">
              Assinado em {formatarDataHora(responsavel.assinadoEm)}
            </p>
          )}
        </div>

        {contrato.temArquivoAssinado && (
          <BotaoDownload contratoId={contrato.id} tipo="assinado" rotulo="Ver contrato assinado" />
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-[5px]">
          <label className="text-xs text-muted-foreground">Desconto para 2027 (%)</label>
          <Input
            value={descontoPercentual}
            onChange={(e) => setDescontoPercentual(e.target.value)}
            placeholder="Em branco = sem desconto"
          />
        </div>
        <div className="flex flex-col gap-[5px]">
          <label className="text-xs text-muted-foreground">Vigência do desconto</label>
          <Input
            value={vigenciaDesconto}
            onChange={(e) => setVigenciaDesconto(e.target.value)}
            placeholder="Ex.: até dezembro/2027"
          />
        </div>
      </div>

      {reprovando ? (
        <div className="flex flex-col gap-2">
          <Textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Motivo da reprovação (fica registrado)"
            rows={2}
          />
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleReprovar} disabled={reprovar.isPending}>
              {reprovar.isPending ? "Reprovando..." : "Confirmar reprovação"}
            </Button>
            <Button variant="ghost" onClick={() => setReprovando(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleAprovar} disabled={aprovar.isPending}>
            {aprovar.isPending ? "Aprovando..." : "Aprovar e enviar à família"}
          </Button>
          <Button variant="outline" onClick={() => setReprovando(true)}>
            Reprovar
          </Button>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        A família já assinou este contrato. Aprovar libera o envio da via com a assinatura da
        escola; reprovar impede o envio, mas o cancelamento com a família é uma conversa à parte.
      </p>
    </div>
  );
}

function Historico({ contratos }: { contratos: Contract[] }) {
  const excluir = useDeleteContract();

  // Contrato aberto para ver o motivo da falha. Um por vez: a lista fica legível, e o motivo
  // é sempre longo demais para caber numa coluna.
  const [detalhando, setDetalhando] = useState<string | null>(null);

  // Só contrato que não chegou ao provedor. O backend recusa o resto de qualquer forma; aqui a
  // regra existe para não oferecer um botão que vai falhar.
  // Qualquer contrato que ninguém assinou. O caso real: uma mãe preencheu duas vezes, assinou um
  // e o outro ficou aberto — duplicidade a limpar, e que não é falha de envio.
  const podeExcluir = (c: Contract) =>
    !c.signatarios.some((s) => !!s.assinadoEm) &&
    !c.statusDescricao?.toLowerCase().includes("assinado");

  async function handleExcluir(c: Contract) {
    try {
      await excluir.mutateAsync(c.id);
      toast.success("Contrato excluído.");
      setDetalhando(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir.");
    }
  }

  // Conteúdo de cada contrato montado uma vez só: a tabela (tela larga) e os cartões (celular)
  // mostram as mesmas informações e as mesmas ações.
  const titulo = (c: Contract) => (
    <>
      {c.titulo}
      {c.sandbox && (
        // Contrato de teste não tem valor jurídico nenhum e some do provedor em
        // poucos dias — precisa ser impossível confundir com um real.
        <span className="ml-2 rounded bg-warning-soft px-1 text-xs">teste</span>
      )}
    </>
  );

  const situacao = (c: Contract) => (
    <>
      {c.statusDescricao}
      {/* Só quando a via realmente saiu: assinado não quer dizer entregue, e a
          secretaria precisa saber a diferença antes de responder à família. */}
      {c.copiaEnviadaEm && (
        <span className="ml-2 rounded bg-success-soft px-1 text-xs text-success-soft-foreground">
          via enviada
        </span>
      )}
    </>
  );

  const acoes = (c: Contract) => {
    const resp = c.signatarios.find((s) => s.papel === 0);
    return (
      <>
        {resp?.linkAssinatura && !resp.assinadoEm && (
          <LinkDeAssinatura link={resp.linkAssinatura} nome={resp.nome} titulo={c.titulo} />
        )}
        {c.temArquivoAssinado && (
          <>
            <BotaoDownload contratoId={c.id} tipo="assinado" rotulo="Baixar" />
            <BotaoDownload
              contratoId={c.id}
              tipo="original"
              rotulo="Original"
              discreto
              titulo="PDF do Autentique, sem a assinatura da escola. É a prova, com a trilha de auditoria."
            />
          </>
        )}

        {/* Falhou: mostra o motivo e deixa excluir. Antes a linha só dizia
            "Falha no envio" e não havia o que clicar — nem para entender, nem
            para limpar. */}
        {podeExcluir(c) && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDetalhando(detalhando === c.id ? null : c.id)}
            >
              <TriangleAlert className="size-4 text-warning-soft-foreground" />
              Motivo
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={excluir.isPending}
              onClick={() => handleExcluir(c)}
            >
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </>
        )}
      </>
    );
  };

  const motivo = (c: Contract) => (
    <p className="font-mono text-xs whitespace-pre-wrap text-muted-foreground">
      {c.ultimoErroEnvio ?? "Sem detalhe registrado."}
    </p>
  );

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
      <h2 className="font-heading text-base font-bold">Todos os contratos</h2>

      <div className="flex flex-col gap-2 md:hidden">
        {contratos.map((c) => {
          const resp = c.signatarios.find((s) => s.papel === 0);
          return (
            <div key={c.id} className="flex flex-col gap-1.5 rounded-md border border-border p-3 text-sm">
              <p className="font-medium break-words">{titulo(c)}</p>
              {(resp?.nome || resp?.email) && (
                <p className="break-words">
                  {resp?.nome}
                  {resp?.email && <span className="block text-xs text-muted-foreground">{resp.email}</span>}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {situacao(c)} · Criado {formatarData(c.criadoEm)}
              </p>
              <div className="flex flex-wrap items-center gap-1">{acoes(c)}</div>
              {detalhando === c.id && <div className="rounded-md bg-muted/30 p-2">{motivo(c)}</div>}
            </div>
          );
        })}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground">
            <tr>
              <th className="py-1">Contrato</th>
              <th className="py-1">Responsável</th>
              <th className="py-1">Situação</th>
              <th className="py-1">Criado</th>
              <th className="py-1"></th>
            </tr>
          </thead>
          <tbody>
            {contratos.map((c) => {
              const resp = c.signatarios.find((s) => s.papel === 0);
              return (
                <Fragment key={c.id}>
                <tr className="border-t border-border">
                  <td className="py-2">{titulo(c)}</td>
                  <td className="py-2">
                    {resp?.nome}
                    {resp?.email && <span className="block text-xs text-muted-foreground">{resp.email}</span>}
                  </td>
                  <td className="py-2">{situacao(c)}</td>
                  <td className="py-2">{formatarData(c.criadoEm)}</td>
                  <td className="py-2 text-right">
                    <div className="flex items-center justify-end gap-1">{acoes(c)}</div>
                  </td>
                </tr>

                {detalhando === c.id && (
                  <tr className="border-t border-border bg-muted/30">
                    <td colSpan={5} className="px-2 py-3">
                      {motivo(c)}
                    </td>
                  </tr>
                )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Link de assinatura do responsável, para mandar por outro caminho.
 *
 * O contrato vai ao Autentique com entrega por link, não por e-mail: quem abre o link assina, sem
 * precisar entrar no e-mail cadastrado (se o CPF foi informado, o Autentique pede o CPF). É o que
 * resolve a família que perdeu acesso ao e-mail — a escola copia o link e manda pelo WhatsApp.
 */
function LinkDeAssinatura({ link, nome, titulo }: { link: string; nome: string; titulo: string }) {
  async function copiar() {
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Link de assinatura copiado.");
    } catch {
      toast.message("Copie o link:", { description: link });
    }
  }

  const mensagem = `Olá, ${nome}! Segue o link para assinar o contrato "${titulo}": ${link}`;

  return (
    <>
      <Button variant="ghost" size="sm" onClick={copiar} title="Copiar o link de assinatura">
        <Link2 className="size-4" /> Link
      </Button>
      <a
        href={`https://wa.me/?text=${encodeURIComponent(mensagem)}`}
        target="_blank"
        rel="noreferrer"
        title="Enviar o link pelo WhatsApp"
        className="inline-flex h-9 items-center gap-1 rounded-lg md:h-7 px-2.5 text-[0.8rem] font-medium hover:bg-muted"
      >
        <MessageCircle className="size-4" /> WhatsApp
      </a>
    </>
  );
}

/**
 * Baixa um arquivo do contrato.
 *
 * Passa por fetch autenticado em vez de link direto porque são documentos com nome, CPF e
 * assinatura — o endpoint exige token, e um `<a href>` não mandaria o cabeçalho.
 */
/** Nome do arquivo salvo, por tipo. */
const NOME_DO_ARQUIVO: Record<"assinado" | "original" | "auditoria", string> = {
  assinado: "contrato.pdf",
  original: "contrato-original-autentique.pdf",
  auditoria: "contrato-auditoria.pdf",
};

/**
 * Baixa um arquivo do contrato.
 *
 * "assinado" é o contrato com a assinatura da escola, quando já aprovado — o mesmo que a família
 * recebeu. "original" é o PDF do Autentique sem alteração: a prova, com a trilha de auditoria.
 */
function BotaoDownload({
  contratoId,
  tipo,
  rotulo,
  discreto = false,
  titulo,
}: {
  contratoId: string;
  tipo: "assinado" | "original" | "auditoria";
  rotulo: string;
  discreto?: boolean;
  titulo?: string;
}) {
  const [baixando, setBaixando] = useState(false);

  async function baixar() {
    setBaixando(true);
    try {
      const { getToken } = await import("@/lib/auth/session");
      const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://localhost:7141";
      const token = getToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

      let res = await fetch(`${base}/api/Contracts/${contratoId}/arquivo/${tipo}`, { headers });

      // Backend anterior não conhece "original": nele, "assinado" é exatamente o PDF do Autentique.
      if (res.status === 404 && tipo === "original") {
        res = await fetch(`${base}/api/Contracts/${contratoId}/arquivo/assinado`, { headers });
      }

      if (!res.ok) throw new Error("Arquivo não disponível.");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = NOME_DO_ARQUIVO[tipo];
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao baixar.");
    } finally {
      setBaixando(false);
    }
  }

  return (
    <Button
      variant={discreto ? "ghost" : "outline"}
      size="sm"
      onClick={baixar}
      disabled={baixando}
      title={titulo}
      className={discreto ? "text-muted-foreground" : undefined}
    >
      {baixando ? "Baixando..." : rotulo}
    </Button>
  );
}
