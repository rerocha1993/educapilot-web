"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronDown, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FinanceNav } from "@/components/finance/finance-nav";
import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
import {
  useCategoriasFinanceiras,
  useCentrosDeCusto,
  useExcluirCategoria,
  useExcluirCentro,
  useSalvarCategoria,
  useSalvarCentro,
  type CategoriaFinanceira,
  type CentroDeCusto,
} from "@/lib/finance/use-tesouraria";

type Tipo = "Receita" | "Despesa";

export default function PlanoDeContasPage() {
  const { data: categorias, isLoading } = useCategoriasFinanceiras(true);
  const { data: centros } = useCentrosDeCusto(true);
  const salvarCategoria = useSalvarCategoria();
  const excluirCategoria = useExcluirCategoria();
  const salvarCentro = useSalvarCentro();
  const excluirCentro = useExcluirCentro();

  const [aba, setAba] = useState<Tipo>("Despesa");
  const [recolhidos, setRecolhidos] = useState<Set<string>>(new Set());

  const [dialogCategoria, setDialogCategoria] = useState(false);
  const [editandoCategoria, setEditandoCategoria] = useState<CategoriaFinanceira | null>(null);
  const [formCategoria, setFormCategoria] = useState({
    nome: "",
    codigo: "",
    paiId: "" as string,
    ativa: true,
  });

  const [dialogCentro, setDialogCentro] = useState(false);
  const [editandoCentro, setEditandoCentro] = useState<CentroDeCusto | null>(null);
  const [formCentro, setFormCentro] = useState({ nome: "", codigo: "", ativo: true });

  const doTipo = useMemo(
    () => (categorias ?? []).filter((c) => c.tipo === aba),
    [categorias, aba]
  );
  const grupos = doTipo.filter((c) => !c.paiId);
  const grupoParaFormulario = (categorias ?? []).filter((c) => c.tipo === aba && !c.paiId);

  function alternar(id: string) {
    setRecolhidos((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  function abrirNovaCategoria(paiId?: string) {
    setEditandoCategoria(null);
    setFormCategoria({ nome: "", codigo: "", paiId: paiId ?? "", ativa: true });
    setDialogCategoria(true);
  }

  function abrirEdicaoCategoria(categoria: CategoriaFinanceira) {
    setEditandoCategoria(categoria);
    setFormCategoria({
      nome: categoria.nome,
      codigo: categoria.codigo ?? "",
      paiId: categoria.paiId ?? "",
      ativa: categoria.ativa,
    });
    setDialogCategoria(true);
  }

  async function guardarCategoria() {
    if (!formCategoria.nome.trim()) {
      toast.error("Dê um nome para a categoria.");
      return;
    }
    try {
      await salvarCategoria.mutateAsync({
        id: editandoCategoria?.id,
        dados: {
          nome: formCategoria.nome.trim(),
          tipo: aba,
          codigo: formCategoria.codigo || null,
          paiId: formCategoria.paiId || null,
          ativa: formCategoria.ativa,
          ordem: editandoCategoria?.ordem ?? 999,
        },
      });
      toast.success(editandoCategoria ? "Categoria atualizada." : "Categoria criada.");
      setDialogCategoria(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar.");
    }
  }

  async function apagarCategoria(id: string) {
    try {
      await excluirCategoria.mutateAsync(id);
      toast.success("Categoria removida.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível remover.");
    }
  }

  function abrirNovoCentro() {
    setEditandoCentro(null);
    setFormCentro({ nome: "", codigo: "", ativo: true });
    setDialogCentro(true);
  }

  function abrirEdicaoCentro(centro: CentroDeCusto) {
    setEditandoCentro(centro);
    setFormCentro({ nome: centro.nome, codigo: centro.codigo ?? "", ativo: centro.ativo });
    setDialogCentro(true);
  }

  async function guardarCentro() {
    if (!formCentro.nome.trim()) {
      toast.error("Dê um nome para o centro de custo.");
      return;
    }
    try {
      await salvarCentro.mutateAsync({
        id: editandoCentro?.id,
        dados: { nome: formCentro.nome.trim(), codigo: formCentro.codigo || null, ativo: formCentro.ativo },
      });
      toast.success(editandoCentro ? "Centro de custo atualizado." : "Centro de custo criado.");
      setDialogCentro(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar.");
    }
  }

  async function apagarCentro(id: string) {
    try {
      await excluirCentro.mutateAsync(id);
      toast.success("Centro de custo removido.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível remover.");
    }
  }

  return (
    <div className="flex flex-col gap-[18px]">
      <FinanceNav />

      <CabecalhoDaPagina
        eyebrow="Financeiro"
        titulo="Plano de contas"
        apoio="Como cada entrada e cada saída é classificada. É esta lista que o contador recebe no fim do mês."
        acoes={
          <Button onClick={() => abrirNovaCategoria()}>
            <Plus className="size-4" />
            Nova categoria
          </Button>
        }
      />

      <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:px-0">
        <div className="flex w-max gap-1 rounded-lg bg-muted p-1">
          {(["Despesa", "Receita"] as Tipo[]).map((tipo) => (
            <button
              key={tipo}
              type="button"
              onClick={() => setAba(tipo)}
              className={`shrink-0 rounded-[9px] px-3.5 py-2 text-[13.5px] whitespace-nowrap transition-colors ${
                aba === tipo
                  ? "bg-card font-semibold text-foreground shadow-[0_1px_3px_rgba(42,37,48,.12)]"
                  : "font-medium text-muted-foreground hover:text-foreground"
              }`}
            >
              {tipo === "Despesa" ? "Saídas" : "Entradas"}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <Skeleton className="h-64 w-full" />}

      {!isLoading && (
        <div className="rounded-xl border border-border bg-card">
          {grupos.map((grupo, indice) => {
            const filhas = doTipo.filter((c) => c.paiId === grupo.id);
            const aberto = !recolhidos.has(grupo.id);

            return (
              <div key={grupo.id} className={indice > 0 ? "border-t border-border" : ""}>
                <div className="flex flex-wrap items-center justify-between gap-2 px-[18px] py-3">
                  <button
                    type="button"
                    onClick={() => alternar(grupo.id)}
                    className="flex min-w-0 items-center gap-2 text-left"
                  >
                    {aberto ? (
                      <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                    )}
                    <span className="font-heading text-[14.5px] font-semibold break-words">{grupo.nome}</span>
                    {grupo.codigo && (
                      <span className="font-mono text-xs text-muted-foreground">{grupo.codigo}</span>
                    )}
                    {!grupo.ativa && <Badge variant="outline">Inativo</Badge>}
                    <span className="text-xs text-muted-foreground">
                      {filhas.length} {filhas.length === 1 ? "conta" : "contas"}
                    </span>
                  </button>

                  <div className="flex shrink-0 gap-1">
                    <Button variant="ghost" size="sm" onClick={() => abrirNovaCategoria(grupo.id)}>
                      <Plus className="size-4" />
                      Conta
                    </Button>
                    <Button variant="ghost" size="icon" aria-label="Editar grupo" onClick={() => abrirEdicaoCategoria(grupo)}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label="Apagar grupo" onClick={() => apagarCategoria(grupo.id)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>

                {aberto && filhas.length > 0 && (
                  <div className="flex flex-col border-t border-border bg-muted/40">
                    {filhas.map((conta) => (
                      <div
                        key={conta.id}
                        className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 py-2 pr-[18px] pl-11 last:border-b-0"
                      >
                        <span className="flex min-w-0 flex-wrap items-center gap-2 text-sm">
                          <span className="break-words">{conta.nome}</span>
                          {conta.codigo && (
                            <span className="font-mono text-xs text-muted-foreground">{conta.codigo}</span>
                          )}
                          {!conta.ativa && <Badge variant="outline">Inativa</Badge>}
                          {conta.lancamentos > 0 && (
                            <span className="text-xs text-muted-foreground">
                              {conta.lancamentos} lançamento{conta.lancamentos === 1 ? "" : "s"}
                            </span>
                          )}
                        </span>
                        <div className="flex shrink-0 gap-1">
                          <Button variant="ghost" size="icon" aria-label="Editar conta" onClick={() => abrirEdicaoCategoria(conta)}>
                            <Pencil className="size-4" />
                          </Button>
                          <Button variant="ghost" size="icon" aria-label="Apagar conta" onClick={() => apagarCategoria(conta.id)}>
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-[18px]">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="font-heading text-[15.5px] font-semibold">Centros de custo</h2>
            <p className="mt-1 text-[12.5px] text-muted-foreground">
              Para qual parte da escola a entrada ou a saída pertence — é o que separa o resultado do
              Infantil do resultado do Fundamental.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={abrirNovoCentro}>
            <Plus className="size-4" />
            Novo
          </Button>
        </div>

        <div className="mt-3.5 flex flex-wrap gap-2">
          {(centros ?? []).map((centro) => (
            <span
              key={centro.id}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm ${
                centro.ativo ? "border-border" : "border-dashed border-border text-muted-foreground"
              }`}
            >
              {centro.nome}
              <button
                type="button"
                aria-label={`Editar ${centro.nome}`}
                className="text-muted-foreground hover:text-foreground"
                onClick={() => abrirEdicaoCentro(centro)}
              >
                <Pencil className="size-3.5" />
              </button>
              <button
                type="button"
                aria-label={`Apagar ${centro.nome}`}
                className="text-muted-foreground hover:text-foreground"
                onClick={() => apagarCentro(centro.id)}
              >
                <Trash2 className="size-3.5" />
              </button>
            </span>
          ))}
          {(centros ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum centro de custo cadastrado.</p>
          )}
        </div>
      </div>

      <Dialog open={dialogCategoria} onOpenChange={setDialogCategoria}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editandoCategoria ? "Editar categoria" : "Nova categoria"}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-3.5">
            <div className="flex flex-col gap-[5px]">
              <Label className="text-xs text-muted-foreground">Nome</Label>
              <Input
                value={formCategoria.nome}
                placeholder={aba === "Despesa" ? "Energia elétrica" : "Mensalidade regular"}
                onChange={(e) => setFormCategoria((f) => ({ ...f, nome: e.target.value }))}
              />
            </div>

            {!editandoCategoria && (
              <div className="flex flex-col gap-[5px]">
                <Label className="text-xs text-muted-foreground">Dentro de qual grupo</Label>
                <Select
                  value={formCategoria.paiId || "__nenhum__"}
                  onValueChange={(v) =>
                    v && setFormCategoria((f) => ({ ...f, paiId: v === "__nenhum__" ? "" : String(v) }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {() =>
                        formCategoria.paiId
                          ? (grupoParaFormulario.find((g) => g.id === formCategoria.paiId)?.nome ?? "Grupo")
                          : "Nenhum — é um grupo novo"
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__nenhum__">Nenhum — é um grupo novo</SelectItem>
                    {grupoParaFormulario.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex flex-col gap-[5px]">
              <Label className="text-xs text-muted-foreground">Código contábil (opcional)</Label>
              <Input
                value={formCategoria.codigo}
                placeholder="3.1.01"
                onChange={(e) => setFormCategoria((f) => ({ ...f, codigo: e.target.value }))}
              />
            </div>

            <label className="flex items-start gap-2.5 text-sm">
              <Checkbox
                checked={formCategoria.ativa}
                onCheckedChange={(v) => setFormCategoria((f) => ({ ...f, ativa: v === true }))}
              />
              <span>
                Ativa
                <span className="block text-xs text-muted-foreground">
                  Desmarque para sumir das listas sem mexer no que já foi lançado.
                </span>
              </span>
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogCategoria(false)}>
              Cancelar
            </Button>
            <Button onClick={guardarCategoria} disabled={salvarCategoria.isPending}>
              {salvarCategoria.isPending ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogCentro} onOpenChange={setDialogCentro}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editandoCentro ? "Editar centro de custo" : "Novo centro de custo"}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-3.5">
            <div className="flex flex-col gap-[5px]">
              <Label className="text-xs text-muted-foreground">Nome</Label>
              <Input
                value={formCentro.nome}
                placeholder="Educação Infantil"
                onChange={(e) => setFormCentro((f) => ({ ...f, nome: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-[5px]">
              <Label className="text-xs text-muted-foreground">Código (opcional)</Label>
              <Input
                value={formCentro.codigo}
                onChange={(e) => setFormCentro((f) => ({ ...f, codigo: e.target.value }))}
              />
            </div>
            <label className="flex items-center gap-2.5 text-sm">
              <Checkbox
                checked={formCentro.ativo}
                onCheckedChange={(v) => setFormCentro((f) => ({ ...f, ativo: v === true }))}
              />
              Ativo
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogCentro(false)}>
              Cancelar
            </Button>
            <Button onClick={guardarCentro} disabled={salvarCentro.isPending}>
              {salvarCentro.isPending ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
