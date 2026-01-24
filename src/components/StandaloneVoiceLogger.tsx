import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Mic, MicOff, Loader2, Sparkles, CheckCircle2, Shield } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { callAI } from "@/utils/ai-bridge";
import { TradeInterceptorModal } from './TradeInterceptorModal';

// Extend Window interface for Speech Recognition
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export const StandaloneVoiceLogger = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isSupported, setIsSupported] = useState(true);
  const [savedTrade, setSavedTrade] = useState<any>(null);
  const [parsedData, setParsedData] = useState<any>(null);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + ' ';
        }
      }
      if (finalTranscript) {
        setTranscript(prev => prev + finalTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'no-speech') {
        toast.error("No speech detected", { description: "Please try speaking again" });
      } else if (event.error !== 'aborted') {
        toast.error("Speech recognition error", { description: event.error });
      }
      setIsRecording(false);
    };

    recognition.onend = () => setIsRecording(false);
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
      setSavedTrade(null);
      recognitionRef.current.start();
      setIsRecording(true);
      toast.success("Listening...", {
        description: "Speak your trade details clearly"
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

  const handleValidateTrade = async () => {
    if (!parsedData) return;

    try {
      setIsValidating(true);

      const { data, error } = await supabase.functions.invoke('validate-trade', {
        body: {
          proposedTrade: {
            pair: parsedData.pair,
            direction: parsedData.direction,
            entry_price: parsedData.entry_price,
            stop_loss: parsedData.stop_loss,
            take_profit: parsedData.take_profit,
            session: parsedData.session,
            emotion_before: parsedData.emotion_before,
          }
        }
      });

      if (error) {
        if (error.message.includes('Insufficient credits')) {
          toast.error('Insufficient AI credits for validation');
        } else {
          throw error;
        }
        return;
      }

      setValidationResult(data);
      setShowValidationModal(true);

    } catch (error: any) {
      console.error('Validation error:', error);
      toast.error(error.message || 'Failed to validate trade');
    } finally {
      setIsValidating(false);
    }
  };

  const processTranscript = async (text: string) => {
    if (!text.trim()) {
      toast.error("No speech detected", { description: "Please try again and speak clearly" });
      return;
    }

    setIsProcessing(true);

    try {
      // Parse voice to trade data
      const { data: parseData, error: parseError } = await supabase.functions.invoke('parse-voice-trade', {
        body: { transcript: text }
      });

      if (parseError) {
        if ((parseError as any)?.status === 402) {
          toast.error("Insufficient credits", {
            description: "You need credits to parse voice trades. Upgrade to continue.",
            action: {
              label: "Upgrade",
              onClick: () => window.location.href = "/pricing"
            }
          });
          return;
        }
        throw parseError;
      }

      if (!parseData?.tradeData) {
        throw new Error("No trade data extracted");
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const tradeData = parseData.tradeData;
      setParsedData(tradeData);

      // Validate required fields
      if (!tradeData.pair || !tradeData.direction) {
        throw new Error("Could not extract trade pair or direction. Please speak more clearly.");
      }

      // Save trade directly to database
      const { data: trade, error: insertError } = await supabase
        .from('trades')
        .insert({
          user_id: user.id,
          pair: tradeData.pair,
          direction: tradeData.direction,
          entry_price: tradeData.entry_price || null,
          stop_loss: tradeData.stop_loss || null,
          take_profit: tradeData.take_profit || null,
          exit_price: tradeData.exit_price || null,
          profit_loss: tradeData.profit_loss || null,
          result: tradeData.result || 'open',
          emotion_before: tradeData.emotion_before || null,
          emotion_after: tradeData.emotion_after || null,
          notes: tradeData.notes || null,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setSavedTrade(trade);
      toast.success("Trade logged successfully! 🎉", {
        description: `${tradeData.direction} ${tradeData.pair} saved`
      });

      // Trigger AI analysis in background (don't await to avoid blocking)
      // Trigger AI analysis in background
      callAI('analyze-trade', {
        tradeId: trade.id
      }).catch((error) => {
        console.error("AI analysis error:", error);
      });

    } catch (error: any) {
      console.error("Error processing voice trade:", error);
      toast.error("Failed to save trade", {
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
              Speak your trade details - AI saves it automatically
            </CardDescription>
          </div>
          <Badge variant="outline" className="gap-1 bg-primary/10 text-primary border-primary/20">
            <Sparkles className="h-3 w-3" />
            5 credits
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!savedTrade ? (
          <>
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
                    Processing & Saving...
                  </>
                ) : isRecording ? (
                  <>
                    <MicOff className="mr-2 h-4 w-4" />
                    Stop Recording
                  </>
                ) : (
                  <>
                    <Mic className="mr-2 h-4 w-4" />
                    Start Recording
                  </>
                )}
              </Button>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg border border-border/50 space-y-3">
              <div>
                <p className="text-sm font-semibold mb-2 text-foreground">How to log trades with voice:</p>
                <p className="text-xs text-muted-foreground mb-3">
                  Just speak naturally! Include the pair, direction (buy/sell/long/short), and any prices or results you remember.
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold mb-2 text-foreground">Example phrases:</p>
                <ul className="text-xs space-y-2 text-muted-foreground">
                  <li className="flex gap-2">
                    <span className="text-primary">•</span>
                    <span>"I went long EUR/USD at 1.0850, stop loss 1.0800, take profit 1.0950, feeling confident"</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary">•</span>
                    <span>"Sold gold at 2050, stop at 2060, closed at 2031, made 380 dollars profit, was anxious before but relieved after the win"</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary">•</span>
                    <span>"Bought GBP/USD at 1.2650 with stop at 1.2620, got stopped out at 1.2615, lost 70 dollars, felt impulsive when entering"</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary">•</span>
                    <span>"Short on Bitcoin, entry 45000, still holding the position, feeling neutral"</span>
                  </li>
                </ul>
              </div>

              <div className="pt-2 border-t border-border/30">
                <p className="text-xs font-medium text-primary mb-1">💡 Pro Tips:</p>
                <ul className="text-xs space-y-1 text-muted-foreground">
                  <li>• Always mention the <strong>pair</strong> (e.g., EUR/USD, gold) and <strong>direction</strong> (buy/sell/long/short)</li>
                  <li>• Include prices when you remember them (entry, stop, target, exit)</li>
                  <li>• Mention profit/loss amounts if the trade is closed</li>
                  <li>• Share your emotions before and after for better insights</li>
                  <li>• Add any notes about market conditions or your reasoning</li>
                </ul>
              </div>
            </div>

            {transcript && !isRecording && (
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Review & Edit Transcript:
                  </label>
                  <Textarea
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    disabled={isProcessing}
                    placeholder="Your transcript will appear here..."
                    className="min-h-[120px] resize-none"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Review and edit if needed, validate, or process immediately
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleValidateTrade}
                    disabled={isValidating || !parsedData}
                    variant="secondary"
                    className="flex-1"
                  >
                    {isValidating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Validating...
                      </>
                    ) : (
                      <>
                        <Shield className="mr-2 h-4 w-4" />
                        Validate Trade
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => processTranscript(transcript)}
                    disabled={isProcessing || !transcript.trim()}
                    className="flex-1"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Save Trade
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8 space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">Trade Logged!</h3>
              <p className="text-muted-foreground">
                {savedTrade.direction} {savedTrade.pair} saved successfully
              </p>
            </div>
            <Button onClick={() => {
              setSavedTrade(null);
              setTranscript("");
            }} className="w-full">
              Log Another Trade
            </Button>
          </div>
        )}
      </CardContent>

      <TradeInterceptorModal
        open={showValidationModal}
        onOpenChange={setShowValidationModal}
        validationResult={validationResult}
        onProceed={async () => {
          setShowValidationModal(false);
          await processTranscript(transcript);
        }}
        onCancel={() => {
          setShowValidationModal(false);
          toast.info('Trade validation cancelled');
        }}
      />
    </Card>
  );
};
