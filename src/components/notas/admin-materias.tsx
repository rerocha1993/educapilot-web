"use client";

import { useState } from "react";
import { toast } from "sonner";
import { BookOpen, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";

import { Campo } from "@/components/notas/campos";
import { EstadoVazio } from "@/components/padroes/estado-vazio";
import { ErroDeCarga } from "@/components/rh/campo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  useCriarModeloDeMaterias,
  useExcluirMateria,
  useMaterias,
  useSalvarMateria,
  type Materia,
} from "@/lib/notas/use-notas";
import { cn } from "@/lib/utils";

/** Matérias da escola. Na educação infantil, os campos de experiência da BNCC fazem o papel de matéria. */
export function MateriasPainel() {
  const { data: materias, isLoading, isError, error, refetch } = useMaterias();
  const modelo = useCriarModeloDeMaterias();
  const salvar = useSalvarMateria();
  const excluir = useExcluirMateria();
  const [editando, setEditando] = useState<Materia | "nova" | null>(null);
  const [excluindo, setExcluindo] = useState<Materia | null>(null);

  async function handleModelo(qual: "bncc" | "fundamental") {
    try {
      const r = await modelo.mutateAsync(qual);
      toast.success(
        r.criadas === 0
          ? "Todas essas matérias já existiam."
          : `${r.criadas} ${r.criadas === 1 ? "matéria criada" : "matérias criadas"}${r.jaExistiam > 0 ? `; ${r.jaExistiam} já existiam` : ""}.`
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar as matérias.");
    }
  }

  async function alternarAtiva(m: Materia, ativa: boolean) {
    try {
      await salvar.mutateAsync({ id: m.id, entrada: { nome: m.nome, sigla: m.sigla ?? null, area: m.area ?? null, ativa } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
    }
  }

  async function handleExcluir() {
    if (!excluindo) return;
    try {
      await excluir.mutateAsync(excluindo.id);
      toast.success("Matéria excluída.");
      setExcluindo(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir.");
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={() => void handleModelo("bncc")} disabled={modelo.isPending}>
          <Sparkles className="size-4" />
          Criar campos de experiência da BNCC
        </Button>
        <Button variant="outline" onClick={() => void handleModelo("fundamental")} disabled={modelo.isPending}>
          <Sparkles className="size-4" />
          Criar matérias do fundamental
        </Button>
        <Button className="sm:ml-auto" onClick={() => setEditando("nova")}>
          <Plus className="size-4" />
          Nova matéria
        </Button>
      </div>
      <p className="-mt-2 text-[12.5px] text-muted-foreground">
        Os modelos só criam o que ainda não existe. Para o infantil, os cinco campos de experiência da BNCC fazem o papel de matéria.
      </p>

      {isLoading && (
        <div className="flex flex-col gap-1.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </div>
      )}
      {isError && <ErroDeCarga texto={error instanceof Error ? error.message : "Não foi possível carregar as matérias."} onTentar={() => void refetch()} />}

      {!isLoading && !isError && (materias ?? []).length === 0 && (
        <EstadoVazio icone={<BookOpen />} titulo="Nenhuma matéria cadastrada" texto="Use um dos modelos acima ou crie a primeira matéria." />
      )}

      {(materias ?? []).length > 0 && (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {(materias ?? []).map((m) => (
            <li key={m.id} className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2", !m.ativa && "bg-muted/40")}>
              <div className="min-w-0 flex-1">
                <p className={cn("truncate font-medium", !m.ativa && "text-muted-foreground")}>
                  {m.nome}
                  {m.sigla != null && <span className="ml-2 text-[12px] font-normal text-muted-foreground">{m.sigla}</span>}
                </p>
                <p className="truncate text-[12.5px] text-muted-foreground">
                  {[m.area, m.emUso > 0 ? `em ${m.emUso} ${m.emUso === 1 ? "turma" : "turmas"}` : "sem turma"].filter(Boolean).join(" · ")}
                </p>
              </div>
              {!m.ativa && <Badge variant="outline">Inativa</Badge>}
              <Switch checked={m.ativa} onCheckedChange={(v) => void alternarAtiva(m, v)} aria-label={`${m.nome}: ativa`} />
              <Button variant="ghost" size="icon" aria-label={`Editar ${m.nome}`} onClick={() => setEditando(m)}>
                <Pencil className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Excluir ${m.nome}`}
                disabled={m.emUso > 0}
                title={m.emUso > 0 ? "Está em uso por turmas: desative em vez de excluir." : undefined}
                onClick={() => setExcluindo(m)}
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <MateriaDialog aberta={editando} onFechar={() => setEditando(null)} />

      <Dialog open={excluindo != null} onOpenChange={(aberto) => !aberto && setExcluindo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir a matéria?</DialogTitle>
          </DialogHeader>
          <p className="text-sm">
            <strong>{excluindo?.nome}</strong> será removida do cadastro. Isso não pode ser desfeito.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExcluindo(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleExcluir} disabled={excluir.isPending}>
              {excluir.isPending ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MateriaDialog({ aberta, onFechar }: { aberta: Materia | "nova" | null; onFechar: () => void }) {
  const salvar = useSalvarMateria();
  // O formulário só existe com o diálogo aberto: key recomeça os campos a cada abertura.
  return (
    <Dialog open={aberta != null} onOpenChange={(a) => !a && onFechar()}>
      <DialogContent>
        {aberta != null && <FormularioDaMateria key={aberta === "nova" ? "nova" : aberta.id} materia={aberta === "nova" ? null : aberta} salvar={salvar} onFechar={onFechar} />}
      </DialogContent>
    </Dialog>
  );
}

function FormularioDaMateria({
  materia,
  salvar,
  onFechar,
}: {
  materia: Materia | null;
  salvar: ReturnType<typeof useSalvarMateria>;
  onFechar: () => void;
}) {
  const [nome, setNome] = useState(materia?.nome ?? "");
  const [sigla, setSigla] = useState(materia?.sigla ?? "");
  const [area, setArea] = useState(materia?.area ?? "");

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return;
    try {
      await salvar.mutateAsync({
        id: materia?.id,
        entrada: { nome: nome.trim(), sigla: sigla.trim() || null, area: area.trim() || null, ativa: materia?.ativa ?? true },
      });
      toast.success(materia ? "Matéria atualizada." : "Matéria criada.");
      onFechar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
    }
  }

  return (
    <form onSubmit={handleSalvar} className="flex flex-col gap-3">
      <DialogHeader>
        <DialogTitle>{materia ? "Editar matéria" : "Nova matéria"}</DialogTitle>
      </DialogHeader>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_6rem]">
        <Campo rotulo="Nome">
          <Input value={nome} maxLength={80} onChange={(e) => setNome(e.target.value)} autoFocus />
        </Campo>
        <Campo rotulo="Sigla">
          <Input value={sigla} maxLength={10} onChange={(e) => setSigla(e.target.value)} />
        </Campo>
        <Campo rotulo="Área (opcional)" className="sm:col-span-2">
          <Input value={area} maxLength={60} placeholder="Linguagens, Exatas…" onChange={(e) => setArea(e.target.value)} />
        </Campo>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onFechar}>
          Cancelar
        </Button>
        <Button type="submit" disabled={!nome.trim() || salvar.isPending}>
          {salvar.isPending ? "Salvando..." : "Salvar"}
        </Button>
      </DialogFooter>
    </form>
  );
}
