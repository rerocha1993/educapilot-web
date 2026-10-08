import { redirect } from "next/navigation";

// Os planos recorrentes passaram a morar na aba Recorrente de Cobranças (2026-10). A rota antiga
// fica de pé por causa de favoritos e links salvos.
export default function PlanosRedirect() {
  redirect("/relacionamento/pagamentos?aba=recorrente");
}
