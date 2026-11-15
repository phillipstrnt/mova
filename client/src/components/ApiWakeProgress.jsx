import { useApiWakeProgress } from "../api";

const ApiWakeProgress = ({ onRetry, className = "" }) => {
  const wake = useApiWakeProgress();

  if (wake.status === "waking") {
    return (
      <div className={`rounded-xl border border-blue-100 bg-blue-50/80 p-4 ${className}`} role="status" aria-live="polite">
        <div className="mb-2 flex items-center justify-between gap-3 text-sm font-semibold text-slate-800">
          <span>{wake.message || "Connecting to MOVA…"}</span>
          <span className="shrink-0 tabular-nums">About {wake.percentage}%</span>
        </div>
        <div
          className="h-2 overflow-hidden rounded-full bg-blue-100"
          role="progressbar"
          aria-label="Estimated MOVA server startup progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={wake.percentage}
          aria-valuetext={`Estimated startup progress about ${wake.percentage} percent`}
        >
          <div
            className="h-full rounded-full bg-blue-600 transition-[width] duration-500 ease-out"
            style={{ width: `${wake.percentage}%` }}
          />
        </div>
        <p className="mt-2 text-xs leading-5 text-slate-600">
          This is an estimate based on waiting time. The hosting service does not report an exact startup percentage. Please keep this page open; MOVA will continue automatically when ready.
        </p>
      </div>
    );
  }

  if (wake.status === "error") {
    return (
      <div className={`rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 ${className}`} role="alert">
        <p>{wake.message}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 rounded-lg border border-amber-300 bg-white px-3 py-2 font-semibold text-amber-950 transition hover:bg-amber-100"
          >
            Retry connection
          </button>
        )}
      </div>
    );
  }

  return null;
};

export default ApiWakeProgress;
