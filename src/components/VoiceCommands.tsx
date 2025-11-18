import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, MicOff, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

interface VoiceCommandsProps {
  onCommandExecuted?: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export const VoiceCommands = ({ onCommandExecuted }: VoiceCommandsProps) => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isSupported, setIsSupported] = useState(true);
  const [lastResult, setLastResult] = useState<string>("");
  const recognitionRef = useRef<any>(null);

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
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      const result = event.results[0][0].transcript;
      setTranscript(result);
      setIsListening(false);
      
      setTimeout(() => {
        processCommand(result);
      }, 100);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'no-speech') {
        toast.error("No speech detected");
      } else if (event.error !== 'aborted') {
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
        } catch (e) {
          // Ignore if already stopped
        }
      }
    };
  }, []);

  const startListening = async () => {
    if (!isSupported) {
      toast.error("Speech recognition not supported", {
        description: "Try using Chrome, Edge, or Safari"
      });
      return;
    }

    try {
      setTranscript("");
      setLastResult("");
      setIsProcessing(false);
      recognitionRef.current.start();
      setIsListening(true);
      toast.success("Listening...", {
        description: "Try: 'delete last trade', 'show my wins this week', 'count trades today'"
      });
    } catch (error) {
      console.error("Error starting recognition:", error);
      toast.error("Could not start listening");
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.error("Error stopping recognition:", e);
      }
      setIsListening(false);
    }
  };

  const processCommand = async (command: string) => {
    if (!command.trim()) {
      toast.error("No command detected");
      return;
    }

    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('voice-command', {
        body: { command }
      });

      if (error) throw error;

      if (data?.success) {
        setLastResult(data.message);
        toast.success("Command executed!", {
          description: data.message
        });
        
        // Refresh data if needed
        if (onCommandExecuted && (data.action === 'delete' || data.action === 'show')) {
          onCommandExecuted();
        }
      } else {
        toast.error("Command failed", {
          description: data?.message || "Please try again"
        });
      }
    } catch (error: any) {
      console.error("Error processing command:", error);
      toast.error("Failed to process command", {
        description: error.message || "Please try again"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isSupported) {
    return (
      <Card className="border-destructive/20 bg-destructive/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <MicOff className="h-5 w-5" />
            Voice Commands Unavailable
          </CardTitle>
          <CardDescription>
            Your browser doesn't support speech recognition. Please use Chrome, Edge, or Safari.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Voice Commands
            </CardTitle>
            <CardDescription>
              Control your trades with voice commands
            </CardDescription>
          </div>
          <Badge variant="outline" className="gap-1 bg-primary/10 text-primary border-primary/20">
            <Mic className="h-3 w-3" />
            AI Powered
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button
            onClick={isListening ? stopListening : startListening}
            disabled={isProcessing}
            variant={isListening ? "destructive" : "default"}
            className="flex-1"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : isListening ? (
              <>
                <MicOff className="mr-2 h-4 w-4" />
                Stop Listening
              </>
            ) : (
              <>
                <Mic className="mr-2 h-4 w-4" />
                Start Voice Command
              </>
            )}
          </Button>
        </div>

        {transcript && (
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm font-medium mb-1">Heard:</p>
            <p className="text-sm text-muted-foreground">{transcript}</p>
          </div>
        )}

        {lastResult && (
          <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
            <p className="text-sm font-medium mb-1">Result:</p>
            <p className="text-sm">{lastResult}</p>
          </div>
        )}

        <div className="text-xs text-muted-foreground space-y-1">
          <p className="font-medium">Example commands:</p>
          <ul className="list-disc list-inside space-y-0.5 ml-2">
            <li>"Delete last trade"</li>
            <li>"Show my wins this week"</li>
            <li>"Count trades today"</li>
            <li>"Show recent trades"</li>
            <li>"Show my stats this month"</li>
            <li>"Mark last trade as win"</li>
            <li>"Close trade with profit 50"</li>
            <li>"Mark last as loss"</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
