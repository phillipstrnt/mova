import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, KeyRound, Loader2, Mail } from "lucide-react";

import api from "../../services/api";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState("");

  const requestCode = async (event) => {
    event.preventDefault();
    setError("");
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError("Enter the email address associated with your MOVA account.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email: cleanEmail });
      setEmail(cleanEmail);
      setCodeSent(true);
    } catch (requestError) {
      console.error("Password recovery request failed:", requestError);
      setError("We couldn't send a verification code right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (event) => {
    event.preventDefault();
    setError("");
    if (!/^\d{6}$/.test(code)) {
      setError("Enter the six-digit verification code from your email.");
      return;
    }
    if (password.length < 8) {
      setError("Your new password must contain at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/reset-password", { email, code, password });
      setComplete(true);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "We couldn't reset your password. Request a new code and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl sm:p-10">
        <Link to="/login" className="mb-8 inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-blue-600">
          <ArrowLeft size={16} /> Back to sign in
        </Link>

        {complete ? (
          <div className="py-4 text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><CheckCircle2 size={32} /></div>
            <h1 className="text-3xl font-black text-slate-950">Password updated</h1>
            <p className="mt-4 leading-7 text-slate-500">Your MOVA password has been reset. You can now sign in with your new password.</p>
            <Link to="/login" className="mt-8 block w-full rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-blue-700">Back to sign in</Link>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">{codeSent ? <KeyRound size={25} /> : <Mail size={25} />}</div>
              <h1 className="text-3xl font-black text-slate-950">{codeSent ? "Enter your email code" : "Forgot your password?"}</h1>
              <p className="mt-3 leading-7 text-slate-500">{codeSent ? <>Enter the six-digit code sent to <strong className="break-all text-slate-700">{email}</strong>, then choose a new password. The code expires in 10 minutes.</> : "Enter the email address associated with your MOVA account and we'll send you a verification code."}</p>
            </div>

            {!codeSent ? (
              <form onSubmit={requestCode} className="space-y-5">
                <div>
                  <label htmlFor="reset-email" className="mb-2 block text-sm font-bold text-slate-700">Email address</label>
                  <input id="reset-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@business.com" autoComplete="email" disabled={loading} required className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-60" />
                </div>
                {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium leading-6 text-red-700">{error}</div>}
                <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-4 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70">
                  {loading ? <><Loader2 size={18} className="animate-spin" /> Sending code...</> : <><Mail size={18} /> Email me a verification code</>}
                </button>
              </form>
            ) : (
              <form onSubmit={resetPassword} className="space-y-5">
                <div>
                  <label htmlFor="reset-code" className="mb-2 block text-sm font-bold text-slate-700">Six-digit verification code</label>
                  <input id="reset-code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" disabled={loading} required className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-center text-xl font-bold tracking-[0.4em] outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 disabled:opacity-60" />
                </div>
                <div>
                  <label htmlFor="new-password" className="mb-2 block text-sm font-bold text-slate-700">New password</label>
                  <input id="new-password" type="password" autoComplete="new-password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" disabled={loading} required className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 disabled:opacity-60" />
                </div>
                <div>
                  <label htmlFor="confirm-password" className="mb-2 block text-sm font-bold text-slate-700">Confirm new password</label>
                  <input id="confirm-password" type="password" autoComplete="new-password" minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Enter the new password again" disabled={loading} required className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 disabled:opacity-60" />
                </div>
                {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium leading-6 text-red-700">{error}</div>}
                <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-4 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70">
                  {loading ? <><Loader2 size={18} className="animate-spin" /> Resetting password...</> : <><KeyRound size={18} /> Reset password</>}
                </button>
                <button type="button" disabled={loading} onClick={() => { setCodeSent(false); setCode(""); setError(""); }} className="w-full text-sm font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-60">Request a new code</button>
              </form>
            )}
            <p className="mt-7 text-center text-xs leading-5 text-slate-400">For your security, MOVA won't reveal whether an email address has an account.</p>
          </>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;

