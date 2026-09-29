import { Link } from "react-router-dom";
import { ArrowLeft, Mail } from "lucide-react";

const ForgotPassword = () => {
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl sm:p-10">

        <Link
          to="/login"
          className="mb-8 inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-blue-600"
        >
          <ArrowLeft size={16} />
          Back to sign in
        </Link>

        <div className="mb-8">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <Mail size={25} />
          </div>

          <h1 className="text-3xl font-black text-slate-950">
            Forgot your password?
          </h1>

          <p className="mt-3 leading-7 text-slate-500">
            Enter the email address associated with your MOVA
            account and we'll help you reset your password.
          </p>
        </div>

        <form className="space-y-5">
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
              placeholder="you@business.com"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-blue-600 px-5 py-4 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
          >
            Send reset instructions
          </button>
        </form>

        <p className="mt-7 text-center text-xs leading-5 text-slate-400">
          Password recovery will be connected to the MOVA backend
          when the authentication recovery API is implemented.
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;