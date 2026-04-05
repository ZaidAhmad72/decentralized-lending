"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";

/**
 * Fade + slide up on mount. Lightweight, respects prefers-reduced-motion.
 * @param deps - re-run when these change (default: mount only)
 */
export function useFadeUp(deps: unknown[] = []) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Respect accessibility preference
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    gsap.fromTo(
      el,
      { opacity: 0, y: 18 },
      { opacity: 1, y: 0, duration: 0.45, ease: "power2.out", clearProps: "transform" }
    );
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  return ref;
}

/**
 * Stagger fade-up for a list of children.
 */
export function useStaggerFadeUp(deps: unknown[] = []) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const children = Array.from(el.children) as HTMLElement[];
    gsap.fromTo(
      children,
      { opacity: 0, y: 16 },
      {
        opacity: 1,
        y: 0,
        duration: 0.4,
        ease: "power2.out",
        stagger: 0.07,
        clearProps: "transform",
      }
    );
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  return ref;
}

/**
 * Scale-in animation — good for cards/modals appearing.
 */
export function useScaleIn(deps: unknown[] = []) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    gsap.fromTo(
      el,
      { opacity: 0, scale: 0.96 },
      { opacity: 1, scale: 1, duration: 0.35, ease: "power2.out", clearProps: "transform" }
    );
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  return ref;
}

/**
 * Number counter animation — animates a number from 0 to target.
 */
export function useCountUp(target: number, duration = 1.2, deps: unknown[] = []) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || target === 0) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) { el.textContent = target.toLocaleString("en-IN"); return; }

    const obj = { val: 0 };
    gsap.to(obj, {
      val: target,
      duration,
      ease: "power1.out",
      onUpdate: () => {
        el.textContent = Math.round(obj.val).toLocaleString("en-IN");
      },
    });
  }, [target, ...deps]); // eslint-disable-line react-hooks/exhaustive-deps

  return ref;
}
