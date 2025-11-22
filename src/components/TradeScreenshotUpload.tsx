import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ExtractedData {
  pair: string;
  direction: string;
  entry_price: number;
  exit_price?: number;
  stop_loss?: number;
  take_profit?: number;
  lot_size?: number;
  profit_loss?: number;
}

export const TradeScreenshotUpload = ({ onDataExtracted }: { onDataExtracted: (data: ExtractedData) => void }) => {
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

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

      toast.success('Trade data extracted successfully!');
      onDataExtracted(data.extracted_data);

    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to extract trade data');
    } finally {
      setUploading(false);
      setExtracting(false);
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

        <div className="text-xs text-muted-foreground">
          <p>💡 Tip: Clear screenshots with visible prices work best</p>
          <p>💎 Cost: 10 AI credits per extraction</p>
        </div>
      </div>
    </Card>
  );
};
