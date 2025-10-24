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
      const TELEGRAM_BOT_TOKEN = "YOUR_BOT_TOKEN"; // This will be replaced by bot username
      const botUsername = "your_bot_username"; // User needs to provide this
      
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
      <div className="container mx-auto p-6 max-w-4xl">
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
        </div>
      </div>
    </Layout>
  );
};

export default Settings;
