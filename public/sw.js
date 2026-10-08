/*
 * Service worker do EducaPilot: recebe o push e abre a tela certa ao tocar na notificação.
 *
 * Não guarda nada em cache nem intercepta requisições (sem "fetch"): o site continua funcionando
 * como antes, e este arquivo só existe para o navegador acordar a página quando chega um aviso,
 * uma atividade ou uma mensagem do chat.
 *
 * O servidor manda um JSON com { titulo, corpo, url, tag }. Os nomes em inglês (title, body)
 * também são aceitos. Sem JSON (ou com texto puro), a notificação usa o texto como corpo.
 *
 * Serve em HTTPS (produção) e em http://localhost (desenvolvimento): o navegador não registra
 * service worker em HTTP de outro endereço.
 */

const ICONE = "/icon-192.png";

self.addEventListener("install", () => {
  // Assume o lugar da versão anterior sem esperar as abas fecharem.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

function lerPayload(event) {
  if (!event.data) return {};
  try {
    return event.data.json() || {};
  } catch {
    return { corpo: event.data.text() };
  }
}

self.addEventListener("push", (event) => {
  const dados = lerPayload(event);
  const titulo = dados.titulo || dados.title || "EducaPilot";
  const opcoes = {
    body: dados.corpo || dados.body || dados.mensagem || "",
    icon: dados.icone || ICONE,
    badge: dados.badge || ICONE,
    // Mesma tag substitui a notificação anterior (uma conversa não vira dez avisos na bandeja).
    tag: dados.tag || undefined,
    renotify: Boolean(dados.tag),
    data: { url: dados.url || "/" },
  };

  event.waitUntil(self.registration.showNotification(titulo, opcoes));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const destino = new URL((event.notification.data && event.notification.data.url) || "/", self.location.origin);
  // Só abre endereços do próprio site: o payload vem do servidor, mas a regra é barata.
  if (destino.origin !== self.location.origin) return;

  event.waitUntil(
    (async () => {
      const abas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });

      // Já tem uma aba do sistema aberta: leva ela para a tela e traz para a frente.
      for (const aba of abas) {
        if (new URL(aba.url).origin !== self.location.origin) continue;
        try {
          if ("navigate" in aba) await aba.navigate(destino.href);
        } catch {
          // navegador que não deixa navegar a aba: cai no openWindow
          continue;
        }
        return aba.focus();
      }

      return self.clients.openWindow(destino.href);
    })()
  );
});
