import { redirect } from "next/navigation";

// A mensalidade passou a morar na aba Recorrente de Cobranças (2026-10). A rota antiga fica de
// pé porque está em favorito, em e-mail e nos atalhos do Início.
export default function MensalidadesRedirect() {
  redirect("/relacionamento/pagamentos?aba=recorrente");
}
