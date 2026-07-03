import type { Metadata } from "next";
import "./globals.css";
import { StoreProvider } from "@/components/store-provider";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = {
  title: "Sorveteria da Manu | Pedidos",
  description: "Controle interno de pedidos e pagamentos",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <StoreProvider><AppShell>{children}</AppShell></StoreProvider>
      </body>
    </html>
  );
}
