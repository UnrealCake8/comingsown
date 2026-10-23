import { createElement, useEffect, useRef, useState, useId } from "react";
import type ZoomVideo from "@zoom/videosdk";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  MonitorUp,
  PhoneOff,
  Phone,
  Headphones,
  Users,
  ChevronDown,
  ChevronUp,
  Monitor,
  Settings2,
} from "lucide-react";
import { request } from "../lib/supabase";
type Client = ReturnType<typeof ZoomVideo.createClient>;
type Person = ReturnType<Client["getAllUser"]>[number];
type Props = {
  space: string;
  name: string;
  restricted: boolean;
  userId: string;
  compact?: boolean;
  vm: number | null;
  onJoined: (joined: boolean) => void;
};
const describe = (e: unknown) =>
  e instanceof Error
    ? e.message
    : typeof e === "object" && e && "reason" in e
      ? String(e.reason)
      : String(e);
// Zoom may resolve an operation with ExecutedFailure instead of rejecting it.
async function checked<T>(result: Promise<T>): Promise<T> {
  const value = await result;
  if (value && typeof value === "object" && "type" in value) throw value;
  return value;
}
export default function Call({
  space,
  name,
  restricted,
  compact,
  vm,
  onJoined,
}: Props) {
  const clientRef = useRef<Client | null>(null),
    stage = useRef<HTMLDivElement>(null),
    shareHost = useRef<HTMLDivElement>(null),
    shareViewHost = useRef<HTMLDivElement>(null),
    remoteSharer = useRef(0),
    shareQueue = useRef(Promise.resolve());
  const alive = useRef(true),
    busyRef = useRef(false),
    generation = useRef(0),
    listeners = useRef<(() => void)[]>([]);
  const attached = useRef(new Map<number, HTMLElement>()),
    renderQueue = useRef(Promise.resolve());
  const settingsId = useId();
  const vmSharingRef = useRef(false);
  const [vmSharing, setVmSharing] = useState(false);
  const [vmShares, setVmShares] = useState<Record<number, { vm: number; name: string; seen: number }>>({});
  const [watching, setWatching] = useState<number | null>(null);
  const [speakers, setSpeakers] = useState<number[]>([]);
  const [settings, setSettings] = useState(false);
  const [devices, setDevices] = useState<{ microphones: {deviceId: string; label: string}[]; speakers: {deviceId: string; label: string}[] }>({microphones: [], speakers: []});
  async function announceVm(active: boolean) {
    const client = clientRef.current;
    if (!client) return;
    await checked(client.getCommandClient().send(JSON.stringify({type: "mao-vm-share", vm: active ? vm : null})));
  }
  async function toggleVmShare() {
    await run(async () => {
      if (!vm) return;
      const next = !vmSharingRef.current;
      await announceVm(next);
      vmSharingRef.current = next;
      setVmSharing(next);
      if (next) setExpanded(true);
    });
  }
  const [expanded, setExpanded] = useState(false);
  const [joined, setJoined] = useState(false),
    [busy, setBusy] = useState(false),
    [mic, setMic] = useState(false),
    [audio, setAudio] = useState(false),
    [cam, setCam] = useState(false),
    [sharing, setSharing] = useState(false),
    [people, setPeople] = useState<Person[]>([]),
    [error, setError] = useState(""),
    [status, setStatus] = useState("Ready when you are"),
    [resume, setResume] = useState(false);
  const notify = useRef(onJoined);
  notify.current = onJoined;
  function reset() {
    vmSharingRef.current = false;
    setVmSharing(false);
    setVmShares({});
    setWatching(null);
    setSpeakers([]);
    attached.current.clear();
    stage.current?.replaceChildren();
    shareHost.current?.replaceChildren();
    shareViewHost.current?.replaceChildren();
    remoteSharer.current = 0;
    if (!alive.current) return;
    setJoined(false);
    notify.current(false);
    setMic(false);
    setAudio(false);
    setCam(false);
    setSharing(false);
    setPeople([]);
    setResume(false);
    setStatus("Ready when you are");
  }
  function sync(client: Client) {
    if (client !== clientRef.current || !alive.current) return;
    const members = client.getAllUser();
    setPeople([...members]);
    setVmShares(old => Object.fromEntries(Object.entries(old).filter(([id]) => members.some(u => u.userId === Number(id)))));

    const stream = client.getMediaStream();
    setCam(stream.isCapturingVideo());
    setMic(!stream.isAudioMuted());
    renderQueue.current = renderQueue.current
      .then(async () => {
        if (client !== clientRef.current) return;
        const users = client.getAllUser();
        for (const [id, element] of attached.current) {
          if (!users.some((u) => u.userId === id && u.bVideoOn)) {
            await stream.detachVideo(id).catch(() => {});
            element.remove();
            attached.current.delete(id);
          }
        }
        for (const user of users) {
          if (user.bVideoOn && !attached.current.has(user.userId)) {
            const element = await stream.attachVideo(user.userId, 2);
            if (!(element instanceof HTMLElement)) throw element;
            if (client !== clientRef.current) {
              element.remove();
              return;
            }
            attached.current.set(user.userId, element);
            stage.current?.append(element);
          }
        }
      })
      .catch((e) => {
        if (alive.current) setError(describe(e));
      });
  }
  async function run(fn: () => Promise<void>) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      if (alive.current) setError(describe(e));
    } finally {
      busyRef.current = false;
      if (alive.current) setBusy(false);
    }
  }
  async function dispose() {
    generation.current++;
    listeners.current.splice(0).forEach((off) => off());
    const client = clientRef.current;
    const wasSharing = vmSharingRef.current;
    clientRef.current = null;
    reset();
    if (client && wasSharing) {
      await checked(client.getCommandClient().send(JSON.stringify({type: "mao-vm-share", vm: null}))).catch(() => {});
    }
    await client?.leave().catch(() => {});
  }
  async function join() {
    await run(async () => {
      const ticket = ++generation.current;
      const data = await request<{
        token: string;
        sessionName: string;
        displayName: string;
      }>("/call/" + space, {});
      if (ticket !== generation.current || !alive.current) return;
      const { default: ZoomVideo } = await import("@zoom/videosdk");
      if (ticket !== generation.current || !alive.current) return;
      const client = ZoomVideo.createClient();
      clientRef.current = client;
      try {
        await checked(
          client.init("en-US", "Global", {
            patchJsMedia: true,
            enforceMultipleVideos: true,
            leaveOnPageUnload: true,
          }),
        );
        if (ticket !== generation.current) return;
        const listen = (event: string, fn: (payload: any) => void) => {
          client.on(event as any, fn);
          listeners.current.push(() => client.off(event as any, fn));
        };
        listen("active-speaker", (users) => setSpeakers(users.map((u: {userId: number}) => u.userId)));
        listen("command-channel-message", (event) => {
          if (event.senderId === client.getCurrentUserInfo().userId ||
              !client.getAllUser().some(u => u.userId === event.senderId)) return;
          try {
            const message = JSON.parse(event.text);
            if (message.type !== "mao-vm-share") return;
            if (message.vm !== null && (!Number.isSafeInteger(message.vm) || message.vm < 1 || message.vm > 100000)) return;
            const person = client.getAllUser().find(u => u.userId === event.senderId);
            setVmShares(old => {
              const next = {...old};
              if (message.vm === null) delete next[event.senderId];
              else next[event.senderId] = {vm: message.vm, name: person?.displayName || "Friend", seen: Date.now()};
              return next;
            });
          } catch { /* Ignore unrelated or malformed commands. */ }
        });
        listen("user-added", () => sync(client));
        listen("user-removed", () => sync(client));
        listen("user-updated", () => sync(client));
        listen("peer-video-state-change", () => sync(client));
        listen("auto-play-audio-failed", () => setResume(true));
        listen("connection-change", (event) => {
          if (event.state === "Closed") {
            void dispose();
            if (alive.current)
              setError(event.reason || "Call ended. You can rejoin.");
          } else
            setStatus(
              event.state === "Reconnecting" ? "Reconnecting…" : "Connected",
            );
        });
        listen("passively-stop-share", () => {
          setSharing(false);
          shareHost.current?.replaceChildren();
        });
        listen("active-share-change", (event) => {
          if (event.state === "Active") setExpanded(true);
          void runShareView(event.state === "Active" ? event.userId : 0);
        });
        await checked(
          client.join(data.sessionName, data.token, data.displayName),
        );
        if (ticket !== generation.current || !alive.current) {
          await client.leave();
          return;
        }
        setJoined(true);
        notify.current(true);
        setStatus("Connected");
        sync(client);
        const active = client.getMediaStream().getActiveShareUserId();
        if (active) await runShareView(active);
        // Audio is deliberately enabled by a separate click, retaining a real user gesture.
      } catch (e) {
        await dispose();
        throw e;
      }
    });
  }
  async function runShareView(userId: number) {
    const client = clientRef.current;
    if (!client) return;
    shareQueue.current = shareQueue.current
      .then(async () => {
        if (client !== clientRef.current || !shareViewHost.current) return;
        const stream = client.getMediaStream();
        if (remoteSharer.current) {
          await stream.detachShareView(remoteSharer.current);
          remoteSharer.current = 0;
        }
        shareViewHost.current.replaceChildren();
        if (userId && userId !== client.getCurrentUserInfo().userId) {
          const element = await stream.attachShareView(userId);
          if (!(element instanceof HTMLElement)) throw element;
          if (client !== clientRef.current) {
            element.remove();
            return;
          }
          shareViewHost.current.append(element);
          remoteSharer.current = userId;
        }
      })
      .catch((e) => {
        if (alive.current) setError(describe(e));
      });
    await shareQueue.current;
  }
  async function toggleAudio() {
    await run(async () => {
      const stream = clientRef.current?.getMediaStream();
      if (!stream) return;
      if (!audio) {
        await checked(stream.startAudio());
        setAudio(true);
        setMic(true);
        setResume(false);
        setDevices({microphones: stream.getMicList(), speakers: stream.getSpeakerList()});
      } else if (mic) {
        await checked(stream.muteAudio());
        setMic(false);
      } else {
        await checked(stream.unmuteAudio());
        setMic(true);
      }
    });
  }
  async function toggleCamera() {
    await run(async () => {
      const client = clientRef.current;
      if (!client || restricted) return;
      const stream = client.getMediaStream();
      await checked(cam ? stream.stopVideo() : stream.startVideo());
      if (!cam) setExpanded(true);
      sync(client);
    });
  }
  async function toggleShare() {
    await run(async () => {
      const stream = clientRef.current?.getMediaStream();
      if (!stream || !shareHost.current) return;
      if (sharing) {
        await checked(stream.stopShareScreen());
        setSharing(false);
        shareHost.current.replaceChildren();
      } else {
        const element = document.createElement(
          stream.isStartShareScreenWithVideoElement() ? "video" : "canvas",
        );
        if (element instanceof HTMLVideoElement) {
          element.muted = true;
          element.autoplay = true;
          element.playsInline = true;
        }
        shareHost.current.replaceChildren(element);
        try {
          await checked(stream.startShareScreen(element));
          setSharing(true);
          setExpanded(true);
        } catch (e) {
          element.remove();
          throw e;
        }
      }
    });
  }
  useEffect(() => {
    if (!joined) return;
    // Re-announce to late joiners; expire a lost stop message or disconnected sharer.
    const timer = setInterval(() => {
      if (vmSharingRef.current) void announceVm(true).catch(() => {});
      setVmShares(old => Object.fromEntries(Object.entries(old).filter(([, share]) => Date.now() - share.seen < 45000)));
    }, 15000);
    return () => clearInterval(timer);
  }, [joined, vm]);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      void dispose();
    };
  }, []);
  useEffect(() => {
    if (restricted && clientRef.current?.getMediaStream().isCapturingVideo()) {
      void checked(clientRef.current.getMediaStream().stopVideo())
        .then(() => {
          if (clientRef.current) sync(clientRef.current);
        })
        .catch((e) => setError(describe(e)));
    }
  }, [restricted]);
  return (
    <section
      className={
        "call-room " +
        (compact ? "compact " : "") +
        (compact && !expanded ? "call-collapsed" : "")
      }
      aria-label="Zoom call"
    >
      <div className="call-room-heading">
        <div>
          <span className="call-kicker">THE HANGOUT</span>
          <h2>{name}</h2>
        </div>
        <span className={"connection " + (joined ? "live" : "")}>
          <i />
          {status}
        </span>
        {compact && (
          <button
            className="video-toggle"
            aria-expanded={expanded}
            onClick={() => setExpanded((old) => !old)}
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            <span>{expanded ? "Hide video" : "Show video"}</span>
          </button>
        )}
      </div>
      <div className="call-stage" hidden={compact && !expanded}>
        <div className="call-stage-placeholder" hidden={joined && people.length > 0}>
          <div className="call-stage-icon">
            <Headphones size={36} />
          </div>
          <h3>
            {joined
              ? "You’re in. Make yourself at home."
              : "Your friends are a call away."}
          </h3>
          <p>
            {joined
              ? "Your call stays connected while you use your desktop or messages."
              : "Catch up, share your screen, or just hang out while you do your thing."}
          </p>
        </div>
        {joined && (
          <div className="participant-grid">
            {people.map(person => (
              <div key={person.userId} className={"participant-tile " + (speakers.includes(person.userId) ? "speaking" : "")}>
                <span className="participant-avatar">{person.displayName.slice(0, 2).toUpperCase()}</span>
                <strong>{person.displayName}{person.userId === clientRef.current?.getCurrentUserInfo().userId ? " (you)" : ""}</strong>
                <small>{person.muted ? "Mic off" : speakers.includes(person.userId) ? "Speaking" : "In the call"}</small>
              </div>
            ))}
          </div>
        )}
        {createElement("video-player-container", {
          ref: stage,
          className: "video-stage",
        })}
        <div ref={shareHost} className="share-stage" />
        {createElement("video-player-container", {
          ref: shareViewHost,
          className: "share-view-stage",
        })}
      </div>
      {joined && (vmSharing || Object.keys(vmShares).length > 0) && (
        <div className="vm-share-panel">
          {vmSharing && <p role="status">You’re sharing your VM. Friends can watch its screen.</p>}
          {Object.entries(vmShares).map(([id, share]) => (
            <button key={id} aria-pressed={watching === Number(id)} onClick={() => {
              setWatching(watching === Number(id) ? null : Number(id));
              setExpanded(true);
            }}><Monitor size={16} />{watching === Number(id) ? "Hide" : "Watch"} {share.name}’s VM</button>
          ))}
          {watching !== null && vmShares[watching] && (
            <div className="vm-watch">
              <p>Watching {vmShares[watching].name}’s VM · view only</p>
              <iframe title="Shared VM screen" src={"https://vm" + vmShares[watching].vm + ".asanib.com/#shared"} allow="fullscreen" />
              <small>If the desktop asks you to sign in, its existing access rules still apply.</small>
            </div>
          )}
        </div>
      )}
      {joined && (
        <div className="people-strip">
          <Users size={14} />
          {people.length} in this call
          {people.map((p) => (
            <span key={p.userId}>
              {p.displayName}
              {p.muted ? " · muted" : ""}
            </span>
          ))}
        </div>
      )}
      <div className="call-toolbar">
        {!joined ? (
          <button
            className="call-join"
            disabled={busy}
            onClick={() => void join()}
          >
            <Phone size={18} />
            {busy ? "Connecting…" : "Join the call"}
          </button>
        ) : (
          <>
            <button
              className={"call-control " + (mic && audio ? "is-on" : "")}
              disabled={busy}
              onClick={() => void toggleAudio()}
            >
              {mic && audio ? <Mic size={20} /> : <MicOff size={20} />}
              <span>{!audio ? "Enable audio" : mic ? "Mute" : "Unmute"}</span>
            </button>
            <button
              className={"call-control " + (cam ? "is-on" : "")}
              disabled={busy || restricted}
              onClick={() => void toggleCamera()}
            >
              {cam ? <Video size={20} /> : <VideoOff size={20} />}
              <span>{cam ? "Camera off" : "Camera on"}</span>
            </button>
            <button
              className={"call-control " + (sharing ? "is-on" : "")}
              disabled={busy}
              onClick={() => void toggleShare()}
            >
              <MonitorUp size={20} />
              <span>{sharing ? "Stop device share" : "Share device screen"}</span>
            </button>
            <button className={"call-control " + (vmSharing ? "is-on" : "")} disabled={busy || !vm} onClick={() => void toggleVmShare()}>
              <Monitor size={20} /><span>{vmSharing ? "Stop VM share" : "Share VM screen"}</span>
            </button>
            <button className="call-control" aria-expanded={settings} onClick={() => setSettings(!settings)}>
              <Settings2 size={20} /><span>Audio settings</span>
            </button>
            <button
              className="call-control call-hangup"
              disabled={busy}
              onClick={() => void run(dispose)}
            >
              <PhoneOff size={20} />
              <span>Leave</span>
            </button>
          </>
        )}
      </div>
      {joined && settings && (
        <div className="audio-settings">
          {!audio ? <p>Enable audio first to choose your devices.</p> : <>
            <label htmlFor={settingsId + "-mic"}>Microphone</label><select id={settingsId + "-mic"} defaultValue="" disabled={busy} onChange={e => void run(async () => {
              await checked(clientRef.current!.getMediaStream().switchMicrophone(e.target.value));
            })}><option value="" disabled>Choose microphone</option>{devices.microphones.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label || "Microphone"}</option>)}</select>
            <label htmlFor={settingsId + "-speaker"}>Speaker</label><select id={settingsId + "-speaker"} defaultValue="" disabled={busy} onChange={e => void run(async () => {
              await checked(clientRef.current!.getMediaStream().switchSpeaker(e.target.value));
            })}><option value="" disabled>Choose speaker</option>{devices.speakers.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label || "Speaker"}</option>)}</select>
            <p>If your browser doesn’t offer speaker selection, use your device’s sound settings.</p>
          </>}
        </div>
      )}
      {resume && (
        <button
          className="audio-resume"
          disabled={busy}
          onClick={() =>
            void run(async () => {
              const stream = clientRef.current?.getMediaStream();
              if (stream) {
                await checked(stream.startAudio());
                setAudio(true);
                setMic(!stream.isAudioMuted());
                setResume(false);
              }
            })
          }
        >
          Click to resume call audio
        </button>
      )}
      {joined && <p className="call-help">Your call stays on while you use My PC. VM sharing shows your whole desktop to this call; device sharing opens your browser’s screen picker.</p>}
      {restricted && (
        <p className="call-privacy">
          Restricted Video is on. Your camera stays off. Screen shares are
          visible to everyone in this call.
        </p>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </section>
  );
}
