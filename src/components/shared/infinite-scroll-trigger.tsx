"use client";

import { useEffect, useRef } from "react";

interface InfiniteScrollTriggerProps {
  onTrigger: () => void;
  hasMore: boolean;
  isLoading: boolean;
}

export function InfiniteScrollTrigger({ onTrigger, hasMore, isLoading }: InfiniteScrollTriggerProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasMore || isLoading) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          onTrigger();
        }
      },
      { threshold: 0.1 }
    );

    const el = ref.current;
    if (el) observer.observe(el);

    return () => {
      if (el) observer.unobserve(el);
    };
  }, [onTrigger, hasMore, isLoading]);

  if (!hasMore) return null;

  return <div ref={ref} className="h-10" />;
}
