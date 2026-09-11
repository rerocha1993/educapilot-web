import { redirect } from "next/navigation";
import { ADMIN_HREF } from "@/lib/kernel/nav-items";

// /settings existia no menu mas nunca teve página: clicar dava 404 direto.
//
// Redireciona em vez de simplesmente sumir porque o link ficou meses no menu — quem salvou o
// favorito ou decorou a URL continua chegando aqui, e um 404 não diz para onde ir.
export default function SettingsRedirect() {
  redirect(ADMIN_HREF);
}
