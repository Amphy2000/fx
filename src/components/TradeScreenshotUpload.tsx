import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Loader2, Check, ArrowUpDown, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { TradeInterceptorModal } from './TradeInterceptorModal';

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
  confluences?: string;
  risk_reward?: string;
  pips_risk?: number;
  pips_target?: number;
  result?: 'open' | 'win' | 'loss' | 'breakeven';
  emotion?: string;
  emotion_before?: string;
  emotion_after?: string;
  trade_timestamp?: string;
  platform?: string;
  notes?: string;
}

export const TradeScreenshotUpload = ({ onDataExtracted }: { onDataExtracted: (data: ExtractedData) => void }) => {
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);

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
      toast.success('Trade data extracted! Review and edit before saving.');
      onDataExtracted(extracted);

    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to extract trade data');
    } finally {
      setUploading(false);
      setExtracting(false);
    }
  };

  const handleFlipDirection = () => {
    if (!extractedData) return;
    setExtractedData({
      ...extractedData,
      direction: extractedData.direction === 'buy' ? 'sell' : 'buy'
    });
    toast.success(`Direction changed to ${extractedData.direction === 'buy' ? 'SELL' : 'BUY'}`);
  };

  const handleFieldEdit = (field: keyof ExtractedData, value: any) => {
    if (!extractedData) return;
    setExtractedData({
      ...extractedData,
      [field]: value
    });
  };

  const handleValidateTrade = async () => {
    if (!extractedData) return;

    try {
      setValidating(true);

      const { data, error } = await supabase.functions.invoke('validate-trade', {
        body: {
          pair: extractedData.pair,
          direction: extractedData.direction,
          entry_price: extractedData.entry_price,
          stop_loss: extractedData.stop_loss,
          take_profit: extractedData.take_profit,
          session: extractedData.session,
          emotion_before: extractedData.emotion_before,
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
      setValidating(false);
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

      // Build comprehensive notes from all extracted context
      const contextNotes = [
        extractedData.setup_name ? `Setup: ${extractedData.setup_name}` : '',
        extractedData.timeframe ? `Timeframe: ${extractedData.timeframe}` : '',
        extractedData.platform ? `Platform: ${extractedData.platform}` : '',
        extractedData.risk_reward ? `R:R: ${extractedData.risk_reward}` : '',
        extractedData.pips_risk ? `Risk: ${extractedData.pips_risk} pips` : '',
        extractedData.pips_target ? `Target: ${extractedData.pips_target} pips` : '',
        extractedData.confluences ? `Confluences: ${extractedData.confluences}` : '',
        extractedData.emotion ? `Emotion: ${extractedData.emotion}` : '',
        extractedData.emotion_before ? `Before: ${extractedData.emotion_before}` : '',
        extractedData.emotion_after ? `After: ${extractedData.emotion_after}` : '',
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
        result: extractedData.result ?? 'open',
        profit_loss: extractedData.profit_loss ?? undefined,
        session: extractedData.session ?? undefined,
        emotion_before: extractedData.emotion_before ?? undefined,
        emotion_after: extractedData.emotion_after ?? undefined,
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
          Upload a screenshot from any platform. Our advanced AI extracts comprehensive trade data automatically.
        </p>

        <div className="text-xs space-y-1 p-3 bg-muted/50 rounded-lg">
          <p className="font-medium">🎯 Universal Platform Support</p>
          <p className="text-muted-foreground">TradingView • MT4/MT5 • cTrader • NinjaTrader • Think or Swim</p>
          <p className="font-medium mt-2">⚡ Extracts Everything Visible</p>
          <p className="text-muted-foreground">Direction • Entry/SL/TP • Setup • Confluences • Risk/Reward • Trader Notes</p>
          <p className="font-medium mt-2">📊 Broker Screenshots</p>
          <p className="text-muted-foreground">Also extracts: Lot Size • P/L • Exit Price • Account Details</p>
        </div>

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
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm">Review & Edit Trade Data</h4>
                <div className="flex gap-2">
                  <Button
                    onClick={handleFlipDirection}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    <ArrowUpDown className="w-4 h-4" />
                    Flip Direction
                  </Button>
                  <Button
                    onClick={handleValidateTrade}
                    disabled={validating}
                    variant="secondary"
                    size="sm"
                    className="gap-2"
                  >
                    {validating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                    {validating ? 'Validating...' : 'Validate'}
                  </Button>
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
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Pair - Editable */}
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Pair *</label>
                  <Input
                    value={extractedData.pair}
                    onChange={(e) => handleFieldEdit('pair', e.target.value)}
                    className="h-8 text-sm"
                    placeholder="e.g., EURUSD"
                  />
                </div>

                {/* Direction - Shows current with clear indicator */}
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Direction *</label>
                  <div className={`h-8 px-3 rounded-md border flex items-center font-semibold text-sm ${
                    extractedData.direction === 'buy' 
                      ? 'bg-green-500/10 text-green-600 border-green-500/20' 
                      : 'bg-red-500/10 text-red-600 border-red-500/20'
                  }`}>
                    {extractedData.direction.toUpperCase()} {extractedData.direction === 'buy' ? '↑' : '↓'}
                  </div>
                </div>

                {/* Entry Price */}
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Entry Price *</label>
                  <Input
                    type="number"
                    step="0.00001"
                    value={extractedData.entry_price}
                    onChange={(e) => handleFieldEdit('entry_price', parseFloat(e.target.value))}
                    className="h-8 text-sm"
                  />
                </div>

                {/* Stop Loss */}
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Stop Loss</label>
                  <Input
                    type="number"
                    step="0.00001"
                    value={extractedData.stop_loss || ''}
                    onChange={(e) => handleFieldEdit('stop_loss', e.target.value ? parseFloat(e.target.value) : undefined)}
                    className="h-8 text-sm"
                    placeholder="Optional"
                  />
                </div>

                {/* Take Profit */}
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Take Profit</label>
                  <Input
                    type="number"
                    step="0.00001"
                    value={extractedData.take_profit || ''}
                    onChange={(e) => handleFieldEdit('take_profit', e.target.value ? parseFloat(e.target.value) : undefined)}
                    className="h-8 text-sm"
                    placeholder="Optional"
                  />
                </div>

                {/* Exit Price */}
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Exit Price</label>
                  <Input
                    type="number"
                    step="0.00001"
                    value={extractedData.exit_price || ''}
                    onChange={(e) => handleFieldEdit('exit_price', e.target.value ? parseFloat(e.target.value) : undefined)}
                    className="h-8 text-sm"
                    placeholder="If closed"
                  />
                </div>

                {/* Setup Name */}
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Setup</label>
                  <Input
                    value={extractedData.setup_name || ''}
                    onChange={(e) => handleFieldEdit('setup_name', e.target.value || undefined)}
                    className="h-8 text-sm"
                    placeholder="e.g., Breakout"
                  />
                </div>

                {/* Timeframe */}
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Timeframe</label>
                  <Input
                    value={extractedData.timeframe || ''}
                    onChange={(e) => handleFieldEdit('timeframe', e.target.value || undefined)}
                    className="h-8 text-sm"
                    placeholder="e.g., 1H"
                  />
                </div>

                {/* Session */}
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Session</label>
                  <Input
                    value={extractedData.session || ''}
                    onChange={(e) => handleFieldEdit('session', e.target.value || undefined)}
                    className="h-8 text-sm"
                    placeholder="e.g., London"
                  />
                </div>

                {/* Lot Size */}
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Lot Size</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={extractedData.lot_size || ''}
                    onChange={(e) => handleFieldEdit('lot_size', e.target.value ? parseFloat(e.target.value) : undefined)}
                    className="h-8 text-sm"
                    placeholder="Optional"
                  />
                </div>

                {/* P/L */}
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">P/L (for AI analytics)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={extractedData.profit_loss || ''}
                    onChange={(e) => handleFieldEdit('profit_loss', e.target.value ? parseFloat(e.target.value) : undefined)}
                    className="h-8 text-sm"
                    placeholder="Enter P/L"
                  />
                </div>

                {/* R:R */}
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Risk:Reward</label>
                  <Input
                    value={extractedData.risk_reward || ''}
                    onChange={(e) => handleFieldEdit('risk_reward', e.target.value || undefined)}
                    className="h-8 text-sm"
                    placeholder="e.g., 1:3"
                  />
                </div>
              </div>

              {/* Result */}
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Result</label>
                <Select
                  value={extractedData.result || 'open'}
                  onValueChange={(value) => handleFieldEdit('result', value)}
                >
                  <SelectTrigger className="h-8 text-sm">
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

              {/* Emotional Tracking */}
              <div className="space-y-3 pt-3 border-t border-border/20">
                <h4 className="text-xs font-medium text-muted-foreground">🧘 Emotional Tracking</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Emotion Before</label>
                    <Select
                      value={extractedData.emotion_before || ''}
                      onValueChange={(value) => handleFieldEdit('emotion_before', value)}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="calm">😌 Calm</SelectItem>
                        <SelectItem value="confident">😎 Confident</SelectItem>
                        <SelectItem value="disciplined">🎯 Disciplined</SelectItem>
                        <SelectItem value="focused">🧠 Focused</SelectItem>
                        <SelectItem value="patient">⏳ Patient</SelectItem>
                        <SelectItem value="optimistic">✨ Optimistic</SelectItem>
                        <SelectItem value="neutral">😐 Neutral</SelectItem>
                        <SelectItem value="anxious">😟 Anxious</SelectItem>
                        <SelectItem value="greedy">🤑 Greedy</SelectItem>
                        <SelectItem value="fearful">😨 Fearful</SelectItem>
                        <SelectItem value="impatient">😤 Impatient</SelectItem>
                        <SelectItem value="impulsive">⚡ Impulsive</SelectItem>
                        <SelectItem value="stressed">😰 Stressed</SelectItem>
                        <SelectItem value="uncertain">🤔 Uncertain</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Emotion After</label>
                    <Select
                      value={extractedData.emotion_after || ''}
                      onValueChange={(value) => handleFieldEdit('emotion_after', value)}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="satisfied">😁 Satisfied</SelectItem>
                        <SelectItem value="excited">🎉 Excited</SelectItem>
                        <SelectItem value="content">😌 Content</SelectItem>
                        <SelectItem value="relieved">😮‍💨 Relieved</SelectItem>
                        <SelectItem value="proud">🏆 Proud</SelectItem>
                        <SelectItem value="neutral">😐 Neutral</SelectItem>
                        <SelectItem value="frustrated">😤 Frustrated</SelectItem>
                        <SelectItem value="regretful">😔 Regretful</SelectItem>
                        <SelectItem value="disappointed">😞 Disappointed</SelectItem>
                        <SelectItem value="angry">😠 Angry</SelectItem>
                        <SelectItem value="stressed">😰 Stressed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Notes - Full width, editable */}
              <div className="pt-2 border-t space-y-1">
                <label className="text-xs text-muted-foreground">Notes</label>
                <textarea
                  value={extractedData.notes || ''}
                  onChange={(e) => handleFieldEdit('notes', e.target.value || undefined)}
                  className="w-full min-h-[60px] px-3 py-2 text-xs rounded-md border border-input bg-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Add your trade context, emotions, lessons learned..."
                />
              </div>

              <p className="text-xs text-muted-foreground">
                * Required fields. Review AI extracts and fill in any missing data.
              </p>
            </div>
          </Card>
        )}

        <div className="text-xs text-muted-foreground space-y-1">
          <p>💡 AI extracts visible data from your screenshot</p>
          <p>✏️ Review and fill in any missing fields before saving</p>
          <p>💎 Cost: 10 AI credits per extraction</p>
        </div>
      </div>

      <TradeInterceptorModal
        open={showValidationModal}
        onOpenChange={setShowValidationModal}
        validationResult={validationResult}
        onProceed={async () => {
          setShowValidationModal(false);
          await handleSaveTrade();
        }}
        onCancel={() => {
          setShowValidationModal(false);
          toast.info('Trade validation cancelled');
        }}
      />
    </Card>
  );
};
