import { redirect } from "next/navigation";

// Mensalidades passou para Relacionamento > Pagamentos > Cobranças > Recorrente (2026-10): quem
// cobra a família é quem atende a família. A rota antiga fica de pé porque está em favorito, em
// e-mail e em anotação.
export default function MensalidadesRedirect() {
  redirect("/relacionamento/pagamentos?aba=recorrente");
}
