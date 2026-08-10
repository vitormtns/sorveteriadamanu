import type { Metadata } from "next";
import "./globals.css";
import { StoreProvider } from "@/components/store-provider";
import { SiteShell } from "@/components/site-shell";
import { OrdersProvider } from "@/components/orders-provider";

export const metadata: Metadata = {
  title: "Esfiharia da Manu",
  description: "Esfihas preparadas com cuidado para retirada e entrega.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <StoreProvider>
          <OrdersProvider>
            <SiteShell>{children}</SiteShell>
          </OrdersProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
