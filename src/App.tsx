import { useEffect, useState } from "react";
import {
  Headphones,
  Monitor,
  Users,
  MessageCircle,
  Plus,
  LogOut,
  Shield,
  ArrowUpRight,
  Phone,
} from "lucide-react";
import { supabase, request } from "./lib/supabase";
import Call from "./components/Call";
type Space = { id: string; name: string; owner_id: string };
type Profile = { username: string; restricted_video: boolean };
type Message = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
};
export default function App({ userId }: { userId: string }) {
  const [liveSpace, setLiveSpace] = useState(""),
    [profile, setProfile] = useState<Profile | null>(null),
    [spaces, setSpaces] = useState<Space[]>([]),
    [vm, setVm] = useState<number | null>(null),
    [selected, setSelected] = useState(""),
    [tab, setTab] = useState<
      "desktop" | "chat" | "call" | "privacy" | "friends"
    >("call"),
    [messages, setMessages] = useState<Message[]>([]),
    [draft, setDraft] = useState(""),
    [username, setUsername] = useState(""),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [friends, setFriends] = useState<{
      links: { requester_id: string; addressee_id: string; status: string }[];
      people: { user_id: string; username: string }[];
    }>({ links: [], people: [] });
  async function refresh() {
    try {
      const data = await request<{
        profile: Profile | null;
        spaces: Space[];
        vm: number | null;
      }>("/bootstrap");
      setProfile(data.profile);
      setSpaces(data.spaces);
      setVm(data.vm);
      setSelected((old) =>
        data.spaces.some((s) => s.id === old) ? old : data.spaces[0]?.id || "",
      );
      setError("");
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void refresh();
  }, []);
  useEffect(() => {
    setMessages([]);
    if (!selected) return;
    let active = true;
    async function load() {
      try {
        const d = await request<{ messages: Message[] }>(
          "/messages/" + selected,
        );
        if (active) setMessages(d.messages);
      } catch (e) {
        if (active) setError(String(e));
      }
    }
    void load();
    const interval = setInterval(load, 3500);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [selected]);
  async function act(fn: () => Promise<unknown>) {
    try {
      setError("");
      await fn();
      await refresh();
    } catch (e) {
      setError(String(e));
    }
  }
  async function createSpace() {
    const name = prompt("Name your Space");
    if (name?.trim())
      await act(() => request("/spaces", { name: name.trim() }));
  }
  async function send() {
    if (!draft.trim() || !selected) return;
    const body = draft.trim();
    setDraft("");
    try {
      await request("/messages/" + selected, { body });
      const d = await request<{ messages: Message[] }>("/messages/" + selected);
      setMessages(d.messages);
    } catch (e) {
      setError(String(e));
      setDraft(body);
    }
  }
  async function loadFriends() {
    try {
      setFriends(await request("/friends"));
    } catch (e) {
      setError(String(e));
    }
  }
  const current = spaces.find((s) => s.id === selected);
  const callSpace = spaces.find((s) => s.id === (liveSpace || selected));
  const vmUrl = vm ? "https://vm" + vm + ".asanib.com" : null;
  if (loading) return <div className="auth-screen">Opening Mao…</div>;
  if (!profile)
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <img
            className="brand-image"
            src="/mao-logo.png"
            alt="Mao"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
          <h1>Choose a username</h1>
          <p>Your new Mao account is ready.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void act(() => request("/profile", { username }));
            }}
          >
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              minLength={3}
              maxLength={24}
              required
            />
            <button className="primary">Continue</button>
          </form>
          {error && <p role="alert">{error}</p>}
        </div>
      </div>
    );
  return (
    <div className="hangout-app">
      <header className="app-header">
        <div className="logo">
          <img
            className="brand-image"
            src="/mao-logo.png"
            alt=""
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
          <span>
            mao<span className="dot">.</span>
          </span>
        </div>
        <nav aria-label="Main">
          <button
            className={tab === "call" ? "on" : ""}
            onClick={() => setTab("call")}
          >
            <Phone size={18} />
            Hang out
          </button>
          <button
            className={tab === "desktop" ? "on" : ""}
            onClick={() => setTab("desktop")}
          >
            <Monitor size={18} />
            My PC
          </button>
          <button
            className={tab === "chat" ? "on" : ""}
            onClick={() => setTab("chat")}
          >
            <MessageCircle size={18} />
            Chat
          </button>
        </nav>
        <div className="header-actions">
          <button
            aria-label="Friends"
            title="Friends"
            className={"round-button " + (tab === "friends" ? "on" : "")}
            onClick={() => {
              setTab("friends");
              void loadFriends();
            }}
          >
            <Users size={20} />
          </button>
          <button
            aria-label="Privacy settings"
            title="Privacy settings"
            className="avatar"
            onClick={() => setTab("privacy")}
          >
            {profile.username[0].toUpperCase()}
          </button>
        </div>
      </header>
      <main className="hangout-main">
        <div className="hello-row">
          <div>
            <span className="hello-label">
              HEY, {profile.username.toUpperCase()} ✦
            </span>
            <h1>
              {tab === "desktop"
                ? "Your PC. Your thing."
                : tab === "chat"
                  ? "Keep the chat going."
                  : tab === "friends"
                    ? "Better with friends."
                    : tab === "privacy"
                      ? "Your space, your rules."
                      : "Come on in."}
            </h1>
            <p>
              {tab === "desktop"
                ? "Play, make, browse. Your friends can stay on the call."
                : tab === "chat"
                  ? "Something to say? Drop it here."
                  : tab === "friends"
                    ? "Find your people and bring them along."
                    : tab === "privacy"
                      ? "You choose what you share."
                      : "Grab a spot. Call your friends. Do your thing."}
            </p>
          </div>
          <span className="hello-sticker" aria-hidden="true">
            {tab === "desktop" ? "↗" : "✳"}
          </span>
        </div>
        <div className="room-picker">
          <div className="room-chips">
            {spaces.map((s) => (
              <button
                key={s.id}
                className={"room-chip " + (s.id === selected ? "selected" : "")}
                onClick={() => setSelected(s.id)}
              >
                <span className="room-dot" />
                {s.name}
              </button>
            ))}
            <button className="new-room" onClick={createSpace}>
              <Plus size={16} />
              New space
            </button>
          </div>
          <button
            className="invite"
            disabled={!selected}
            onClick={async () => {
              const name = prompt(
                "Who’s joining? Enter your friend’s username.",
              );
              if (name && selected)
                await act(() =>
                  request("/invite/" + selected, { username: name }),
                );
            }}
          >
            <Plus size={16} />
            Invite a friend
          </button>
        </div>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <div
          className={"workspace-grid " + (tab === "call" ? "call-focused" : "")}
        >
          <div className="workspace-view" hidden={tab === "call"}>
            <div hidden={tab !== "desktop"} className="desktop card">
              <div className="desktopbar">
                <span>
                  <Monitor size={15} />
                  My PC
                </span>
                {vmUrl && (
                  <a href={vmUrl} target="_blank" rel="noreferrer">
                    Open in a new tab
                    <ArrowUpRight size={15} />
                  </a>
                )}
              </div>
              {vmUrl ? (
                <iframe
                  title="Your Linux desktop"
                  src={vmUrl}
                  style={{ width: "100%", height: "65vh", border: 0 }}
                  allow="clipboard-read; clipboard-write; fullscreen"
                />
              ) : (
                <div className="desktopbody">
                  <div className="desktopcontent">
                    <Monitor size={48} />
                    <h3>Your PC is on its way</h3>
                    <p>
                      You haven’t been assigned a desktop yet. Ask your admin to
                      connect one.
                    </p>
                  </div>
                </div>
              )}
            </div>
            {tab === "chat" && (
              <div className="chatpanel card">
                <div className="chatheading">
                  {current?.name || "Your space"} · chat
                </div>
                <div className="chatmessages">
                  {messages.length === 0 && (
                    <div className="chat-empty">
                      <MessageCircle size={32} />
                      <h3>It’s a little quiet here.</h3>
                      <p>Be the first to say hey.</p>
                    </div>
                  )}
                  {messages.map((m) => (
                    <div className="msg" key={m.id}>
                      <div className="avatar">
                        {m.sender_id === userId ? "Y" : "F"}
                      </div>
                      <div>
                        <div className="msgmeta">
                          <b>{m.sender_id === userId ? "You" : "Member"}</b>
                        </div>
                        <p>{m.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <form
                  className="composer"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void send();
                  }}
                >
                  <input
                    aria-label="Message"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Say something…"
                    disabled={!selected}
                  />
                  <button disabled={!selected || !draft.trim()}>Send ↗</button>
                </form>
              </div>
            )}
            {tab === "friends" && (
              <div className="card settingspanel">
                <h3>Your people</h3>
                <button
                  className="primary"
                  onClick={() => {
                    const name = prompt("Your friend’s username");
                    if (name)
                      void act(async () => {
                        await request("/friends", { username: name });
                        await loadFriends();
                      });
                  }}
                >
                  <Plus size={16} />
                  Add a friend
                </button>
                {friends.links.length === 0 && (
                  <p>No friends added yet. Find someone by their username.</p>
                )}
                {friends.links.map((f, i) => (
                  <div className="settingrow" key={i}>
                    <span>
                      {friends.people.find(
                        (p) =>
                          p.user_id ===
                          (f.requester_id === userId
                            ? f.addressee_id
                            : f.requester_id),
                      )?.username || "User"}{" "}
                      — {f.status}
                    </span>
                    {f.status === "pending" && f.addressee_id === userId && (
                      <button
                        onClick={() =>
                          void act(async () => {
                            await request("/friends/accept", {
                              requester_id: f.requester_id,
                            });
                            await loadFriends();
                          })
                        }
                      >
                        Accept
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
            {tab === "privacy" && (
              <div className="card settingspanel">
                <h3>
                  <Shield size={20} />
                  Your privacy
                </h3>
                <p>
                  Restricted Video keeps your camera off. Your voice still
                  works, and screen shares can be seen by everyone in the call.
                </p>
                <label className="settingrow">
                  <input
                    type="checkbox"
                    checked={profile.restricted_video}
                    onChange={(e) =>
                      void act(() =>
                        request("/privacy", { restricted: e.target.checked }),
                      )
                    }
                  />
                  Keep my camera off
                </label>
                <button
                  className="signout"
                  onClick={() => supabase?.auth.signOut()}
                >
                  <LogOut size={16} />
                  Sign out
                </button>
              </div>
            )}
          </div>
          <aside className="call-panel">
            {callSpace ? (
              <Call
                key={callSpace.id}
                space={callSpace.id}
                name={callSpace.name}
                restricted={profile.restricted_video}
                userId={userId}
                compact={tab !== "call"}
                onJoined={(joined) => setLiveSpace(joined ? callSpace.id : "")}
              />
            ) : (
              <div className="empty-space">
                <Headphones size={42} />
                <h3>Save a spot for your friends.</h3>
                <p>Make a Space and invite your people.</p>
                <button className="primary" onClick={createSpace}>
                  <Plus size={16} />
                  Create a Space
                </button>
              </div>
            )}
            {liveSpace && liveSpace !== selected && (
              <p className="call-privacy">
                Still calling in {callSpace?.name}. Leave this call before
                joining another Space.
              </p>
            )}
          </aside>
        </div>
        <p className="app-footnote">Your own little corner of the internet.</p>
      </main>
    </div>
  );
}
