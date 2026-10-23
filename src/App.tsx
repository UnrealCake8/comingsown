import { useEffect, useRef, useState } from "react";
import {
  Headphones,
  Monitor,
  Users,
  MessageCircle,
  Plus,
  LogOut,
  Shield,
  Phone,
  Palette,
  UserPlus,
  Check,
  ArrowRight,
} from "lucide-react";
import { supabase, request } from "./lib/supabase";
import Call from "./components/Call";
import Desktop from "./components/Desktop";
import Modal from "./components/Modal";
import SpaceIcon from "./components/SpaceIcon";
import SpaceLookPicker from "./components/SpaceLookPicker";
import {
  DEFAULT_LOOK,
  readSpaceLooks,
  saveSpaceLook,
  type SpaceLook,
} from "./lib/spaceLooks";
type Space = { id: string; name: string; owner_id: string };
type Profile = { username: string; restricted_video: boolean };
type Message = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
};
type Friends = {
  links: { requester_id: string; addressee_id: string; status: string }[];
  people: { user_id: string; username: string }[];
};
type FormKind = "create" | "invite" | "friend" | "look";
const problem = (error: unknown) =>
  error instanceof Error ? error.message : String(error);
export default function App({ userId }: { userId: string }) {
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [vm, setVm] = useState<number | null>(null);
  const [selected, setSelected] = useState("");
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const [liveSpace, setLiveSpace] = useState("");
  const [tab, setTab] = useState<
    "desktop" | "chat" | "call" | "privacy" | "friends"
  >("desktop");
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [sending, setSending] = useState(false);
  const [profileBusy, setProfileBusy] = useState(false);
  const [vmNotice, setVmNotice] = useState("");
  const [focused, setFocused] = useState(false);
  const [friends, setFriends] = useState<Friends>({ links: [], people: [] });
  const [looks, setLooks] = useState(() => readSpaceLooks(userId));
  const [form, setForm] = useState<FormKind | null>(null);
  const [formValue, setFormValue] = useState("");
  const [formLook, setFormLook] = useState<SpaceLook>(DEFAULT_LOOK);
  const [formBusy, setFormBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const formSpace = useRef("");
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  async function refresh() {
    setError("");
    try {
      const data = await request<{
        profile: Profile | null;
        spaces: Space[];
        vm: number | null;
      }>("/bootstrap");
      if (!mounted.current) return;
      setProfile(data.profile);
      setSpaces(data.spaces);
      setVm(data.vm);
      setSelected((old) =>
        data.spaces.some((s) => s.id === old) ? old : data.spaces[0]?.id || "",
      );
    } catch (e) {
      if (mounted.current) setError(problem(e));
    } finally {
      if (mounted.current) setLoading(false);
    }
  }
  useEffect(() => {
    void refresh();
  }, []);
  useEffect(() => {
    setMessages([]);
    setDraft("");
    if (!selected) return;
    let active = true;
    async function load() {
      try {
        const d = await request<{ messages: Message[] }>(
          "/messages/" + selected,
        );
        if (active) setMessages(d.messages);
      } catch (e) {
        if (active) setError(problem(e));
      }
    }
    void load();
    const interval = setInterval(load, 3500);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [selected]);
  async function loadFriends() {
    try {
      setFriends(await request<Friends>("/friends"));
    } catch (e) {
      setError(problem(e));
    }
  }
  async function retryVm() {
    if (claiming) return;
    setClaiming(true);
    setVmNotice("");
    try {
      const d = await request<{ vm: number | null }>("/vm/claim", {});
      setVm(d.vm);
      if (d.vm === null)
        setVmNotice("All PCs are still taken. Check back soon.");
    } catch (e) {
      setVmNotice(problem(e));
    } finally {
      setClaiming(false);
    }
  }
  async function send() {
    if (sending || !draft.trim() || !selected) return;
    const space = selected,
      body = draft.trim();
    setSending(true);
    setError("");
    try {
      await request("/messages/" + space, { body });
      if (selectedRef.current === space) setDraft("");
      const data = await request<{ messages: Message[] }>("/messages/" + space);
      if (selectedRef.current === space) setMessages(data.messages);
    } catch (e) {
      setError(problem(e));
    } finally {
      setSending(false);
    }
  }
  function openForm(kind: FormKind) {
    formSpace.current = selected;
    setFormValue("");
    setFormError("");
    setFormLook(looks[selected] || DEFAULT_LOOK);
    setForm(kind);
    if (kind === "invite") void loadFriends();
  }
  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    if (formBusy || !form) return;
    setFormBusy(true);
    setFormError("");
    setNotice("");
    const space = formSpace.current;
    try {
      if (form === "create") {
        const { space: created } = await request<{ space: Space }>("/spaces", {
          name: formValue.trim(),
        });
        setSpaces((old) => [...old, created]);
        setSelected(created.id);
        try {
          setLooks(saveSpaceLook(userId, created.id, formLook));
          setNotice("Your Space is ready. Invite a friend to join you.");
        } catch {
          setLooks((old) => ({ ...old, [created.id]: formLook }));
          setNotice(
            "Your Space is ready. This browser could not save its icon and colour.",
          );
        }
        setTab("call");
      } else if (form === "look") {
        try {
          setLooks(saveSpaceLook(userId, space, formLook));
          setNotice("Your Space look is saved on this browser.");
        } catch {
          setLooks((old) => ({ ...old, [space]: formLook }));
          setNotice(
            "Your look is applied for now. This browser could not save it.",
          );
        }
      } else if (form === "invite") {
        await request("/invite/" + space, { username: formValue.trim() });
        setNotice("Friend invited. They can now open this Space in Mao.");
      } else {
        await request("/friends", { username: formValue.trim() });
        setNotice("Friend request sent. They’ll need to accept it.");
        void loadFriends();
      }
      setForm(null);
    } catch (e) {
      setFormError(problem(e));
    } finally {
      setFormBusy(false);
    }
  }
  async function acceptFriend(requesterId: string) {
    setError("");
    try {
      await request("/friends/accept", { requester_id: requesterId });
      await loadFriends();
      setNotice("You’re now friends. Invite them to a Space.");
    } catch (e) {
      setError(problem(e));
    }
  }
  async function privacy(restricted: boolean) {
    if (savingPrivacy) return;
    setSavingPrivacy(true);
    setError("");
    try {
      await request("/privacy", { restricted });
      setProfile((old) =>
        old ? { ...old, restricted_video: restricted } : old,
      );
      setNotice("Privacy setting saved.");
    } catch (e) {
      setError(problem(e));
    } finally {
      setSavingPrivacy(false);
    }
  }
  const current = spaces.find((s) => s.id === selected);
  const callSpace = spaces.find((s) => s.id === (liveSpace || selected));
  const acceptedFriends = friends.links
    .filter((f) => f.status === "accepted")
    .map((f) =>
      friends.people.find(
        (p) =>
          p.user_id ===
          (f.requester_id === userId ? f.addressee_id : f.requester_id),
      ),
    )
    .filter((p): p is Friends["people"][number] => !!p);
  if (loading) return <div className="auth-screen">Opening Mao…</div>;
  if (profile === undefined)
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <h1>Couldn’t open Mao</h1>
          <p role="alert">{error}</p>
          <button
            className="primary"
            onClick={() => {
              setLoading(true);
              void refresh();
            }}
          >
            Try again
          </button>
        </div>
      </div>
    );
  if (profile === null)
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <div className="logo">
            mao<span className="dot">.</span>
          </div>
          <h1>What should we call you?</h1>
          <p>
            Choose a username so your friends can find you. Your PC will be
            assigned automatically.
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (profileBusy) return;
              setProfileBusy(true);
              setError("");
              try {
                await request("/profile", { username });
                await refresh();
              } catch (e) {
                setError(problem(e));
              } finally {
                setProfileBusy(false);
              }
            }}
          >
            <label>
              Username
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                placeholder="your_username"
                minLength={3}
                maxLength={24}
                pattern="[a-z0-9_]{3,24}"
                required
                autoComplete="username"
              />
            </label>
            <small>3–24 lowercase letters, numbers, or underscores.</small>
            <button className="primary" disabled={profileBusy}>
              {profileBusy ? "Getting ready…" : "Let’s go"}
            </button>
          </form>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
        </div>
      </div>
    );
  return (
    <div
      className={
        "hangout-app " +
        (tab === "desktop" ? "pc-mode " : "") +
        (focused && tab === "desktop" ? "pc-focus" : "")
      }
    >
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
          {(
            [
              { id: "call", label: "Hang out", icon: Phone },
              { id: "desktop", label: "My PC", icon: Monitor },
              { id: "chat", label: "Chat", icon: MessageCircle },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              className={tab === item.id ? "on" : ""}
              aria-current={tab === item.id ? "page" : undefined}
              onClick={() => setTab(item.id)}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="header-actions">
          <button
            className={"friends-button " + (tab === "friends" ? "on" : "")}
            onClick={() => {
              setTab("friends");
              void loadFriends();
            }}
          >
            <Users size={19} />
            <span>Friends</span>
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
        {tab !== "desktop" && (
          <div className="hello-row">
            <div>
              <span className="hello-label">
                HEY, {profile.username.toUpperCase()} ✦
              </span>
              <h1>
                {tab === "chat"
                  ? "Keep the chat going."
                  : tab === "friends"
                    ? "Better with friends."
                    : tab === "privacy"
                      ? "Your space, your rules."
                      : "Come on in."}
              </h1>
              <p>
                {tab === "chat"
                  ? "A place for your conversations."
                  : tab === "friends"
                    ? "Find your people and bring them along."
                    : tab === "privacy"
                      ? "You choose what you share."
                      : "Grab a spot. Call your friends. Do your thing."}
              </p>
            </div>
            <span className="hello-sticker" aria-hidden="true">
              ✳
            </span>
          </div>
        )}
        <div className="room-picker">
          <div className="room-chips">
            {spaces.map((s) => {
              const look = looks[s.id] || DEFAULT_LOOK;
              return (
                <button
                  key={s.id}
                  data-tone={look.tone}
                  className={
                    "room-chip " + (s.id === selected ? "selected" : "")
                  }
                  aria-pressed={s.id === selected}
                  onClick={() => setSelected(s.id)}
                >
                  <span aria-hidden="true">
                    <SpaceIcon name={look.icon} />
                  </span>
                  {s.name}
                </button>
              );
            })}
            <button className="new-room" onClick={() => openForm("create")}>
              <Plus size={16} />
              New space
            </button>
          </div>
          <div className="room-actions">
            {current && (
              <button
                className="customize-button"
                aria-label="Customise Space"
                title="Choose this Space’s icon and colour"
                onClick={() => openForm("look")}
              >
                <Palette size={17} />
              </button>
            )}
            <button
              className="invite"
              disabled={!selected}
              onClick={() => openForm("invite")}
            >
              <UserPlus size={16} />
              Invite a friend
            </button>
          </div>
        </div>
        {notice && (
          <div className="notice" role="status">
            <Check size={16} />
            <span>{notice}</span>
            <button
              aria-label="Dismiss notification"
              onClick={() => setNotice("")}
            >
              ×
            </button>
          </div>
        )}
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        {spaces.length === 0 && tab === "desktop" && (
          <div className="welcome-tip">
            <Headphones size={20} />
            <div>
              <strong>Your PC is your own. Bring some company?</strong>
              <span>Create a Space to call and chat while you use it.</span>
            </div>
            <button onClick={() => openForm("create")}>
              Create a Space
              <ArrowRight size={16} />
            </button>
          </div>
        )}
        <div
          className={
            "workspace-grid " +
            (tab === "call"
              ? "call-focused"
              : tab === "desktop"
                ? "pc-layout"
                : "")
          }
        >
          <div className="workspace-view" hidden={tab === "call"}>
            <div hidden={tab !== "desktop"}>
              <Desktop
                key={vm ?? "waiting"}
                vm={vm}
                active={tab === "desktop"}
                focused={focused}
                onFocus={() => setFocused((old) => !old)}
                claiming={claiming}
                notice={vmNotice}
                onClaim={() => void retryVm()}
              />
            </div>
            {tab === "chat" &&
              (!selected ? (
                <div className="card onboarding-empty">
                  <MessageCircle size={36} />
                  <h2>Give your chat a home</h2>
                  <p>
                    Create a Space, then invite your friends. Your conversations
                    and calls live together there.
                  </p>
                  <button
                    className="primary"
                    onClick={() => openForm("create")}
                  >
                    <Plus size={16} />
                    Create a Space
                  </button>
                </div>
              ) : (
                <div className="chatpanel card">
                  <div className="chatheading">
                    <span aria-hidden="true">
                      <SpaceIcon
                        name={(looks[selected] || DEFAULT_LOOK).icon}
                      />
                    </span>
                    {current?.name} · chat
                  </div>
                  <div className="chatmessages">
                    {messages.length === 0 && (
                      <div className="chat-empty">
                        <MessageCircle size={32} />
                        <h3>Say hey to your Space.</h3>
                        <p>Your first conversation starts here.</p>
                        <button
                          className="text-button"
                          onClick={() => openForm("invite")}
                        >
                          Invite a friend
                        </button>
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
                      maxLength={4000}
                      disabled={sending}
                    />
                    <button disabled={sending || !draft.trim()}>
                      {sending ? "Sending…" : "Send ↗"}
                    </button>
                  </form>
                </div>
              ))}
            {tab === "friends" && (
              <div className="card settingspanel">
                <div className="section-heading">
                  <div>
                    <h3>Your people</h3>
                    <p>
                      Your username is <strong>@{profile.username}</strong>.
                      Share it with your friends.
                    </p>
                  </div>
                  <button
                    className="primary"
                    onClick={() => openForm("friend")}
                  >
                    <Plus size={16} />
                    Add a friend
                  </button>
                </div>
                {friends.links.length === 0 && (
                  <div className="chat-empty">
                    <Users size={32} />
                    <h3>Save a spot for someone.</h3>
                    <p>
                      Add them by username. Once they accept, you can invite
                      them to your Space.
                    </p>
                  </div>
                )}
                {friends.links.map((f, i) => {
                  const person = friends.people.find(
                    (p) =>
                      p.user_id ===
                      (f.requester_id === userId
                        ? f.addressee_id
                        : f.requester_id),
                  );
                  return (
                    <div className="settingrow" key={i}>
                      <div className="avatar">
                        {person?.username[0].toUpperCase() || "?"}
                      </div>
                      <div className="friend-name">
                        <strong>@{person?.username || "User"}</strong>
                        <small>
                          {f.status === "accepted"
                            ? "Friends"
                            : f.requester_id === userId
                              ? "Request sent"
                              : "Wants to be your friend"}
                        </small>
                      </div>
                      {f.status === "pending" && f.addressee_id === userId && (
                        <button
                          onClick={() => void acceptFriend(f.requester_id)}
                        >
                          Accept
                        </button>
                      )}
                    </div>
                  );
                })}
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
                    disabled={savingPrivacy}
                    checked={profile.restricted_video}
                    onChange={(e) => void privacy(e.target.checked)}
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
          <aside
            className={"call-panel " + (tab === "desktop" ? "call-dock" : "")}
          >
            {callSpace ? (
              <Call
                key={callSpace.id}
                space={callSpace.id}
                name={callSpace.name}
                restricted={profile.restricted_video}
                userId={userId}
                vm={vm}
                compact={tab !== "call"}
                onJoined={(joined) => setLiveSpace(joined ? callSpace.id : "")}
              />
            ) : (
              <div
                className={
                  "empty-space " + (tab === "desktop" ? "empty-call-dock" : "")
                }
              >
                <Headphones size={32} />
                <div>
                  <h3>Better with company.</h3>
                  <p>Create a Space, invite a friend, and hang out.</p>
                </div>
                <button className="primary" onClick={() => openForm("create")}>
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
        {tab !== "desktop" && (
          <p className="app-footnote">
            Your own little corner of the internet.
          </p>
        )}
      </main>
      {form && (
        <Modal
          title={
            form === "create"
              ? "Make a Space"
              : form === "invite"
                ? "Invite a friend"
                : form === "friend"
                  ? "Find your friend"
                  : "Make it yours"
          }
          onClose={() => setForm(null)}
          busy={formBusy}
        >
          <form className="dialog-form" onSubmit={(e) => void submitForm(e)}>
            {form === "create" ? (
              <>
                <p>A place for your people. Give it a name.</p>
                <label>
                  Space name
                  <input
                    autoFocus
                    value={formValue}
                    onChange={(e) => setFormValue(e.target.value)}
                    placeholder="The after-school hangout"
                    maxLength={80}
                    required
                  />
                </label>
                <SpaceLookPicker look={formLook} onChange={setFormLook} />
                <small>
                  Your icon and colour are personal to this browser.
                </small>
              </>
            ) : form === "look" ? (
              <>
                <p>Choose how this Space looks to you.</p>
                <SpaceLookPicker look={formLook} onChange={setFormLook} />
                <small>Saved on this browser, just for your account.</small>
              </>
            ) : (
              <>
                <p>
                  {form === "invite"
                    ? "Invite an accepted friend to this Space. You can both call and chat here."
                    : "Enter their Mao username. They’ll need to accept your request before you can invite them to a Space."}
                </p>
                <label>
                  Friend’s username
                  <input
                    autoFocus
                    value={formValue}
                    onChange={(e) => setFormValue(e.target.value.toLowerCase())}
                    placeholder="their_username"
                    minLength={3}
                    maxLength={24}
                    pattern="[a-z0-9_]{3,24}"
                    required
                    autoComplete="off"
                  />
                </label>
                {form === "invite" && acceptedFriends.length > 0 && (
                  <div className="friend-suggestions">
                    {acceptedFriends.map((p) => (
                      <button
                        type="button"
                        key={p.user_id}
                        onClick={() => setFormValue(p.username)}
                      >
                        @{p.username}
                      </button>
                    ))}
                  </div>
                )}
                {form === "invite" && acceptedFriends.length === 0 && (
                  <p className="form-tip">
                    No accepted friends yet?{" "}
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => openForm("friend")}
                    >
                      Add a friend first
                    </button>
                  </p>
                )}
              </>
            )}
            {formError && (
              <p className="error" role="alert">
                {formError}
              </p>
            )}
            <div className="dialog-actions">
              <button
                className="secondary"
                type="button"
                disabled={formBusy}
                onClick={() => setForm(null)}
              >
                Cancel
              </button>
              <button
                className="primary"
                type="submit"
                disabled={formBusy || (form !== "look" && !formValue.trim())}
              >
                {formBusy
                  ? "One moment…"
                  : form === "create"
                    ? "Create Space"
                    : form === "invite"
                      ? "Send invite"
                      : form === "friend"
                        ? "Send friend request"
                        : "Save look"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
