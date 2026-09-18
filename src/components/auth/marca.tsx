import { cn } from "@/lib/utils";

/**
 * Marca da entrega 2026-09: quadrado em gradiente roxo→laranja com o "E" e a palavra
 * "Educa" + "Pilot" em laranja. Mesmo desenho do topo da sidebar (app-shell), repetido
 * aqui porque as telas públicas não passam pelo shell.
 */
export function MarcaEducaPilot({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center justify-center gap-2.5", className)}>
      <span
        aria-hidden
        className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-[linear-gradient(145deg,#6E5AA8,#F5851F)] font-heading text-base font-bold text-white shadow-[0_6px_16px_-8px_rgba(245,133,31,.9)]"
      >
        E
      </span>
      <span className="font-heading text-[19px] font-semibold tracking-[-.01em] text-foreground">
        Educa<span className="text-action-brand">Pilot</span>
      </span>
    </span>
  );
}
