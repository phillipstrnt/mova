import { useEffect, useRef, useState } from "react";
import { Camera, X } from "lucide-react";

export default function BarcodeScanner({ onDetected, onClose }) {
  const videoRef = useRef(null);
  const onDetectedRef = useRef(onDetected);
  const onCloseRef = useRef(onClose);
  onDetectedRef.current = onDetected;
  onCloseRef.current = onClose;
  const [error, setError] = useState("");

  useEffect(() => {
    let stream;
    let timer;
    let stopped = false;

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Camera access is not available in this browser. You can still scan with a hardware scanner or type the barcode.");
        return;
      }
      if (!("BarcodeDetector" in window)) {
        setError("This browser does not support built-in barcode scanning. Try Chrome or Edge, or type the product code.");
        return;
      }
      try {
        const detector = new window.BarcodeDetector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "qr_code"] });
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
        if (stopped) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        const scan = async () => {
          if (stopped || !videoRef.current || videoRef.current.readyState < 2) return;
          try {
            const results = await detector.detect(videoRef.current);
            const value = results.find((result) => result.rawValue)?.rawValue;
            if (value) {
              onDetectedRef.current(value);
              onCloseRef.current();
              return;
            }
          } catch {
            setError("Could not read that code. Keep it inside the camera frame and try again.");
          }
          timer = window.setTimeout(scan, 180);
        };
        scan();
      } catch (cameraError) {
        setError(cameraError?.name === "NotAllowedError" ? "Allow camera access in your browser to scan products." : "Unable to start the camera. Check that another app is not using it.");
      }
    };

    start();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
      stream?.getTracks().forEach((track) => track.stop());
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
        <div className="p-4 text-sm text-slate-600">Point the rear camera at a product barcode or QR code. The product will be added when the code is recognized.</div>
        {error && <div className="mx-4 mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{error}</div>}
      </div>
    </div>
  );
}
