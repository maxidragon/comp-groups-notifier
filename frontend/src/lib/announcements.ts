export type Language = "pl" | "en";
export type AnnounceType =
  | "all"
  | "judges"
  | "competitors"
  | "scramblers"
  | "runners";

// ─── Event name maps ───────────────────────────────────────────────────────────

// Polish names are in the genitive case — they always follow "Zapraszamy … <konkurencji>".
export const EVENT_NAMES: Record<Language | "title", Record<string, string>> = {
  pl: {
    "333": "kostki trzy na trzy",
    "222": "kostki dwa na dwa",
    "444": "kostki cztery na cztery",
    "555": "kostki pięć na pięć",
    "666": "kostki sześć na sześć",
    "777": "kostki siedem na siedem",
    "333bf": "kostki trzy na trzy bez patrzenia",
    "333fm": "kostki trzy na trzy rozwiązywanej w najmniejszej liczbie ruchów",
    "333oh": "kostki trzy na trzy jedną ręką",
    clock: "clocka",
    minx: "megaminxa",
    pyram: "pyraminxa",
    skewb: "skewba",
    sq1: "square one",
    "444bf": "kostki cztery na cztery bez patrzenia",
    "555bf": "kostki pięć na pięć bez patrzenia",
    "333mbf": "multiblinda",
  },
  en: {
    "333": "three by three",
    "222": "two by two",
    "444": "four by four",
    "555": "five by five",
    "666": "six by six",
    "777": "seven by seven",
    "333bf": "three by three blindfolded",
    "333fm": "fewest moves",
    "333oh": "three by three one-handed",
    clock: "clock",
    minx: "megaminx",
    pyram: "pyraminx",
    skewb: "skewb",
    sq1: "square one",
    "444bf": "four by four blindfolded",
    "555bf": "five by five blindfolded",
    "333mbf": "multi blind",
  },
  title: {
    "333": "3x3x3",
    "222": "2x2x2",
    "444": "4x4x4",
    "555": "5x5x5",
    "666": "6x6x6",
    "777": "7x7x7",
    "333bf": "3x3x3 BLD",
    "333fm": "3x3x3 FM",
    "333oh": "3x3x3 OH",
    clock: "Clock",
    minx: "Megaminx",
    pyram: "Pyraminx",
    skewb: "Skewb",
    sq1: "SQ-1",
    "444bf": "4x4x4 BLD",
    "555bf": "5x5x5 BLD",
    "333mbf": "3x3x3 MBLD",
  },
};

// ─── Activity code parser ──────────────────────────────────────────────────────

export function parseActivityCode(code: string) {
  const parts = code.split("-");
  const eventId = parts[0];
  const roundPart = parts.find((p) => p.startsWith("r"));
  const groupPart = parts.find((p) => p.startsWith("g"));
  return {
    eventId,
    round: roundPart ? parseInt(roundPart.slice(1)) : null,
    group: groupPart ? parseInt(groupPart.slice(1)) : null,
  };
}

// ─── Polish ordinal numbers (genitive feminine) ───────────────────────────────
// Used after "rundy" and "grupy" which are genitive of feminine nouns.

const PL_ORD_ONES = [
  "", "pierwszej", "drugiej", "trzeciej", "czwartej", "piątej",
  "szóstej", "siódmej", "ósmej", "dziewiątej",
];
const PL_ORD_TEENS = [
  "dziesiątej", "jedenastej", "dwunastej", "trzynastej", "czternastej",
  "piętnastej", "szesnastej", "siedemnastej", "osiemnastej", "dziewiętnastej",
];
const PL_ORD_TENS = [
  "", "", "dwudziestej", "trzydziestej", "czterdziestej", "pięćdziesiątej",
  "sześćdziesiątej", "siedemdziesiątej", "osiemdziesiątej", "dziewięćdziesiątej",
];

function toPolishOrdinalGenF(n: number): string {
  if (n >= 10 && n < 20) return PL_ORD_TEENS[n - 10];
  const ten = Math.floor(n / 10);
  const one = n % 10;
  if (ten === 0) return PL_ORD_ONES[one] || String(n);
  if (!PL_ORD_TENS[ten]) return String(n); // out of range (100+) — read as a digit
  if (one === 0) return PL_ORD_TENS[ten];
  return `${PL_ORD_TENS[ten]} ${PL_ORD_ONES[one]}`;
}

// ─── Text builder ──────────────────────────────────────────────────────────────

export function buildAnnouncementText(
  type: AnnounceType,
  activityCode: string,
  language: Language,
): string {
  const { eventId, round, group } = parseActivityCode(activityCode);
  const eventName = EVENT_NAMES[language][eventId] ?? eventId;

  if (language === "pl") {
    const roundStr = round ? `rundy ${toPolishOrdinalGenF(round)}` : "";
    const groupStr = group ? `grupy ${toPolishOrdinalGenF(group)}` : "";
    const which = [eventName, roundStr, groupStr].filter(Boolean).join(", ");

    const texts: Record<AnnounceType, string> = {
      all: `Uwaga! Zapraszamy ${which}. Zawodników prosimy o oddanie kostek do mieszania, a osoby funkcyjne o zgłoszenie się do swoich ról.`,
      judges: `Zapraszamy sędziów ${which} na stanowiska sędziowskie.`,
      competitors: `Zapraszamy zawodników ${which} do poczekalni.`,
      scramblers: `Zapraszamy mieszaczy ${which} do stolika mieszania.`,
      runners: `Zapraszamy runnerów ${which} na stanowiska.`,
    };
    return texts[type] ?? texts.all;
  } else {
    const roundStr = round ? `round ${round}` : "";
    const groupStr = group ? `group ${group}` : "";
    const which = [eventName, roundStr, groupStr].filter(Boolean).join(", ");

    const texts: Record<AnnounceType, string> = {
      all: `Attention! We are calling ${which}. Competitors please proceed to the waiting area. Judges and scramblers please proceed to your stations. Runners please be ready.`,
      judges: `Judges for ${which}, please proceed to your stations.`,
      competitors: `Competitors for ${which}, please proceed to the waiting area.`,
      scramblers: `Scramblers for ${which}, please proceed to the scrambling table.`,
      runners: `Runners for ${which}, please be ready.`,
    };
    return texts[type] ?? texts.all;
  }
}

/** Join a list so it reads naturally when spoken: "A, B i C" / "A, B and C". */
function joinNames(names: string[], language: Language): string {
  if (names.length < 2) return names.join("");
  const conjunction = language === "pl" ? "i" : "and";
  return `${names.slice(0, -1).join(", ")} ${conjunction} ${names[names.length - 1]}`;
}

/**
 * Build the "name-reading" suffix appended after the main announcement.
 * e.g. " Zawodnicy: Jan Kowalski, Anna Nowak i Piotr Wiśniewski."
 */
export function buildNamesText(
  names: string[],
  type: AnnounceType,
  language: Language,
): string {
  if (!names.length) return "";
  const joined = joinNames(names, language);
  if (language === "pl") {
    // Labels start a new sentence, so they are capitalised.
    const intro: Partial<Record<AnnounceType, string>> = {
      all: "Zawodnicy",
      competitors: "Zawodnicy",
      judges: "Sędziowie",
      scramblers: "Mieszacze",
      runners: "Runnerzy",
    };
    const label = intro[type] ?? "Osoby";
    return ` ${label}: ${joined}.`;
  }
  const intro: Partial<Record<AnnounceType, string>> = {
    all: "Competitors",
    competitors: "Competitors",
    judges: "Judges",
    scramblers: "Scramblers",
    runners: "Runners",
  };
  const label = intro[type] ?? "Persons";
  return ` ${label}: ${joined}.`;
}

// ─── Attention chime (Web Audio API) ──────────────────────────────────────────
// Three-note E-major arpeggio (E5 → G#5 → B5) with bell harmonics and reverb

export function playAttentionChime(): void {
  try {
    const ctx = new AudioContext();

    // Master output with gentle limiter
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.55, ctx.currentTime);
    master.connect(ctx.destination);

    // Light reverb: simple delay feedback loop
    const delay = ctx.createDelay(0.6);
    delay.delayTime.value = 0.11;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.22;
    const delayOut = ctx.createGain();
    delayOut.gain.value = 0.28;
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(delayOut);
    delayOut.connect(master);

    // E-major chord notes — arpeggio with slight delay between each
    const notes = [
      { freq: 659.25, start: 0.0, decay: 1.1 }, // E5
      { freq: 830.61, start: 0.28, decay: 1.1 }, // G#5
      { freq: 987.77, start: 0.56, decay: 1.6 }, // B5 (longest — resolve)
    ];

    notes.forEach(({ freq, start, decay }) => {
      // ── Fundamental sine (body of the bell)
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      osc.connect(g);
      g.connect(master);
      g.connect(delay); // send to reverb
      g.gain.setValueAtTime(0, ctx.currentTime + start);
      g.gain.linearRampToValueAtTime(0.28, ctx.currentTime + start + 0.006); // soft percussive attack
      g.gain.exponentialRampToValueAtTime(
        0.001,
        ctx.currentTime + start + decay,
      );
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + decay + 0.05);

      // ── Inharmonic bell partial at 2.756× fundamental (classic bell timbre)
      const osc2 = ctx.createOscillator();
      const g2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.value = freq * 2.756;
      osc2.connect(g2);
      g2.connect(master);
      g2.gain.setValueAtTime(0, ctx.currentTime + start);
      g2.gain.linearRampToValueAtTime(0.07, ctx.currentTime + start + 0.004);
      g2.gain.exponentialRampToValueAtTime(
        0.001,
        ctx.currentTime + start + decay * 0.35,
      );
      osc2.start(ctx.currentTime + start);
      osc2.stop(ctx.currentTime + start + decay * 0.4);

      // ── Soft high shimmer at 5.4× (adds air without harshness)
      const osc3 = ctx.createOscillator();
      const g3 = ctx.createGain();
      osc3.type = "sine";
      osc3.frequency.value = freq * 5.4;
      osc3.connect(g3);
      g3.connect(master);
      g3.gain.setValueAtTime(0, ctx.currentTime + start);
      g3.gain.linearRampToValueAtTime(0.025, ctx.currentTime + start + 0.003);
      g3.gain.exponentialRampToValueAtTime(
        0.001,
        ctx.currentTime + start + decay * 0.15,
      );
      osc3.start(ctx.currentTime + start);
      osc3.stop(ctx.currentTime + start + decay * 0.2);
    });

    setTimeout(() => ctx.close(), 2000);
  } catch {
    // AudioContext not available (blocked or SSR)
  }
}

// ─── Text-to-speech ──────────────────────────────────────────────────────────

// Preferred neural voice names per language — these are Edge's free "Online (Natural)"
// voices, which are the same models as Azure Neural TTS served through the browser.
const PREFERRED_PL = ["zofia", "marek"];
const PREFERRED_EN = ["jenny", "aria", "guy", "natasha", "ryan"];

function scoreVoice(v: SpeechSynthesisVoice, preferred: string[]): number {
  const name = v.name.toLowerCase();
  const preferredIdx = preferred.findIndex((p) => name.includes(p));
  if (preferredIdx !== -1) return 100 - preferredIdx; // highest: exact preferred name
  if (name.includes("natural")) return 50;            // any "Online (Natural)" voice
  if (!v.localService) return 20;                     // other cloud voice
  return 0;                                           // local (robotic)
}

/** Returns voices for the given language, best quality first.
 *  Edge/Chrome neural cloud voices ("Online (Natural)") are ranked above local ones. */
export function getVoicesForLanguage(
  language: Language,
): SpeechSynthesisVoice[] {
  const langPrefix = language === "pl" ? "pl" : "en";
  const preferred = language === "pl" ? PREFERRED_PL : PREFERRED_EN;
  return window.speechSynthesis
    .getVoices()
    .filter((v) => v.lang.toLowerCase().startsWith(langPrefix))
    .sort((a, b) => scoreVoice(b, preferred) - scoreVoice(a, preferred));
}

function pickVoice(
  language: Language,
  voiceName?: string,
): SpeechSynthesisVoice | undefined {
  if (voiceName) {
    const match = window.speechSynthesis
      .getVoices()
      .find((v) => v.name === voiceName);
    if (match) return match;
  }
  return getVoicesForLanguage(language)[0];
}

// Known Polish TTS mispronunciations → phonetic replacements.
// Only applied to the spoken text; displayed text is unchanged.
// Matching is case-insensitive; the original capitalisation is preserved so that
// sentence-initial labels ("Mieszacze: …") stay capitalised after substitution.
const PL_TTS_FIXES: [RegExp, string][] = [
  [/mieszaczy\b/gi, "scramblerów"],
  [/mieszacze\b/gi, "scramblerzy"],
];

function matchCase(source: string, replacement: string): string {
  if (source[0] !== source[0].toUpperCase()) return replacement;
  return replacement[0].toUpperCase() + replacement.slice(1);
}

function normalizePlTts(text: string): string {
  return PL_TTS_FIXES.reduce(
    (t, [re, sub]) => t.replace(re, (match) => matchCase(match, sub)),
    text,
  );
}

// Names that look like Roman numerals or abbreviations and get misread by TTS.
// We insert a zero-width non-joiner (U+200C) after the first letter so the
// engine no longer matches the numeral pattern, while pronunciation is unchanged.
const ROMAN_NUMERAL_NAMES = new Set([
  "xi", "xii", "xiii", "xiv", "xv", "xvi", "xvii", "xviii", "xix", "xx",
  "li", "lv", "lx", "lxi", "iv", "vi", "vii", "viii", "ix",
  "di", "ci",
]);

function normalizeNames(text: string): string {
  // Match word-boundary tokens that are all ASCII letters (names, not numbers)
  return text.replace(/\b([A-Za-z]+)\b/g, (word) => {
    if (ROMAN_NUMERAL_NAMES.has(word.toLowerCase())) {
      // Insert zero-width non-joiner after first char — breaks numeral pattern
      return word[0] + "‌" + word.slice(1);
    }
    return word;
  });
}

export function speakText(
  text: string,
  language: Language,
  voiceName?: string,
): void {
  if (!("speechSynthesis" in window)) return;

  let called = false;

  const doSpeak = () => {
    if (called) return;
    called = true;

    const synth = window.speechSynthesis;

    // Chrome bug: after AudioContext usage the synth can end up in a
    // "paused" state and silently drop speak() calls.
    if (synth.paused) synth.resume();
    synth.cancel();

    // Give cancel() a tick to flush, then enqueue the utterance
    setTimeout(() => {
      const spokenText = normalizeNames(
        language === "pl" ? normalizePlTts(text) : text,
      );
      const utterance = new SpeechSynthesisUtterance(spokenText);
      utterance.lang = language === "pl" ? "pl-PL" : "en-US";
      utterance.rate = 0.92;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      const voice = pickVoice(language, voiceName);
      if (voice) utterance.voice = voice;

      synth.speak(utterance);
    }, 80);
  };

  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    doSpeak();
  } else {
    // Voices load asynchronously — wait for the event, with a fallback timer
    window.speechSynthesis.addEventListener("voiceschanged", doSpeak, {
      once: true,
    });
    setTimeout(doSpeak, 400);
  }
}
