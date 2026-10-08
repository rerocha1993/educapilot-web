import { redirect } from "next/navigation";

// Inadimplência passou para Relacionamento > Pagamentos (2026-10), junto com as mensalidades. A
// rota antiga fica de pé porque está em favorito, em e-mail e em anotação.
export default function InadimplenciaRedirect() {
  redirect("/relacionamento/pagamentos/inadimplencia");
}
