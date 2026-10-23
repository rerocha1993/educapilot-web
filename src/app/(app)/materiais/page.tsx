"use client";

import { useMemo, useState } from "react";
import { Search, Package, Trash2, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RotinaNav } from "@/components/tasks/rotina-nav";
import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
import { EstadoVazio } from "@/components/padroes/estado-vazio";
import { cn } from "@/lib/utils";
import {
  useMaterials,
  useSaveMaterial,
  useDeleteMaterial,
  type MaterialDto,
  type SaveMaterialInput,
} from "@/lib/tasks/use-materials";

// Reestruturado (2026-09, feedback do cliente): "essa tela é desnecessaria por que
// nem da para criar material [...] pode ser como popup". A tela era literalmente
// somente leitura (badge "Somente leitura" removido) — o backend só tinha
// GetAllMaterialsAsync, nenhum jeito de criar/editar/excluir. Virou um cadastro
// geral + controle de quantidade de verdade (popup pra criar/editar, +/- rápido de
// estoque, exclusão). Cruzar com o que a professora pede no planejamento semanal
// fica pra depois — o planejamento ainda não tem modelo (R12), não dá pra cruzar
// com algo que não existe ainda.
//
// Redesenhado (2026-10, auditoria de telas): um item por linha com +/− nas pontas virou grade de
// cartões com nível de estoque, alerta de estoque baixo e filtro por categoria.

// A API devolve só nome, categoria e quantidade: não existe estoque mínimo por item. Enquanto não
// existir, "baixo" é um marcador simples e igual para todos (5 unidades ou menos), e a barra mostra
// o nível relativo ao maior estoque da mesma categoria, para comparar o que é parecido.
const ESTOQUE_BAIXO = 5;
const SEM_CATEGORIA = "Sem categoria";

const EMPTY_FORM: SaveMaterialInput = { name: "", type: "", availableQuantity: 0 };

export default function MateriaisPage() {
  const { data: materials, isLoading, isError } = useMaterials();
  const saveMaterial = useSaveMaterial();
  const deleteMaterial = useDeleteMaterial();

  const [search, setSearch] = useState("");
  const [categoria, setCategoria] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<SaveMaterialInput>(EMPTY_FORM);

  const categorias = useMemo(
    () =>
      [...new Set((materials ?? []).map((m) => m.type.trim() || SEM_CATEGORIA))].sort((a, b) =>
        a.localeCompare(b)
      ),
    [materials]
  );

  // Maior quantidade por categoria: é o "cheio" da barra de nível dos cartões dela.
  const maiorPorCategoria = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const m of materials ?? []) {
      const c = m.type.trim() || SEM_CATEGORIA;
      mapa.set(c, Math.max(mapa.get(c) ?? 0, m.availableQuantity));
    }
    return mapa;
  }, [materials]);

  const termo = search.trim().toLowerCase();
  const filtered = (materials ?? []).filter(
    (m) =>
      (categoria === null || (m.type.trim() || SEM_CATEGORIA) === categoria) &&
      (m.name.toLowerCase().includes(termo) || m.type.toLowerCase().includes(termo))
  );
  const baixos = (materials ?? []).filter((m) => m.availableQuantity <= ESTOQUE_BAIXO).length;

  function openCreate() {
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(m: MaterialDto) {
    setForm({ id: m.id, name: m.name, type: m.type, availableQuantity: m.availableQuantity });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    try {
      await saveMaterial.mutateAsync({
        ...form,
        name: form.name.trim(),
        type: form.type.trim(),
      });
      toast.success(form.id ? "Material atualizado." : "Material cadastrado.");
      setDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar material.");
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteMaterial.mutateAsync(id);
      toast.success("Material excluído.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir material.");
    }
  }

  // +/- rápido direto no cartão, sem abrir o popup — pro dia a dia de "chegou uma
  // caixa" / "acabou o estoque".
  async function adjustQuantity(m: MaterialDto, delta: number) {
    const next = Math.max(0, m.availableQuantity + delta);
    try {
      await saveMaterial.mutateAsync({ id: m.id, name: m.name, type: m.type, availableQuantity: next });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao ajustar quantidade.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <RotinaNav />

      <CabecalhoDaPagina
        eyebrow="Rotina"
        titulo="Materiais"
        apoio="Cadastro geral e controle de estoque da escola."
        acoes={
          // Único botão laranja da tela: é a decisão a tomar aqui.
          <Button variant="action" className="w-full md:w-auto" onClick={openCreate}>
            + Novo material
          </Button>
        }
      />

      {/* Números antes da lista: quantos itens, quantas categorias e quantos pedem reposição. */}
      {!isLoading && (materials?.length ?? 0) > 0 && (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
          <span>
            <span className="font-numeric font-medium text-foreground">{materials?.length}</span> materiais
          </span>
          <span aria-hidden>·</span>
          <span>
            <span className="font-numeric font-medium text-foreground">{categorias.length}</span>{" "}
            {categorias.length === 1 ? "categoria" : "categorias"}
          </span>
          {baixos > 0 && (
            <>
              <span aria-hidden>·</span>
              <Badge variant="pending">
                <span className="font-numeric">{baixos}</span> com estoque baixo
              </Badge>
            </>
          )}
        </p>
      )}

      <div className="flex flex-col gap-2.5 md:flex-row md:items-center md:gap-4">
        <div className="relative w-full md:w-72 md:shrink-0">
          <Search aria-hidden className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Buscar material"
            placeholder="Buscar por nome ou categoria"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 pl-8 md:h-9"
          />
        </div>

        {categorias.length > 1 && (
          <div
            role="group"
            aria-label="Filtrar por categoria"
            className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:px-0 md:pb-0"
          >
            {[null, ...categorias].map((c) => (
              <button
                key={c ?? "todas"}
                type="button"
                aria-pressed={categoria === c}
                onClick={() => setCategoria(c)}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-2 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring md:py-1",
                  categoria === c
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-transparent text-foreground hover:bg-accent"
                )}
              >
                {c ?? "Todas"}
              </button>
            ))}
          </div>
        )}
      </div>

      {isError && (
        <div className="rounded-md border border-destructive-border bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground">
          Não foi possível carregar os materiais.
        </div>
      )}

      {/* O botão roxo só aparece quando o cadastro está realmente vazio (na busca
          sem resultado não há ação a oferecer). */}
      {!isLoading && filtered.length === 0 ? (
        <EstadoVazio
          icone={<Package />}
          titulo={
            materials?.length === 0 ? "Nenhum material cadastrado ainda." : "Nenhum material encontrado."
          }
          acao={materials?.length === 0 ? <Button onClick={openCreate}>+ Novo material</Button> : undefined}
        />
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {isLoading &&
            Array.from({ length: 8 }).map((_, i) => (
              <li key={i}>
                <Skeleton className="h-[132px] w-full rounded-xl" />
              </li>
            ))}

          {filtered.map((m) => {
            const cat = m.type.trim() || SEM_CATEGORIA;
            const cheio = Math.max(maiorPorCategoria.get(cat) ?? 0, 1);
            const nivel = Math.min(100, (m.availableQuantity / cheio) * 100);
            const baixo = m.availableQuantity <= ESTOQUE_BAIXO;
            return (
              <li key={m.id} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3.5">
                <div className="flex items-start gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(m)}
                    className="flex min-w-0 flex-1 items-start gap-2.5 rounded-md text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
                      <Package aria-hidden className="size-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block break-words text-sm font-medium leading-snug">{m.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">{cat}</span>
                    </span>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Excluir ${m.name}`}
                    className="-mr-1 -mt-1 shrink-0 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(m.id)}
                    disabled={deleteMaterial.isPending}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="text-[10.5px] font-bold uppercase tracking-[.12em] text-muted-foreground">
                      Em estoque
                    </span>
                    {m.availableQuantity === 0 ? (
                      <Badge variant="overdue">Sem estoque</Badge>
                    ) : (
                      baixo && <Badge variant="pending">Baixo</Badge>
                    )}
                  </div>
                  <div
                    role="img"
                    aria-label={`Nível de estoque: ${m.availableQuantity} de ${cheio} na categoria`}
                    className="h-1.5 overflow-hidden rounded-[4px] bg-muted"
                  >
                    <div
                      className={cn(
                        "h-full rounded-[4px] transition-[width] duration-500",
                        baixo ? "bg-action-brand" : "bg-primary"
                      )}
                      style={{ width: `${nivel}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <Button
                    variant="outline"
                    size="icon-sm"
                    aria-label={`Diminuir ${m.name}`}
                    onClick={() => adjustQuantity(m, -1)}
                    disabled={saveMaterial.isPending || m.availableQuantity === 0}
                  >
                    <Minus className="size-3.5" />
                  </Button>
                  <span className="font-numeric text-lg font-semibold tabular-nums">{m.availableQuantity}</span>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    aria-label={`Aumentar ${m.name}`}
                    onClick={() => adjustQuantity(m, 1)}
                    disabled={saveMaterial.isPending}
                  >
                    <Plus className="size-3.5" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar material" : "Novo material"}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-[5px]">
              <span className="text-[10.5px] font-bold uppercase tracking-[.14em] text-muted-foreground">
                Nome
              </span>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ex.: Papel sulfite A4"
              />
            </div>

            <div className="flex flex-col gap-[5px]">
              <span className="text-[10.5px] font-bold uppercase tracking-[.14em] text-muted-foreground">
                Categoria
              </span>
              <Input
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                placeholder="Ex.: Papelaria, Limpeza, Pedagógico..."
              />
            </div>

            <div className="flex flex-col gap-[5px]">
              <span className="text-[10.5px] font-bold uppercase tracking-[.14em] text-muted-foreground">
                Quantidade em estoque
              </span>
              <Input
                type="number"
                min={0}
                className="font-numeric"
                value={form.availableQuantity}
                onChange={(e) =>
                  setForm((f) => ({ ...f, availableQuantity: Math.max(0, Number(e.target.value)) }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saveMaterial.isPending || !form.name.trim()}>
              {saveMaterial.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
