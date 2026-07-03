import { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export function Button({ className = "", variant = "primary", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" | "ghost" }) {
  const styles = {
    primary: "bg-[var(--purple)] text-white hover:bg-[var(--purple-dark)] shadow-sm",
    secondary: "bg-[var(--yellow)] text-[#291447] hover:bg-[#ffd43b]",
    danger: "bg-red-50 text-red-700 hover:bg-red-100",
    ghost: "bg-transparent text-slate-600 hover:bg-slate-100",
  };
  return <button className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`} {...props} />;
}

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-base outline-none transition placeholder:text-slate-400 focus:border-[var(--purple)] focus:ring-4 focus:ring-purple-100 ${className}`} {...props} />;
}

export function Select({ className = "", ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-base outline-none focus:border-[var(--purple)] focus:ring-4 focus:ring-purple-100 ${className}`} {...props} />;
}

export function Textarea({ className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`w-full rounded-xl border border-slate-200 bg-white p-4 text-base outline-none focus:border-[var(--purple)] focus:ring-4 focus:ring-purple-100 ${className}`} {...props} />;
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_4px_24px_rgba(42,21,68,.06)] ${className}`}>{children}</div>;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="grid gap-2 text-sm font-bold text-slate-700"><span>{label}</span>{children}</label>;
}
