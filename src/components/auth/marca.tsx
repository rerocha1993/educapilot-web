import Image from "next/image";

import { cn } from "@/lib/utils";

/**
 * Marca do EducaPilot nas telas que não passam pelo shell (login, convite, formulário público,
 * área do responsável).
 *
 * É o logo da escola de verdade (`/logo.png`), e não um desenho recriado em CSS: a marca já
 * existe, e uma versão "parecida" só cria duas marcas para manter.
 */
export function MarcaEducaPilot({ className }: { className?: string }) {
  return (
    <Image
      src="/logo.png"
      alt="EducaPilot"
      width={156}
      height={123}
      className={cn("h-13 w-auto", className)}
      priority
    />
  );
}
