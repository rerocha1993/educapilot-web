import type { Metadata, Viewport } from "next";
import { Outfit, Plus_Jakarta_Sans, IBM_Plex_Mono } from "next/font/google";
import { QueryProvider } from "@/lib/query-provider";
import { Toaster } from "@/components/ui/sonner";
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

export const metadata: Metadata = {
  title: "EducaPilot",
  description: "Gestão escolar multi-tenant",
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
          <Toaster />
        </QueryProvider>
      </body>
    </html>
  );
}
