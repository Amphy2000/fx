import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, MicOff, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

interface VoiceTradeLoggerProps {
  onTradeDataParsed: (data: any) => void;
}

// Extend Window interface for Speech Recognition
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export const VoiceTradeLogger = ({ onTradeDataParsed }: VoiceTradeLoggerProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check if Speech Recognition is supported
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    // Initialize Speech Recognition
    const recognition = new SpeechRecognition();
    recognition.continuous = false; // Changed to false for cleaner results
    recognition.interimResults = false; // Only final results
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      const result = event.results[0][0].transcript;
      setTranscript(result);
      setIsRecording(false);
      
      // Automatically process after recording stops
      setTimeout(() => {
        processTranscript(result);
      }, 100);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'no-speech') {
        toast.error("No speech detected", {
          description: "Please try speaking again"
        });
      } else if (event.error === 'aborted') {
        // User stopped manually, ignore
      } else {
        toast.error("Speech recognition error", {
          description: event.error
        });
      }
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
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

  const startRecording = async () => {
    if (!isSupported) {
      toast.error("Speech recognition not supported", {
        description: "Try using Chrome, Edge, or Safari"
      });
      return;
    }

    try {
      setTranscript("");
      setIsProcessing(false);
      recognitionRef.current.start();
      setIsRecording(true);
      toast.success("Listening...", {
        description: "Say: 'Long EUR/USD at 1.0850, stop 1.0800, target 1.0950, feeling confident, it was a win, followed my setup'"
      });
    } catch (error) {
      console.error("Error starting recognition:", error);
      toast.error("Could not start recording");
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current && isRecording) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.error("Error stopping recognition:", e);
      }
      setIsRecording(false);
    }
  };

  const processTranscript = async (text: string) => {
    if (!text.trim()) {
      toast.error("No speech detected", {
        description: "Please try again and speak clearly"
      });
      return;
    }

    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('parse-voice-trade', {
        body: { transcript: text }
      });

      if (error) {
        if ((error as any)?.status === 402) {
          toast.error("Insufficient credits", {
            description: "You need 1 credit to parse voice trades. Upgrade to continue.",
            action: { label: "Upgrade", onClick: () => window.location.href = "/pricing" }
          });
          return;
        }
        throw error;
      }

      if (data?.tradeData) {
        onTradeDataParsed(data.tradeData);
        toast.success("Trade data extracted from voice!", {
          description: "Form populated automatically"
        });
      }
    } catch (error: any) {
      console.error("Error parsing transcript:", error);
      toast.error("Failed to parse trade details", {
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
            Voice Recognition Unavailable
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
              <Mic className="h-5 w-5 text-primary" />
              Voice Trade Logger
            </CardTitle>
            <CardDescription>
              Speak ALL trade details: pair, direction, prices, result, emotions & notes
            </CardDescription>
          </div>
          <Badge variant="outline" className="gap-1 bg-primary/10 text-primary border-primary/20">
            <Sparkles className="h-3 w-3" />
            1 credit
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isProcessing}
            variant={isRecording ? "destructive" : "default"}
            className="flex-1"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Parsing trade...
              </>
            ) : isRecording ? (
              <>
                <MicOff className="mr-2 h-4 w-4" />
                Stop & Parse
              </>
            ) : (
              <>
                <Mic className="mr-2 h-4 w-4" />
                Speak Trade
              </>
            )}
          </Button>
        </div>

        {/* Example phrases to help users */}
        <div className="p-3 bg-muted/50 rounded-lg border border-border/50">
          <p className="text-xs font-semibold mb-2 text-foreground">Example phrases:</p>
          <ul className="text-xs space-y-1 text-muted-foreground">
            <li>• "Long EUR/USD at 1.0850, stop 1.0800, target 1.0950, feeling confident"</li>
            <li>• "Sold gold at 2050, stop 2060, target 2030, was anxious, it was a loss"</li>
            <li>• "Bought GBP/USD 1.2650, stop 1.2620, still open, felt disciplined"</li>
          </ul>
          <p className="text-xs mt-2 text-muted-foreground italic">
            Tip: Include emotions before/after and any notes about your setup or mistakes
          </p>
        </div>

        {transcript && !isProcessing && (
          <>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-1">Heard:</p>
              <p className="text-sm text-muted-foreground">{transcript}</p>
            </div>
            <Button
              onClick={() => processTranscript(transcript)}
              variant="outline"
              size="sm"
              disabled={isProcessing}
              className="w-full"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Parsing...
                </>
              ) : (
                "Parse Again"
              )}
            </Button>
          </>
        )}

        <div className="text-xs text-muted-foreground space-y-1">
          <p className="font-medium">Example phrases:</p>
          <ul className="list-disc list-inside space-y-0.5 ml-2">
            <li>"Long EUR/USD at 1.0950, stop 1.0920, target 1.1000"</li>
            <li>"Short gold at 2050, stop loss 2060, take profit 2030"</li>
            <li>"Buy GBP/USD 1.2650, SL 1.2620, TP 1.2700"</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
