"use client";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
export default function RecoverPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    const client = createBrowserSupabaseClient();
    if (!client) {
      setMessage("Supabase não configurado.");
      return;
    }
    await client.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/auth/callback?next=/redefinir-senha`,
    });
    setMessage("Se o e-mail estiver cadastrado, você receberá as instruções.");
  }
  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <h1>Recuperar senha</h1>
        <p className="muted">
          Enviaremos um link seguro para redefinir sua senha.
        </p>
        <div className="field">
          <label htmlFor="email">E-mail</label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        {message && <p className="notice">{message}</p>}
        <button className="btn">Enviar instruções</button>
        <p>
          <Link href="/login" className="muted">
            ← Voltar
          </Link>
        </p>
      </form>
    </main>
  );
}
