import { redirect } from "next/navigation";

// Contratos passou para Administração (2026-09): é documento da escola, não uma função do
// construtor de formulários.
//
// A rota antiga fica de pé, como /settings: ela viveu meses no menu e está em favorito, em
// e-mail e em anotação de secretaria — um 404 não diz para onde ir.
export default function ContratosRedirect() {
  redirect("/admin/contratos");
}
