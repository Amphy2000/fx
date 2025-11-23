import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Upload, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface AvatarUploadProps {
  userId: string;
  currentAvatarUrl?: string | null;
  onUploadComplete: (url: string) => void;
}

export const AvatarUpload = ({ userId, currentAvatarUrl, onUploadComplete }: AvatarUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d')!;
          
          canvas.width = 200;
          canvas.height = 200;
          
          ctx.drawImage(img, 0, 0, 200, 200);
          
          canvas.toBlob((blob) => {
            resolve(blob!);
          }, 'image/jpeg', 0.8);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error("Please upload a JPG, PNG, or WEBP image");
      return;
    }

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be less than 2MB");
      return;
    }

    try {
      setUploading(true);

      // Compress image
      const compressedBlob = await compressImage(file);
      
      // Create preview
      const preview = URL.createObjectURL(compressedBlob);
      setPreviewUrl(preview);

      // Delete old avatar if exists
      if (currentAvatarUrl) {
        const oldPath = currentAvatarUrl.split('/').pop();
        if (oldPath) {
          await supabase.storage.from('avatars').remove([`${userId}/${oldPath}`]);
        }
      }

      // Upload new avatar
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, compressedBlob);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: filePath })
        .eq('id', userId);

      if (updateError) throw updateError;

      onUploadComplete(publicUrl);
      toast.success("Avatar updated successfully");
    } catch (error: any) {
      console.error('Avatar upload error:', error);
      toast.error(error.message || "Failed to upload avatar");
      setPreviewUrl(null);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!currentAvatarUrl) return;

    try {
      setUploading(true);

      // Delete from storage
      const oldPath = currentAvatarUrl.split('/').pop();
      if (oldPath) {
        await supabase.storage.from('avatars').remove([`${userId}/${oldPath}`]);
      }

      // Update profile
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', userId);

      if (error) throw error;

      setPreviewUrl(null);
      onUploadComplete('');
      toast.success("Avatar removed");
    } catch (error: any) {
      console.error('Avatar delete error:', error);
      toast.error(error.message || "Failed to remove avatar");
    } finally {
      setUploading(false);
    }
  };

  const getAvatarUrl = () => {
    if (previewUrl) return previewUrl;
    if (currentAvatarUrl) {
      return supabase.storage.from('avatars').getPublicUrl(currentAvatarUrl).data.publicUrl;
    }
    return null;
  };

  return (
    <div className="flex items-center gap-4">
      <Avatar className="h-20 w-20">
        <AvatarImage src={getAvatarUrl() || undefined} />
        <AvatarFallback className="bg-primary/10 text-primary text-xl">
          <Upload className="h-8 w-8" />
        </AvatarFallback>
      </Avatar>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => document.getElementById('avatar-upload')?.click()}
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              {currentAvatarUrl ? 'Change' : 'Upload'}
            </>
          )}
        </Button>
        
        {currentAvatarUrl && !uploading && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
          >
            <X className="h-4 w-4 mr-2" />
            Remove
          </Button>
        )}
      </div>

      <input
        id="avatar-upload"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  );
};
