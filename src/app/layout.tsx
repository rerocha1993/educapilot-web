import type { Metadata, Viewport } from "next";
import { Outfit, Plus_Jakarta_Sans, IBM_Plex_Mono } from "next/font/google";
import { QueryProvider } from "@/lib/query-provider";
import { Toaster } from "@/components/ui/sonner";
import { SessaoNativa } from "@/components/nativo/sessao-nativa";
import { URL_DO_SITE } from "@/lib/seo/site";
import "./globals.css";

// Tipografia da direção visual 2026-09 (entrega "EducaPilot Sistema"): títulos em Outfit,
// corpo em Plus Jakarta Sans, todo número em IBM Plex Mono com tabular-nums.
const fontHeading = Outfit({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const fontBody = Plus_Jakarta_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const fontMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

// As telas do sistema não entram no Google (robots noindex aqui, no layout raiz). As páginas públicas
// (/privacidade) liberam a indexação na própria metadata; o site institucional na raiz é um HTML
// estático (public/site) com as próprias tags.
export const metadata: Metadata = {
  metadataBase: new URL(URL_DO_SITE),
  title: { default: "EducaPilot", template: "%s · EducaPilot" },
  description: "Sistema de gestão escolar: chamada, rematrícula com contrato assinado, financeiro, portaria e eventos.",
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: "EducaPilot", statusBarStyle: "default" },
};

// viewportFit "cover": instalado no iPhone, o app ocupa a tela toda e a barra de baixo respeita a
// área do gesto (env(safe-area-inset-bottom)).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#F7F6F3",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${fontHeading.variable} ${fontBody.variable} ${fontMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <QueryProvider>
          {children}
          <SessaoNativa />
          <Toaster />
        </QueryProvider>
      </body>
    </html>
  );
}
