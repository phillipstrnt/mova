import { useEffect, useRef, useState } from "react";
import { Camera, X } from "lucide-react";
import { BrowserMultiFormatReader } from "@zxing/browser";

export default function BarcodeScanner({ onDetected, onClose }) {
  const videoRef = useRef(null);
  const onDetectedRef = useRef(onDetected);
  const onCloseRef = useRef(onClose);
  const controlsRef = useRef(null);
  onDetectedRef.current = onDetected;
  onCloseRef.current = onClose;
  const [error, setError] = useState("");

  useEffect(() => {
    let stopped = false;

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Camera access is not available in this browser. You can still scan with a hardware scanner or type the barcode.");
        return;
      }
      try {
        const reader = new BrowserMultiFormatReader();
        const controls = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } }, audio: false },
          videoRef.current,
          (result) => {
            const value = result?.getText?.();
            if (!value || stopped) return;
            stopped = true;
            onDetectedRef.current(value);
            onCloseRef.current();
          }
        );
        if (stopped) controls.stop();
        else controlsRef.current = controls;
      } catch (cameraError) {
        const message = cameraError?.name === "NotAllowedError"
          ? "Allow camera access in your browser to scan products."
          : cameraError?.name === "NotFoundError"
            ? "No camera was found. You can still use a hardware scanner or type the barcode."
            : "Unable to start the camera. Check permissions and make sure another app is not using it.";
        setError(message);
      }
    };

    start();
    return () => {
      stopped = true;
      controlsRef.current?.stop();
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-4" role="dialog" aria-modal="true" aria-label="Scan product barcode">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 p-4">
          <div className="flex items-center gap-2 font-semibold text-slate-900"><Camera size={19} /> Scan a product</div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close scanner"><X size={19} /></button>
        </div>
        <div className="bg-black">
          <video ref={videoRef} className="aspect-video w-full object-cover" playsInline muted />
        </div>
        <div className="p-4 text-sm text-slate-600">Point your phone’s rear camera at the barcode and hold steady. You can also connect an inexpensive USB or Bluetooth scanner, or type the code.</div>
        {error && <div className="mx-4 mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{error}</div>}
      </div>
    </div>
  );
}
