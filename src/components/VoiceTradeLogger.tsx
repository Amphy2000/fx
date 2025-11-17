import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, MicOff, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

interface VoiceTradeLoggerProps {
  onTradeDataParsed: (data: any) => void;
}

export const VoiceTradeLogger = ({ onTradeDataParsed }: VoiceTradeLoggerProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast.success("Recording started - speak your trade details");
    } catch (error) {
      console.error("Error accessing microphone:", error);
      toast.error("Could not access microphone");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    try {
      // Convert blob to base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1];
        
        const { data, error } = await supabase.functions.invoke('voice-trade-parser', {
          body: { audio: base64Audio }
        });

        if (error) {
          if ((error as any)?.status === 402) {
            toast.error("Insufficient credits", {
              description: "You need 1 credit to use voice logging. Upgrade to continue.",
              action: { label: "Upgrade", onClick: () => window.location.href = "/pricing" }
            });
            return;
          }
          throw error;
        }

        if (data?.tradeData) {
          setTranscript(data.transcript);
          onTradeDataParsed(data.tradeData);
          toast.success("Trade data extracted from voice", {
            description: "Form populated automatically!"
          });
        }
      };
    } catch (error: any) {
      console.error("Error processing audio:", error);
      toast.error("Failed to process voice recording", {
        description: error.message || "Please try again"
      });
    } finally {
      setIsProcessing(false);
    }
  };

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
              Speak your trade details hands-free
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
          {!isRecording ? (
            <Button
              onClick={startRecording}
              disabled={isProcessing}
              className="flex-1"
              size="lg"
            >
              <Mic className="mr-2 h-4 w-4" />
              Start Recording
            </Button>
          ) : (
            <Button
              onClick={stopRecording}
              variant="destructive"
              className="flex-1"
              size="lg"
            >
              <MicOff className="mr-2 h-4 w-4" />
              Stop Recording
            </Button>
          )}
        </div>

        {isProcessing && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            Processing your voice...
          </div>
        )}

        {transcript && (
          <div className="mt-4 p-4 bg-muted/30 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Transcript:</p>
            <p className="text-sm">{transcript}</p>
          </div>
        )}

        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>Example:</strong> "Long EURUSD at 1.0950, stop at 1.0920, target 1.1000"</p>
          <p>The AI will automatically parse pair, direction, entry, stop loss, and take profit</p>
        </div>
      </CardContent>
    </Card>
  );
};