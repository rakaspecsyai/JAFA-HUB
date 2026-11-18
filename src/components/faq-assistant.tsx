"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { safeUrl } from "@/lib/content-types";
import type { RagResult } from "@/lib/rag";
import { Icon } from "./icon";
import { Markdown } from "./markdown";
import p from "./portal.module.css";
import s from "./faq-assistant.module.css";

type Choice = { id: string; title: string };
type Answer = { id: string; revisionId: string; title: string; answer: string; sources: { title: string; url: string }[]; links: { label: string; href: string }[] };
type Message = { user?: string; faq?: Answer; rag?: RagResult; choices?: Choice[]; fallback?: boolean };
function RagMessage({ result }: { result: RagResult }) {
  return <>
    <small>AI beta · Periksa sumber jawaban</small>
    {result.type === "answer" ? <>
      <p className={s.aiAnswer}>{result.answer}</p>
      <div className={s.sources}>{result.sources.filter(source => safeUrl(source.url, false)).map(source =>
        <details key={source.id} className={s.citation}>
          <summary>{source.regulationStatus === "amended" ? "Diubah" : "Berlaku"} · {source.title} · Halaman PDF {source.pageNumber}</summary>
          <p>{source.statusNote}</p><blockquote>{source.quote}</blockquote>
          <a href={safeUrl(source.url, false)!} target="_blank" rel="noopener noreferrer">Sumber resmi · {source.number} ({source.year})</a>
        </details>
      )}</div>
    </> : <>
      <p>{result.message}</p>
      <div className={s.sources}><Link href="/faq">Lihat semua FAQ</Link><Link href="/kontak">Kontak pengelola</Link></div>
    </>}
  </>;
}
export function FaqAssistant() {
  const dialog = useRef<HTMLDialogElement>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const sequence = useRef(0);
  const [topics, setTopics] = useState<Choice[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [ragAvailable, setRagAvailable] = useState(false);
  const [mode, setMode] = useState<"faq" | "ai">("faq");
  useEffect(() => { setReady(true); }, []);
  function openAssistant() {
    dialog.current?.showModal();
    void fetch("/api/rag").then(response => response.ok ? response.json() : null).catch(() => null).then(result => {
      const available = result?.enabled === true;
      setRagAvailable(available);
      if (!available) setMode("faq");
    });
    if (!topics.length && !pending) void request({});
  }
  async function request(data: { question?: string; id?: string }, label?: string) {
    const id = ++sequence.current;
    const ai = mode === "ai" && !!data.question;
    setPending(true); setError("");
    try {
      const response = await fetch(ai ? "/api/rag" : "/api/faq/match", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const result = await response.json();
      if (sequence.current !== id) return;
      if (!response.ok) throw new Error(result.error ?? "Jawaban belum dapat dimuat.");
      if (result.type === "topics") setTopics(result.choices);
      else {
        setMessages(current => [...current, ...(label ? [{ user: label }] : []), { rag: ai ? result : undefined, faq: ai ? undefined : result.faq, choices: result.type === "choices" ? result.choices : undefined, fallback: !ai && result.type === "fallback" }]);
        setQuestion("");
      }
      setTimeout(() => bottom.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }), 30);
    } catch (e) { if (sequence.current === id) setError(e instanceof Error ? e.message : "Koneksi terganggu. Coba kembali."); }
    finally { if (sequence.current === id) { setPending(false); input.current?.focus(); } }
  }
  return <>
    <button type="button" className={p.iconButton} aria-label="Buka asisten FAQ Jafa Hub" title="Asisten Jafa Hub" disabled={!ready} onClick={openAssistant}><Icon name="chat-circle-dots" /></button>
    <dialog ref={dialog} className={s.panel} aria-labelledby="assistant-title" onClick={e => { if (e.target === e.currentTarget) dialog.current?.close(); }}>
      <div className={s.head}><div><h2 id="assistant-title">Asisten Jafa Hub</h2><p>{mode === "ai" ? "AI beta · Peraturan bersumber" : "Jawaban dari FAQ terkurasi"}</p></div><div><button type="button" title="Reset percakapan" aria-label="Reset percakapan" onClick={() => { sequence.current++; setMessages([]); setError(""); setQuestion(""); setPending(false); input.current?.focus(); }}><Icon name="arrow-counter-clockwise" /></button><button type="button" aria-label="Tutup asisten" onClick={() => dialog.current?.close()}><Icon name="x" /></button></div></div>
      {ragAvailable && <label className={s.mode}>Sumber jawaban<select value={mode} disabled={pending} onChange={event => { setMode(event.target.value as "faq" | "ai"); setError(""); }}><option value="faq">FAQ terkurasi</option><option value="ai">AI beta · Sumber peraturan</option></select></label>}
      <div className={s.body} role="region" aria-label="Percakapan FAQ" tabIndex={0}>
        <div className={s.welcome}><strong>Ada yang ingin Anda pahami?</strong><p>Saya membantu menemukan jawaban seputar jabatan fungsional, regulasi, dan Angka Kredit.</p><small>{mode === "ai" ? "AI beta menyusun jawaban dari peraturan yang disetujui. Ajukan pertanyaan lengkap; periksa kutipan dan status peraturan sebelum mengambil keputusan." : "Asisten ini menggunakan jawaban terkurasi. Jawaban baru tidak dibuat oleh AI."}</small></div>
        {!messages.length && mode === "faq" && <div className={s.topics}>{topics.map(t => <button key={t.id} disabled={pending} onClick={() => void request({ id: t.id }, t.title)}>{t.title}</button>)}</div>}
        <div role="log" aria-label="Riwayat percakapan FAQ" aria-live="polite">{messages.map((m, i) => <div key={i} className={`${s.message} ${m.user ? s.user : ""}`}>
          {m.user ?? (m.rag ? <RagMessage result={m.rag} /> : m.faq ? <><small>FAQ terkurasi</small><Markdown text={m.faq.answer} /><div className={s.sources}>{m.faq.sources.filter(source => safeUrl(source.url, false)).map((source, n) => <a key={n} href={safeUrl(source.url, false)!} target="_blank" rel="noopener noreferrer">{source.title}</a>)}{m.faq.links.filter(l => safeUrl(l.href)).map((l, n) => <a key={`l${n}`} href={safeUrl(l.href)!}>{l.label}</a>)}</div></> : m.choices ? <><p>Beberapa FAQ sesuai dengan pertanyaan Anda. Pilih yang ingin dibaca:</p><div className={s.topics}>{m.choices.map(c => <button key={c.id} disabled={pending} onClick={() => void request({ id: c.id }, c.title)}>{c.title}</button>)}</div></> : <><p>Belum ada jawaban terkurasi yang cocok. Coba kata kunci lebih singkat atau telusuri halaman berikut.</p><div className={s.sources}><Link href="/faq">Lihat semua FAQ</Link><Link href="/pencarian">Pencarian portal</Link><Link href="/kontak">Kontak pengelola</Link></div></>)}
        </div>)}</div>
        {pending && <p className={s.loading} role="status">{mode === "ai" ? "Menyiapkan jawaban bersumber…" : "Mencari jawaban terkurasi…"}</p>}<div ref={bottom} />
      </div>
      <form className={s.form} onSubmit={e => { e.preventDefault(); if (question.trim() && !pending) void request({ question: question.trim() }, question.trim()); }}>
        <div className={s.inputRow}><label className="sr-only" htmlFor="faq-question">Pertanyaan Anda</label><input ref={input} id="faq-question" value={question} maxLength={500} onChange={e => setQuestion(e.target.value)} placeholder="Ketik topik atau pertanyaan…" autoComplete="off" aria-describedby={error ? "faq-help faq-error" : "faq-help"} /><button className={s.send} type="submit" disabled={pending || !question.trim()} aria-label="Kirim pertanyaan"><Icon name="paper-plane-tilt" /></button></div>
        {error && <p id="faq-error" role="alert" className={s.error}>{error}</p>}<small id="faq-help">{mode === "ai" && <>Pertanyaan dan konteks sumber dikirim ke OpenAI. </>}Jangan masukkan data pribadi. Riwayat hanya berada di tab ini.{mode === "ai" && <> <Link href="/privasi">Kebijakan privasi</Link>.</>}</small>
      </form>
    </dialog>
  </>;
}
