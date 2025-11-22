import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ExtractedData {
  pair: string;
  direction: 'buy' | 'sell';
  entry_price: number;
  exit_price?: number;
  stop_loss?: number;
  take_profit?: number;
  lot_size?: number;
  profit_loss?: number;
  setup_name?: string;
  timeframe?: string;
  session?: string;
  risk_reward?: string;
  trade_timestamp?: string;
  notes?: string;
}

export const TradeScreenshotUpload = ({ onDataExtracted }: { onDataExtracted: (data: ExtractedData) => void }) => {
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    try {
      setUploading(true);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(file);

      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('trade-screenshots')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('trade-screenshots')
        .getPublicUrl(fileName);

      setScreenshotUrl(publicUrl);
      setUploading(false);
      setExtracting(true);

      // Call AI extraction function
      const { data, error } = await supabase.functions.invoke('extract-trade-data', {
        body: { imageUrl: publicUrl }
      });

      if (error) {
        if (error.message.includes('Insufficient credits')) {
          toast.error('Insufficient AI credits. Please upgrade your plan.');
        } else {
          throw error;
        }
        return;
      }

      const extracted = data.extracted_data;
      setExtractedData(extracted);
      toast.success('Trade data extracted successfully!');
      onDataExtracted(extracted);

    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to extract trade data');
    } finally {
      setUploading(false);
      setExtracting(false);
    }
  };

  const handleSaveTrade = async () => {
    if (!extractedData) return;

    try {
      setSaving(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in to save trades');
        return;
      }

      // Build notes combining extracted context
      const contextNotes = [
        extractedData.setup_name ? `Setup: ${extractedData.setup_name}` : '',
        extractedData.timeframe ? `Timeframe: ${extractedData.timeframe}` : '',
        extractedData.risk_reward ? `R:R: ${extractedData.risk_reward}` : '',
        extractedData.notes || ''
      ].filter(Boolean).join(' | ');

      const { error } = await supabase.from('trades').insert([{
        user_id: user.id,
        pair: extractedData.pair,
        direction: extractedData.direction,
        entry_price: extractedData.entry_price,
        exit_price: extractedData.exit_price ?? undefined,
        stop_loss: extractedData.stop_loss ?? undefined,
        take_profit: extractedData.take_profit ?? undefined,
        volume: extractedData.lot_size ?? undefined,
        profit_loss: extractedData.profit_loss ?? undefined,
        session: extractedData.session ?? undefined,
        notes: contextNotes || undefined,
        screenshot_url: screenshotUrl ?? undefined,
        open_time: extractedData.trade_timestamp ?? undefined,
        ai_extracted_data: extractedData as any,
        ai_confidence: 0.85
      }]);

      if (error) throw error;

      toast.success('Trade saved successfully!');
      
      // Reset state
      setExtractedData(null);
      setPreview(null);
      setScreenshotUrl(null);

    } catch (error: any) {
      console.error('Save error:', error);
      toast.error(error.message || 'Failed to save trade');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          <h3 className="font-semibold">Upload Trade Screenshot</h3>
        </div>
        
        <p className="text-sm text-muted-foreground">
          Upload a screenshot from your trading platform. AI will automatically extract pair, entry, exit, P&L, and more.
        </p>

        {preview && (
          <div className="relative rounded-lg overflow-hidden border">
            <img src={preview} alt="Trade screenshot" className="w-full h-48 object-cover" />
            {extracting && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-white" />
              </div>
            )}
          </div>
        )}

        <div className="relative">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={uploading || extracting}
          />
          <Button
            className="w-full"
            disabled={uploading || extracting}
          >
            {uploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {extracting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {!uploading && !extracting && <Upload className="w-4 h-4 mr-2" />}
            {uploading ? 'Uploading...' : extracting ? 'Extracting Data...' : 'Choose Screenshot'}
          </Button>
        </div>

        {extractedData && (
          <Card className="p-4 bg-muted/50 border-primary/20">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm">Extracted Data</h4>
                <Button
                  onClick={handleSaveTrade}
                  disabled={saving}
                  size="sm"
                  className="gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {saving ? 'Saving...' : 'Save Trade'}
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Pair:</span>
                  <span className="ml-2 font-medium">{extractedData.pair}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Direction:</span>
                  <span className={`ml-2 font-medium ${extractedData.direction === 'buy' ? 'text-green-500' : 'text-red-500'}`}>
                    {extractedData.direction.toUpperCase()}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Entry:</span>
                  <span className="ml-2 font-medium">{extractedData.entry_price}</span>
                </div>
                {extractedData.stop_loss && (
                  <div>
                    <span className="text-muted-foreground">SL:</span>
                    <span className="ml-2 font-medium">{extractedData.stop_loss}</span>
                  </div>
                )}
                {extractedData.take_profit && (
                  <div>
                    <span className="text-muted-foreground">TP:</span>
                    <span className="ml-2 font-medium">{extractedData.take_profit}</span>
                  </div>
                )}
                {extractedData.setup_name && (
                  <div>
                    <span className="text-muted-foreground">Setup:</span>
                    <span className="ml-2 font-medium">{extractedData.setup_name}</span>
                  </div>
                )}
                {extractedData.timeframe && (
                  <div>
                    <span className="text-muted-foreground">Timeframe:</span>
                    <span className="ml-2 font-medium">{extractedData.timeframe}</span>
                  </div>
                )}
                {extractedData.session && (
                  <div>
                    <span className="text-muted-foreground">Session:</span>
                    <span className="ml-2 font-medium">{extractedData.session}</span>
                  </div>
                )}
                {extractedData.risk_reward && (
                  <div>
                    <span className="text-muted-foreground">R:R:</span>
                    <span className="ml-2 font-medium">{extractedData.risk_reward}</span>
                  </div>
                )}
                {extractedData.profit_loss && (
                  <div>
                    <span className="text-muted-foreground">P/L:</span>
                    <span className={`ml-2 font-medium ${extractedData.profit_loss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {extractedData.profit_loss >= 0 ? '+' : ''}{extractedData.profit_loss}
                    </span>
                  </div>
                )}
              </div>

              {extractedData.notes && (
                <div className="pt-2 border-t">
                  <span className="text-xs text-muted-foreground">Notes:</span>
                  <p className="text-xs mt-1">{extractedData.notes}</p>
                </div>
              )}
            </div>
          </Card>
        )}

        <div className="text-xs text-muted-foreground">
          <p>💡 Tip: Clear screenshots with visible prices work best</p>
          <p>💎 Cost: 10 AI credits per extraction</p>
        </div>
      </div>
    </Card>
  );
};
