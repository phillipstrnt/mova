import { useEffect, useState } from "react";
import { Clock3, Loader2 } from "lucide-react";
import api from "../../services/api";

const formatUGX = (value) => new Intl.NumberFormat("en-UG", { style: "currency", currency: "UGX", maximumFractionDigits: 0 }).format(Number(value || 0));

export default function CashierShiftClock({ isOnline }) {
  const [shift, setShift] = useState(null);
  const [openingFloat, setOpeningFloat] = useState("");
  const [declaredCash, setDeclaredCash] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [closedSummary, setClosedSummary] = useState(null);

  const load = async () => {
    try {
      const response = await api.get("/shifts/sessions/current");
      setShift(response.data?.shift || null);
    } catch (requestError) {
      if (requestError?.response?.status !== 403) setError(requestError?.response?.data?.message || "Unable to load the cash drawer shift.");
    }
  };

  useEffect(() => { load(); }, []);

  const start = async (event) => {
    event.preventDefault();
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await api.post("/shifts/sessions/start", { openingFloat: Number(openingFloat || 0) });
      setShift(response.data?.shift || null);
      setOpeningFloat("");
      setMessage("Cash drawer shift started. Opening float recorded.");
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError.message || "Unable to start shift.");
    } finally { setBusy(false); }
  };

  const close = async (event) => {
    event.preventDefault();
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await api.post(`/shifts/sessions/${shift._id}/end`, { declaredCash: Number(declaredCash) });
      setClosedSummary(response.data?.shift || null);
      setShift(null);
      setDeclaredCash("");
      setMessage("Shift closed. Drawer variance has been recorded.");
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError.message || "Unable to close shift.");
    } finally { setBusy(false); }
  };

  return (
    <section className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900"><Clock3 size={17} /> Cash drawer shift</h2>
          <p className="mt-1 text-xs text-slate-500">Record your opening float and reconcile the drawer at shift end.</p>
          {shift && <p className="mt-2 text-xs font-medium text-emerald-700">Shift open since {new Date(shift.startedAt).toLocaleTimeString("en-UG", { hour: "2-digit", minute: "2-digit" })}. Opening float: {formatUGX(shift.openingFloat)}.</p>}
          {closedSummary && <p className={`mt-2 text-xs font-semibold ${Number(closedSummary.variance) === 0 ? "text-emerald-700" : "text-amber-700"}`}>Last close: expected {formatUGX(closedSummary.expectedCash)}, counted {formatUGX(closedSummary.declaredCash)}, variance {formatUGX(closedSummary.variance)}.</p>}
          {message && <p className="mt-2 text-xs text-emerald-700">{message}</p>}
          {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
        </div>
        {!shift ? (
          <form onSubmit={start} className="flex flex-wrap items-end gap-2">
            <label className="text-xs font-medium text-slate-600">Opening float
              <input type="number" min="0" step="1" value={openingFloat} onChange={(event) => setOpeningFloat(event.target.value)} placeholder="UGX 0" className="mt-1 block w-36 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </label>
            <button disabled={!isOnline || busy} className="inline-flex h-9 items-center gap-2 rounded-lg bg-slate-900 px-3 text-xs font-semibold text-white disabled:opacity-50">{busy && <Loader2 size={14} className="animate-spin" />} Start shift</button>
          </form>
        ) : (
          <form onSubmit={close} className="flex flex-wrap items-end gap-2">
            <label className="text-xs font-medium text-slate-600">Cash counted at close
              <input required type="number" min="0" step="1" value={declaredCash} onChange={(event) => setDeclaredCash(event.target.value)} placeholder="Enter drawer total" className="mt-1 block w-40 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </label>
            <button disabled={!isOnline || busy} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 disabled:opacity-50">{busy && <Loader2 size={14} className="animate-spin" />} End & reconcile</button>
          </form>
        )}
      </div>
      {!isOnline && <p className="mt-2 text-xs text-amber-700">Shift start and close require a connection; keep the POS open and sync queued sales when online.</p>}
    </section>
  );
}
