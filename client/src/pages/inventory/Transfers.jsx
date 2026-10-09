import { useEffect, useState } from "react";
import { ArrowLeftRight, Check, Loader2, RefreshCw, Send, X } from "lucide-react";
import api from "../../services/api";

const statusStyle = {
  REQUESTED: "bg-amber-100 text-amber-800",
  PROCESSING: "bg-blue-100 text-blue-800",
  APPROVED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-red-100 text-red-800",
};

export default function Transfers() {
  const [branches, setBranches] = useState([]);
  const [products, setProducts] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [sourceBranchId, setSourceBranchId] = useState("");
  const [destinationBranchId, setDestinationBranchId] = useState("");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [branchResponse, productResponse, transferResponse] = await Promise.all([
        api.get("/branches"),
        api.get("/products?limit=100&status=active"),
        api.get("/inventory-transfers"),
      ]);
      const branchList = branchResponse.data?.branches || branchResponse.data?.data || [];
      const productList = productResponse.data?.products || [];
      setBranches(Array.isArray(branchList) ? branchList : []);
      setProducts(Array.isArray(productList) ? productList : []);
      setTransfers(Array.isArray(transferResponse.data?.transfers) ? transferResponse.data.transfers : []);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Unable to load branch transfers.");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setMessage(""); setError("");
    try {
      const response = await api.post("/inventory-transfers", {
        sourceBranchId,
        destinationBranchId,
        items: [{ productId, quantity: Number(quantity) }],
        notes,
      });
      setMessage(response.data?.message || "Transfer request submitted.");
      setProductId(""); setQuantity(1); setNotes("");
      await load();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Unable to submit the transfer request.");
    } finally { setBusy(false); }
  };

  const review = async (transfer, status) => {
    setBusy(true); setMessage(""); setError("");
    try {
      const response = await api.patch(`/inventory-transfers/${transfer._id}/review`, { status });
      setMessage(response.data?.message || `Transfer ${status.toLowerCase()}.`);
      await load();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Unable to review this request.");
    } finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold text-slate-900">Branch stock transfers</h1><p className="mt-1 text-sm text-slate-500">Request movement between store locations, then approve to update both stock balances.</p></div>
        <button type="button" onClick={load} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold"><RefreshCw size={16} /> Refresh</button>
      </div>
      {message && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</div>}
      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}

      <form onSubmit={submit} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-2 xl:grid-cols-5">
        <label className="text-xs font-semibold text-slate-600">From branch<select required value={sourceBranchId} onChange={(event) => setSourceBranchId(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-sm"><option value="">Select source</option>{branches.map((branch) => <option key={branch._id} value={branch._id}>{branch.name}</option>)}</select></label>
        <label className="text-xs font-semibold text-slate-600">To branch<select required value={destinationBranchId} onChange={(event) => setDestinationBranchId(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-sm"><option value="">Select destination</option>{branches.map((branch) => <option key={branch._id} value={branch._id}>{branch.name}</option>)}</select></label>
        <label className="text-xs font-semibold text-slate-600 xl:col-span-2">Product<select required value={productId} onChange={(event) => setProductId(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-sm"><option value="">Select product</option>{products.map((product) => <option key={product._id} value={product._id}>{product.name} · {product.sku}</option>)}</select></label>
        <label className="text-xs font-semibold text-slate-600">Quantity<input required type="number" min="1" step="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-sm" /></label>
        <label className="text-xs font-semibold text-slate-600 md:col-span-2 xl:col-span-4">Request note<input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional reason for transfer" className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-sm" /></label>
        <button disabled={busy} className="inline-flex items-center justify-center gap-2 self-end rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Request transfer</button>
      </form>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-100 p-4"><ArrowLeftRight size={18} /><h2 className="font-bold text-slate-900">Recent requests</h2></div>
        {loading ? <div className="p-8 text-center text-sm text-slate-500">Loading transfers…</div> : transfers.length === 0 ? <div className="p-8 text-center text-sm text-slate-500">No branch transfer requests yet.</div> : (
          <div className="divide-y divide-slate-100">
            {transfers.map((transfer) => (
              <article key={transfer._id} className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-slate-900">{transfer.sourceBranchId?.name || "Source"} → {transfer.destinationBranchId?.name || "Destination"}</p><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${statusStyle[transfer.status] || "bg-slate-100 text-slate-700"}`}>{transfer.status}</span></div>
                  <p className="mt-1 text-sm text-slate-600">{(transfer.items || []).map((item) => `${item.name} × ${item.quantity}`).join(" · ")}</p>
                  <p className="mt-1 text-xs text-slate-400">Requested by {transfer.requestedBy?.name || "staff"} · {new Date(transfer.createdAt).toLocaleString("en-UG")}</p>
                  {transfer.notes && <p className="mt-1 text-xs text-slate-500">{transfer.notes}</p>}
                </div>
                {transfer.status === "REQUESTED" && <div className="flex gap-2"><button disabled={busy} onClick={() => review(transfer, "APPROVED")} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"><Check size={15} /> Approve</button><button disabled={busy} onClick={() => review(transfer, "REJECTED")} className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 disabled:opacity-50"><X size={15} /> Reject</button></div>}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
