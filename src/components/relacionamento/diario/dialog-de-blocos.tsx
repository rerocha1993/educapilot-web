"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { ErroDeCarga } from "@/components/rh/campo";
import { useBlocosDaTurma, useSalvarBlocosDaTurma, type BlocosDaTurma } from "@/lib/relacionamento/use-diario";

const LINHAS: { campo: keyof BlocosDaTurma; rotulo: string; dica?: string; filhoDe?: keyof BlocosDaTurma }[] = [
  { campo: "alimentacao", rotulo: "Alimentação", dica: "Refeições e como a criança aceitou." },
  { campo: "sono", rotulo: "Sono", dica: "Horário de dormir e acordar." },
  { campo: "higiene", rotulo: "Higiene", dica: "Xixi, cocô, banho e escovação." },
  { campo: "fralda", rotulo: "Troca de fralda", dica: "Desligue na turma que já largou a fralda.", filhoDe: "higiene" },
  { campo: "humor", rotulo: "Humor" },
  { campo: "saude", rotulo: "Saúde", dica: "Temperatura, medicamento e observações. Dado sensível." },
  { campo: "reposicao", rotulo: "Precisa repor", dica: "Fralda, lenço, pomada, roupa..." },
  { campo: "fotos", rotulo: "Fotos", dica: "Só de alunos com autorização de uso de imagem." },
];

/**
 * "Blocos da turma": quais partes do diário a turma usa. O padrão é tudo ligado. Desligar não
 * apaga o que já foi lançado; só some da tela do lançamento e passa a ser recusado pelo servidor.
 */
export function DialogDeBlocos({
  classId,
  turma,
  aberto,
  onFechar,
}: {
  classId: number | null;
  turma: string;
  aberto: boolean;
  onFechar: () => void;
}) {
  return (
    <Dialog open={aberto} onOpenChange={(a) => !a && onFechar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Blocos do diário · {turma}</DialogTitle>
          <DialogDescription>O que a equipe lança no dia desta turma. As outras turmas não mudam.</DialogDescription>
        </DialogHeader>
        {aberto && classId !== null && <Corpo key={classId} classId={classId} onFechar={onFechar} />}
      </DialogContent>
    </Dialog>
  );
}

function Corpo({ classId, onFechar }: { classId: number; onFechar: () => void }) {
  const consulta = useBlocosDaTurma(classId);
  if (consulta.isLoading) return <Skeleton className="h-64 w-full rounded-xl" />;
  if (consulta.isError || !consulta.data) {
    return <ErroDeCarga texto="Não foi possível carregar os blocos da turma." onTentar={() => consulta.refetch()} />;
  }
  return <Formulario classId={classId} inicial={consulta.data} onFechar={onFechar} />;
}

function Formulario({ classId, inicial, onFechar }: { classId: number; inicial: BlocosDaTurma; onFechar: () => void }) {
  const [blocos, setBlocos] = useState(inicial);
  const [erro, setErro] = useState<string | null>(null);
  const salvar = useSalvarBlocosDaTurma();

  async function gravar() {
    setErro(null);
    try {
      await salvar.mutateAsync({ classId, dados: blocos });
      toast.success("Blocos da turma salvos.");
      onFechar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível salvar os blocos da turma.");
    }
  }

  return (
    <>
      <ul className="flex flex-col divide-y divide-border">
        {LINHAS.map((l) => {
          const desligadaPeloPai = l.filhoDe ? !blocos[l.filhoDe] : false;
          const id = `bloco-${l.campo}`;
          return (
            <li key={l.campo} className="flex items-center gap-3 py-2.5">
              <label htmlFor={id} className={l.filhoDe ? "min-w-0 flex-1 pl-4" : "min-w-0 flex-1"}>
                <span className="block text-sm font-medium">{l.rotulo}</span>
                {l.dica && <span className="block text-xs text-muted-foreground">{l.dica}</span>}
              </label>
              <Switch
                id={id}
                checked={blocos[l.campo] && !desligadaPeloPai}
                disabled={desligadaPeloPai || salvar.isPending}
                onCheckedChange={(v) => setBlocos((b) => ({ ...b, [l.campo]: v }))}
              />
            </li>
          );
        })}
      </ul>

      {erro && (
        <p role="alert" className="text-sm text-destructive">
          {erro}
        </p>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onFechar} disabled={salvar.isPending}>
          Cancelar
        </Button>
        <Button type="button" onClick={() => void gravar()} disabled={salvar.isPending}>
          {salvar.isPending ? "Salvando..." : "Salvar"}
        </Button>
      </DialogFooter>
    </>
  );
}
