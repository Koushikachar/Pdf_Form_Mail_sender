"use client";

import { useEffect, useState, FormEvent } from "react";

type ViewState =
  | { status: "checking" }
  | { status: "form" }
  | { status: "submitting" }
  | { status: "success"; emailSent: boolean }
  | { status: "already" }
  | { status: "error"; message: string };

const STORAGE_KEY = "doc-request-submitted-email";

export default function Page() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [view, setView] = useState<ViewState>({ status: "checking" });

  // On load: if this browser already submitted, or the email on record
  // already exists server-side, skip straight to the "already filled" view.
  useEffect(() => {
    const savedEmail = localStorage.getItem(STORAGE_KEY);
    if (!savedEmail) {
      setView({ status: "form" });
      return;
    }
    fetch(`/api/submit?email=${encodeURIComponent(savedEmail)}`)
      .then((r) => r.json())
      .then((data) => {
        setView(data.alreadySubmitted ? { status: "already" } : { status: "form" });
      })
      .catch(() => setView({ status: "form" }));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setView({ status: "submitting" });
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      const data = await res.json();

      if (res.status === 409 && data.alreadySubmitted) {
        localStorage.setItem(STORAGE_KEY, email);
        setView({ status: "already" });
        return;
      }
      if (!res.ok) {
        setView({ status: "error", message: data.error || "Something went wrong." });
        return;
      }
      localStorage.setItem(STORAGE_KEY, email);
      setView({ status: "success", emailSent: !!data.emailSent });
    } catch {
      setView({ status: "error", message: "Network error. Please try again." });
    }
  }

  return (
    <main className="relative min-h-screen flex items-center justify-center px-6 py-16">
      <Aurora />
      <div className="relative z-10 w-full max-w-md">
        <Card view={view} name={name} email={email} setName={setName} setEmail={setEmail} onSubmit={handleSubmit} />
      </div>
    </main>
  );
}

function Aurora() {
  return (
    <div className="aurora-bg">
      <div
        className="aurora-blob animate-blob"
        style={{
          top: "-10%",
          left: "-10%",
          width: 480,
          height: 480,
          background: "#3E2C6B",
        }}
      />
      <div
        className="aurora-blob animate-blob"
        style={{
          top: "10%",
          right: "-15%",
          width: 420,
          height: 420,
          background: "#2FBF9F",
          animationDelay: "-4s",
        }}
      />
      <div
        className="aurora-blob animate-blob"
        style={{
          bottom: "-15%",
          left: "20%",
          width: 460,
          height: 460,
          background: "#D9B65E",
          opacity: 0.25,
          animationDelay: "-8s",
        }}
      />
    </div>
  );
}

function DocIcon() {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M10 4h14l6 6v24a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"
        stroke="#D9B65E"
        strokeWidth="1.6"
        fill="none"
      />
      <path d="M24 4v6h6" stroke="#D9B65E" strokeWidth="1.6" fill="none" />
      <path d="M13 20h14M13 25h14M13 30h9" stroke="#D9B65E" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function Card({
  view,
  name,
  email,
  setName,
  setEmail,
  onSubmit,
}: {
  view: ViewState;
  name: string;
  email: string;
  setName: (v: string) => void;
  setEmail: (v: string) => void;
  onSubmit: (e: FormEvent) => void;
}) {
  const base =
    "rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-xl shadow-[0_8px_40px_rgba(0,0,0,0.35)] p-8 sm:p-10";

  if (view.status === "checking") {
    return (
      <div className={`${base} animate-fade-in-up`}>
        <p className="text-sm text-slate-400">Loading…</p>
      </div>
    );
  }

  if (view.status === "already") {
    return (
      <div className={`${base} animate-fade-in-up text-center`}>
        <div className="mx-auto mb-5 w-fit">
          <DocIcon />
        </div>
        <h1 className="font-serif text-2xl text-slate-50 mb-2">You've already sent this</h1>
        <p className="text-slate-300 text-[15px] leading-relaxed">
          This link only works once per person. If you didn't receive the document, check your
          spam folder or reach out to the sender directly.
        </p>
      </div>
    );
  }

  if (view.status === "success") {
    return (
      <div className={`${base} animate-fade-in-up text-center`}>
        <div className="mx-auto mb-5 w-fit">
          <DocIcon />
        </div>
        <h1 className="font-serif text-2xl text-slate-50 mb-2">On its way</h1>
        <p className="text-slate-300 text-[15px] leading-relaxed">
          {view.emailSent
            ? "Your document has been sent — check your inbox in the next few minutes."
            : "Your details were received. We hit a snag sending the email, so the sender will follow up directly."}
        </p>
      </div>
    );
  }

  return (
    <div className={base}>
      <div className="mb-8">
        <DocIcon />
        <h1 className="font-serif text-3xl italic text-slate-50 mt-4 mb-2 leading-tight">
          Request your document
        </h1>
        <p className="text-slate-400 text-[15px]">
          Leave your name and email — we'll send the file straight over.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-5">
        <Field
          label="Name"
          id="name"
          type="text"
          value={name}
          onChange={setName}
          placeholder="Jordan Blake"
          autoComplete="name"
        />
        <Field
          label="Email"
          id="email"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="jordan@gmail.com"
          autoComplete="email"
        />

        {view.status === "error" && (
          <p className="text-sm text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
            {view.message}
          </p>
        )}

        <button
          type="submit"
          disabled={view.status === "submitting"}
          className="w-full rounded-lg bg-[#D9B65E] text-[#1a1508] font-medium text-[15px] py-3
                     transition-colors hover:bg-[#e6c979] focus:outline-none focus-visible:ring-2
                     focus-visible:ring-[#D9B65E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b1220]
                     disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {view.status === "submitting" ? "Sending…" : "Send me the document"}
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  id,
  type,
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  label: string;
  id: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  autoComplete: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm text-slate-300 mb-1.5">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        required
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg bg-black/25 border border-white/10 px-3.5 py-2.5 text-[15px]
                   text-slate-50 placeholder:text-slate-500 outline-none transition-colors
                   focus:border-[#D9B65E]/60 focus:ring-1 focus:ring-[#D9B65E]/40"
      />
    </div>
  );
}
