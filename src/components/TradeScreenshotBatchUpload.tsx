import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, Check, X, AlertCircle, CheckCircle, ArrowUpDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

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
        profit_loss: trade.extractedData.profit_loss ?? undefined,
        session: trade.extractedData.session ?? undefined,
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
              <h3 className="font-semibold">Batch Upload Trade Screenshots</h3>
            </div>
            {trades.length > 0 && (
              <Button onClick={handleReset} variant="outline" size="sm">
                Reset
              </Button>
            )}
          </div>
          
          <p className="text-sm text-muted-foreground">
            Upload multiple screenshots at once. AI will extract trade data from each image.
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
            <p>💡 Clear screenshots with visible prices work best</p>
            <p>💎 Cost: 10 AI credits per screenshot</p>
          </div>
        </div>
      </Card>

      {trades.length > 0 && (
        <ScrollArea className="h-[600px]">
          <div className="space-y-4">
            {trades.map((trade) => (
              <Card key={trade.id} className="p-4">
                <div className="space-y-3">
                  <div className="flex gap-4">
                    {/* Preview Image */}
                    <div className="relative w-32 h-32 flex-shrink-0 rounded-lg overflow-hidden border">
                      <img 
                        src={trade.preview} 
                        alt={trade.fileName}
                        className="w-full h-full object-cover"
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

                    {/* Trade Data */}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate">{trade.fileName}</span>
                        {trade.status === 'ready' && (
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleFlipDirection(trade.id)}
                              variant="outline"
                              size="sm"
                              className="gap-1"
                            >
                              <ArrowUpDown className="w-3 h-3" />
                              Flip
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
                        <p className="text-sm text-muted-foreground">Extracting data...</p>
                      )}

                      {trade.status === 'error' && (
                        <div className="flex items-start gap-2 text-sm text-red-500">
                          <AlertCircle className="w-4 h-4 mt-0.5" />
                          <span>{trade.error || 'Failed to process'}</span>
                        </div>
                      )}

                      {trade.extractedData && trade.status !== 'error' && (
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">Pair:</span>
                            <span className="ml-2 font-medium">{trade.extractedData.pair}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Direction:</span>
                            <span className={`ml-2 font-medium ${trade.extractedData.direction === 'buy' ? 'text-green-500' : 'text-red-500'}`}>
                              {trade.extractedData.direction.toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Entry:</span>
                            <span className="ml-2 font-medium">{trade.extractedData.entry_price}</span>
                          </div>
                          {trade.extractedData.setup_name && (
                            <div>
                              <span className="text-muted-foreground">Setup:</span>
                              <span className="ml-2 font-medium">{trade.extractedData.setup_name}</span>
                            </div>
                          )}
                          {trade.extractedData.timeframe && (
                            <div>
                              <span className="text-muted-foreground">Timeframe:</span>
                              <span className="ml-2 font-medium">{trade.extractedData.timeframe}</span>
                            </div>
                          )}
                          {trade.extractedData.session && (
                            <div>
                              <span className="text-muted-foreground">Session:</span>
                              <span className="ml-2 font-medium">{trade.extractedData.session}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};