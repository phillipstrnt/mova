import { useEffect, useRef, useState } from "react";

const GOOGLE_SCRIPT = "https://accounts.google.com/gsi/client";

const getDisplayProfile = (credential) => {
  try {
    const encoded = credential.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const binary = window.atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, "="));
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const payload = JSON.parse(new TextDecoder().decode(bytes));
    return {
      name: payload.name || payload.given_name || "",
      email: payload.email || "",
      picture: payload.picture || "",
    };
  } catch {
    return {};
  }
};

const GoogleSignInButton = ({ onCredential, disabled = false }) => {
  const buttonRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [setupError, setSetupError] = useState("");
  const clientId =
    import.meta.env.VITE_GOOGLE_CLIENT_ID || window.__MOVA_CONFIG__?.googleClientId;

  useEffect(() => {
    if (!clientId) {
      setSetupError("Google sign-in will be available after setup is completed.");
      return undefined;
    }

    let cancelled = false;
    const renderButton = () => {
      if (cancelled || !window.google?.accounts?.id || !buttonRef.current) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: ({ credential }) => {
          if (credential && !disabled) onCredential(credential, getDisplayProfile(credential));
        },
        auto_select: false,
        cancel_on_tap_outside: true,
      });
      buttonRef.current.replaceChildren();
      window.google.accounts.id.renderButton(buttonRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        shape: "rectangular",
        text: "continue_with",
        width: Math.max(240, Math.min(buttonRef.current.clientWidth || 360, 420)),
        logo_alignment: "left",
      });
      setReady(true);
    };

    if (window.google?.accounts?.id) {
      renderButton();
      return () => { cancelled = true; };
    }

    let script = document.querySelector(`script[src="${GOOGLE_SCRIPT}"]`);
    if (!script) {
      script = document.createElement("script");
      script.src = GOOGLE_SCRIPT;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
    script.addEventListener("load", renderButton);
    script.addEventListener("error", () => {
      if (!cancelled) setSetupError("Google could not load. Check your connection and try again.");
    });

    return () => {
      cancelled = true;
      script.removeEventListener("load", renderButton);
    };
  }, [clientId, disabled, onCredential]);

  if (!clientId) {
    return (
      <div>
        <button type="button" disabled className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-500 opacity-75">
          <GoogleMark /> Continue with Google
        </button>
        <p className="mt-2 text-center text-xs text-slate-500">{setupError}</p>
      </div>
    );
  }

  return (
    <div className={disabled ? "pointer-events-none opacity-60" : ""}>
      {!ready && (
        <button type="button" disabled className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
          <GoogleMark /> Loading Google sign-in…
        </button>
      )}
      <div ref={buttonRef} className={!ready ? "sr-only" : "flex min-h-11 w-full justify-center"} />
      {setupError && <p className="mt-2 text-center text-xs text-red-600">{setupError}</p>}
    </div>
  );
};

const GoogleMark = () => (
  <svg aria-hidden="true" viewBox="0 0 48 48" className="h-5 w-5">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z" transform="translate(0 4)" />
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.72 7.18l7.62 5.91c4.45-4.11 7.14-10.16 7.14-17.56Z" />
    <path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.75-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.55 2.56 10.78l7.97-6.19Z" transform="translate(0 0)" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.89l-7.62-5.91c-2.12 1.42-4.83 2.27-8.28 2.27-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 40.62 14.62 48 24 48Z" />
  </svg>
);

export default GoogleSignInButton;
