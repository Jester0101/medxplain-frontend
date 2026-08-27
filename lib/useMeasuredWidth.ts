"use client";

import { useEffect, useRef, useState } from "react";

export function useMeasuredWidth<T extends HTMLElement>(fallback = 640) {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(fallback);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect.width;
      if (next) setWidth((current) => (Math.abs(next - current) > 0.5 ? next : current));
    });
    observer.observe(el);
    setWidth(el.clientWidth || fallback);
    return () => observer.disconnect();
  }, [fallback]);

  return { ref, width };
}
