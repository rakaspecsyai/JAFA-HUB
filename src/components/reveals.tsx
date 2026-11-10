"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

export function Reveals() {
  const path = usePathname();
  const router = useRouter();
  useEffect(() => {
    const hash = location.hash;
    if (hash.startsWith("#/")) {
      const target = hash.slice(1);
      if (/^\/(?:informasi(?:\/(?:penilai-pemerintah|penata-laksana-barang|pelelang))?|insight(?:\/[a-z0-9-]+)?|artikel(?:\/[a-z0-9-]+)?|simulasi|regulasi|tentang|kontak|privasi|faq)?$/.test(target)) router.replace(target.replace(/^\/artikel/, "/insight"));
    }
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const elements = document.querySelectorAll<HTMLElement>("[data-reveal]");
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) {
        const el = entry.target as HTMLElement;
        el.animate([{ opacity: .15, transform: "translateY(22px)" }, { opacity: 1, transform: "translateY(0)" }], { duration: 650, delay: Number(el.dataset.reveal ?? 0), easing: "cubic-bezier(.2,.65,.2,1)", fill: "backwards" });
        observer.unobserve(el);
      }
    }, { threshold: .1 });
    elements.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [path, router]);
  return null;
}
