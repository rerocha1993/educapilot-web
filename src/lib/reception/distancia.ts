const km = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** "350 m" até 1 km; daí em diante "1,2 km". Metro quebrado não ajuda ninguém na portaria. */
export function formatarDistancia(metros: number | null | undefined): string {
  if (metros == null) return "—";
  if (metros < 1000) return `${Math.round(metros / 10) * 10} m`;
  return `${km.format(metros / 1000)} km`;
}

/** Distância em metros entre dois pontos (haversine) — só para decidir se vale reenviar a posição. */
export function metrosEntre(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const r = 6371000;
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(a));
}
