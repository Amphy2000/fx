import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown, Sparkles } from "lucide-react";

interface UpgradePromptProps {
  title: string;
  description: string;
  featureName: string;
}

export const UpgradePrompt = ({ title, description, featureName }: UpgradePromptProps) => {
  const navigate = useNavigate();

  return (
    <Card className="bg-gradient-to-br from-primary/10 to-amber-500/10 border-primary/20">
      <CardContent className="p-6 text-center space-y-4">
        <div className="flex justify-center">
          <div className="bg-primary/20 p-3 rounded-full">
            <Crown className="h-8 w-8 text-primary" />
          </div>
        </div>
        <div>
          <h3 className="text-xl font-semibold mb-2">{title}</h3>
          <p className="text-muted-foreground mb-4">{description}</p>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4" />
            <span>Available on Pro and Lifetime plans</span>
          </div>
        </div>
        <Button 
          onClick={() => navigate('/pricing')} 
          size="lg" 
          className="bg-primary hover:bg-primary/90"
        >
          <Crown className="h-4 w-4 mr-2" />
          Upgrade to Unlock {featureName}
        </Button>
      </CardContent>
    </Card>
  );
};