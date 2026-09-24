import { redirect } from "next/navigation";

// Ver o comentário em ../page.tsx: a tela mudou de endereço, a rota antiga continua respondendo.
export default function ConfiguracaoContratosRedirect() {
  redirect("/admin/contratos/configuracao");
}
