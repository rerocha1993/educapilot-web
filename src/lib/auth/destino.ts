/**
 * Para onde cada perfil vai depois de entrar. Um lugar só, usado pelo login e (quando entrarem) pelo
 * toque numa notificação e pelos links diretos do app.
 *
 * Responsável não usa o sistema da equipe: tem o portal dele, feito para o celular. A equipe
 * (professor, secretaria, administração) começa sempre pelo Início, que já mostra o que cada perfil
 * enxerga conforme os módulos e permissões da escola.
 */
export function destinoDoPerfil(role: string | null | undefined): string {
  return role === "Responsavel" ? "/responsavel" : "/inicio";
}
