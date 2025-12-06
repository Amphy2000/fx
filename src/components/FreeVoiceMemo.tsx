import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mic, Square, Trash2, Save, Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { VoiceMemoPlayer } from "./VoiceMemoPlayer";

interface FreeVoiceMemoProps {
  tradeId?: string;
  onMemoSaved?: () => void;
  onParseWithAI?: (audioBlob: Blob) => void;
  compact?: boolean;
}

export const FreeVoiceMemo = ({ 
  tradeId, 
  onMemoSaved,
  onParseWithAI,
  compact = false 
}: FreeVoiceMemoProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const requestPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setHasPermission(true);
      return true;
    } catch (error) {
      setHasPermission(false);
      toast.error("Microphone access denied");
      return false;
    }
  };

  const startRecording = async () => {
    const permitted = hasPermission ?? await requestPermission();
    if (!permitted) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingTime(0);
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error: any) {
      toast.error("Failed to start recording");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const discardRecording = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
  };

  const saveMemo = async () => {
    if (!audioBlob) return;

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileName = `${user.id}/${Date.now()}.webm`;
      
      const { error: uploadError } = await supabase.storage
        .from("voice-memos")
        .upload(fileName, audioBlob);

      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase
        .from("voice_memos")
        .insert({
          user_id: user.id,
          trade_id: tradeId || null,
          storage_path: fileName,
          duration: recordingTime
        });

      if (insertError) throw insertError;

      toast.success("Voice memo saved!");
      discardRecording();
      onMemoSaved?.();
    } catch (error: any) {
      toast.error(error.message || "Failed to save memo");
    } finally {
      setIsSaving(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {!audioBlob ? (
          <Button
            variant={isRecording ? "destructive" : "outline"}
            size="sm"
            onClick={isRecording ? stopRecording : startRecording}
            className="gap-1"
          >
            {isRecording ? (
              <>
                <Square className="h-3 w-3" />
                {formatTime(recordingTime)}
              </>
            ) : (
              <>
                <Mic className="h-3 w-3" />
                Voice Memo
              </>
            )}
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <VoiceMemoPlayer audioUrl={audioUrl!} duration={recordingTime} compact />
            <Button variant="ghost" size="icon" onClick={discardRecording}>
              <Trash2 className="h-3 w-3" />
            </Button>
            <Button variant="default" size="sm" onClick={saveMemo} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mic className="h-5 w-5 text-primary" />
          <h4 className="font-medium">Voice Memo</h4>
          <Badge variant="secondary" className="text-xs">Free</Badge>
        </div>
      </div>

      {!audioBlob ? (
        <div className="flex flex-col items-center gap-4 py-6">
          <motion.button
            onClick={isRecording ? stopRecording : startRecording}
            className={`p-6 rounded-full transition-colors ${
              isRecording 
                ? "bg-red-500 hover:bg-red-600" 
                : "bg-primary hover:bg-primary/90"
            }`}
            whileTap={{ scale: 0.95 }}
            animate={isRecording ? { scale: [1, 1.1, 1] } : {}}
            transition={isRecording ? { repeat: Infinity, duration: 1 } : {}}
          >
            {isRecording ? (
              <Square className="h-8 w-8 text-white" />
            ) : (
              <Mic className="h-8 w-8 text-white" />
            )}
          </motion.button>
          
          {isRecording && (
            <div className="text-center">
              <p className="text-2xl font-mono">{formatTime(recordingTime)}</p>
              <p className="text-sm text-muted-foreground">Recording...</p>
            </div>
          )}
          
          {!isRecording && (
            <p className="text-sm text-muted-foreground text-center">
              Tap to record a voice note about your trade
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <VoiceMemoPlayer audioUrl={audioUrl!} duration={recordingTime} />
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={discardRecording}
              className="flex-1"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Discard
            </Button>
            <Button
              variant="default"
              onClick={saveMemo}
              disabled={isSaving}
              className="flex-1"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Memo
            </Button>
          </div>

          {onParseWithAI && (
            <Button
              variant="secondary"
              onClick={() => onParseWithAI(audioBlob)}
              className="w-full"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Parse with AI (1 credit)
            </Button>
          )}
        </div>
      )}
    </Card>
  );
};
