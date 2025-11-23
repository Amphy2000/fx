import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, Send, Loader2, Calendar, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const WeeklySummaryEmailManager = () => {
  const [isSending, setIsSending] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [lastRun, setLastRun] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);

  // Load analytics on mount
  useState(() => {
    loadAnalytics();
  });

  const loadAnalytics = async () => {
    try {
      // Get weekly summary campaign data
      const { data: campaigns, error: campaignsError } = await supabase
        .from('email_campaigns')
        .select('id, name, sent_count, opened_count, clicked_count, delivered_count, bounced_count, sent_at')
        .ilike('name', '%weekly%summary%')
        .order('sent_at', { ascending: false })
        .limit(10);

      if (campaignsError) throw campaignsError;

      // Calculate totals
      const totals = campaigns?.reduce((acc, campaign) => ({
        totalSent: acc.totalSent + (campaign.sent_count || 0),
        totalOpened: acc.totalOpened + (campaign.opened_count || 0),
        totalClicked: acc.totalClicked + (campaign.clicked_count || 0),
        totalDelivered: acc.totalDelivered + (campaign.delivered_count || 0),
        totalBounced: acc.totalBounced + (campaign.bounced_count || 0),
      }), { totalSent: 0, totalOpened: 0, totalClicked: 0, totalDelivered: 0, totalBounced: 0 });

      const openRate = totals && totals.totalSent > 0 ? ((totals.totalOpened / totals.totalSent) * 100).toFixed(1) : '0';
      const clickRate = totals && totals.totalSent > 0 ? ((totals.totalClicked / totals.totalSent) * 100).toFixed(1) : '0';
      const deliveryRate = totals && totals.totalSent > 0 ? ((totals.totalDelivered / totals.totalSent) * 100).toFixed(1) : '0';

      setAnalytics({
        totalSent: totals?.totalSent || 0,
        totalOpened: totals?.totalOpened || 0,
        totalClicked: totals?.totalClicked || 0,
        totalDelivered: totals?.totalDelivered || 0,
        totalBounced: totals?.totalBounced || 0,
        openRate,
        clickRate,
        deliveryRate,
        recentCampaigns: campaigns?.slice(0, 5) || []
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const handleSendWeeklySummaries = async () => {
    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-weekly-summaries', {
        body: {}
      });

      if (error) throw error;

      toast.success(`Weekly summaries sent!`, {
        description: `${data.emailsSent} emails sent successfully out of ${data.totalUsers} users`,
      });

      setLastRun({
        timestamp: new Date().toISOString(),
        emailsSent: data.emailsSent,
        errors: data.errors,
        totalUsers: data.totalUsers
      });

      // Reload analytics after sending
      loadAnalytics();

    } catch (error: any) {
      console.error('Error sending weekly summaries:', error);
      toast.error('Failed to send weekly summaries', {
        description: error.message
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleSendTest = async () => {
    if (!testEmail || !testEmail.includes('@')) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsSendingTest(true);
    try {
      const { error } = await supabase.functions.invoke('send-test-weekly-summary', {
        body: { email: testEmail }
      });

      if (error) throw error;
      
      toast.success(`Test weekly summary sent to ${testEmail}`);
      setTestEmail('');
    } catch (error: any) {
      console.error('Error sending test email:', error);
      toast.error(error.message || "Failed to send test email");
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Weekly Summary Emails
            </CardTitle>
            <CardDescription>
              Automated weekly trading performance summaries sent to all active users
            </CardDescription>
          </div>
          <Badge variant="outline" className="gap-1">
            <Calendar className="h-3 w-3" />
            Sundays 9AM UTC
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Analytics Overview */}
        {!loadingAnalytics && analytics && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Total Sent</p>
              <p className="text-2xl font-bold">{analytics.totalSent}</p>
            </div>
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Delivered</p>
              <p className="text-2xl font-bold text-green-600">{analytics.totalDelivered}</p>
              <p className="text-xs text-muted-foreground">{analytics.deliveryRate}%</p>
            </div>
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Opened</p>
              <p className="text-2xl font-bold text-blue-600">{analytics.totalOpened}</p>
              <p className="text-xs text-muted-foreground">{analytics.openRate}%</p>
            </div>
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Clicked</p>
              <p className="text-2xl font-bold text-purple-600">{analytics.totalClicked}</p>
              <p className="text-xs text-muted-foreground">{analytics.clickRate}%</p>
            </div>
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Bounced</p>
              <p className="text-2xl font-bold text-red-600">{analytics.totalBounced}</p>
            </div>
          </div>
        )}

        {/* Schedule Info */}
        <div className="bg-muted p-4 rounded-lg space-y-2">
          <h4 className="font-semibold text-sm flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Automatic Schedule
          </h4>
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>• Runs every Sunday at 9:00 AM UTC</p>
            <p>• Sends personalized summaries to users with trades</p>
            <p>• Includes AI insights for Pro/Lifetime users</p>
            <p>• Skips users with no trades in the past 7 days</p>
          </div>
        </div>

        {/* Test Email */}
        <div className="space-y-3 border-b pb-4">
          <div>
            <h4 className="font-semibold text-sm">Send Test Email</h4>
            <p className="text-xs text-muted-foreground">
              Preview the weekly summary email with sample data
            </p>
          </div>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="Enter email address"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              className="flex-1"
            />
            <Button
              onClick={handleSendTest}
              disabled={isSendingTest || !testEmail}
              className="gap-2"
              variant="outline"
            >
              {isSendingTest ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4" />
                  Send Test
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Manual Trigger */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-sm">Manual Send to All Users</h4>
              <p className="text-xs text-muted-foreground">
                Send weekly summaries to all eligible users now
              </p>
            </div>
            <Button
              onClick={handleSendWeeklySummaries}
              disabled={isSending}
              className="gap-2"
            >
              {isSending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Send to All
                </>
              )}
            </Button>
          </div>

          {/* Last Run Stats */}
          {lastRun && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">Last Run Successful</p>
                    <Badge variant="outline" className="text-xs">
                      {new Date(lastRun.timestamp).toLocaleString()}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-xs">
                    <div>
                      <p className="text-muted-foreground">Total Users</p>
                      <p className="font-semibold">{lastRun.totalUsers}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Emails Sent</p>
                      <p className="font-semibold text-green-600">{lastRun.emailsSent}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Errors</p>
                      <p className="font-semibold text-red-600">{lastRun.errors}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Email Content Preview */}
        <div className="space-y-2">
          <h4 className="font-semibold text-sm">Email Includes:</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-primary">✓</span>
              <span>Total trades & win rate</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-primary">✓</span>
              <span>Profit/Loss breakdown</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-primary">✓</span>
              <span>Most traded pair</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-primary">✓</span>
              <span>Best trade of the week</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-primary">✓</span>
              <span>Emotional state analysis</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-primary">✓</span>
              <span>AI insights (Pro/Lifetime)</span>
            </div>
          </div>
        </div>

        {/* Important Notes */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
          <p className="text-sm text-blue-600 dark:text-blue-400 font-medium mb-2">
            ℹ️ Important Notes
          </p>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Ensure RESEND_API_KEY is configured in Supabase secrets</li>
            <li>• Verify your domain at resend.com to avoid spam filters</li>
            <li>• Update the "from" email address in the edge function (line 153)</li>
            <li>• Cron job runs automatically every Sunday at 9 AM UTC</li>
            <li>• Test email uses the exact same template as real emails</li>
            <li>• Real emails will have actual user data instead of mock data</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
