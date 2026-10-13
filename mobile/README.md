# EducaPilot Mobile (Android e iOS)

Casca nativa em **Capacitor 8** que abre o site já publicado. Não há cópia das telas aqui: cada deploy do `educapilot-web` vale na hora no app. O código do app só muda ao trocar plugin, permissão ou configuração nativa.

- Identificador: `com.educapilot.app` (não muda depois de publicado).
- Endereço aberto: `APP_URL` (variável) em `capacitor.config.ts`. Hoje aponta para o **staging** com a escola demo; trocar para produção antes das lojas.
- Plano completo: `../../APP-MOVEL-PASSO-A-PASSO.md` e `../../APP-MOVEL-REQUISITOS.md`.

## Estrutura
| Pasta/arquivo | O que é |
|---|---|
| `capacitor.config.ts` | Configuração (nome, endereço, navegação permitida, push) |
| `www/index.html` | Tela local "Sem conexão" |
| `config-nativa/` | `google-services.json` (Android) e `GoogleService-Info.plist` (iOS), do projeto Firebase `educapilot-app`. Não são segredo |
| `android/` | Projeto Android Studio |
| `ios/` | Projeto Xcode (Swift Package Manager, sem CocoaPods) |

**Nunca no GitHub:** chave de conta de serviço do Firebase, `.p8` da Apple, `.jks`/`.keystore`, certificados. O `.gitignore` já bloqueia os formatos.

## Android (no PC com Windows)
1. Instalar o **Android Studio**. Em *More Actions › SDK Manager*: marcar **Android 16 (API 36)** e, em SDK Tools, *Android SDK Build-Tools*, *Platform-Tools* e *Android Emulator*. Aceitar as licenças pedidas.
2. *Device Manager › Create device*: Pixel 8 (ou similar) com a imagem **API 36** (Google Play).
3. No terminal, dentro de `educapilot-web/mobile`:
   ```bash
   npm install
   npx cap sync
   npx cap open android
   ```
4. No Android Studio, esperar o Gradle sincronizar, escolher o emulador e clicar em **Run**.

O emulador não serve para testar localização em segundo plano nem push em fabricantes diferentes; para isso, um celular real.

## iOS (no Mac)
1. Instalar **Xcode 26** (App Store) e **Node 22+**. Aceitar a licença: `sudo xcodebuild -license accept`.
2. Puxar o repositório e rodar dentro de `educapilot-web/mobile`:
   ```bash
   npm install
   npx cap sync ios
   npx cap open ios
   ```
3. No Xcode, projeto **App › Signing & Capabilities**: escolher o *Team* da conta Apple Developer e manter o Bundle Identifier `com.educapilot.app`.
4. Arrastar `config-nativa/GoogleService-Info.plist` para dentro da pasta **App** no Xcode (marcar *Copy items if needed* e o target App).
5. Em *Signing & Capabilities*, **+ Capability**: *Push Notifications* e *Background Modes* (marcar *Remote notifications*; *Location updates* só quando entrar a chegada automática).
6. Rodar no simulador (*Run*). Push e localização em segundo plano só funcionam em **iPhone real**.

## Quando mudar algo
- Mudou o endereço do site, plugin ou configuração: `npx cap sync`.
- Mudou só uma tela do site: nada aqui; basta publicar o `educapilot-web`.

## Pendente (ver o passo a passo)
Ícone e tela de abertura, biometria, câmera, deep links, push nativo ponta a ponta, chegada automática e as telas do professor no celular.
