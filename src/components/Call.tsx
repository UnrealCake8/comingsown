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
      const next = !vmSharingRef.…11028 tokens truncated…
    padding: 28px 25px;
  }
  .app-header nav button {
    padding: 10px 16px;
  }
  .hello-sticker {
    width: 76px;
    height: 76px;
    font-size: 60px;
  }
  .hello-row {
    padding-right: 12px;
  }
  .compact .call-stage {
    min-height: 150px;
  }
  .compact .call-stage-placeholder p {
    max-width: 400px;
  }
  .compact .call-toolbar {
    padding: 12px;
  }
  .compact .call-room-heading {
    padding: 16px 20px;
  }
}
@media (max-width: 600px) {
  .app-header {
    height: auto;
    min-height: 118px;
    flex-wrap: wrap;
    padding: 18px 20px 12px;
    gap: 13px;
  }
  .app-header .logo {
    font-size: 29px;
  }
  .app-header .brand-image {
    width: 31px;
    height: 31px;
  }
  .app-header nav {
    order: 3;
    width: 100%;
    justify-content: center;
  }
  .app-header nav button {
    flex: 1;
    justify-content: center;
    padding: 10px 8px;
    font-size: 11px;
  }
  .header-actions {
    gap: 9px;
  }
  .hangout-main {
    padding: 25px 18px 15px;
  }
  .hello-row {
    margin-bottom: 27px;
    padding-right: 5px;
    gap: 15px;
  }
  .hello-row h1 {
    font-size: 38px;
    letter-spacing: -1.7px;
  }
  .hello-row p {
    font-size: 12px;
    max-width: 240px;
  }
  .hello-label {
    font-size: 8px;
    letter-spacing: 1.3px;
  }
  .hello-sticker {
    width: 57px;
    height: 57px;
    border-radius: 17px;
    font-size: 46px;
    flex-shrink: 0;
    box-shadow: 4px 4px 0 #e2d4f6;
  }
  .room-picker {
    align-items: flex-start;
    flex-direction: column;
    gap: 12px;
  }
  .room-picker .invite {
    font-size: 11px;
    padding: 10px 15px;
    align-self: flex-end;
  }
  .room-chip,
  .new-room {
    font-size: 11px;
    padding: 10px 13px;
  }
  .call-stage {
    min-height: 320px;
    margin: 0 8px;
  }
  .call-stage-placeholder h3 {
    font-size: 24px;
  }
  .call-room-heading {
    flex-direction: row;
    align-items: center;
    padding: 18px;
    gap: 10px;
  }
  .call-room-heading h2 {
    font-size: 15px;
  }
  .connection {
    max-width: 130px;
    font-size: 9px;
  }
  .compact .call-room-heading {
    flex-direction: row;
    align-items: center;
  }
  .compact .call-stage {
    min-height: 140px;
  }
  .compact .call-stage-placeholder h3 {
    font-size: 18px;
  }
  .compact .call-stage-placeholder p {
    font-size: 10px;
  }
  .compact .call-toolbar {
    padding: 12px;
  }
  .call-control {
    min-width: 50px;
  }
  .desktopbar {
    flex-direction: row;
    align-items: center;
    font-size: 11px;
  }
  .desktopbar a {
    font-size: 9px;
  }
  .call-toolbar {
    padding: 18px 12px;
  }
  .call-join {
    padding: 14px 26px;
  }
}

.share-view-stage {
  display: block;
  width: 100%;
}
.share-view-stage:empty {
  display: none;
}
.share-view-stage video-player {
  display: block;
  width: 100%;
  aspect-ratio: 16/9;
}
.call-stage:has(.share-view-stage > :first-child) .call-stage-placeholder {
  display: none;
}

/* PC-first everyday use */
.app-header {
  height: 74px;
}
.pc-mode .hangout-main {
  max-width: 1640px;
  padding: 18px 30px 20px;
}
.pc-mode .room-picker {
  margin-bottom: 14px;
}
.pc-mode .workspace-grid.pc-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 12px;
}
.pc-layout .call-panel {
  grid-row: auto;
}
.pc-mode .desktop {
  border-radius: 14px;
}
.desktopbar {
  padding: 0 16px;
  min-height: 48px;
}
.desktopbar > span {
  white-space: nowrap;
}
.desktopbar small {
  font-size: 10px;
  font-weight: 500;
  background: #f3edf9;
  color: #947ba9;
  padding: 4px 7px;
  border-radius: 6px;
}
.desktop-actions {
  display: flex;
  align-items: center;
  gap: 5px;
}
.desktop-actions button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: transparent;
  border: 0;
  border-radius: 7px;
  padding: 9px 10px;
  color: #8261a4;
  font-size: 11px;
}
.desktop-actions button:hover {
  background: #f2ebfc;
}
.desktop-frame {
  height: calc(100dvh - 330px);
  min-height: 420px;
  position: relative;
  background: #e9e3f4;
}
.desktop-frame iframe {
  width: 100%;
  height: 100% !important;
  border: 0;
  display: block;
}
.desktop-loading {
  position: absolute;
  inset: 0;
  background: #f5f0fc;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 18px;
  color: #9781b2;
  font-size: 13px;
}
.spinner {
  animation: spin 1.4s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.desktop-tip {
  padding: 9px 15px;
  margin: 0;
  font-size: 10px;
  color: #9f8bb0;
  background: #fdfbff;
  line-height: 1.5;
}
.desktop-tip button,
.text-button {
  border: 0;
  background: transparent;
  color: #7951b3;
  padding: 0;
  font-size: inherit;
  text-decoration: underline;
  text-underline-offset: 3px;
}
.desktopbody.pc-away {
  min-height: calc(100dvh - 300px);
}
.pc-away .desktopcontent {
  max-width: 440px;
}
.pc-away small {
  display: block;
  font-size: 10px;
  color: #a493b7;
  line-height: 1.6;
  margin-top: 15px;
}
.pc-focus .room-picker,
.pc-focus .welcome-tip {
  display: none;
}
.pc-focus .hangout-main {
  padding-top: 8px;
}
.pc-focus .desktop-frame {
  height: calc(100dvh - 230px);
  min-height: 440px;
}
.friends-button {
  display: flex;
  gap: 7px;
  align-items: center;
  border: 0;
  background: transparent;
  color: #8f7b9e;
  font-size: 12px;
  font-weight: 600;
  border-radius: 100px;
  padding: 10px 12px;
}
.friends-button:hover,
.friends-button.on {
  color: #7952b6;
  background: #eee5fa;
}
.room-actions {
  display: flex;
  align-items: center;
  gap: 7px;
}
.customize-button {
  border: 1px solid #e8ddf2;
  border-radius: 50%;
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  background: #fff;
  color: #a086bd;
  flex-shrink: 0;
}
.room-chip {
  --room-colour: #9673c9;
  --room-fill: #e9ddff;
  --room-border: #decbfa;
}
.room-chip[data-tone="peach"] {
  --room-colour: #ae7355;
  --room-fill: #fce1d1;
  --room-border: #f5ceb7;
}
.room-chip[data-tone="mint"] {
  --room-colour: #4b907c;
  --room-fill: #d9f0e5;
  --room-border: #bfe4d3;
}
.room-chip[data-tone="sky"] {
  --room-colour: #548bb2;
  --room-fill: #deeffb;
  --room-border: #c2e0f5;
}
.room-chip.selected {
  background: var(--room-fill);
  border-color: var(--room-border);
  color: var(--room-colour);
}
.room-chip > span {
  font-size: 15px;
}
.notice {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 11px 15px;
  border: 1px solid #d8e9db;
  border-radius: 10px;
  background: #f0f8ef;
  color: #628367;
  font-size: 12px;
  line-height: 1.6;
  margin-bottom: 12px;
}
.notice > svg {
  flex-shrink: 0;
}
.notice > button {
  margin-left: auto;
  align-self: flex-start;
  background: transparent;
  border: 0;
  color: inherit;
  font-size: 20px;
  line-height: 1;
}
.welcome-tip {
  display: flex;
  align-items: center;
  gap: 13px;
  border: 1px solid #e6daf6;
  background: #f0e8fd;
  padding: 14px 18px;
  margin-bottom: 14px;
  border-radius: 12px;
  color: #8b70af;
  font-size: 12px;
}
.welcome-tip > div {
  flex: 1;
}
.welcome-tip strong,
.welcome-tip span {
  display: block;
}
.welcome-tip strong {
  font-weight: 600;
  color: #725291;
  margin-bottom: 4px;
}
.welcome-tip button {
  display: flex;
  align-items: center;
  gap: 7px;
  white-space: nowrap;
  border: 0;
  background: #fff;
  color: #7f57ac;
  font-size: 11px;
  font-weight: 600;
  border-radius: 100px;
  padding: 10px 14px;
}
.onboarding-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 25px;
  text-align: center;
  min-height: 380px;
  color: #a187b9;
}
.onboarding-empty h2 {
  font-size: 25px;
  color: #4b365e;
  letter-spacing: -0.8px;
  margin: 18px 0 8px;
}
.onboarding-empty p {
  max-width: 340px;
  font-size: 13px;
  line-height: 1.8;
  margin: 0 0 22px;
}
.chatheading {
  display: flex;
  align-items: center;
  gap: 9px;
}
.chat-empty .text-button {
  font-size: 12px;
  margin-top: 13px;
}
.section-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 15px;
}
.section-heading h3 {
  margin-top: 0;
}
.section-heading p {
  margin: 7px 0 15px;
}
.section-heading .primary {
  flex-shrink: 0;
}
.friend-name {
  flex: 1;
  display: grid;
  gap: 5px;
}
.friend-name small {
  color: #a18eb0;
  font-size: 10px;
}
.empty-call-dock {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 20px;
  text-align: left;
  background: #f0e8fc;
}
.empty-call-dock > div {
  flex: 1;
}
.empty-call-dock h3 {
  font-size: 14px;
  margin: 0 0 4px;
  letter-spacing: 0;
}
.empty-call-dock p {
  font-size: 11px;
  margin: 0;
}
.empty-call-dock .primary {
  margin: 0;
  font-size: 11px;
  padding: 10px 15px;
}
.call-dock .call-collapsed {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
}
.call-dock .call-collapsed .call-room-heading {
  border: 0;
  padding: 12px 18px;
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-start;
  gap: 9px 14px;
}
.call-dock .call-collapsed .call-room-heading h2 {
  font-size: 14px;
}
.call-dock .call-collapsed .call-toolbar {
  border: 0;
  padding: 10px 12px;
  flex-wrap: nowrap;
  gap: 7px;
}
.call-dock .call-collapsed .call-control {
  min-width: 65px;
  padding: 9px 8px;
  font-size: 9px;
  gap: 5px;
}
.call-dock .call-collapsed .call-control svg {
  width: 17px;
  height: 17px;
}
.call-dock .call-collapsed .call-join {
  font-size: 11px;
  padding: 12px 20px;
}
.call-collapsed .people-strip {
  display: none;
}
.call-dock .call-collapsed > .call-privacy,
.call-dock .call-collapsed > .error,
.call-dock .call-collapsed > .audio-resume {
  grid-column: 1/-1;
}
.video-toggle {
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
  font-size: 10px;
  border: 0;
  background: #f4eefb;
  color: #9275b3;
  border-radius: 100px;
  padding: 6px 9px;
}
.call-dock .call-stage {
  min-height: 250px;
}
.call-dock .video-stage video-player {
  max-width: 360px;
}
.call-panel .empty-space:not(.empty-call-dock) {
  padding: 45px 22px;
}
.call-panel .empty-space > svg {
  flex-shrink: 0;
}
.mao-dialog {
  border: 1px solid #e4d8f0;
  border-radius: 22px;
  background: #fffcff;
  color: #574262;
  box-shadow: 0 25px 100px #34204b33;
  max-width: 480px;
  width: calc(100% - 32px);
  max-height: 90dvh;
  padding: 26px;
  overflow: auto;
}
.mao-dialog::backdrop {
  background: #30243f66;
  backdrop-filter: blur(4px);
}
.dialog-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.dialog-heading h2 {
  font-size: 24px;
  letter-spacing: -0.8px;
  margin: 0;
  font-weight: 700;
}
.dialog-form {
  display: grid;
  gap: 20px;
  margin-top: 13px;
}
.dialog-form > p {
  font-size: 13px;
  color: #9b86ac;
  line-height: 1.8;
  margin: 0;
}
.dialog-form label {
  display: grid;
  gap: 9px;
  font-size: 12px;
  font-weight: 600;
}
.dialog-form input {
  width: 100%;
  padding: 13px;
  background: #f8f3ff;
}
.dialog-form > small {
  font-size: 10px;
  line-height: 1.7;
  color: #a28bb7;
}
.dialog-form .error {
  margin: 0;
  color: #a43c5c;
}
.dialog-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 8px;
}
.secondary {
  border: 1px solid #e7ddf1;
  background: #fff;
  color: #9b86ac;
  border-radius: 9px;
  padding: 11px 17px;
  font-size: 12px;
}
.look-fieldset {
  border: 0;
  margin: 0;
  padding: 0;
  min-width: 0;
}
.look-fieldset legend {
  font-size: 11px;
  font-weight: 600;
  margin-bottom: 10px;
  color: #937ba7;
}
.look-options {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.look-options button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  background: #f7f1fc;
  border: 2px solid transparent;
  border-radius: 11px;
  width: 49px;
  height: 44px;
  font-size: 21px;
}
.look-options button.chosen {
  border-color: #ac88d8;
  background: #ede1fc;
}
.look-options button.tone-choice {
  width: auto;
  padding: 0 10px;
  font-size: 10px;
  text-transform: capitalize;
}
.tone-swatch {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #ba9ee7;
}
.tone-choice[data-tone="peach"] .tone-swatch {
  background: #e7b495;
}
.tone-choice[data-tone="mint"] .tone-swatch {
  background: #9fcfb8;
}
.tone-choice[data-tone="sky"] .tone-swatch {
  background: #9cc6e2;
}
.friend-suggestions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.friend-suggestions button {
  background: #f0e6fc;
  border: 0;
  color: #8962b2;
  padding: 8px 11px;
  font-size: 11px;
  border-radius: 100px;
}
.form-tip {
  font-size: 11px !important;
}
.desktop-actions button:focus-visible,
.room-chip:focus-visible,
.new-room:focus-visible,
.friends-button:focus-visible,
.look-options button:focus-visible {
  outline: 2px solid #9e7ac8;
  outline-offset: 3px;
}
@media (max-width: 900px) {
  .pc-mode .hangout-main {
    padding: 14px 20px;
  }
  .call-dock .call-collapsed {
    grid-template-columns: minmax(0, 1fr) auto;
  }
  .desktop-actions button {
    padding: 9px 7px;
    font-size: 10px;
  }
  .desktopbar {
    padding: 0 12px;
  }
  .call-dock .call-collapsed .connection {
    display: none;
  }
  .section-heading {
    flex-wrap: wrap;
  }
  .call-dock .call-collapsed .call-control {
    min-width: 52px;
    font-size: 8px;
  }
  .call-dock .call-collapsed .call-room-heading {
    gap: 8px;
    padding: 10px 12px;
  }
  .call-dock .call-collapsed .call-room-heading h2 {
    font-size: 12px;
  }
}
@media (max-width: 600px) {
  .app-header {
    height: auto;
    min-height: 118px;
  }
  .pc-mode .hangout-main {
    padding: 12px 12px 20px;
  }
  .pc-mode .room-picker {
    gap: 9px;
    margin-bottom: 10px;
    flex-direction: column;
    align-items: stretch;
  }
  .pc-mode .room-actions {
    justify-content: flex-end;
  }
  .room-actions {
    align-self: flex-end;
  }
  .room-picker .invite {
    align-self: auto;
  }
  .room-chips {
    gap: 6px;
  }
  .room-chip,
  .new-room {
    padding: 8px 11px;
  }
  .desktopbar {
    flex-wrap: wrap;
    padding: 9px 10px;
    gap: 5px;
    align-items: center;
    flex-direction: row;
  }
  .desktop-actions {
    margin-left: auto;
    gap: 0;
  }
  .desktop-actions button {
    padding: 8px 6px;
    font-size: 9px;
    gap: 4px;
  }
  .desktop-actions button svg {
    width: 13px;
  }
  .desktop-actions button:last-child span {
    max-width: 65px;
    line-height: 1.3;
  }
  .desktopbar small {
    display: none;
  }
  .desktop-frame {
    height: calc(100dvh - 330px);
    min-height: 350px;
  }
  .desktop-tip {
    font-size: 9px;
    padding: 8px 10px;
  }
  .desktop-tip > span {
    display: none;
  }
  .pc-focus .desktop-frame {
    height: calc(100dvh - 260px);
    min-height: 390px;
  }
  .desktopbody.pc-away {
    min-height: 390px;
  }
  .desktopcontent {
    padding: 25px 18px;
  }
  .welcome-tip {
    padding: 13px;
    gap: 10px;
    flex-wrap: wrap;
    font-size: 11px;
  }
  .welcome-tip > svg {
    display: none;
  }
  .welcome-tip button {
    padding: 9px 12px;
    font-size: 10px;
  }
  .call-dock .call-collapsed {
    grid-template-columns: 1fr;
  }
  .call-dock .call-collapsed .call-room-heading {
    padding: 10px 12px 0;
    justify-content: space-between;
  }
  .call-dock .call-collapsed .call-toolbar {
    justify-content: flex-start;
    padding: 10px 12px;
  }
  .call-dock .call-collapsed .call-control {
    min-width: 54px;
    max-width: none;
    font-size: 9px;
  }
  .call-dock .call-collapsed .call-join {
    padding: 10px 18px;
  }
  .call-dock .call-collapsed .connection {
    display: flex;
    font-size: 8px;
    margin-left: auto;
  }
  .call-dock .call-collapsed .video-toggle {
    font-size: 9px;
  }
  .empty-call-dock {
    padding: 13px;
    gap: 10px;
    flex-wrap: wrap;
  }
  .empty-call-dock > svg {
    width: 24px;
  }
  .empty-call-dock h3 {
    font-size: 12px;
  }
  .empty-call-dock p {
    font-size: 10px;
  }
  .empty-call-dock .primary {
    margin-left: 34px;
    font-size: 10px;
    padding: 9px 13px;
  }
  .friends-button {
    font-size: 10px;
    padding: 8px;
    gap: 5px;
  }
  .mao-dialog {
    padding: 22px;
  }
  .dialog-heading h2 {
    font-size: 22px;
  }
  .look-options {
    gap: 6px;
  }
  .look-options button {
    width: 40px;
    height: 40px;
    font-size: 18px;
  }
  .look-options button.tone-choice {
    padding: 0 8px;
    font-size: 9px;
  }
  .onboarding-empty {
    min-height: 330px;
    padding: 35px 20px;
  }
  .onboarding-empty h2 {
    font-size: 23px;
  }
  .onboarding-empty p {
    font-size: 12px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .spinner {
    animation: none;
  }
}
.room-chip > span {
  display: inline-flex;
  align-items: center;
}
.look-options button > svg {
  flex-shrink: 0;
}

.participant-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(130px,1fr)); gap:12px; padding:16px; }
.participant-tile { display:flex; flex-direction:column; align-items:center; gap:8px; padding:20px 12px; border:2px solid transparent; background:#f0edf9; border-radius:20px; text-align:center; }
.participant-tile.speaking { border-color:#6c54c7; background:#e7e0fc; }
.participant-avatar { display:grid; place-items:center; width:54px; height:54px; border-radius:50%; background:#d7caf7; color:#493778; font-weight:800; }
.participant-tile small { color:#625876; }
.vm-share-panel, .audio-settings { padding:16px; background:#f6f3ff; border-radius:18px; margin:12px; }
.vm-share-panel > button { display:inline-flex; align-items:center; gap:8px; padding:10px 14px; margin:4px; border-radius:12px; background:white; border:1px solid #d7cfec; }
.vm-watch iframe { display:block; width:100%; height:clamp(240px,50vh,650px); border:0; border-radius:14px; background:#181624; }
.vm-watch small { display:block; margin-top:8px; }
.audio-settings label { display:flex; flex-direction:column; gap:6px; margin:10px 0; font-weight:600; }
.audio-settings select { max-width:100%; padding:10px; border:1px solid #d7cfec; border-radius:10px; background:white; }
.call-toolbar { flex-wrap:wrap; }
.call-help { padding:0 16px; color:#625876; font-size:12px; line-height:1.6; }
.call-stage-placeholder[hidden] { display:none; }
.participant-grid { width:100%; }
.participant-tile { color:#382c50; }
