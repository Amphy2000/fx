import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const Settings = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [telegramConnecting, setTelegramConnecting] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      fetchProfile(session.user.id);
    };
    checkAuth();
  }, [navigate]);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const handleConnectTelegram = async () => {
    if (!profile) return;
    
    setTelegramConnecting(true);
    try {
      // Use the actual bot username for Amphy Trade Journal
      const botUsername = "AmphyJournalBot";
      
      // Create deep link with user ID
      const deepLink = `https://t.me/${botUsername}?start=${profile.id}`;
      
      // Open Telegram
      window.open(deepLink, '_blank');
      
      toast.success("Opening Telegram... Click 'Start' to connect!");
    } catch (error) {
      console.error("Error connecting Telegram:", error);
      toast.error("Failed to connect Telegram");
    } finally {
      setTelegramConnecting(false);
    }
  };

  const handleReconnectTelegram = async () => {
    // Allow users to reconnect at any time
    await handleConnectTelegram();
  };

  const handleDisconnectTelegram = async () => {
    if (!profile) return;
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ telegram_chat_id: null, telegram_notifications_enabled: false })
        .eq("id", profile.id);

      if (error) throw error;
      setProfile({ ...profile, telegram_chat_id: null, telegram_notifications_enabled: false });
      toast.success("Telegram disconnected. You can reconnect anytime.");
    } catch (error) {
      console.error("Error disconnecting Telegram:", error);
      toast.error("Failed to disconnect Telegram");
    }
  };

  const handleToggleNotifications = async (enabled: boolean) => {
    if (!profile) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ telegram_notifications_enabled: enabled })
        .eq("id", profile.id);

      if (error) throw error;

      setProfile({ ...profile, telegram_notifications_enabled: enabled });
      toast.success(enabled ? "Notifications enabled" : "Notifications disabled");
    } catch (error) {
      console.error("Error updating notifications:", error);
      toast.error("Failed to update notifications");
    }
  };

  const handleResetAccount = async () => {
    if (!profile) return;
    
    const confirmed = window.confirm(
      "⚠️ WARNING: This will permanently delete ALL your data including:\n\n" +
      "• All trades\n" +
      "• Journal entries\n" +
      "• Achievements\n" +
      "• Check-ins\n" +
      "• Streaks\n" +
      "• Analytics data\n" +
      "• MT5 connections\n\n" +
      "This action CANNOT be undone. Are you absolutely sure?"
    );
    
    if (!confirmed) return;
    
    try {
      toast.info("Deleting all data... This may take a moment.");
      
      // Use database function to efficiently delete all user data (handles large datasets without timeout)
      const { error: deleteError } = await supabase.rpc('delete_all_user_data', {
        p_user_id: profile.id
      });

      if (deleteError) {
        console.error("Error deleting user data:", deleteError);
        throw deleteError;
      }
      
      // Reset profile to fresh free tier account
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ 
          trades_count: 0,
          current_streak: 0,
          longest_streak: 0,
          last_trade_date: null,
          onboarding_completed: false,
          onboarding_step: 0,
          ai_credits: 100,
          subscription_tier: 'free',
          subscription_status: 'active',
          subscription_expires_at: null,
          monthly_trade_limit: 50
        })
        .eq("id", profile.id);

      if (profileError) {
        console.error("Profile reset error:", profileError);
        throw profileError;
      }
      
      toast.success("Account reset successfully! Redirecting to fresh dashboard...");
      
      // Force a hard refresh to clear all cached data
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 1500);
    } catch (error) {
      console.error("Error resetting account:", error);
      toast.error("Failed to reset account. Check console for details.");
    }
  };

  const restartOnboarding = async () => {
    if (!profile) return;
    
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ 
          onboarding_completed: false,
          onboarding_step: 0
        })
        .eq("id", profile.id);

      if (error) throw error;
      
      toast.success("Restarting onboarding...");
      navigate("/onboarding");
    } catch (error) {
      console.error("Error restarting onboarding:", error);
      toast.error("Failed to restart onboarding");
    }
  };

  const handleExportData = async (format: 'json' | 'csv') => {
    if (!profile) return;
    
    try {
      toast.info(`Preparing ${format.toUpperCase()} export...`);
      
      const { data, error } = await supabase.functions.invoke('export-user-data', {
        body: { format }
      });

      if (error) throw error;

      // Create blob and download
      const blob = format === 'json' 
        ? new Blob([data], { type: 'application/json' })
        : new Blob([data], { type: 'text/csv' });
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `amphy-backup-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success(`${format.toUpperCase()} export complete!`);
    } catch (error) {
      console.error("Error exporting data:", error);
      toast.error("Failed to export data");
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate("/auth");
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("Failed to sign out");
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto p-6 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-3 sm:p-4 md:p-6 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8 text-foreground">Settings</h1>

        <div className="space-y-6">
          {/* Telegram Integration */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Telegram Notifications</CardTitle>
              <CardDescription>
                Get trade updates and weekly summaries directly on Telegram
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {profile?.telegram_chat_id ? (
                <>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-foreground">Connected</Label>
                      <p className="text-sm text-muted-foreground">
                        Your Telegram is connected ✓
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={profile.telegram_notifications_enabled}
                        onCheckedChange={handleToggleNotifications}
                      />
                      <Label className="text-muted-foreground">
                        {profile.telegram_notifications_enabled ? "Enabled" : "Disabled"}
                      </Label>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <Button variant="outline" onClick={handleReconnectTelegram} disabled={telegramConnecting}>
                      {telegramConnecting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Opening Telegram...
                        </>
                      ) : (
                        'Reconnect Telegram'
                      )}
                    </Button>
                    <Button variant="destructive" onClick={handleDisconnectTelegram}>
                      Disconnect
                    </Button>
                  </div>
                 </>
              ) : (
                <Button 
                  onClick={handleConnectTelegram}
                  disabled={telegramConnecting}
                  className="w-full"
                >
                  {telegramConnecting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    "Connect Telegram"
                  )}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Profile Info */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Profile Information</CardTitle>
              <CardDescription>Your account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <Label className="text-muted-foreground">Email</Label>
                <p className="text-foreground">{profile?.email}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Full Name</Label>
                <p className="text-foreground">{profile?.full_name || "Not set"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Total Trades</Label>
                <p className="text-foreground">{profile?.trades_count || 0}</p>
              </div>
            </CardContent>
          </Card>

          {/* Onboarding */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Onboarding</CardTitle>
              <CardDescription>Review the app's key features</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={restartOnboarding} variant="outline" className="w-full">
                Restart Onboarding Tour
              </Button>
            </CardContent>
          </Card>

          {/* Data Export */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Data Export & Backup</CardTitle>
              <CardDescription>Download your data before resetting your account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Button onClick={() => handleExportData('json')} variant="outline" className="w-full">
                  Export as JSON
                </Button>
                <Button onClick={() => handleExportData('csv')} variant="outline" className="w-full">
                  Export as CSV
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                JSON includes all data. CSV includes trades only.
              </p>
            </CardContent>
          </Card>

          {/* Account Actions */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Account Management</CardTitle>
              <CardDescription>Manage your account and data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={handleSignOut} variant="outline" className="w-full">
                Sign Out
              </Button>
              <div className="pt-3 border-t border-border">
                <Button onClick={handleResetAccount} variant="destructive" className="w-full">
                  Reset Account (Delete All Data)
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  ⚠️ This will permanently delete all your trades, journal entries, achievements, and other data. This action cannot be undone.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Settings;
