import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Upload, Loader2, Check, X, AlertCircle, CheckCircle, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  risk_reward?: string;
  result?: 'open' | 'win' | 'loss' | 'breakeven';
  emotion_before?: string;
  emotion_after?: string;
  trade_timestamp?: string;
  notes?: string;
}

interface ProcessedTrade {
  id: string;
  preview: string;
  screenshotUrl: string;
  extractedData: ExtractedData | null;
  status: 'uploading' | 'extracting' | 'ready' | 'saved' | 'error';
  error?: string;
  fileName: string;
}

export const TradeScreenshotBatchUpload = () => {
  const [processing, setProcessing] = useState(false);
  const [trades, setTrades] = useState<ProcessedTrade[]>([]);
  const [savingAll, setSavingAll] = useState(false);
  const [validatingTradeId, setValidatingTradeId] = useState<string | null>(null);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [pendingTradeId, setPendingTradeId] = useState<string | null>(null);

  const handleFilesUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    if (files.length === 0) return;

    // Validate files
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    if (imageFiles.length !== files.length) {
      toast.error('Please upload only image files');
      return;
    }

    if (imageFiles.length > 10) {
      toast.error('Maximum 10 images allowed per batch');
      return;
    }

    setProcessing(true);

    // Initialize trades with uploading status
    const initialTrades: ProcessedTrade[] = imageFiles.map((file, index) => ({
      id: `${Date.now()}-${index}`,
      preview: URL.createObjectURL(file),
      screenshotUrl: '',
      extractedData: null,
      status: 'uploading',
      fileName: file.name
    }));

    setTrades(initialTrades);

    // Process each file
    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];
      const tradeId = initialTrades[i].id;

      try {
        // Upload to storage
        const fileExt = file.name.split('.').pop();
        const fileName = `batch-${Date.now()}-${i}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('trade-screenshots')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('trade-screenshots')
          .getPublicUrl(fileName);

        // Update status to extracting
        setTrades(prev => prev.map(t => 
          t.id === tradeId ? { ...t, screenshotUrl: publicUrl, status: 'extracting' } : t
        ));

        // Extract data
        const { data, error } = await supabase.functions.invoke('extract-trade-data', {
          body: { imageUrl: publicUrl }
        });

        if (error) {
          if (error.message.includes('Insufficient credits')) {
            throw new Error('Insufficient AI credits');
          }
          throw error;
        }

        // Update with extracted data
        setTrades(prev => prev.map(t => 
          t.id === tradeId 
            ? { ...t, extractedData: data.extracted_data, status: 'ready' } 
            : t
        ));

      } catch (error: any) {
        console.error(`Error processing ${file.name}:`, error);
        setTrades(prev => prev.map(t => 
          t.id === tradeId 
            ? { ...t, status: 'error', error: error.message } 
            : t
        ));
      }
    }

    setProcessing(false);
    
    const successCount = initialTrades.filter(t => t.status === 'ready').length;
    if (successCount > 0) {
      toast.success(`${successCount} trade${successCount > 1 ? 's' : ''} extracted successfully!`);
    }
  };

  const handleFlipDirection = (tradeId: string) => {
    setTrades(prev => prev.map(t => {
      if (t.id === tradeId && t.extractedData) {
        const flipped = t.extractedData.direction === 'buy' ? 'sell' : 'buy';
        toast.success(`Direction flipped to ${flipped.toUpperCase()}`);
        return {
          ...t,
          extractedData: {
            ...t.extractedData,
            direction: flipped as 'buy' | 'sell'
          }
        };
      }
      return t;
    }));
  };

  const handleFieldEdit = (tradeId: string, field: keyof ExtractedData, value: any) => {
    setTrades(prev => prev.map(t => {
      if (t.id === tradeId && t.extractedData) {
        return {
          ...t,
          extractedData: {
            ...t.extractedData,
            [field]: value
          }
        };
      }
      return t;
    }));
  };

  const handleValidateTrade = async (tradeId: string) => {
    const trade = trades.find(t => t.id === tradeId);
    if (!trade || !trade.extractedData) return;

    try {
      setValidatingTradeId(tradeId);

      const { data, error } = await supabase.functions.invoke('validate-trade', {
        body: {
          proposedTrade: {
            pair: trade.extractedData.pair,
            direction: trade.extractedData.direction,
            entry_price: trade.extractedData.entry_price,
            stop_loss: trade.extractedData.stop_loss,
            take_profit: trade.extractedData.take_profit,
            session: trade.extractedData.session,
            emotion_before: trade.extractedData.emotion_before,
          }
        }
      });

      if (error) {
        console.error('Validation error:', error);
        if (error.message.includes('Insufficient credits')) {
          toast.error('Insufficient AI credits for validation');
        } else {
          toast.error('Failed to validate trade. Please try again.');
        }
        return;
      }

      if (!data || !data.risk_score) {
        toast.error('Invalid validation response. Please try again.');
        return;
      }

      setValidationResult(data);
      setPendingTradeId(tradeId);
      setShowValidationModal(true);

    } catch (error: any) {
      console.error('Validation error:', error);
      toast.error(error.message || 'Failed to validate trade');
    } finally {
      setValidatingTradeId(null);
    }
  };

  const handleSaveTrade = async (tradeId: string) => {
    const trade = trades.find(t => t.id === tradeId);
    if (!trade || !trade.extractedData) return;

    try {
      setTrades(prev => prev.map(t => 
        t.id === tradeId ? { ...t, status: 'uploading' as const } : t
      ));

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in to save trades');
        return;
      }

      const contextNotes = [
        trade.extractedData.setup_name ? `Setup: ${trade.extractedData.setup_name}` : '',
        trade.extractedData.timeframe ? `Timeframe: ${trade.extractedData.timeframe}` : '',
        trade.extractedData.risk_reward ? `R:R: ${trade.extractedData.risk_reward}` : '',
        trade.extractedData.emotion_before ? `Before: ${trade.extractedData.emotion_before}` : '',
        trade.extractedData.emotion_after ? `After: ${trade.extractedData.emotion_after}` : '',
        trade.extractedData.notes || ''
      ].filter(Boolean).join(' | ');

      const { error } = await supabase.from('trades').insert([{
        user_id: user.id,
        pair: trade.extractedData.pair,
        direction: trade.extractedData.direction,
        entry_price: trade.extractedData.entry_price,
        exit_price: trade.extractedData.exit_price ?? undefined,
        stop_loss: trade.extractedData.stop_loss ?? undefined,
        take_profit: trade.extractedData.take_profit ?? undefined,
        volume: trade.extractedData.lot_size ?? undefined,
        result: trade.extractedData.result ?? 'open',
        profit_loss: trade.extractedData.profit_loss ?? undefined,
        session: trade.extractedData.session ?? undefined,
        emotion_before: trade.extractedData.emotion_before ?? undefined,
        emotion_after: trade.extractedData.emotion_after ?? undefined,
        notes: contextNotes || undefined,
        screenshot_url: trade.screenshotUrl ?? undefined,
        open_time: trade.extractedData.trade_timestamp ?? undefined,
        ai_extracted_data: trade.extractedData as any,
        ai_confidence: 0.85
      }]);

      if (error) throw error;

      setTrades(prev => prev.map(t => 
        t.id === tradeId ? { ...t, status: 'saved' as const } : t
      ));

      toast.success('Trade saved successfully!');

    } catch (error: any) {
      console.error('Save error:', error);
      toast.error(error.message || 'Failed to save trade');
      setTrades(prev => prev.map(t => 
        t.id === tradeId ? { ...t, status: 'ready' as const } : t
      ));
    }
  };

  const handleSaveAll = async () => {
    setSavingAll(true);
    const readyTrades = trades.filter(t => t.status === 'ready');
    
    for (const trade of readyTrades) {
      await handleSaveTrade(trade.id);
    }
    
    setSavingAll(false);
    toast.success(`${readyTrades.length} trades saved successfully!`);
  };

  const handleReset = () => {
    setTrades([]);
  };

  const readyCount = trades.filter(t => t.status === 'ready').length;
  const savedCount = trades.filter(t => t.status === 'saved').length;
  const errorCount = trades.filter(t => t.status === 'error').length;

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              <h3 className="font-semibold">Trade Screenshots</h3>
            </div>
            {trades.length > 0 && (
              <Button onClick={handleReset} variant="outline" size="sm">
                Reset
              </Button>
            )}
          </div>
          
          <p className="text-sm text-muted-foreground">
            Upload multiple screenshots at once. AI extracts visible data automatically - review and fill in any missing fields.
          </p>

          {trades.length === 0 ? (
            <div className="relative">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFilesUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={processing}
              />
              <Button
                className="w-full h-32"
                variant="outline"
                disabled={processing}
              >
                <div className="flex flex-col items-center gap-2">
                  <Upload className="w-8 h-8" />
                  <span>Choose Multiple Screenshots</span>
                  <span className="text-xs text-muted-foreground">Max 10 images</span>
                </div>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-sm">
                <Badge variant="secondary">{trades.length} Total</Badge>
                {readyCount > 0 && <Badge variant="default">{readyCount} Ready</Badge>}
                {savedCount > 0 && <Badge className="bg-green-500">{savedCount} Saved</Badge>}
                {errorCount > 0 && <Badge variant="destructive">{errorCount} Failed</Badge>}
              </div>

              {readyCount > 0 && (
                <Button
                  onClick={handleSaveAll}
                  disabled={savingAll}
                  className="w-full"
                >
                  {savingAll ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving All...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Save All Ready Trades ({readyCount})
                    </>
                  )}
                </Button>
              )}
            </div>
          )}

          <div className="text-xs text-muted-foreground">
            <p>💡 AI extracts visible data from each screenshot</p>
            <p>✏️ Review and fill in any missing fields before saving</p>
            <p>💎 Cost: 10 AI credits per screenshot</p>
          </div>
        </div>
      </Card>

      {trades.length > 0 && (
        <div className="space-y-4">
          {trades.map((trade) => (
            <Card key={trade.id} className="p-4">
              <div className="flex flex-col lg:flex-row gap-4">
                  {/* Preview Image */}
                  <div className="relative w-full lg:w-40 h-40 flex-shrink-0 rounded-lg overflow-hidden border bg-muted/30">
                      <img 
                        src={trade.preview} 
                        alt={trade.fileName}
                        className="w-full h-full object-contain p-1"
                      />
                      {trade.status === 'uploading' && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <Loader2 className="w-6 h-6 animate-spin text-white" />
                        </div>
                      )}
                      {trade.status === 'extracting' && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <Loader2 className="w-6 h-6 animate-spin text-white" />
                        </div>
                      )}
                      {trade.status === 'saved' && (
                        <div className="absolute inset-0 bg-green-500/80 flex items-center justify-center">
                          <Check className="w-8 h-8 text-white" />
                        </div>
                      )}
                      {trade.status === 'error' && (
                        <div className="absolute inset-0 bg-red-500/80 flex items-center justify-center">
                          <X className="w-8 h-8 text-white" />
                        </div>
                      )}
                    </div>

                  {/* Trade Data - Editable Form */}
                  <div className="flex-1 min-w-0">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-muted-foreground truncate">{trade.fileName}</span>
                        {trade.status === 'ready' && (
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleValidateTrade(trade.id)}
                              disabled={validatingTradeId === trade.id}
                              variant="secondary"
                              size="sm"
                              className="gap-1"
                            >
                              {validatingTradeId === trade.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Shield className="w-3 h-3" />
                              )}
                              Validate
                            </Button>
                            <Button
                              onClick={() => handleSaveTrade(trade.id)}
                              size="sm"
                              className="gap-2"
                            >
                              <Check className="w-4 h-4" />
                              Save
                            </Button>
                          </div>
                        )}
                        {trade.status === 'saved' && (
                          <Badge className="bg-green-500">Saved</Badge>
                        )}
                      </div>

                      {trade.status === 'uploading' && (
                        <p className="text-sm text-muted-foreground">Uploading...</p>
                      )}

                      {trade.status === 'extracting' && (
                        <p className="text-sm text-muted-foreground">Extracting data with AI...</p>
                      )}

                      {trade.status === 'error' && (
                        <div className="flex items-start gap-2 text-sm text-red-500">
                          <AlertCircle className="w-4 h-4 mt-0.5" />
                          <span>{trade.error || 'Failed to process'}</span>
                        </div>
                      )}

                      {trade.extractedData && trade.status !== 'error' && (
                        <div className="space-y-3">
                          {/* Core Trade Fields */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs">Pair *</Label>
                              <Input
                                value={trade.extractedData.pair || ''}
                                onChange={(e) => handleFieldEdit(trade.id, 'pair', e.target.value)}
                                placeholder="e.g., XAUUSD"
                                className="h-8 text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Direction *</Label>
                              <Select
                                value={trade.extractedData.direction}
                                onValueChange={(value) => handleFieldEdit(trade.id, 'direction', value)}
                              >
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="buy">BUY ↑</SelectItem>
                                  <SelectItem value="sell">SELL ↓</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {/* Price Fields */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs">Entry Price *</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={trade.extractedData.entry_price || ''}
                                onChange={(e) => handleFieldEdit(trade.id, 'entry_price', parseFloat(e.target.value))}
                                className="h-8 text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Exit Price</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={trade.extractedData.exit_price || ''}
                                onChange={(e) => handleFieldEdit(trade.id, 'exit_price', e.target.value ? parseFloat(e.target.value) : undefined)}
                                placeholder="If closed"
                                className="h-8 text-xs"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs">Stop Loss</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={trade.extractedData.stop_loss || ''}
                                onChange={(e) => handleFieldEdit(trade.id, 'stop_loss', e.target.value ? parseFloat(e.target.value) : undefined)}
                                className="h-8 text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Take Profit</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={trade.extractedData.take_profit || ''}
                                onChange={(e) => handleFieldEdit(trade.id, 'take_profit', e.target.value ? parseFloat(e.target.value) : undefined)}
                                className="h-8 text-xs"
                              />
                            </div>
                          </div>

                          {/* Context Fields */}
                          <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs">Setup</Label>
                              <Input
                                value={trade.extractedData.setup_name || ''}
                                onChange={(e) => handleFieldEdit(trade.id, 'setup_name', e.target.value)}
                                placeholder="e.g., Breakout"
                                className="h-8 text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Timeframe</Label>
                              <Input
                                value={trade.extractedData.timeframe || ''}
                                onChange={(e) => handleFieldEdit(trade.id, 'timeframe', e.target.value)}
                                placeholder="e.g., 1H"
                                className="h-8 text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Session</Label>
                              <Input
                                value={trade.extractedData.session || ''}
                                onChange={(e) => handleFieldEdit(trade.id, 'session', e.target.value)}
                                placeholder="e.g., London"
                                className="h-8 text-xs"
                              />
                            </div>
                          </div>

                          {/* Broker Fields */}
                          <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs">Lot Size</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={trade.extractedData.lot_size || ''}
                                onChange={(e) => handleFieldEdit(trade.id, 'lot_size', e.target.value ? parseFloat(e.target.value) : undefined)}
                                placeholder="Optional"
                                className="h-8 text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">P/L (for AI analytics)</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={trade.extractedData.profit_loss || ''}
                                onChange={(e) => handleFieldEdit(trade.id, 'profit_loss', e.target.value ? parseFloat(e.target.value) : undefined)}
                                placeholder="Enter P/L"
                                className="h-8 text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Risk:Reward</Label>
                              <Input
                                value={trade.extractedData.risk_reward || ''}
                                onChange={(e) => handleFieldEdit(trade.id, 'risk_reward', e.target.value)}
                                placeholder="e.g., 1:5"
                                className="h-8 text-xs"
                              />
                            </div>
                          </div>

                          {/* Result */}
                          <div className="space-y-1">
                            <Label className="text-xs">Result</Label>
                            <Select
                              value={trade.extractedData.result || 'open'}
                              onValueChange={(value) => handleFieldEdit(trade.id, 'result', value)}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="open">Open</SelectItem>
                                <SelectItem value="win">Win</SelectItem>
                                <SelectItem value="loss">Loss</SelectItem>
                                <SelectItem value="breakeven">Breakeven</SelectItem>
                                <SelectItem value="missed">Missed</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Emotional Tracking */}
                          <div className="space-y-3 pt-3 border-t border-border/20">
                            <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                              🧘 Emotional Tracking
                            </h4>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <Label className="text-xs">Emotion Before</Label>
                                <Select
                                  value={trade.extractedData.emotion_before || ''}
                                  onValueChange={(value) => handleFieldEdit(trade.id, 'emotion_before', value)}
                                >
                                  <SelectTrigger className="h-8 text-xs">
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
                                <Label className="text-xs">Emotion After</Label>
                                <Select
                                  value={trade.extractedData.emotion_after || ''}
                                  onValueChange={(value) => handleFieldEdit(trade.id, 'emotion_after', value)}
                                >
                                  <SelectTrigger className="h-8 text-xs">
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

                          {/* Notes */}
                          <div className="space-y-1">
                            <Label className="text-xs">Notes</Label>
                            <Textarea
                              value={trade.extractedData.notes || ''}
                              onChange={(e) => handleFieldEdit(trade.id, 'notes', e.target.value)}
                              placeholder="Add your trade context, emotions, lessons learned..."
                              className="text-xs min-h-16"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        <TradeInterceptorModal
        open={showValidationModal}
        onOpenChange={setShowValidationModal}
        validationResult={validationResult}
        onProceed={async () => {
          setShowValidationModal(false);
          if (pendingTradeId) {
            await handleSaveTrade(pendingTradeId);
            setPendingTradeId(null);
          }
        }}
        onCancel={() => {
          setShowValidationModal(false);
          setPendingTradeId(null);
          toast.info('Trade validation cancelled');
        }}
      />
    </div>
  );
};