import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Image as ImageIcon, X } from "lucide-react";
import { updateStreak, checkTradeAchievements } from "@/utils/streakManager";
import { VoiceTradeLogger } from "@/components/VoiceTradeLogger";

interface TradeFormProps {
  onTradeAdded: () => void;
}

const TradeForm = ({ onTradeAdded }: TradeFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [screenshots, setScreenshots] = useState<File[]>([]);
  const [screenshotPreviews, setScreenshotPreviews] = useState<string[]>([]);
  const [showVoiceLogger, setShowVoiceLogger] = useState(false);
  const [formData, setFormData] = useState({
    pair: "",
    direction: "buy",
    entry_price: "",
    stop_loss: "",
    take_profit: "",
    exit_price: "",
    result: "open",
    profit_loss: "",
    notes: "",
    emotion_before: "",
    emotion_after: "",
  });

  const handleVoiceData = (voiceData: any) => {
    setFormData(prev => ({
      ...prev,
      pair: voiceData.pair || prev.pair,
      direction: voiceData.direction || prev.direction,
      entry_price: voiceData.entry_price || prev.entry_price,
      stop_loss: voiceData.stop_loss || prev.stop_loss,
      take_profit: voiceData.take_profit || prev.take_profit,
    }));
    setShowVoiceLogger(false);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (screenshots.length + files.length > 5) {
      toast.error("Maximum 5 images allowed");
      return;
    }

    const validFiles = files.filter(file => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is too large. Maximum 5MB per image`);
        return false;
      }
      return true;
    });

    if (validFiles.length > 0) {
      setScreenshots(prev => [...prev, ...validFiles]);
      
      validFiles.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setScreenshotPreviews(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }

    // Reset input
    e.target.value = '';
  };

  const removeImage = (index: number) => {
    setScreenshots(prev => prev.filter((_, i) => i !== index));
    setScreenshotPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data: { session } } = await supabase.auth.getSession();

      let screenshotUrls: string[] = [];
      const uploadedFiles: { path: string; name: string; size: number }[] = [];

      // Upload screenshots if provided
      if (screenshots.length > 0) {
        for (const screenshot of screenshots) {
          const fileExt = screenshot.name.split('.').pop();
          const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage
            .from('trade-screenshots')
            .upload(fileName, screenshot);

          if (uploadError) {
            console.error("Upload error:", uploadError);
            toast.error("AI is feeling sleepy 😴... Could not upload image right now.");
            continue;
          }

          uploadedFiles.push({ path: fileName, name: screenshot.name, size: screenshot.size });

          // Use signed URLs for private bucket (1 hour expiry)
          const { data: signedUrlData, error: signedUrlError } = await supabase.storage
            .from('trade-screenshots')
            .createSignedUrl(fileName, 3600);

          if (signedUrlError) {
            console.error("Signed URL error:", signedUrlError);
            continue;
          }

          screenshotUrls.push(signedUrlData.signedUrl);
        }
      }

      const tradeData = {
        user_id: user.id,
        pair: formData.pair,
        direction: formData.direction,
        entry_price: parseFloat(formData.entry_price),
        stop_loss: formData.stop_loss ? parseFloat(formData.stop_loss) : null,
        take_profit: formData.take_profit ? parseFloat(formData.take_profit) : null,
        exit_price: formData.exit_price ? parseFloat(formData.exit_price) : null,
        result: formData.result,
        profit_loss: formData.profit_loss ? parseFloat(formData.profit_loss) : null,
        notes: formData.notes || null,
        emotion_before: formData.emotion_before || null,
        emotion_after: formData.emotion_after || null,
        screenshot_url: screenshotUrls.length > 0 ? screenshotUrls.join(',') : null,
      };

      const { data: newTrade, error } = await supabase
        .from("trades")
        .insert(tradeData)
        .select()
        .single();

      if (error) throw error;

      // Save screenshot metadata to trade_screenshots table
      if (uploadedFiles.length > 0 && newTrade) {
        const screenshotMetadata = uploadedFiles.map((f) => ({
          trade_id: newTrade.id,
          user_id: user.id,
          storage_path: f.path,
          file_name: f.name,
          file_size: f.size,
        }));

        await supabase.from("trade_screenshots").insert(screenshotMetadata);
      }

      toast.success("Trade logged successfully! Getting AI feedback...");

      // Get AI feedback
      try {
        const { data: aiData, error: aiError } = await supabase.functions.invoke('analyze-trade', {
          body: { trade: tradeData }
        });

        if (aiError) throw aiError;

        if (aiData?.feedback) {
          toast.success(aiData.feedback, { duration: 8000 });
        }
      } catch (aiError) {
        console.error("AI analysis error:", aiError);
      }

      // Send Telegram notification in background (don't wait for it)
      supabase.functions.invoke('send-telegram-notification', {
        body: { trade: tradeData },
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined
      }).catch(error => {
        console.error("Error sending Telegram notification:", error);
      });

      setFormData({
        pair: "",
        direction: "buy",
        entry_price: "",
        stop_loss: "",
        take_profit: "",
        exit_price: "",
        result: "open",
        profit_loss: "",
        notes: "",
        emotion_before: "",
        emotion_after: "",
      });
      setScreenshots([]);
      setScreenshotPreviews([]);
      
      // Update streak and check achievements
      await updateStreak(user.id, 'trade_journal');
      await checkTradeAchievements(user.id);
      
      onTradeAdded();
    } catch (error: any) {
      toast.error(error.message || "Failed to log trade");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Log New Trade
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowVoiceLogger(!showVoiceLogger)}
          >
            {showVoiceLogger ? "Hide" : "Voice Logger"}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {showVoiceLogger && (
          <div className="mb-6">
            <VoiceTradeLogger onTradeDataParsed={handleVoiceData} />
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pair">Pair</Label>
            <Input
              id="pair"
              placeholder="EUR/USD, XAU/USD"
              value={formData.pair}
              onChange={(e) => setFormData({ ...formData, pair: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="direction">Direction</Label>
            <Select
              value={formData.direction}
              onValueChange={(value) => setFormData({ ...formData, direction: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="buy">Buy</SelectItem>
                <SelectItem value="sell">Sell</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="entry_price">Entry Price</Label>
            <Input
              id="entry_price"
              type="number"
              step="0.00001"
              placeholder="1.08500"
              value={formData.entry_price}
              onChange={(e) => setFormData({ ...formData, entry_price: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stop_loss">Stop Loss</Label>
              <Input
                id="stop_loss"
                type="number"
                step="0.00001"
                placeholder="1.08000"
                value={formData.stop_loss}
                onChange={(e) => setFormData({ ...formData, stop_loss: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="take_profit">Take Profit</Label>
              <Input
                id="take_profit"
                type="number"
                step="0.00001"
                placeholder="1.09000"
                value={formData.take_profit}
                onChange={(e) => setFormData({ ...formData, take_profit: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="result">Result</Label>
            <Select
              value={formData.result}
              onValueChange={(value) => setFormData({ ...formData, result: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="win">Win</SelectItem>
                <SelectItem value="loss">Loss</SelectItem>
                <SelectItem value="breakeven">Breakeven</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.result !== "open" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="exit_price">Exit Price</Label>
                <Input
                  id="exit_price"
                  type="number"
                  step="0.00001"
                  placeholder="1.08750"
                  value={formData.exit_price}
                  onChange={(e) => setFormData({ ...formData, exit_price: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="profit_loss">Profit/Loss ($)</Label>
                <Input
                  id="profit_loss"
                  type="number"
                  step="0.01"
                  placeholder="150.00"
                  value={formData.profit_loss}
                  onChange={(e) => setFormData({ ...formData, profit_loss: e.target.value })}
                />
              </div>
            </>
          )}

          {/* Emotion Tracking */}
          <div className="space-y-4 pt-4 border-t border-border/30">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              🧘 Emotional Tracking
            </h3>
            
            <div className="space-y-2">
              <Label htmlFor="emotion_before">Emotion Before Trade</Label>
              <Select
                value={formData.emotion_before}
                onValueChange={(value) => setFormData({ ...formData, emotion_before: value })}
              >
                <SelectTrigger id="emotion_before" className="bg-card border-border/50">
                  <SelectValue placeholder="Select emotion..." />
                </SelectTrigger>
                <SelectContent className="bg-card border-border/50">
                  <SelectItem value="calm">😌 Calm</SelectItem>
                  <SelectItem value="neutral">😐 Neutral</SelectItem>
                  <SelectItem value="anxious">😟 Anxious</SelectItem>
                  <SelectItem value="impatient">😤 Impatient</SelectItem>
                  <SelectItem value="confident">😎 Confident</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="emotion_after">Emotion After Trade</Label>
              <Select
                value={formData.emotion_after}
                onValueChange={(value) => setFormData({ ...formData, emotion_after: value })}
              >
                <SelectTrigger id="emotion_after" className="bg-card border-border/50">
                  <SelectValue placeholder="Select emotion..." />
                </SelectTrigger>
                <SelectContent className="bg-card border-border/50">
                  <SelectItem value="satisfied">😁 Satisfied</SelectItem>
                  <SelectItem value="regretful">😔 Regretful</SelectItem>
                  <SelectItem value="frustrated">😤 Frustrated</SelectItem>
                  <SelectItem value="neutral">😐 Neutral</SelectItem>
                  <SelectItem value="content">😌 Content</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Trade setup, market conditions, etc."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="screenshot">Trade Screenshots ({screenshots.length}/5)</Label>
            
            {screenshotPreviews.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mb-2">
                {screenshotPreviews.map((preview, index) => (
                  <div key={index} className="relative">
                    <img 
                      src={preview} 
                      alt={`Trade screenshot ${index + 1}`} 
                      className="w-full h-32 object-cover rounded-lg border-2 border-border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-1 right-1 h-6 w-6"
                      onClick={() => removeImage(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {screenshots.length < 5 && (
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary transition-smooth cursor-pointer">
                <input
                  id="screenshot"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                  className="hidden"
                />
                <label htmlFor="screenshot" className="cursor-pointer flex flex-col items-center gap-2">
                  <ImageIcon className="h-10 w-10 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Click to upload screenshots (max 5)
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PNG, JPG, WEBP up to 5MB each
                  </p>
                </label>
              </div>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Logging trade..." : "Log Trade"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default TradeForm;
