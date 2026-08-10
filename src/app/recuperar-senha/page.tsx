"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { Button, Field, Input } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

export default function RecoverPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (loading) return;
    setLoading(true); setError("");
    const client = createClient();
    if (!client) { setError("O serviço de autenticação não está configurado."); setLoading(false); return; }
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || window.location.origin;
    const redirectTo = `${siteUrl}/auth/callback?next=/redefinir-senha`;
    const { error: resetError } = await client.auth.resetPasswordForEmail(email, { redirectTo });
    if (resetError) setError("Não foi possível enviar as instruções agora. Tente novamente.");
    else setSent(true);
    setLoading(false);
  }

  return <main className="grid min-h-screen place-items-center bg-[var(--purple-dark)] p-4">
    <div className="w-full max-w-md rounded-2xl bg-[var(--surface)] p-6 sm:p-8">
      <div className="mb-6 flex justify-center"><BrandLogo compact /></div>
      <h1 className="text-2xl font-bold text-[var(--purple-dark)]">Recuperar senha</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">Informe o e-mail usado no acesso administrativo.</p>
      {sent ? <p className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">Se houver uma conta cadastrada com este e-mail, enviaremos as instruções de recuperação.</p> :
        <form onSubmit={submit} className="mt-5 grid gap-4">
          <Field label="E-mail"><Input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></Field>
          {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <Button disabled={loading}>{loading ? "Enviando..." : "Enviar instruções"}</Button>
        </form>}
      <Link href="/login" className="mt-5 block text-center text-sm font-semibold text-[var(--purple)]">Voltar para o login</Link>
    </div>
  </main>;
}
