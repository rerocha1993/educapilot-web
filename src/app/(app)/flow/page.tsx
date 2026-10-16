"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Copy, ExternalLink, FileSignature, FileText, MoreHorizontal, Search, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import {
  useForms,
  useCreateForm,
  useDuplicateForm,
  useDeleteForm,
  useUpdateForm,
  type FormDto,
} from "@/lib/flow/use-forms";
import { TagDoTipo } from "@/components/flow/tag-do-tipo";
import { SeletorDeTipo } from "@/components/flow/seletor-de-tipo";
import { AbasDeFormularios } from "@/components/flow/abas-de-formularios";
import { HASH_LIGAR_CONTRATO } from "@/components/flow/interruptor-de-contrato";
import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
import { EstadoVazio } from "@/components/padroes/estado-vazio";
import { decodeFormConfig, encodeFormConfig, type TipoDeFormulario } from "@/lib/flow/form-config";
import { tipoDoFormulario } from "@/lib/flow/tipo-do-formulario";

// Situação do formulário nas cores do guia: ativo é dado concluído, rascunho ainda aguarda.
const STATUS_VARIANTE = {
  Rascunho: "waiting",
  Ativo: "success",
  Arquivado: "secondary",
} as const;

const SITUACOES: { valor: keyof typeof STATUS_VARIANTE | null; rotulo: string }[] = [
  { valor: null, rotulo: "Todos" },
  { valor: "Ativo", rotulo: "Ativos" },
  { valor: "Rascunho", rotulo: "Rascunhos" },
  { valor: "Arquivado", rotulo: "Arquivados" },
];

export default function FormulariosPage() {
  const { data: forms, isLoading, isError } = useForms();
  const [busca, setBusca] = useState("");
  const [situacao, setSituacao] = useState<keyof typeof STATUS_VARIANTE | null>(null);
  const todos = useMemo(() => forms ?? [], [forms]);
  const contagem = useMemo(() => {
    const c = { Rascunho: 0, Ativo: 0, Arquivado: 0 };
    for (const f of todos) if (f.status in c) c[f.status as keyof typeof c]++;
    return c;
  }, [todos]);
  const comContrato = todos.filter((f) => f.campos?.some((c) => c.tipo === "contrato")).length;
  const termo = busca.trim().toLowerCase();
  const filtrados = todos.filter(
    (f) => (situacao === null || f.status === situacao) && f.nome.toLowerCase().includes(termo)
  );
  const createForm = useCreateForm();
  const duplicateForm = useDuplicateForm();

  const [duplicando, setDuplicando] = useState<{ id: string; nome: string } | null>(null);
  const [nomeCopia, setNomeCopia] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [tipoNovo, setTipoNovo] = useState<TipoDeFormulario | "">("");
  const [geraContrato, setGeraContrato] = useState(false);
  const [tipoCopia, setTipoCopia] = useState<TipoDeFormulario | "">("");

  const deleteForm = useDeleteForm();
  const updateForm = useUpdateForm();
  const [excluindo, setExcluindo] = useState<FormDto | null>(null);
  // Motivo da recusa do servidor (formulário com envios). Com ele na tela, o botão vira "Arquivar".
  const [recusa, setRecusa] = useState<string | null>(null);

  function fecharExclusao() {
    setExcluindo(null);
    setRecusa(null);
  }

  async function handleExcluir() {
    if (!excluindo) return;
    try {
      await deleteForm.mutateAsync(excluindo.id);
      toast.success(`"${excluindo.nome}" excluído.`);
      fecharExclusao();
    } catch (err) {
      setRecusa(err instanceof Error ? err.message : "Não foi possível excluir o formulário.");
    }
  }

  async function handleArquivar() {
    if (!excluindo) return;
    try {
      await updateForm.mutateAsync({ ...excluindo, status: "Arquivado" });
      toast.success(`"${excluindo.nome}" arquivado.`);
      fecharExclusao();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao arquivar o formulário.");
    }
  }

  async function handleCreate() {
    if (!nome.trim() || !tipoNovo) return;
    try {
      const created = await createForm.mutateAsync({ nome: nome.trim(), descricao: descricao.trim() });
      await updateForm.mutateAsync({ ...created, config: encodeFormConfig({ tipo: tipoNovo }) });
      toast.success("Formulário criado.");
      setDialogOpen(false);
      setNome("");
      setDescricao("");
      setTipoNovo("");
      setGeraContrato(false);
      // O campo de contrato não pode ser criado daqui — ele precisa do formulário já salvo. A
      // marca no endereço leva a decisão junto, e o construtor liga o contrato ao abrir.
      window.location.href = `/flow/${created.id}${geraContrato ? HASH_LIGAR_CONTRATO : ""}`;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar formulário.");
    }
  }

  async function handleDuplicar() {
    if (!duplicando) return;
    try {
      const copia = await duplicateForm.mutateAsync({
        id: duplicando.id,
        nome: nomeCopia.trim() || undefined,
      });
      // A cópia herda a configuração do original, inclusive o tipo: sem regravar, a rematrícula
      // duplicada da matrícula continuaria marcada como matrícula.
      if (tipoCopia) {
        await updateForm.mutateAsync({
          ...copia,
          config: encodeFormConfig({ ...decodeFormConfig(copia.config), tipo: tipoCopia }),
        });
      }
      toast.success(`"${copia.nome}" criado como rascunho.`);
      setDuplicando(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao duplicar o formulário.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <AbasDeFormularios />

      <CabecalhoDaPagina
        titulo="Formulários"
        apoio="Construtor de formulários dinâmicos."
        acoes={
          <Button variant="action" onClick={() => setDialogOpen(true)}>
            + Novo formulário
          </Button>
        }
      />

      {isError && (
        <div className="rounded-md border border-destructive-border bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground">
          Não foi possível carregar os formulários.
        </div>
      )}

      {/* Números antes da lista: quantos formulários, quantos em uso e quantos geram contrato. */}
      {!isLoading && todos.length > 0 && (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
          <span>
            <span className="font-numeric font-medium text-foreground">{todos.length}</span>{" "}
            {todos.length === 1 ? "formulário" : "formulários"}
          </span>
          <span aria-hidden>·</span>
          <span>
            <span className="font-numeric font-medium text-foreground">{contagem.Ativo}</span>{" "}
            {contagem.Ativo === 1 ? "ativo" : "ativos"}
          </span>
          {comContrato > 0 && (
            <>
              <span aria-hidden>·</span>
              <span>
                <span className="font-numeric font-medium text-foreground">{comContrato}</span> com contrato
              </span>
            </>
          )}
        </p>
      )}

      {todos.length > 0 && (
        <div className="flex flex-col gap-2.5 md:flex-row md:items-center md:gap-4">
          <div className="relative w-full md:w-72 md:shrink-0">
            <Search aria-hidden className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Buscar formulário"
              placeholder="Buscar por nome"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="h-10 pl-8 md:h-9"
            />
          </div>
          <div
            role="group"
            aria-label="Filtrar por situação"
            className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:px-0 md:pb-0"
          >
            {SITUACOES.map((s) => (
              <button
                key={s.valor ?? "todos"}
                type="button"
                aria-pressed={situacao === s.valor}
                onClick={() => setSituacao(s.valor)}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-2 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring md:py-1",
                  situacao === s.valor
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-transparent text-foreground hover:bg-accent"
                )}
              >
                {s.rotulo}
                <span className="font-numeric ml-1.5 opacity-75">
                  {s.valor === null ? todos.length : contagem[s.valor]}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {isLoading && (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i}>
              <Skeleton className="h-[132px] w-full rounded-xl" />
            </li>
          ))}
        </ul>
      )}

      {!isLoading && todos.length === 0 && (
        <EstadoVazio
          icone={<FileText />}
          titulo="Nenhum formulário criado ainda."
          acao={<Button onClick={() => setDialogOpen(true)}>+ Novo formulário</Button>}
        />
      )}

      {!isLoading && todos.length > 0 && filtrados.length === 0 && (
        <EstadoVazio icone={<Search />} titulo="Nenhum formulário encontrado." />
      )}

      {filtrados.length > 0 && (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtrados.map((form) => {
            const campos = form.campos?.length ?? 0;
            const geraContratoDoForm = form.campos?.some((c) => c.tipo === "contrato");
            return (
              <li
                key={form.id}
                className="relative flex flex-col gap-2.5 rounded-xl border border-border bg-card p-3.5 transition-colors focus-within:ring-2 focus-within:ring-ring hover:bg-muted/60"
              >
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    {/* O título é o link e estica por cima do cartão inteiro; o menu fica acima dele. */}
                    <Link
                      href={`/flow/${form.id}`}
                      className="block break-words text-sm font-medium leading-snug outline-none after:absolute after:inset-0 after:rounded-xl"
                    >
                      {form.nome}
                    </Link>
                    <p className="mt-1 line-clamp-2 min-h-[2.5rem] break-words text-[13px] leading-snug text-muted-foreground">
                      {form.descricao || "Sem descrição."}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      aria-label={`Ações de ${form.nome}`}
                      className="relative z-10 -mr-1 -mt-1 grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors max-md:size-10 hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <MoreHorizontal className="size-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem render={<Link href={`/flow/${form.id}`} />}>
                        <ExternalLink className="size-4" /> Abrir
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setDuplicando({ id: form.id!, nome: form.nome });
                          setNomeCopia(`${form.nome} (cópia)`);
                          setTipoCopia("");
                        }}
                      >
                        <Copy className="size-4" /> Duplicar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => {
                          setRecusa(null);
                          setExcluindo(form);
                        }}
                      >
                        <Trash2 className="size-4" /> Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="mt-auto flex flex-wrap items-center gap-1.5">
                  <Badge variant={STATUS_VARIANTE[form.status as keyof typeof STATUS_VARIANTE] ?? "secondary"}>
                    {form.status}
                  </Badge>
                  <TagDoTipo tipo={tipoDoFormulario(form)} />
                  {/* Dado neutro, não situação: só diz de que espécie é o formulário. Quem decide
                      é o campo de contrato — ver InterruptorDeContrato. */}
                  {geraContratoDoForm && (
                    <Badge variant="outline">
                      <FileSignature />
                      Gera contrato
                    </Badge>
                  )}
                  <span className="ml-auto text-xs text-muted-foreground">
                    <span className="font-numeric tabular-nums">{campos}</span> campo{campos === 1 ? "" : "s"}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={!!excluindo} onOpenChange={(open) => !open && fecharExclusao()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir formulário</DialogTitle>
          </DialogHeader>
          {recusa ? (
            <div className="flex flex-col gap-2">
              <div className="rounded-md border border-warning-border bg-warning-soft px-3 py-2 text-sm text-warning-soft-foreground">
                {recusa}
              </div>
              <p className="text-sm text-muted-foreground">
                Arquivar tira o formulário de uso: o link para de aceitar envios, e as respostas e os
                contratos continuam guardados.
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Excluir <strong>{excluindo?.nome}</strong> apaga os campos e as automações dele. Não dá
              para desfazer.
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={fecharExclusao}>
              Cancelar
            </Button>
            {recusa ? (
              excluindo?.status !== "Arquivado" && (
                <Button onClick={handleArquivar} disabled={updateForm.isPending}>
                  {updateForm.isPending ? "Arquivando..." : "Arquivar"}
                </Button>
              )
            ) : (
              <Button variant="destructive" onClick={handleExcluir} disabled={deleteForm.isPending}>
                {deleteForm.isPending ? "Excluindo..." : "Excluir"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!duplicando} onOpenChange={(open) => !open && setDuplicando(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duplicar formulário</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Copia todos os campos de <strong>{duplicando?.nome}</strong>, inclusive o contrato e as
              configurações. A cópia nasce como rascunho, com link próprio, e as respostas ficam com
              o formulário original.
            </p>
            <div className="flex flex-col gap-[5px]">
              <Label className="text-xs text-muted-foreground">Nome da cópia</Label>
              <Input value={nomeCopia} onChange={(e) => setNomeCopia(e.target.value)} />
            </div>
            <SeletorDeTipo valor={tipoCopia} onChange={setTipoCopia} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDuplicando(null)}>
              Cancelar
            </Button>
            <Button onClick={handleDuplicar} disabled={duplicateForm.isPending || !tipoCopia}>
              {duplicateForm.isPending ? "Duplicando..." : "Duplicar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo formulário</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-[5px]">
              <Label className="text-xs text-muted-foreground">Nome</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Autorização de saída antecipada" />
            </div>
            <div className="flex flex-col gap-[5px]">
              <Label className="text-xs text-muted-foreground">Descrição (opcional)</Label>
              <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} />
            </div>
            <SeletorDeTipo valor={tipoNovo} onChange={setTipoNovo} />

            {/* A pergunta que a escola faz ao criar: é contrato ou não? Marcada, o construtor abre
                já com o campo de contrato criado e a configuração dele na tela. */}
            <div className="flex items-start justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
              <div className="min-w-0">
                <Label htmlFor="novo-gera-contrato" className="text-sm font-medium">
                  Este formulário gera contrato
                </Label>
                <p className="mt-1 text-xs leading-[1.55] text-muted-foreground">
                  A família lê e assina o contrato ao enviar. Os contratos gerados ficam em
                  Administração · Contratos.
                </p>
              </div>
              <Switch
                id="novo-gera-contrato"
                checked={geraContrato}
                onCheckedChange={setGeraContrato}
                className="mt-0.5 shrink-0"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={createForm.isPending || !nome.trim() || !tipoNovo}>
              {createForm.isPending ? "Criando..." : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
