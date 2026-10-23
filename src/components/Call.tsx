import { createElement, useEffect, useRef, useState } from "react";
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
    setPeople([...client.getAllUser()]);
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
    clientRef.current = null;
    reset();
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
          <span className="call-kicker">ZOOM VIDEO SDK</span>
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
        <div className="call-stage-placeholder">
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
              <span>{sharing ? "Stop share" : "Share screen"}</span>
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
