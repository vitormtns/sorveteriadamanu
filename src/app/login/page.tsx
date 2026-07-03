"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Input } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true); setError("");
    const supabase = createClient();
    if (supabase) {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) { setError("E-mail ou senha inválidos."); setLoading(false); return; }
    }
    router.push("/");
  }

  return <main className="grid min-h-screen place-items-center bg-[var(--purple-dark)] p-4">
    <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
      <div className="mb-7 text-center"><div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[var(--yellow)] text-3xl">🍨</div><h1 className="mt-4 text-2xl font-black text-[var(--purple-dark)]">Sorveteria da Manu</h1><p className="mt-1 text-sm text-slate-500">Entre para gerenciar os pedidos</p></div>
      <form className="grid gap-4" onSubmit={submit}>
        <Field label="E-mail"><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" /></Field>
        <Field label="Senha"><Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Digite sua senha" /></Field>
        {error && <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
        <Button className="mt-2 w-full" disabled={loading}>{loading ? "Entrando..." : "Entrar"}</Button>
      </form>
      {!process.env.NEXT_PUBLIC_SUPABASE_URL && <p className="mt-5 text-center text-xs text-slate-400">Modo de demonstração: use qualquer e-mail e senha.</p>}
    </div>
  </main>;
}
