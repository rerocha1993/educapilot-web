import { Camera } from "lucide-react";

import {
  ICONE_DO_TIPO,
  ROTULO_DO_TIPO,
  type TipoDeRegistro,
} from "@/lib/relacionamento/diario-vocabulario";
import type { AlunoDoPainel, BlocosDaTurma, StatusDoDiario } from "@/lib/relacionamento/use-diario";
import { blocoLigado } from "@/lib/relacionamento/use-diario";
import { cn } from "@/lib/utils";

/** "Ana Souza" → "AS". Uma palavra só dá uma letra; vazio dá "?". */
export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0][0].toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

/** O aluno ainda não tem foto de perfil no sistema: o círculo leva as iniciais. */
export function AvatarDoAluno({ nome, className }: { nome: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-full bg-accent text-[12.5px] font-bold text-accent-foreground",
        className
      )}
    >
      {iniciais(nome)}
    </span>
  );
}

const ESTILO_DO_STATUS: Record<StatusDoDiario, { classe: string; rotulo: string }> = {
  SemDiario: { classe: "bg-muted text-muted-foreground", rotulo: "Sem lançamento" },
  Rascunho: { classe: "bg-warning-soft text-warning-soft-foreground", rotulo: "Rascunho" },
  Publicado: { classe: "bg-success-soft text-success-soft-foreground", rotulo: "Publicado" },
};

export function EtiquetaDoDiario({
  status,
  atualizado = false,
  className,
}: {
  status: StatusDoDiario;
  /** Publicado e editado depois. */
  atualizado?: boolean;
  className?: string;
}) {
  const estilo = ESTILO_DO_STATUS[status];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold whitespace-nowrap",
        estilo.classe,
        className
      )}
    >
      {estilo.rotulo}
      {atualizado && status === "Publicado" && <span className="ml-1 font-medium opacity-80">· atualizado</span>}
    </span>
  );
}

/** Os blocos que aparecem como ícone no cartão do aluno, na ordem do dia. */
const BLOCOS_DO_CARTAO: TipoDeRegistro[] = ["Alimentacao", "Sono", "Higiene", "Humor"];

function contagemDo(a: AlunoDoPainel, tipo: TipoDeRegistro): number {
  switch (tipo) {
    case "Alimentacao":
      return a.contagem.alimentacao;
    case "Sono":
      return a.contagem.sono;
    case "Higiene":
      return a.contagem.higiene;
    case "Humor":
      return a.contagem.humor;
    case "Saude":
      return a.contagem.saude;
    case "Reposicao":
      return a.contagem.reposicao;
    default:
      return a.contagem.recado;
  }
}

/**
 * Uma fileira de ícones por aluno: cheio (verde) = já tem lançamento no bloco; vazio (cinza) =
 * falta lançar. Só os blocos que a turma usa entram. Saúde, reposição, recado e fotos só
 * aparecem quando têm algo, para a fileira não crescer à toa. A cor nunca vai sozinha: cada
 * ícone tem texto para leitor de tela.
 */
export function IconesDosBlocos({ aluno, blocos }: { aluno: AlunoDoPainel; blocos: BlocosDaTurma }) {
  const fixos = BLOCOS_DO_CARTAO.filter((t) => blocoLigado(blocos, t));
  const extras = (["Saude", "Reposicao", "Recado"] as TipoDeRegistro[]).filter(
    (t) => blocoLigado(blocos, t) && contagemDo(aluno, t) > 0
  );

  return (
    <ul className="flex flex-wrap items-center gap-1">
      {[...fixos, ...extras].map((tipo) => {
        const n = contagemDo(aluno, tipo);
        const Icone = ICONE_DO_TIPO[tipo];
        return (
          <li
            key={tipo}
            className={cn(
              "grid size-6 place-items-center rounded-md",
              n > 0 ? "bg-success-soft text-success-soft-foreground" : "bg-muted text-muted-foreground/60"
            )}
          >
            <Icone aria-hidden className="size-3.5" />
            <span className="sr-only">
              {ROTULO_DO_TIPO[tipo]}: {n > 0 ? (n === 1 ? "1 registro" : `${n} registros`) : "pendente"}
            </span>
          </li>
        );
      })}
      {aluno.fotos > 0 && (
        <li className="inline-flex h-6 items-center gap-0.5 rounded-md bg-success-soft px-1 text-[11px] font-semibold text-success-soft-foreground tabular-nums">
          <Camera aria-hidden className="size-3.5" />
          {aluno.fotos}
          <span className="sr-only">{aluno.fotos === 1 ? " foto" : " fotos"}</span>
        </li>
      )}
    </ul>
  );
}

/** "15/10" a partir de "2026-10-15". */
export function diaEMesCurto(iso: string): string {
  const [, mes, dia] = iso.slice(0, 10).split("-");
  return mes && dia ? `${dia}/${mes}` : iso;
}

/** Quinta, Sex... a partir de "2026-10-15" (meio-dia local evita escorregar de dia). */
export function diaDaSemanaCurto(iso: string): string {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  return d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
}

/** "2026-10-15" ± `dias`, sem passar por UTC. */
export function somarDias(iso: string, dias: number): string {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  d.setDate(d.getDate() + dias);
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}

/** "HH:mm" do instante local, para o botão "agora". */
export function horaAgora(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
