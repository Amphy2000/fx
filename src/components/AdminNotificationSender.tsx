import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EnhancedNotificationSender } from "./EnhancedNotificationSender";
import { NotificationTemplateManager } from "./NotificationTemplateManager";
import { NotificationAnalytics } from "./NotificationAnalytics";
import { CampaignManager } from "./CampaignManager";
import { CampaignComparison } from "./CampaignComparison";
import { FileText, Send, BarChart3, Zap, GitCompare } from "lucide-react";

export const AdminNotificationSender = () => {
  return (
    <Tabs defaultValue="send" className="w-full">
      <TabsList>
        <TabsTrigger value="send">
          <Send className="mr-2 h-4 w-4" />
          Send
        </TabsTrigger>
        <TabsTrigger value="campaigns">
          <Zap className="mr-2 h-4 w-4" />
          Campaigns
        </TabsTrigger>
        <TabsTrigger value="comparison">
          <GitCompare className="mr-2 h-4 w-4" />
          Compare
        </TabsTrigger>
        <TabsTrigger value="templates">
          <FileText className="mr-2 h-4 w-4" />
          Templates
        </TabsTrigger>
        <TabsTrigger value="analytics">
          <BarChart3 className="mr-2 h-4 w-4" />
          Analytics
        </TabsTrigger>
      </TabsList>

      <TabsContent value="send">
        <EnhancedNotificationSender />
      </TabsContent>

      <TabsContent value="campaigns">
        <CampaignManager />
      </TabsContent>

      <TabsContent value="comparison">
        <CampaignComparison />
      </TabsContent>

      <TabsContent value="templates">
        <NotificationTemplateManager />
      </TabsContent>

      <TabsContent value="analytics">
        <NotificationAnalytics />
      </TabsContent>
    </Tabs>
  );
};
