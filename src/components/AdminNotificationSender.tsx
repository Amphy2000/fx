import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail } from "lucide-react";

export const AdminNotificationSender = () => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          <CardTitle>Email Marketing</CardTitle>
        </div>
        <CardDescription>
          Manage your email campaigns, templates, and analytics
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Use the tabs above to access email templates, campaigns, analytics, workflows, A/B testing, lists, personalization, and warm-up features.
        </p>
      </CardContent>
    </Card>
  );
};
