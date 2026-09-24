"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Store, Loader2, Coffee, ChefHat, ReceiptText } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(
    searchParams.get("inactive") ? "Akun Anda dinonaktifkan. Hubungi admin." : ""
  );
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError("Email atau kata sandi salah.");
      setLoading(false);
      return;
    }
    const next = searchParams.get("next") || "/";
    router.replace(next);
    router.refresh();
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-8">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-600">
          Sistem Kasir
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-900">
          Kasir POS
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Masuk untuk mulai bertransaksi
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Email">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nama@toko.com"
            required
            autoComplete="email"
          />
        </Field>
        <Field label="Kata sandi">
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete="current-password"
          />
        </Field>

        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}

        <Button type="submit" variant="primary" size="lg" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Masuk"}
        </Button>
      </form>

      <p className="mt-6 text-center text-xs text-slate-400">
        Kelola kasir, stok, dan laporan dalam satu tempat.
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen">
      <div className="relative hidden w-1/2 overflow-hidden bg-espresso-950 lg:block">
        <div className="absolute inset-0 opacity-40 [background:radial-gradient(circle_at_20%_20%,rgba(201,90,35,0.35),transparent_50%),radial-gradient(circle_at_80%_80%,rgba(87,66,47,0.5),transparent_55%)]" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-700/40 bg-espresso-800 text-emerald-300">
              <Store className="h-5 w-5" />
            </div>
            <p className="font-display text-xl font-semibold tracking-tight text-slate-100">
              Kasir POS
            </p>
          </div>

          <div className="max-w-md">
            <p className="font-display text-4xl font-medium leading-tight tracking-tight text-slate-100">
              Dari kasir ke pembukuan, satu alur.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-slate-400">
              Layar POS cepat untuk kasir, laporan rapi untuk pemilik. Kafe, resto,
              dan toko berjalan mulus setiap hari.
            </p>
            <div className="mt-8 flex gap-6 text-slate-300">
              <div className="flex items-center gap-2">
                <Coffee className="h-4 w-4 text-emerald-400" />
                <span className="text-sm">Kafe</span>
              </div>
              <div className="flex items-center gap-2">
                <ChefHat className="h-4 w-4 text-emerald-400" />
                <span className="text-sm">Resto</span>
              </div>
              <div className="flex items-center gap-2">
                <ReceiptText className="h-4 w-4 text-emerald-400" />
                <span className="text-sm">Retail</span>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-500">
            © 2026 Kasir POS · Dibuat untuk pelaku usaha kecil
          </p>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center bg-warm-50 px-6 py-12">
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}