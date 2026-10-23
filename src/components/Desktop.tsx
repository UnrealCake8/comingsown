import { useEffect, useState } from "react";
import {
  Monitor,
  ArrowUpRight,
  RotateCw,
  Maximize2,
  Minimize2,
  ExternalLink,
  Loader2,
} from "lucide-react";
type Props = {
  vm: number | null;
  active: boolean;
  focused: boolean;
  onFocus: () => void;
  claiming: boolean;
  notice: string;
  onClaim: () => void;
};
export default function Desktop({
  vm,
  active,
  focused,
  onFocus,
  claiming,
  notice,
  onClaim,
}: Props) {
  const url = vm ? "https://vm" + vm + ".asanib.com" : null;
  const [started, setStarted] = useState(active),
    [poppedOut, setPoppedOut] = useState(false),
    [revision, setRevision] = useState(0),
    [loaded, setLoaded] = useState(false),
    [slow, setSlow] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    if (active) setStarted(true);
  }, [active]);
  useEffect(() => {
    if (!started || !url || poppedOut || loaded) return;
    const timer = setTimeout(() => setSlow(true), 15000);
    return () => clearTimeout(timer);
  }, [started, url, poppedOut, loaded, revision]);
  function reconnect() {
    setLoaded(false);
    setSlow(false);
    setError("");
    setRevision((n) => n + 1);
  }
  function popOut() {
    // Open synchronously so browser popup blockers can reliably report failure.
    const next = window.open("about:blank", "mao-pc-" + vm);
    if (!next) {
      setError(
        "Your browser blocked the new tab. Allow pop-ups for Mao, then try again.",
      );
      return;
    }
    try {
      next.opener = null;
      next.location.replace(url!);
      setPoppedOut(true);
      setError("");
    } catch {
      next.close();
      setError("The PC tab could not open. Your desktop is still here.");
    }
  }
  function resume() {
    // The detached tab has no opener, so browsers correctly prevent this page
    // from controlling or closing it. Reconnecting takes the VM session back.
    setPoppedOut(false);
    reconnect();
  }
  return (
    <section className="desktop card" aria-label="Your PC">
      <div className="desktopbar">
        <span>
          <Monitor size={16} />
          <strong>My PC</strong>
          {vm && <small>VM{vm}</small>}
        </span>
        {url && (
          <div className="desktop-actions">
            <button
              onClick={poppedOut ? resume : reconnect}
              title="Reconnect this view without restarting your PC"
            >
              <RotateCw size={15} />
              <span>{poppedOut ? "Resume here" : "Reconnect"}</span>
            </button>
            <button onClick={onFocus} aria-pressed={focused}>
              {focused ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
              <span>{focused ? "Exit focus" : "Focus PC"}</span>
            </button>
            {!poppedOut && (
              <button onClick={popOut}>
                <ArrowUpRight size={15} />
                <span>Open in a new tab</span>
              </button>
            )}
          </div>
        )}
      </div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {!url ? (
        <div className="desktopbody">
          <div className="desktopcontent">
            <Monitor size={44} />
            <h3>All PCs are taken right now</h3>
            <p>
              You’ll get a PC automatically when one is available. You can still
              call and chat while you wait.
            </p>
            <button className="primary" disabled={claiming} onClick={onClaim}>
              {claiming ? "Checking…" : "Check for a PC"}
            </button>
            {notice && <p role="status">{notice}</p>}
          </div>
        </div>
      ) : poppedOut ? (
        <div className="desktopbody pc-away">
          <div className="desktopcontent">
            <ExternalLink size={44} />
            <h3>Your PC is open in another tab</h3>
            <p>
              Keep this Mao tab open for your call. When you’re done there,
              bring your PC back here.
            </p>
            <button className="primary" onClick={resume}>
              <RotateCw size={16} />
              Resume here
            </button>
            <small>
              Your apps stay open. You can close the separate tab after
              resuming.
            </small>
          </div>
        </div>
      ) : started ? (
        <div className="desktop-frame">
          <iframe
            key={revision}
            title="Your Linux desktop"
            src={url}
            allow="clipboard-read; clipboard-write; fullscreen"
            onLoad={() => {
              setLoaded(true);
              setSlow(false);
            }}
          />
          {!loaded && (
            <div className="desktop-loading" role="status">
              <Loader2 size={26} className="spinner" />
              <strong>
                {slow ? "Taking a little longer…" : "Opening your PC…"}
              </strong>
              {slow && (
                <button onClick={reconnect} className="primary">
                  Reconnect view
                </button>
              )}
            </div>
          )}
        </div>
      ) : null}
      {url && !poppedOut && (
        <p className="desktop-tip">
          PC view frozen or disconnected?{" "}
          <button onClick={reconnect}>Reconnect view</button>
          <span> Your apps and call stay open.</span>
        </p>
      )}
    </section>
  );
}
