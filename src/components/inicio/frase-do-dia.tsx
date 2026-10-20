import { fraseDoDia } from "@/lib/inicio/frase-do-dia";

/**
 * A frase do dia, discreta, logo abaixo da saudação. Muda uma vez por dia (data de Brasília) e é
 * a mesma em qualquer recarga — ver lib/inicio/frase-do-dia. Texto puro: sem imagem, sem rede.
 */
export function FraseDoDia({ agora }: { agora: Date }) {
  const frase = fraseDoDia(agora);
  if (!frase) return null;

  return (
    <p
      aria-label="Frase do dia"
      className="-mt-2 max-w-[620px] border-l-2 border-border pl-3 text-[14px] leading-[1.55] text-muted-foreground italic"
    >
      {frase}
    </p>
  );
}
