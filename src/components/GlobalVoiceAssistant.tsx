import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, MicOff, X, Minimize2, Maximize2, Volume2, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}
export const GlobalVoiceAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [commandHistory, setCommandHistory] = useState<Array<{
    command: string;
    result: string;
    timestamp: Date;
  }>>([]);
  const [isSupported, setIsSupported] = useState(true);
  const [isRecentCommandsOpen, setIsRecentCommandsOpen] = useState(false);
  const recognitionRef = useRef<any>(null);
  const navigate = useNavigate();
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.onresult = (event: any) => {
      const result = event.results[0][0].transcript;
      setTranscript(result);
      setIsListening(false);
      processCommand(result);
    };
    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error !== 'aborted' && event.error !== 'no-speech') {
        toast.error("Speech recognition error");
      }
      setIsListening(false);
    };
    recognition.onend = () => {
      setIsListening(false);
    };
    recognitionRef.current = recognition;
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, []);
  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.1;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };
  const startListening = () => {
    if (!isSupported) {
      toast.error("Voice commands not supported in your browser");
      return;
    }
    try {
      setTranscript("");
      recognitionRef.current.start();
      setIsListening(true);
    } catch (error) {
      console.error("Error starting recognition:", error);
    }
  };
  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      setIsListening(false);
    }
  };
  const processCommand = async (command: string) => {
    setIsProcessing(true);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke('voice-command', {
        body: {
          command
        }
      });
      if (error) throw error;
      if (data?.success) {
        toast.success(data.message);
        speak(data.message);

        // Handle navigation
        if (data.action === 'navigate' && data.data?.destination) {
          const routes: Record<string, string> = {
            'dashboard': '/',
            'journal': '/journal',
            'trades': '/',
            'analytics': '/analytics',
            'targets': '/targets',
            'achievements': '/achievements',
            'leaderboard': '/leaderboard',
            'streaks': '/streaks',
            'settings': '/settings',
            'pricing': '/pricing',
            'integrations': '/integrations'
          };
          const route = routes[data.data.destination];
          if (route) {
            navigate(route);
          }
        }

        // Handle export
        if (data.action === 'export' && data.data?.format) {
          const format = data.data.format === 'csv' ? 'csv' : 'json';
          const exportData = await supabase.functions.invoke('export-user-data', {
            body: {
              format
            }
          });
          if (exportData.data) {
            const blob = new Blob([exportData.data.data], {
              type: format === 'csv' ? 'text/csv' : 'application/json'
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `backup-${Date.now()}.${format}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }
        }
        setCommandHistory(prev => [{
          command,
          result: data.message,
          timestamp: new Date()
        }, ...prev.slice(0, 9)]);
      } else {
        toast.error(data?.message || "Command failed");
        speak(data?.message || "I couldn't process that command");
      }
    } catch (error: any) {
      console.error("Command processing error:", error);
      toast.error("Failed to process command");
      speak("I couldn't process that command");
    } finally {
      setIsProcessing(false);
      setTranscript("");
    }
  };
  if (!isOpen) {
    return <Button onClick={() => setIsOpen(true)} size="icon" className="fixed bottom-24 right-6 h-14 w-14 rounded-full shadow-lg z-50">
        <Mic className="h-6 w-6" />
      </Button>;
  }
  if (isMinimized) {
    return <Card className="fixed bottom-24 right-6 w-72 shadow-2xl z-50">
        <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm">Voice Assistant</CardTitle>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsMinimized(false)}>
              <Maximize2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <Button onClick={isListening ? stopListening : startListening} disabled={isProcessing} className="w-full" variant={isListening ? "destructive" : "default"}>
            {isListening ? <MicOff className="h-4 w-4 mr-2" /> : <Mic className="h-4 w-4 mr-2" />}
            {isListening ? "Stop" : "Speak"}
          </Button>
        </CardContent>
      </Card>;
  }
  return <Card className="fixed bottom-24 right-6 w-[95vw] max-w-96 max-h-[85vh] md:max-h-[600px] shadow-2xl z-50 flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 px-4 py-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Volume2 className="h-4 w-4 text-primary" />
            Voice Assistant
          </CardTitle>
          <CardDescription className="text-xs">Control your app with voice commands</CardDescription>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsMinimized(true)}>
            <Minimize2 className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsOpen(false)}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto space-y-3 px-4 pb-4">
        <div className="space-y-2">
          <Button onClick={isListening ? stopListening : startListening} disabled={isProcessing} className="w-full h-14" variant={isListening ? "destructive" : "default"} size="lg">
            {isListening ? <>
                <MicOff className="h-5 w-5 mr-2 animate-pulse" />
                Listening...
              </> : <>
                <Mic className="h-5 w-5 mr-2" />
                {isProcessing ? "Processing..." : "Tap to Speak"}
              </>}
          </Button>

          {transcript && <div className="p-2.5 bg-primary/10 border border-primary/20 rounded-lg">
              <p className="text-xs font-medium mb-1">You said:</p>
              <p className="text-xs">{transcript}</p>
            </div>}
        </div>

        {commandHistory.length > 0 && <Collapsible open={isRecentCommandsOpen} onOpenChange={setIsRecentCommandsOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-medium hover:text-primary transition-colors">
              <span>Recent Commands ({commandHistory.length})</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${isRecentCommandsOpen ? 'rotate-180' : ''}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <div className="space-y-2 max-h-40 overflow-y-auto scrollbar-thin">
                {commandHistory.map((item, idx) => <div key={idx} className="p-2 bg-muted/50 rounded-lg text-xs space-y-1">
                    <p className="font-medium">{item.command}</p>
                    <p className="text-muted-foreground">{item.result}</p>
                  </div>)}
              </div>
            </CollapsibleContent>
          </Collapsible>}

        <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
          <p className="font-medium">Example commands:</p>
          <ul className="list-disc list-inside space-y-0.5 ml-2">
            <li>"Go to journal"</li>
            <li>"Show my analytics"</li>
            <li>"What's my current streak?"</li>
            <li>"Show my recent trades"</li>
            <li>"Mark last trade as win"</li>
            <li>"Close my trade with profit 100"</li>
            <li>"Delete last trade"</li>
            <li>"Show my stats for this week"</li>
          </ul>
        </div>
      </CardContent>
    </Card>;
};