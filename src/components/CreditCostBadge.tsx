import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";

interface CreditCostBadgeProps {
  cost: number;
}

export const CreditCostBadge = ({ cost }: CreditCostBadgeProps) => {
  return (
    <Badge variant="outline" className="gap-1 bg-primary/10 text-primary border-primary/20">
      <Sparkles className="h-3 w-3" />
      {cost} {cost === 1 ? 'credit' : 'credits'}
    </Badge>
  );
};
