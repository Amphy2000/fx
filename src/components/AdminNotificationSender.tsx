import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EnhancedNotificationSender } from "./EnhancedNotificationSender";
import { NotificationTemplateManager } from "./NotificationTemplateManager";
import { NotificationAnalytics } from "./NotificationAnalytics";
import { FileText, Send, BarChart3 } from "lucide-react";

export const AdminNotificationSender = () => {
  return (
    <Tabs defaultValue="send" className="w-full">
      <TabsList>
        <TabsTrigger value="send">
          <Send className="mr-2 h-4 w-4" />
          Send Notifications
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

      <TabsContent value="templates">
        <NotificationTemplateManager />
      </TabsContent>

      <TabsContent value="analytics">
        <NotificationAnalytics />
      </TabsContent>
    </Tabs>
  );
};
