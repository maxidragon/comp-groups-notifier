import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
//eslint-disable-next-line
//@ts-ignore
import "@cubing/icons";
import { getAnnouncementsSocket } from "../lib/socket";
import type { Language, AnnounceType } from "../lib/announcements";
import {
  buildAnnouncementText,
  buildNamesText,
  EVENT_NAMES,
  getVoicesForLanguage,
  parseActivityCode,
  playAttentionChime,
  speakText,
} from "../lib/announcements";

interface PublicCompetition {
  id: string;
  wcaId: string;
  name: string;
  countryIso2?: string;
  currentGroupId?: string;
}

interface AnnouncementEvent {
  type: AnnounceType;
  activityCode: string;
  activityName: string;
  competitionId: string;
  competitionName: string;
  timestamp: number;
  names?: string[];
}

interface AnnouncementLogEntry extends AnnouncementEvent {
  text: string;
}


// const TYPE_LABELS_PL: Record<AnnounceType, string> = {
//   all: "Cała grupa",
//   judges: "Sędziowie",
//   competitors: "Zawodnicy",
//   scramblers: "Scramblerzy",
//   runners: "Runnerzy",
// };
// const TYPE_LABELS_EN: Record<AnnounceType, string> = {
//   all: "Full group",
//   judges: "Judges",
//   competitors: "Competitors",
//   scramblers: "Scramblers",
//   runners: "Runners",
// };

function EventIcon({ eventId }: { eventId: string }) {
  return (
    <span
      className={`cubing-icon event-${eventId}`}
      style={{ fontSize: "4.5rem" }}
    />
  );
}

export default function CompetitionLivePage() {
  const { id } = useParams<{ id: string }>();
  const [comp, setComp] = useState<PublicCompetition | null>(null);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState<Language>("pl");
  const [log, setLog] = useState<AnnouncementLogEntry[]>([]);
  // const [lastAnnouncement, setLastAnnouncement] =
  //   useState<AnnouncementLogEntry | null>(null);
  const [connected, setConnected] = useState(false);
  const [flash, setFlash] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const logBottomRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<Language>(language);
  langRef.current = language;
  const voiceRef = useRef<string>(selectedVoice);
  voiceRef.current = selectedVoice;

  // Load/reload voice list when language changes or voices become available
  useEffect(() => {
    const load = () => {
      const list = getVoicesForLanguage(language);
      setVoices(list);
      // Auto-select first voice only if nothing chosen yet for this language
      setSelectedVoice((prev) => {
        const stillValid = list.some((v) => v.name === prev);
        return stillValid ? prev : (list[0]?.name ?? '');
      });
    };
    load();
    window.speechSynthesis.addEventListener('voiceschanged', load);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', load);
  }, [language]);


  // Fetch initial competition data
  useEffect(() => {
    fetch(`/api/public/competitions/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then(setComp)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  // WebSocket connection
  useEffect(() => {
    if (!id) return;
    const socket = getAnnouncementsSocket();

    const onConnect = () => {
      setConnected(true);
      socket.emit("join", id);
    };
    const onDisconnect = () => setConnected(false);
    const onAnnouncement = (event: AnnouncementEvent) => {
      const text = buildAnnouncementText(
        event.type,
        event.activityCode,
        langRef.current,
      );
      const namesText = buildNamesText(
        event.names ?? [],
        event.type,
        langRef.current,
      );
      console.log(namesText);
      const fullText = text + namesText;
      const entry: AnnouncementLogEntry = { ...event, text: fullText };


      // Update competition state
      setComp((prev) =>
        prev ? { ...prev, currentGroupId: event.activityCode } : prev,
      );
      // setLastAnnouncement(entry);
      setLog((prev) => [entry, ...prev].slice(0, 20));

      // Flash effect
      setFlash(true);
      setTimeout(() => setFlash(false), 1500);

      // Play chime, then speak after it finishes (~2.2 s)
      // Chrome locks the audio pipeline while AudioContext is active,
      // so we must wait for the chime to end before calling speechSynthesis.
      playAttentionChime();
      setTimeout(() => speakText(fullText, langRef.current, voiceRef.current || undefined), 2200);
    };

    // Silent group update — just refresh the displayed group, no sound
    const onGroupUpdated = (event: { activityCode: string }) => {
      setComp((prev) =>
        prev ? { ...prev, currentGroupId: event.activityCode } : prev,
      );
    };

    if (socket.connected) onConnect();
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("announcement", onAnnouncement);
    socket.on("group_updated", onGroupUpdated);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("announcement", onAnnouncement);
      socket.off("group_updated", onGroupUpdated);
      socket.emit("leave", id);
    };
  }, [id]);

  // Scroll log to top when new entry
  useEffect(() => {
    logBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [log]);

  const parsedCurrent = comp?.currentGroupId
    ? parseActivityCode(comp.currentGroupId)
    : null;

  // const typeLabels = language === "pl" ? TYPE_LABELS_PL : TYPE_LABELS_EN;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!comp) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
        <p className="text-red-400 font-medium">Competition not found</p>
        <Link to="/live" className="btn-secondary">
          ← Back
        </Link>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen bg-slate-950 transition-colors duration-300 ${flash ? "bg-indigo-950" : ""}`}
    >
      {/* Flash overlay */}
      {flash && (
        <div className="fixed inset-0 pointer-events-none z-50 bg-indigo-500/10 animate-pulse" />
      )}

      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-indigo-600/8 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              to="/live"
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              <svg
                className="w-4 h-4 text-slate-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 19.5L8.25 12l7.5-7.5"
                />
              </svg>
            </Link>
            <div>
              <h1 className="font-bold text-white text-lg leading-tight">
                {comp.name}
              </h1>
              <p className="text-xs text-slate-500">{comp.wcaId}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* Connection status */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${connected
                ? "bg-green-500/10 border-green-500/30 text-green-400"
                : "bg-red-500/10 border-red-500/30 text-red-400"
                }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-green-400 animate-pulse" : "bg-red-400"}`}
              />
              {connected ? "Live" : "Offline"}
            </div>
            {/* Language switcher */}
            <div className="flex rounded-lg overflow-hidden border border-white/10">
              {(["pl", "en"] as Language[]).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={`px-2.5 py-1 text-xs font-medium transition-colors ${language === lang
                    ? "bg-indigo-600 text-white"
                    : "bg-white/5 text-slate-400 hover:text-slate-200"
                    }`}
                >
                  {lang.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Voice picker — shown when browser exposes multiple voices */}
        {voices.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 shrink-0">
              🔊 {language === 'pl' ? 'Głos' : 'Voice'}
            </span>
            <select
              value={selectedVoice}
              onChange={(e) => setSelectedVoice(e.target.value)}
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1
                text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50
                cursor-pointer"
            >
              {voices.map((v) => (
                <option key={v.name} value={v.name} className="bg-slate-900">
                  {v.name}{v.localService ? '' : ' ☁'}
                </option>
              ))}
            </select>
            <button
              onClick={() => speakText(language === 'pl' ? 'Test głosu' : 'Voice test', language, selectedVoice || undefined)}
              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10
                text-xs text-slate-400 hover:text-slate-200 transition-colors shrink-0"
            >
              {language === 'pl' ? 'Testuj' : 'Test'}
            </button>
          </div>
        )}

        {/* Current group hero */}
        <div
          className={`card transition-all duration-500 ${comp.currentGroupId
            ? "border-green-500/30 bg-green-500/5 glow-indigo"
            : "border-white/10"
            }`}
        >
          {comp.currentGroupId && parsedCurrent ? (
            <div className="text-center space-y-6 py-10">

              <div className="flex flex-col items-center gap-3">
                <div style={{ width: 88, height: 88 }}>
                  <EventIcon eventId={parsedCurrent.eventId} />
                </div>
              </div>
              <div>
                <p className="text-4xl font-black text-white tracking-tight leading-none">
                  {(EVENT_NAMES["title"] as Record<string, string>)[parsedCurrent.eventId]}
                </p>
                <p className="text-5xl font-black text-white tracking-tight leading-none">
                  {language === "pl" ? "Runda" : "Round"} {parsedCurrent.round}
                </p>
                <p className="text-6xl font-black text-white tracking-tight leading-none">
                  {language === "pl" ? "Grupa" : "Group"} {parsedCurrent.group}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-slate-400 text-lg">
                {language === "pl"
                  ? "Oczekiwanie na ogłoszenie grupy…"
                  : "Waiting for group announcement…"}
              </p>
            </div>
          )}
        </div>

        {/* Last announcement text (big readable text) */}
        {/* {lastAnnouncement && (
          <div className="card border-indigo-500/20 bg-indigo-500/5">
            <p className="text-slate-300 text-base leading-relaxed text-center">
              {lastAnnouncement.text}
            </p>
          </div>
        )} */}

        {/* Announcement log */}
        {/* {log.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
              {language === "pl" ? "Historia ogłoszeń" : "Announcement log"}
            </p>
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {log.map((entry, i) => (
                <div
                  key={entry.timestamp + i}
                  className={`px-4 py-2.5 rounded-xl text-sm border transition-all ${i === 0
                    ? "bg-indigo-500/10 border-indigo-500/20 text-slate-200"
                    : "bg-white/3 border-white/5 text-slate-500"
                    }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate">{entry.text}</span>
                    <span className="text-xs text-slate-600 shrink-0">
                      {new Date(entry.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              ))}
              <div ref={logBottomRef} />
            </div>
          </div>
        )} */}
      </div>
    </div>
  );
}
