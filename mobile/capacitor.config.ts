import type { CapacitorConfig } from '@capacitor/cli';

// A casca abre o site publicado (modo remoto): cada deploy do front vale na hora, sem nova versão da loja.
// Troque APP_URL pelo endereço de produção antes de publicar nas lojas (ver README.md).
const APP_URL = process.env.APP_URL ?? 'https://educapilot-web-staging.azurewebsites.net/login';
const host = new URL(APP_URL).host;

const config: CapacitorConfig = {
  appId: 'com.educapilot.app',
  appName: 'EducaPilot',
  webDir: 'www',
  server: {
    url: APP_URL,
    // Navegação só dentro do domínio do sistema; links externos (ex.: pagamento do Asaas) abrem no navegador.
    allowNavigation: [host],
    // Tela local mostrada quando o site não abre (sem internet).
    errorPath: 'index.html',
  },
  ios: { contentInset: 'always' },
  plugins: {
    PushNotifications: { presentationOptions: ['badge', 'sound', 'alert'] },
  },
};

export default config;
