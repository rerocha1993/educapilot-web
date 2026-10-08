import type { Metadata } from "next";

// Tela pública do QR da recepção: o endereço leva um token secreto, então nada de indexar nem de
// mandar o endereço como referência para outros sites.
export const metadata: Metadata = {
  title: "QR da recepção",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function QrDaRecepcaoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
