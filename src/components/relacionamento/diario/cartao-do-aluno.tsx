"use client";

import { Check, EyeOff } from "lucide-react";

import { AvatarDoAluno, EtiquetaDoDiario, IconesDosBlocos } from "@/components/relacionamento/diario/comum";
import type { AlunoDoPainel, BlocosDaTurma } from "@/lib/relacionamento/use-diario";
import { cn } from "@/lib/utils";

/**
 * O aluno no painel da turma: um cartão pequeno (3 a 5 por linha no computador) com as iniciais,
 * o nome, a situação do diário e os ícones dos blocos. O cartão todo abre o painel do aluno; a
 * caixinha no canto marca para o lançamento rápido. Tem dois botões separados (e não um dentro do
 * outro) para o teclado e o leitor de tela acharem cada um.
 */
export function CartaoDoAluno({
  aluno,
  blocos,
  selecionado,
  onSelecionar,
  onAbrir,
}: {
  aluno: AlunoDoPainel;
  blocos: BlocosDaTurma;
  selecionado: boolean;
  onSelecionar: () => void;
  onAbrir: () => void;
}) {
  const primeiroNome = aluno.nome.split(" ")[0];

  return (
    <li className="relative">
      <button
        type="button"
        onClick={onAbrir}
        aria-label={`Abrir o diário de ${aluno.nome}`}
        className={cn(
          "flex min-h-[88px] w-full flex-col gap-2 rounded-xl border bg-card p-2.5 pr-10 text-left transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
          selecionado ? "border-primary bg-accent/50 ring-1 ring-primary" : "border-border hover:border-primary/40 hover:bg-muted/40"
        )}
      >
        <span className="flex items-center gap-2">
          <AvatarDoAluno nome={aluno.nome} />
          <span className="min-w-0 flex-1">
            <span className="block text-[13.5px] leading-tight font-semibold break-words">{aluno.nome}</span>
            <span className="mt-0.5 flex flex-wrap items-center gap-1">
              <EtiquetaDoDiario status={aluno.status} atualizado={aluno.atualizado} />
              {aluno.status === "Publicado" && aluno.lido && (
                <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-success-soft-foreground">
                  <Check aria-hidden className="size-3" /> lido
                </span>
              )}
            </span>
          </span>
        </span>

        <span className="flex items-center justify-between gap-2">
          <IconesDosBlocos aluno={aluno} blocos={blocos} />
          {blocos.fotos && aluno.autorizaUsoDeImagem !== true && (
            <span title={`${primeiroNome} não tem autorização de uso de imagem: sem fotos`} className="text-muted-foreground">
              <EyeOff aria-hidden className="size-3.5" />
              <span className="sr-only">Sem autorização de uso de imagem</span>
            </span>
          )}
        </span>
      </button>

      <button
        type="button"
        role="checkbox"
        aria-checked={selecionado}
        aria-label={`Selecionar ${aluno.nome} para o lançamento rápido`}
        onClick={onSelecionar}
        className={cn(
          "absolute top-1.5 right-1.5 grid size-8 place-items-center rounded-lg focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
          "after:absolute after:-inset-1.5"
        )}
      >
        <span
          aria-hidden
          className={cn(
            "grid size-[18px] place-items-center rounded-[5px] border transition-colors",
            selecionado ? "border-primary bg-primary text-primary-foreground" : "border-input bg-card"
          )}
        >
          {selecionado && <Check className="size-3.5" />}
        </span>
      </button>
    </li>
  );
}

