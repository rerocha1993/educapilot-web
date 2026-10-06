"use client";

import { useState } from "react";
import { MailPlus, Search, Send, Users } from "lucide-react";
import { toast } from "sonner";

import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
import { EstadoVazio } from "@/components/padroes/estado-vazio";
import { ErroDeCarga } from "@/components/rh/campo";
import { RelacionamentoNav } from "@/components/relacionamento/relacionamento-nav";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAtraso } from "@/lib/relacionamento/use-atraso";
import {
  useFamilias,
  useGerarAcessos,
  useReenviarAcesso,
  type Familia,
  type GerarAcessos,
  type ResultadoDeAcessos,
} from "@/lib/relacionamento/use-relacionamento";
import { cn } from "@/lib/utils";

/** Chip do acesso. A cor não vai sozinha: o texto diz a situação. */
function EtiquetaDeAcesso({ temLogin }: { temLogin: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[11.5px] font-semibold whitespace-nowrap",
        temLogin ? "bg-success-soft text-success-soft-foreground" : "bg-action-soft text-action-soft-foreground"
      )}
    >
      {temLogin ? "Com acesso" : "Sem acesso"}
    </span>
  );
}

function alunosEmTexto(f: Familia): string {
  if (f.alunos.length === 0) return "—";
  return f.alunos.map((a) => (a.turma ? `${a.nome} (${a.turma})` : a.nome)).join(", ");
}

type Pedido = { tipo: "selecionados" } | { tipo: "todos" };

export default function FamiliasPage() {
  const [busca, setBusca] = useState("");
  const [somenteSemLogin, setSomenteSemLogin] = useState(false);
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set());
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [enviarEmail, setEnviarEmail] = useState(true);
  const [resultado, setResultado] = useState<ResultadoDeAcessos | null>(null);

  const buscaAtrasada = useAtraso(busca);
  const { data, isLoading, isError, refetch } = useFamilias({ busca: buscaAtrasada, somenteSemLogin });
  const gerar = useGerarAcessos();
  const reenviar = useReenviarAcesso();
  const [reenviando, setReenviando] = useState<number | null>(null);

  const lista = data ?? [];
  const marcados = lista.filter((f) => selecionados.has(f.guardianId));
  const todosMarcados = lista.length > 0 && marcados.length === lista.length;
  const semAcesso = lista.filter((f) => !f.temLogin).length;

  function alternar(id: number, marcado: boolean) {
    setSelecionados((atual) => {
      const novo = new Set(atual);
      if (marcado) novo.add(id);
      else novo.delete(id);
      return novo;
    });
  }

  function alternarTodos(marcado: boolean) {
    setSelecionados((atual) => {
      const novo = new Set(atual);
      for (const f of lista) {
        if (marcado) novo.add(f.guardianId);
        else novo.delete(f.guardianId);
      }
      return novo;
    });
  }

  async function confirmarGeracao() {
    if (!pedido) return;
    const dados: GerarAcessos =
      pedido.tipo === "todos"
        ? { todos: true, somenteSemLogin: true, enviarEmail }
        : { guardianIds: marcados.map((f) => f.guardianId), somenteSemLogin: true, enviarEmail };

    try {
      const r = await gerar.mutateAsync(dados);
      setPedido(null);
      setSelecionados(new Set());
      setResultado(r);
    } catch (err) {
      setPedido(null);
      toast.error(err instanceof Error ? err.message : "Não foi possível gerar os acessos.");
    }
  }

  async function reenviarLink(f: Familia) {
    setReenviando(f.guardianId);
    try {
      await reenviar.mutateAsync(f.guardianId);
      toast.success(`Link enviado para ${f.email ?? f.nome}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível reenviar o link.");
    } finally {
      setReenviando(null);
    }
  }

  const filtrando = busca.trim() !== "" || somenteSemLogin;

  return (
    <div className="flex flex-col gap-4">
      <RelacionamentoNav />

      <CabecalhoDaPagina
        eyebrow="Relacionamento"
        titulo="Famílias"
        apoio="Quem já tem acesso ao portal e quem ainda não. O link chega por e-mail e leva o responsável a criar a senha."
        acoes={
          <>
            <Button variant="outline" onClick={() => setPedido({ tipo: "todos" })}>
              <MailPlus /> Todos sem acesso
            </Button>
            <Button
              variant="action"
              disabled={marcados.length === 0}
              onClick={() => setPedido({ tipo: "selecionados" })}
            >
              <Send /> Gerar acesso e enviar e-mail{marcados.length > 0 && ` (${marcados.length})`}
            </Button>
          </>
        }
      />

      <div className="flex flex-col gap-2.5 md:flex-row md:items-center">
        <div className="relative md:w-72">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            aria-label="Buscar responsável"
            placeholder="Buscar por nome ou e-mail"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-8"
          />
        </div>

        <div className="flex min-h-11 items-center gap-3 md:min-h-8">
          <Switch id="fam-sem-login" checked={somenteSemLogin} onCheckedChange={setSomenteSemLogin} />
          <Label htmlFor="fam-sem-login" className="cursor-pointer">
            Só quem está sem acesso
          </Label>
        </div>

        {data && (
          <p className="text-sm text-muted-foreground md:ml-auto" aria-live="polite">
            {lista.length} {lista.length === 1 ? "responsável" : "responsáveis"}
            {!somenteSemLogin && semAcesso > 0 && <> · {semAcesso} sem acesso</>}
          </p>
        )}
      </div>

      {isError && <ErroDeCarga texto="Não foi possível carregar as famílias." onTentar={() => refetch()} />}

      {isLoading && (
        <div className="flex flex-col gap-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      )}

      {data && lista.length === 0 && (
        <EstadoVazio
          icone={<Users />}
          titulo={filtrando ? "Nenhum responsável com esses filtros" : "Nenhum responsável cadastrado"}
          texto={
            filtrando
              ? "Mude a busca ou desligue o filtro de acesso."
              : "Cadastre os responsáveis em Administração para liberar o portal."
          }
        />
      )}

      {data && lista.length > 0 && (
        <>
          {/* Computador: tabela. */}
          <div className="hidden rounded-xl border border-border bg-card md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      aria-label="Marcar todos os responsáveis da lista"
                      checked={todosMarcados}
                      indeterminate={marcados.length > 0 && !todosMarcados}
                      onCheckedChange={alternarTodos}
                    />
                  </TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Alunos</TableHead>
                  <TableHead>Acesso</TableHead>
                  <TableHead className="text-right">
                    <span className="sr-only">Ações</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.map((f) => (
                  <TableRow key={f.guardianId} data-state={selecionados.has(f.guardianId) ? "selected" : undefined}>
                    <TableCell>
                      <Checkbox
                        aria-label={`Marcar ${f.nome}`}
                        checked={selecionados.has(f.guardianId)}
                        onCheckedChange={(v) => alternar(f.guardianId, v)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{f.nome}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {f.email ?? <span className="text-warning-soft-foreground">Sem e-mail</span>}
                    </TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">{f.telefone ?? "—"}</TableCell>
                    <TableCell className="max-w-64 whitespace-normal text-muted-foreground">{alunosEmTexto(f)}</TableCell>
                    <TableCell>
                      <EtiquetaDeAcesso temLogin={f.temLogin} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!f.email || reenviando === f.guardianId}
                        title={f.email ? undefined : "O responsável não tem e-mail cadastrado"}
                        onClick={() => void reenviarLink(f)}
                      >
                        {reenviando === f.guardianId ? "Enviando..." : "Reenviar link"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Celular: um cartão por responsável. */}
          <ul className="flex flex-col gap-2 md:hidden">
            {lista.map((f) => (
              <li key={f.guardianId} className="flex flex-col gap-2.5 rounded-xl border border-border bg-card p-3">
                <div className="flex items-start gap-3">
                  <label className="flex min-h-11 min-w-11 cursor-pointer items-center justify-center">
                    <Checkbox
                      aria-label={`Marcar ${f.nome}`}
                      checked={selecionados.has(f.guardianId)}
                      onCheckedChange={(v) => alternar(f.guardianId, v)}
                    />
                  </label>
                  <div className="min-w-0 flex-1 pt-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium break-words">{f.nome}</p>
                      <EtiquetaDeAcesso temLogin={f.temLogin} />
                    </div>
                    <p className="text-[13px] break-words text-muted-foreground">{f.email ?? "Sem e-mail"}</p>
                    {f.telefone && <p className="text-[13px] text-muted-foreground tabular-nums">{f.telefone}</p>}
                    <p className="mt-1 text-[13px] break-words text-muted-foreground">{alunosEmTexto(f)}</p>
                  </div>
                </div>
                <div className="flex justify-end border-t border-border pt-2">
                  <Button
                    variant="outline"
                    disabled={!f.email || reenviando === f.guardianId}
                    onClick={() => void reenviarLink(f)}
                  >
                    {reenviando === f.guardianId ? "Enviando..." : "Reenviar link"}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {pedido && (
        <Dialog open onOpenChange={(aberto) => !aberto && !gerar.isPending && setPedido(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Gerar acesso e enviar e-mail?</DialogTitle>
              <DialogDescription>
                {pedido.tipo === "todos"
                  ? "Cada responsável que ainda não tem acesso recebe um link para criar a senha."
                  : `${marcados.length} ${marcados.length === 1 ? "responsável recebe" : "responsáveis recebem"} um link para criar a senha. Quem já tem acesso é ignorado.`}
              </DialogDescription>
            </DialogHeader>

            <div className="flex min-h-11 items-center gap-3">
              <Switch id="fam-email" checked={enviarEmail} onCheckedChange={setEnviarEmail} />
              <Label htmlFor="fam-email" className="cursor-pointer">
                Enviar o link por e-mail agora
              </Label>
            </div>

            <DialogFooter>
              <Button variant="outline" disabled={gerar.isPending} onClick={() => setPedido(null)}>
                Cancelar
              </Button>
              <Button variant="action" disabled={gerar.isPending} onClick={() => void confirmarGeracao()}>
                {gerar.isPending ? "Gerando..." : "Gerar acessos"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {resultado && <ResultadoDaGeracao resultado={resultado} onFechar={() => setResultado(null)} />}
    </div>
  );
}

function ResultadoDaGeracao({ resultado, onFechar }: { resultado: ResultadoDeAcessos; onFechar: () => void }) {
  return (
    <Dialog open onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Acessos gerados</DialogTitle>
          <DialogDescription>
            {resultado.gerados === 0
              ? "Nenhum acesso novo foi gerado."
              : `${resultado.gerados} ${resultado.gerados === 1 ? "acesso gerado" : "acessos gerados"}.`}
            {resultado.ignorados.length > 0 &&
              ` ${resultado.ignorados.length} ${resultado.ignorados.length === 1 ? "ficou" : "ficaram"} de fora.`}
          </DialogDescription>
        </DialogHeader>

        {resultado.ignorados.length > 0 && (
          <ul className="flex max-h-64 flex-col gap-1.5 overflow-y-auto">
            {resultado.ignorados.map((i, idx) => (
              <li key={`${i.nome}-${idx}`} className="rounded-lg border border-border px-3 py-2 text-sm">
                <p className="font-medium">{i.nome}</p>
                <p className="text-[13px] text-muted-foreground">{i.motivo}</p>
              </li>
            ))}
          </ul>
        )}

        <DialogFooter>
          <Button variant="action" onClick={onFechar}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
