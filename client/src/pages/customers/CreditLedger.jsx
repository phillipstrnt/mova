import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, Banknote, CalendarClock, CheckCircle2, LoaderCircle, Phone, RefreshCw, Search, X } from "lucide-react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";

const money = (amount) => new Intl.NumberFormat("en-UG", { style: "currency", currency: "UGX", maximumFractionDigits: 0 }).format(Number(amount) || 0);
const asId = (value) => String(value?._id || value?.id || value || "");

export default function CreditLedger() {
  const { user } = useAuth();
  const [debts, setDebts] = useState([]);
  const [summary, setSummary] = useState({ balance: 0, overdueBalance: 0, count: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [selectedDebt, setSelectedDebt] = useState(null);
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [reference, setReference] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  const loadDebts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/customers/credit-ledger");
      setDebts(data?.debts || []);
      setSummary(data?.summary || { balance: 0, overdueBalance: 0, count: 0 });
    } catch (loadError) {
      setError(loadError?.response?.data?.message || "Could not load outstanding customer credit.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadDebts(); }, [loadDebts]);

  const visibleDebts = useMemo(() => debts.filter((debt) => {
    const overdue = debt.dueDate && new Date(debt.dueDate).getTime() < Date.now();
    if (filter === "OVERDUE" && !overdue) return false;
    const text = [debt.customerId?.name, debt.customerId?.phone, debt.customerId?.email, debt.saleId?.receiptNumber, debt.branchId?.name].join(" ").toLowerCase();
    return text.includes(search.trim().toLowerCase());
  }), [debts, filter, search]);

  const startPayment = (debt) => {
    setSelectedDebt(debt);
    setAmount(String(Number(debt.remainingBalance || 0)));
    setPaymentMethod("CASH");
    setReference("");
    setNotice("");
  };

  const submitPayment = async (event) => {
    event.preventDefault();
    if (!selectedDebt) return;
    const customerId = asId(selectedDebt.customerId);
    if (!customerId) { setNotice("This credit record has no linked customer. Please ask a manager to review it."); return; }
    setSaving(true);
    setNotice("");
    try {
      const { data } = await api.post(`/customers/${customerId}/credit-payments`, { amount: Number(amount), paymentMethod, reference });
      setSelectedDebt(null);
      setNotice(data?.message || "Payment recorded and applied to the oldest outstanding credit.");
      await loadDebts();
    } catch (paymentError) {
      setNotice(paymentError?.response?.data?.message || "Payment could not be recorded. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  const canTakePayment = user?.role === "OWNER" || user?.permissions?.includes("payments.create");

  return <main className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-sm font-semibold text-blue-700">Customers</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Credit customers</h1><p className="mt-1 text-sm text-slate-600">See who owes the business, which sale is unpaid, and when payment is due.</p></div>
      <button type="button" onClick={loadDebts} disabled={loading} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><RefreshCw size={16} className={loading ? "animate-spin" : ""} />Refresh</button>
    </header>

    <section className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Outstanding balance</p><p className="mt-2 text-xl font-bold text-slate-900">{money(summary.balance)}</p></div>
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Overdue balance</p><p className="mt-2 text-xl font-bold text-amber-950">{money(summary.overdueBalance)}</p></div>
      <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Unpaid credit sales</p><p className="mt-2 text-xl font-bold text-slate-900">{summary.count || 0}</p></div>
    </section>

    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative block w-full sm:max-w-sm"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search customer, phone or receipt" className="h-10 w-full rounded-lg border border-slate-300 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
        <div className="flex gap-2"><button onClick={() => setFilter("ALL")} className={`min-h-10 rounded-lg px-3 text-sm font-semibold ${filter === "ALL" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}>All open</button><button onClick={() => setFilter("OVERDUE")} className={`min-h-10 rounded-lg px-3 text-sm font-semibold ${filter === "OVERDUE" ? "bg-amber-700 text-white" : "bg-amber-50 text-amber-900"}`}>Overdue</button></div>
      </div>
      {error && <div className="m-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"><AlertCircle size={17} className="mt-0.5 shrink-0" />{error}</div>}
      {loading ? <div className="flex items-center justify-center gap-2 p-12 text-sm text-slate-500"><LoaderCircle className="animate-spin" size={18} />Loading credit records…</div> : visibleDebts.length ? <div className="divide-y divide-slate-100">{visibleDebts.map((debt) => {
        const customer = debt.customerId || {};
        const due = debt.dueDate ? new Date(debt.dueDate) : null;
        const overdue = due && due.getTime() < Date.now();
        return <article key={debt._id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="truncate font-semibold text-slate-900">{customer.name || "Unknown customer"}</h2><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${overdue ? "bg-red-100 text-red-800" : "bg-blue-50 text-blue-800"}`}>{overdue ? "Overdue" : "Open"}</span></div><div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500"><span className="inline-flex items-center gap-1"><Phone size={13} />{customer.phone || "No phone recorded"}</span><span>Receipt {debt.saleId?.receiptNumber || "—"}</span><span>{debt.branchId?.name || "Branch"}</span><span className="inline-flex items-center gap-1"><CalendarClock size={13} />Due {due ? due.toLocaleDateString() : "Not set"}</span></div><p className="mt-2 text-xs text-slate-500">Issued {debt.createdAt ? new Date(debt.createdAt).toLocaleDateString() : "—"} · Original {money(debt.originalAmount)} · Paid {money(debt.paidAmount)}</p></div>
          <div className="flex items-center justify-between gap-4 sm:justify-end"><div className="sm:text-right"><p className="text-xs text-slate-500">Still owed</p><p className="text-lg font-bold text-slate-900">{money(debt.remainingBalance)}</p></div>{canTakePayment && <button onClick={() => startPayment(debt)} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-blue-700 px-3 text-sm font-semibold text-white hover:bg-blue-800"><Banknote size={16} />Record payment</button>}</div>
        </article>;
      })}</div> : <div className="p-10 text-center"><CheckCircle2 size={28} className="mx-auto text-emerald-600" /><h2 className="mt-3 font-semibold text-slate-900">{search || filter === "OVERDUE" ? "No matching credit records" : "No outstanding customer credit"}</h2><p className="mt-1 text-sm text-slate-500">{search || filter === "OVERDUE" ? "Try another search or switch to all open credit." : "Credit sales will appear here automatically when recorded at the POS."}</p></div>}
    </section>

    {selectedDebt && <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setSelectedDebt(null); }}><form onSubmit={submitPayment} className="w-full max-w-md space-y-4 rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl"><div className="flex items-start justify-between"><div><h2 className="text-lg font-bold text-slate-900">Record credit payment</h2><p className="mt-1 text-sm text-slate-600">{selectedDebt.customerId?.name || "Customer"} · owes {money(selectedDebt.remainingBalance)}</p></div><button type="button" onClick={() => setSelectedDebt(null)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close"><X size={18} /></button></div><label className="block text-sm font-medium text-slate-700">Amount<input type="number" min="1" max={Number(selectedDebt.remainingBalance || 0)} step="1" required value={amount} onChange={(event) => setAmount(event.target.value)} className="mt-1 h-11 w-full rounded-lg border border-slate-300 px-3" /></label><label className="block text-sm font-medium text-slate-700">Payment method<select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} className="mt-1 h-11 w-full rounded-lg border border-slate-300 px-3"><option value="CASH">Cash</option><option value="MOBILE_MONEY">Mobile Money</option><option value="BANK">Bank transfer</option><option value="CARD">Card</option></select></label><label className="block text-sm font-medium text-slate-700">Reference (optional)<input value={reference} onChange={(event) => setReference(event.target.value)} maxLength={120} placeholder="Receipt or transaction reference" className="mt-1 h-11 w-full rounded-lg border border-slate-300 px-3" /></label>{notice && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{notice}</p>}<button disabled={saving || Number(amount) <= 0 || Number(amount) > Number(selectedDebt.remainingBalance)} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 font-semibold text-white disabled:opacity-50">{saving && <LoaderCircle size={17} className="animate-spin" />}{saving ? "Saving payment…" : "Save payment"}</button></form></div>}
    {notice && !selectedDebt && <div className="fixed bottom-4 right-4 z-50 max-w-sm rounded-lg bg-emerald-800 px-4 py-3 text-sm font-medium text-white shadow-lg">{notice}</div>}
  </main>;
}
