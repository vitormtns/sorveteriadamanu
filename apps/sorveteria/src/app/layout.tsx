import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "@/components/store-provider";
import { OrdersProvider } from "@/components/orders-provider";
import { AppShell } from "@/components/app-shell";
import {
  getStorefrontPublicError,
  loadPublicStorefront,
} from "@/data/storefront";
import type { StorefrontData, StorefrontPublicError } from "@/lib/storefront";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sorveteria da Manu | Pedidos",
  description: "Controle interno de pedidos e pagamentos",
};

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { initialData, initialError } = await getInitialStorefront();

  return (
    <html lang="pt-BR">
      <body className={jakarta.variable}>
        <StoreProvider initialData={initialData} initialError={initialError}>
          <OrdersProvider>
            <AppShell>{children}</AppShell>
          </OrdersProvider>
        </StoreProvider>
      </body>
    </html>
  );
}

async function getInitialStorefront(): Promise<{
  initialData?: StorefrontData;
  initialError?: StorefrontPublicError;
}> {
  const browserSupabaseMissing =
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (process.env.NODE_ENV === "development" && browserSupabaseMissing) {
    return {};
  }

  try {
    return { initialData: await loadPublicStorefront() };
  } catch (error) {
    return { initialError: getStorefrontPublicError(error) };
  }
}
