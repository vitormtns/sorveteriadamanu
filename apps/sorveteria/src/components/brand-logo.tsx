"use client";

import Image from "next/image";
import { useState } from "react";

export function BrandLogo({ compact = false, light = false }: { compact?: boolean; light?: boolean }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <div className={`relative grid shrink-0 place-items-center overflow-hidden bg-white font-bold tracking-[-0.04em] ${compact ? "h-9 w-9 rounded-lg text-[11px]" : "h-11 w-11 rounded-[10px] text-xs"} ${light ? "ring-1 ring-white/20 text-[var(--purple)]" : "border border-[#ead8b5] text-[var(--purple)]"}`}>
        {!loaded && <span>SM</span>}
        {!failed && <Image src="/logo/logo-sorveteria.png" alt="Logo da Sorveteria da Manu" fill sizes={compact ? "36px" : "44px"} className={`object-cover transition-opacity ${loaded ? "opacity-100" : "opacity-0"}`} onLoad={() => setLoaded(true)} onError={() => setFailed(true)} />}
      </div>
      {!compact && <div className="min-w-0"><p className={`truncate text-[11px] font-medium leading-tight ${light ? "text-slate-400" : "text-[var(--muted)]"}`}>Sorveteria da</p><p className={`truncate text-sm font-semibold leading-tight ${light ? "text-white" : "text-[var(--text)]"}`}>Manu</p></div>}
    </div>
  );
}
