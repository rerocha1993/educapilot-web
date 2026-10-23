import type { CapacitorConfig } from '@capacitor/cli';

// A casca abre o site publicado (modo remoto): cada deploy do front vale na hora, sem nova versão da loja.
// APP_URL pode ser trocado por variável de ambiente (ex.: apontar para um staging) ao rodar `cap sync`.
const APP_URL = process.env.APP_URL ?? 'https://educa-pilot.com/login';
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
