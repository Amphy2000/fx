import { Avatar, AvatarFallback, AvatarImage as AvatarImg } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";

interface AvatarImageProps {
  avatarUrl?: string | null;
  fallbackText: string;
  className?: string;
}

export const AvatarImage = ({ avatarUrl, fallbackText, className }: AvatarImageProps) => {
  const getAvatarUrl = () => {
    if (!avatarUrl) return null;
    return supabase.storage.from('avatars').getPublicUrl(avatarUrl).data.publicUrl;
  };

  const getInitials = (text: string) => {
    return text
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Avatar className={className}>
      <AvatarImg src={getAvatarUrl() || undefined} alt={fallbackText} />
      <AvatarFallback className="bg-primary/10 text-primary">
        {getInitials(fallbackText)}
      </AvatarFallback>
    </Avatar>
  );
};

export const getDisplayName = (profile: any) => {
  return profile?.display_name || 
         profile?.full_name || 
         profile?.email?.split('@')[0] || 
         'Anonymous';
};
