import { useEffect, useState } from "react";

/** O valor, mas só depois de `ms` sem mudar: a busca por texto não dispara uma chamada por tecla. */
export function useAtraso<T>(valor: T, ms = 300): T {
  const [atrasado, setAtrasado] = useState(valor);

  useEffect(() => {
    const t = setTimeout(() => setAtrasado(valor), ms);
    return () => clearTimeout(t);
  }, [valor, ms]);

  return atrasado;
}
