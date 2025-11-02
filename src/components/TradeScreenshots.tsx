import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Image as ImageIcon, Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface TradeScreenshotsProps {
  tradeId: string;
  userId: string;
}

interface Screenshot {
  id: string;
  storage_path: string;
  file_name: string;
  file_size: number;
  created_at: string;
}

const TradeScreenshots = ({ tradeId, userId }: TradeScreenshotsProps) => {
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageUrls, setImageUrls] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchScreenshots();
  }, [tradeId]);

  const fetchScreenshots = async () => {
    try {
      const { data, error } = await supabase
        .from("trade_screenshots")
        .select("*")
        .eq("trade_id", tradeId)
        .eq("user_id", userId);

      if (error) throw error;

      setScreenshots(data || []);

      // Generate signed URLs for all screenshots
      if (data && data.length > 0) {
        const urls: { [key: string]: string } = {};
        for (const screenshot of data) {
          const { data: signedUrlData, error: urlError } = await supabase.storage
            .from("trade-screenshots")
            .createSignedUrl(screenshot.storage_path, 3600);

          if (!urlError && signedUrlData) {
            urls[screenshot.id] = signedUrlData.signedUrl;
          }
        }
        setImageUrls(urls);
      }
    } catch (error) {
      console.error("Error fetching screenshots:", error);
      toast.error("Failed to load screenshots");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (screenshotId: string, storagePath: string) => {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("trade-screenshots")
        .remove([storagePath]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from("trade_screenshots")
        .delete()
        .eq("id", screenshotId);

      if (dbError) throw dbError;

      toast.success("Screenshot deleted");
      fetchScreenshots();
    } catch (error) {
      console.error("Error deleting screenshot:", error);
      toast.error("Failed to delete screenshot");
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Trade Screenshots
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading screenshots...</p>
        </CardContent>
      </Card>
    );
  }

  if (screenshots.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Trade Screenshots
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No screenshots attached</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Trade Screenshots ({screenshots.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {screenshots.map((screenshot) => (
              <div key={screenshot.id} className="relative group">
                <div
                  className="cursor-pointer overflow-hidden rounded-lg border-2 border-border hover:border-primary transition-smooth"
                  onClick={() => setSelectedImage(imageUrls[screenshot.id])}
                >
                  {imageUrls[screenshot.id] ? (
                    <img
                      src={imageUrls[screenshot.id]}
                      alt={screenshot.file_name}
                      className="w-full h-32 object-cover"
                    />
                  ) : (
                    <div className="w-full h-32 bg-muted flex items-center justify-center">
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-smooth flex gap-1">
                  <Button
                    size="icon"
                    variant="destructive"
                    className="h-7 w-7"
                    onClick={() => handleDelete(screenshot.id, screenshot.storage_path)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {screenshot.file_name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(screenshot.file_size)}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Trade Screenshot</DialogTitle>
          </DialogHeader>
          {selectedImage && (
            <div className="relative">
              <img
                src={selectedImage}
                alt="Trade screenshot"
                className="w-full h-auto rounded-lg"
              />
              <Button
                className="absolute top-2 right-2"
                size="icon"
                variant="secondary"
                onClick={() => {
                  const link = document.createElement("a");
                  link.href = selectedImage;
                  link.download = "trade-screenshot.png";
                  link.click();
                }}
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TradeScreenshots;
