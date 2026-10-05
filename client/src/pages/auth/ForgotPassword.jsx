import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Loader2, Mail } from "lucide-react";

import api from "../../services/api";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setError("Please enter your email address.");
      return;
    }

    setLoading(true);

    try {
      await api.post("/auth/forgot-password", {
        email: cleanEmail,
      });

      /*
       * We intentionally show the same success message whether
       * or not the email exists. This prevents revealing whether
       * an account is registered with a particular email address.
       */
      setSubmitted(true);
    } catch (requestError) {
      console.error(
        "Password recovery request failed:",
        requestError
      );

      /*
       * We still show a generic message instead of exposing
       * account existence or backend details.
       */
      setError(
        "We couldn't process your request right now. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl sm:p-10">

        <Link
          to="/login"
          className="mb-8 inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-blue-600"
        >
          <ArrowLeft size={16} />
          Back to sign in
        </Link>

        {!submitted ? (
          <>
            <div className="mb-8">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <Mail size={25} />
              </div>

              <h1 className="text-3xl font-black text-slate-950">
                Forgot your password?
              </h1>

              <p className="mt-3 leading-7 text-slate-500">
                Enter the email address associated with your
                MOVA account and we'll help you reset your
                password.
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-5"
            >
              <div>
                <label
                  htmlFor="reset-email"
                  className="mb-2 block text-sm font-bold text-slate-700"
                >
                  Email address
                </label>

                <input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  placeholder="you@business.com"
                  autoComplete="email"
                  disabled={loading}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium leading-6 text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-4 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? (
                  <>
                    <Loader2
                      size={18}
                      className="animate-spin"
                    />
                    Sending instructions...
                  </>
                ) : (
                  <>
                    <Mail size={18} />
                    Send reset instructions
                  </>
                )}
              </button>
            </form>

            <p className="mt-7 text-center text-xs leading-5 text-slate-400">
              For your security, we'll never reveal whether
              an email address is registered with MOVA.
            </p>
          </>
        ) : (
          <div className="py-4 text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={32} />
            </div>

            <h1 className="text-3xl font-black text-slate-950">
              Check your email
            </h1>

            <p className="mt-4 leading-7 text-slate-500">
              If an account exists for{" "}
              <span className="font-bold text-slate-700">
                {email}
              </span>
              , we've sent instructions for resetting your
              password.
            </p>

            <p className="mt-4 text-sm leading-6 text-slate-400">
              The reset link will expire after a short period
              for your security. Check your spam or junk folder
              if you don't see the email.
            </p>

            <div className="mt-8 space-y-3">
              <button
                type="button"
                onClick={() => {
                  setSubmitted(false);
                  setEmail("");
                  setError("");
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Try another email
              </button>

              <Link
                to="/login"
                className="block w-full rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-blue-700"
              >
                Back to sign in
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;