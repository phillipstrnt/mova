import { useEffect, useState } from "react";
import { CheckCircle2, Download, Smartphone, X } from "lucide-react";
import { installPWA, isPWAInstalled, subscribeToPWAInstallState } from "../pwa.js";

const isAppleMobile = () => typeof navigator !== "undefined" && (/iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

export default function InstallMovaButton({ className = "" }) {
  const [installed, setInstalled] = useState(() => isPWAInstalled());
  const [installing, setInstalling] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => subscribeToPWAInstallState(({ isInstalled: value }) => {
    setInstalled(value);
    if (value) setShowHelp(false);
  }), []);

  useEffect(() => {
    const handleInstalled = () => { setInstalled(true); setInstalling(false); setShowHelp(false); };
    window.addEventListener("mova:pwa-installed", handleInstalled);
    return () => window.removeEventListener("mova:pwa-installed", handleInstalled);
  }, []);

  const handleInstall = async () => {
    if (installing) return;
    if (isPWAInstalled()) { setInstalled(true); return; }
    setInstalling(true);
    try {
      const result = await installPWA();
      if (result?.success) setInstalled(true);
      else if (result?.outcome === "manual" || result?.outcome === "error") setShowHelp(true);
    } catch {
      setShowHelp(true);
    } finally {
      setInstalling(false);
    }
  };

  return (
    <>
      {installed ? (
        <span className={`inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-700 ${className}`}><CheckCircle2 size={17} /> MOVA installed</span>
      ) : (
        <button type="button" onClick={handleInstall} disabled={installing} className={`inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-bold text-blue-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 disabled:opacity-60 ${className}`}><Download size={17} /> {installing ? "Opening install…" : isAppleMobile() ? "Add MOVA to Home Screen" : "Install MOVA"}</button>
      )}
      {showHelp && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/50 p-3 sm:items-center sm:p-5" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowHelp(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="install-mova-title" className="max-h-[min(85dvh,42rem)] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5">
              <div className="flex items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white"><Smartphone size={21} /></span><div><h2 id="install-mova-title" className="font-bold text-slate-900">{isAppleMobile() ? "Add MOVA to your Home Screen" : "Install MOVA on this device"}</h2><p className="mt-1 text-sm leading-6 text-slate-600">{isAppleMobile() ? "Apple devices install web apps from Safari’s Share menu." : "Use your browser menu to add MOVA to your home screen. It opens in its own app window."}</p></div></div>
              <button type="button" onClick={() => setShowHelp(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close install instructions"><X size={19} /></button>
            </div>
            <div className="grid gap-3 p-5 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 p-4"><h3 className="text-sm font-bold">iPhone or iPad</h3><p className="mt-2 text-xs leading-5 text-slate-600">Open MOVA in Safari, tap the Share button, scroll down and tap Add to Home Screen, then tap Add. Launch MOVA from its new Home Screen icon.</p></div>
              <div className="rounded-xl border border-slate-200 p-4"><h3 className="text-sm font-bold">Android</h3><p className="mt-2 text-xs leading-5 text-slate-600">Open the Chrome menu and choose Install app or Add to Home screen.</p></div>
              <div className="rounded-xl border border-slate-200 p-4"><h3 className="text-sm font-bold">Computer</h3><p className="mt-2 text-xs leading-5 text-slate-600">Select the install icon in the address bar, or choose Install MOVA from the browser menu.</p></div>
            </div>
            <div className="flex justify-end border-t border-slate-100 p-4"><button type="button" onClick={() => setShowHelp(false)} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700">Got it</button></div>
          </section>
        </div>
      )}
    </>
  );
}
