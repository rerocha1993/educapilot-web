const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatarMoeda(valor: number): string {
  return moeda.format(valor);
}

/** "350 m" até 1 km; "1,2 km" depois. */
export function formatarDistancia(metros: number | null | undefined): string {
  if (metros == null) return "—";
  if (metros < 1000) return `${Math.round(metros)} m`;
  return `${(metros / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km`;
}
