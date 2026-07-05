"use client";

import { getImageProps } from "next/image";
import { useEffect, useRef } from "react";

export function InteractiveHeroVisual() {
  const rootRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | null>(null);
  const current = useRef({ x: 0, y: 0 });
  const target = useRef({ x: 0, y: 0 });
  const desktopImage = getImageProps({
    src: "/landing/hero-acai.png",
    alt: "",
    fill: true,
    priority: true,
    sizes: "100vw",
  }).props;
  const mobileImage = getImageProps({
    src: "/landing/hero-acai-mobile.png",
    alt: "",
    fill: true,
    priority: true,
    sizes: "100vw",
  }).props;

  useEffect(() => {
    const root = rootRef.current;
    const hero = root?.parentElement;
    if (!root || !hero || matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const render = () => {
      current.current.x += (target.current.x - current.current.x) * 0.075;
      current.current.y += (target.current.y - current.current.y) * 0.075;
      root.style.setProperty("--hero-x", current.current.x.toFixed(3));
      root.style.setProperty("--hero-y", current.current.y.toFixed(3));
      const moving = Math.abs(target.current.x - current.current.x) > 0.002 || Math.abs(target.current.y - current.current.y) > 0.002;
      frameRef.current = moving ? requestAnimationFrame(render) : null;
    };

    const startRender = () => {
      if (frameRef.current === null) frameRef.current = requestAnimationFrame(render);
    };

    const handleMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      const rect = hero.getBoundingClientRect();
      target.current.x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      target.current.y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
      startRender();
    };

    const handleLeave = () => {
      target.current = { x: 0, y: 0 };
      startRender();
    };

    hero.addEventListener("pointermove", handleMove);
    hero.addEventListener("pointerleave", handleLeave);
    return () => {
      hero.removeEventListener("pointermove", handleMove);
      hero.removeEventListener("pointerleave", handleLeave);
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  return (
    <div ref={rootRef} className="interactive-hero" aria-hidden="true">
      <div className="interactive-hero__atmosphere">
        <span className="interactive-hero__glow interactive-hero__glow--pink" />
        <span className="interactive-hero__glow interactive-hero__glow--gold" />
      </div>
      <div className="interactive-hero__product">
        <picture>
          <source media="(max-width: 767px)" srcSet={mobileImage.srcSet} />
          <img {...desktopImage} alt="" className="object-cover object-[68%_center]" />
        </picture>
      </div>
      <div className="interactive-hero__glass" />
    </div>
  );
}
