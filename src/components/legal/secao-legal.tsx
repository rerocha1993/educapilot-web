import type { ReactNode } from "react";

/** Bloco de texto das páginas públicas de privacidade e de exclusão de conta. */
export function SecaoLegal({ titulo, id, children }: { titulo: string; id?: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6 space-y-3">
      <h2 className="font-heading text-xl font-semibold text-foreground">{titulo}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-foreground/85 [&_a]:text-primary [&_a]:underline [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_ul]:space-y-2">
        {children}
      </div>
    </section>
  );
}
