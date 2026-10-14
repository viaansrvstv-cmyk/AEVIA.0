import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Mic } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { parseVoiceCommand, type VoiceAction, type VoiceRoute } from "@/lib/voice-commands";

type SpeechAlternative = { transcript: string };
type SpeechResult = ArrayLike<SpeechAlternative> & { isFinal?: boolean };
type SpeechResultEvent = Event & { results: ArrayLike<SpeechResult>; resultIndex?: number };
type SpeechErrorEvent = Event & { error: string };
type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: SpeechResultEvent) => void) | null;
  onerror: ((event: SpeechErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
type RecognitionConstructor = new () => Recognition;
type SpeechWindow = Window & {
  SpeechRecognition?: RecognitionConstructor;
  webkitSpeechRecognition?: RecognitionConstructor;
};

type VoiceCommandButtonProps = {
  language: "en-IN" | "en-US";
  voiceFeedback: boolean;
  onCommand: (action: VoiceAction) => string;
};

const HELP_MESSAGE =
  "Try “open Home”, “show me World Explorer”, “dark mode”, “open Settings”, or “turn Air Cursor off”.";

function getRecognitionError(error: string) {
  switch (error) {
    case "not-allowed":
    case "service-not-allowed":
      return "Microphone access is blocked. Allow it in your browser’s site settings, then try again.";
    case "audio-capture":
      return "No microphone was found. Check your microphone and try again.";
    case "network":
      return "The browser’s speech service is unavailable. Check your connection and try again.";
    case "no-speech":
      return "I didn’t hear speech. Try again and speak after the mic starts listening.";
    default:
      return "Voice recognition stopped. Please try again.";
  }
}

function speakResponse(text: string, language: string) {
  if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = language;
  utterance.rate = 1;
  const voice = window.speechSynthesis
    .getVoices()
    .find((candidate) => candidate.lang.toLowerCase() === language.toLowerCase());
  if (voice) utterance.voice = voice;
  window.speechSynthesis.speak(utterance);
}

export function VoiceCommandButton({
  language,
  voiceFeedback,
  onCommand,
}: VoiceCommandButtonProps) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<Recognition | null>(null);
  const receivedResult = useRef(false);
  const routeHistory = useRef<string[]>([]);

  useEffect(() => {
    const speechWindow = window as SpeechWindow;
    setSupported(Boolean(speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition));
  }, []);

  useEffect(() => {
    const history = routeHistory.current;
    if (history.at(-1) !== pathname) history.push(pathname);
    if (history.length > 24) history.shift();
  }, [pathname]);

  useEffect(
    () => () => {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    },
    [],
  );

  const runCommand = useCallback(
    (action: VoiceAction) => {
      if (action.kind === "navigate" && action.label === "back") {
        const history = routeHistory.current;
        if (history.length > 1) history.pop();
        const previous = history.at(-1);
        const knownRoutes: VoiceRoute[] = [
          "/",
          "/ar-labs",
          "/crime-report",
          "/ai-news",
          "/ai-intelligence",
          "/world-explorer",
        ];
        const target = knownRoutes.includes(previous as VoiceRoute)
          ? (previous as VoiceRoute)
          : "/";
        void navigate({ to: target });
        return "Going back";
      }
      return onCommand(action);
    },
    [navigate, onCommand],
  );

  const startRecognition = () => {
    if (recognitionRef.current) {
      receivedResult.current = true;
      recognitionRef.current.stop();
      setListening(false);
      toast("Voice command stopped");
      return;
    }

    const speechWindow = window as SpeechWindow;
    const Constructor = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Constructor) {
      setSupported(false);
      toast("Voice commands need a supported browser, such as Chrome or Edge");
      return;
    }

    let recognition: Recognition;
    try {
      recognition = new Constructor();
    } catch {
      toast("Voice recognition could not start in this browser");
      return;
    }

    recognition.lang = language;
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.maxAlternatives = 4;
    receivedResult.current = false;
    recognitionRef.current = recognition;

    recognition.onstart = () => setListening(true);
    recognition.onresult = (event) => {
      const startAt = Math.max(0, event.resultIndex ?? 0);
      const alternatives: string[] = [];
      for (let index = startAt; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (!result || result.isFinal === false) continue;
        for (let alt = 0; alt < result.length; alt += 1) {
          const transcript = result[alt]?.transcript?.trim();
          if (transcript) alternatives.push(transcript);
        }
      }
      if (alternatives.length === 0) return;

      receivedResult.current = true;
      const parsed = alternatives.map(parseVoiceCommand).find((action) => action !== null);
      if (!parsed) {
        const heard = alternatives[0];
        const message = `I heard “${heard},” but don’t have an action for that. ${HELP_MESSAGE}`;
        toast(message);
        if (voiceFeedback)
          speakResponse(
            "I heard you, but I don't have an action for that. " + HELP_MESSAGE,
            language,
          );
      } else {
        const message = runCommand(parsed);
        toast(message);
        if (voiceFeedback) speakResponse(message, language);
      }
      recognition.stop();
    };
    recognition.onerror = (event) => {
      if (event.error === "aborted") return;
      receivedResult.current = true;
      setListening(false);
      toast(getRecognitionError(event.error));
    };
    recognition.onend = () => {
      if (!receivedResult.current) toast("I didn’t hear speech. Tap the mic and try again.");
      recognitionRef.current = null;
      setListening(false);
    };

    try {
      recognition.start();
      setListening(true);
      toast(
        `Listening in ${language === "en-IN" ? "English (India)" : "English (US)"}. Say “open Home”.`,
      );
    } catch {
      recognitionRef.current = null;
      setListening(false);
      toast("Voice recognition could not start. Check microphone permission and try again.");
    }
  };

  if (!supported) return null;

  return (
    <Button
      type="button"
      variant={listening ? "secondary" : "ghost"}
      size="icon"
      className={`size-9 shrink-0 rounded-full ${listening ? "text-primary" : ""}`}
      aria-label={listening ? "Stop voice commands" : "Start voice command"}
      aria-pressed={listening}
      title={
        listening
          ? "Listening · say a page or setting, or click to stop"
          : `Voice commands · ${language === "en-IN" ? "English (India)" : "English (US)"}`
      }
      onClick={startRecognition}
    >
      <Mic className={`size-4 ${listening ? "animate-pulse" : ""}`} />
    </Button>
  );
}
