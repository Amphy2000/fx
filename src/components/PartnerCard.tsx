import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Target, TrendingUp, UserPlus } from "lucide-react";
import PartnerRequestDialog from "./PartnerRequestDialog";
import { AvatarImage, getDisplayName } from "@/components/AvatarImage";

interface PartnerCardProps {
  partner: any;
  onSendRequest: (partnerId: string, message: string) => void;
}

export default function PartnerCard({ partner, onSendRequest }: PartnerCardProps) {
  const [showRequestDialog, setShowRequestDialog] = useState(false);

  const getExperienceLabel = () => {
    const levels: Record<string, string> = {
      beginner: "Beginner",
      intermediate: "Intermediate",
      advanced: "Advanced",
      expert: "Expert"
    };
    return levels[partner.experience_level] || partner.experience_level;
  };

  return (
    <>
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex items-start gap-4">
            <AvatarImage
              avatarUrl={partner.profiles?.avatar_url}
              fallbackText={getDisplayName(partner.profiles)}
              className="h-12 w-12"
            />
            <div className="flex-1">
              <CardTitle className="text-lg">
                {getDisplayName(partner.profiles)}
              </CardTitle>
              <CardDescription className="flex items-center gap-1 mt-1">
                <TrendingUp className="h-3 w-3" />
                {getExperienceLabel()}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {partner.bio && (
            <p className="text-sm text-muted-foreground line-clamp-3">
              {partner.bio}
            </p>
          )}

          {partner.trading_style && partner.trading_style.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3" />
                Trading Style
              </div>
              <div className="flex flex-wrap gap-1">
                {partner.trading_style.slice(0, 3).map((style: string) => (
                  <Badge key={style} variant="secondary" className="text-xs">
                    {style}
                  </Badge>
                ))}
                {partner.trading_style.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{partner.trading_style.length - 3}
                  </Badge>
                )}
              </div>
            </div>
          )}

          {partner.goals && partner.goals.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Target className="h-3 w-3" />
                Goals
              </div>
              <div className="flex flex-wrap gap-1">
                {partner.goals.slice(0, 2).map((goal: string) => (
                  <Badge key={goal} variant="outline" className="text-xs">
                    {goal}
                  </Badge>
                ))}
                {partner.goals.length > 2 && (
                  <Badge variant="outline" className="text-xs">
                    +{partner.goals.length - 2}
                  </Badge>
                )}
              </div>
            </div>
          )}

          {partner.timezone && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {partner.timezone}
            </div>
          )}
        </CardContent>

        <CardFooter>
          <Button 
            onClick={() => setShowRequestDialog(true)}
            className="w-full"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Send Request
          </Button>
        </CardFooter>
      </Card>

      <PartnerRequestDialog
        open={showRequestDialog}
        onOpenChange={setShowRequestDialog}
        partnerName={getDisplayName(partner.profiles)}
        onSend={(message) => {
          onSendRequest(partner.user_id, message);
          setShowRequestDialog(false);
        }}
      />
    </>
  );
}
