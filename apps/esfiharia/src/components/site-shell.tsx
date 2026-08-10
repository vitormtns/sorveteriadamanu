"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardList,
  Home,
  LogOut,
  Menu,
  Settings,
  ShoppingBag,
  X,
} from "lucide-react";
import { ReactNode, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { useStore } from "./store-provider";

const internal = [
  { href: "/sistema", label: "Início", icon: Home },
  { href: "/pedidos", label: "Pedidos", icon: ClipboardList },
  { href: "/produtos", label: "Produtos", icon: ShoppingBag },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];

export function SiteShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const isInternal = internal.some(
    (item) => path === item.href || path.startsWith(`${item.href}/`),
  );
  const { cartCount } = useStore();

  if (isInternal)
    return (
      <div className="admin-layout">
        <aside className={`admin-sidebar ${open ? "open" : ""}`}>
          <div className="brand">
            <span className="brand-mark">M</span>
            <span>
              Esfiharia
              <br />
              <small>da Manu</small>
            </span>
          </div>
          <nav>
            {internal.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={
                  path === href || path.startsWith(`${href}/`) ? "active" : ""
                }
              >
                <Icon size={19} />
                {label}
              </Link>
            ))}
          </nav>
          <button
            className="logout"
            onClick={async () => {
              await createBrowserSupabaseClient()?.auth.signOut();
              location.href = "/login";
            }}
          >
            <LogOut size={18} />
            Sair
          </button>
        </aside>
        <div className="admin-main">
          <header className="admin-top">
            <button aria-label="Abrir menu" onClick={() => setOpen(!open)}>
              {open ? <X /> : <Menu />}
            </button>
            <strong>Operação Esfiharia</strong>
            <span className="status-dot">Store fixa</span>
          </header>
          {children}
        </div>
        <nav className="bottom-nav">
          {internal.slice(0, 4).map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={path === href ? "active" : ""}
            >
              <Icon size={20} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
      </div>
    );

  return (
    <>
      <header className="public-header">
        <Link href="/" className="brand">
          <span className="brand-mark">M</span>
          <span>
            Esfiharia <small>da Manu</small>
          </span>
        </Link>
        <nav>
          <Link href="/">Início</Link>
          <Link href="/delivery">Cardápio</Link>
          <Link href="/login">Entrar</Link>
          <Link href="/delivery" className="cart-link">
            <ShoppingBag size={18} />
            Carrinho {cartCount > 0 && <b>{cartCount}</b>}
          </Link>
        </nav>
      </header>
      {children}
    </>
  );
}
