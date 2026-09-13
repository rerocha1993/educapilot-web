import { useEffect, useState } from "react";

/** O valor, só depois de parar de mudar por `ms`. Evita uma busca por tecla digitada. */
export function useAtrasado<T>(valor: T, ms: number): T {
  const [atrasado, setAtrasado] = useState(valor);

  useEffect(() => {
    const timer = setTimeout(() => setAtrasado(valor), ms);
    return () => clearTimeout(timer);
  }, [valor, ms]);

  return atrasado;
}
