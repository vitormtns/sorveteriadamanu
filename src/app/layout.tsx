import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "@/components/store-provider";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = {
  title: "Sorveteria da Manu | Pedidos",
  description: "Controle interno de pedidos e pagamentos",
};

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className={jakarta.variable}>
        <StoreProvider><AppShell>{children}</AppShell></StoreProvider>
      </body>
    </html>
  );
}
