"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";

/**
 * Wraps a page with a lightweight fade-in on mount.
 * Use as the outermost div on any page.
 */
export default function PageTransition({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "power1.out" });
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
