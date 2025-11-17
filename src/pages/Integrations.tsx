import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Upload, TrendingUp, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const Integrations = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [mt5Connection, setMt5Connection] = useState<any>(null);
  const [connecting, setConnecting] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    brokerName: "",
    serverName: "",
    accountNumber: "",
    investorPassword: ""
  });

  useEffect(() => {
    checkAuth();
  }, [navigate]);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      await fetchMT5Connection();
    } catch (error) {
      console.error("Error checking auth:", error);
      toast.error("Failed to verify authentication");
    } finally {
      setLoading(false);
    }
  };

  const fetchMT5Connection = async () => {
    try {
      const { data, error } = await supabase
        .from("mt5_connections")
        .select("*")
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;
      setMt5Connection(data);
    } catch (error) {
      console.error("Error fetching MT5 connection:", error);
    }
  };

  const handleConnectMT5 = async (e: React.FormEvent) => {
    e.preventDefault();
    setConnecting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Note: In production, encrypt the password before storing
      const { error } = await supabase.from("mt5_connections").insert({
        user_id: user.id,
        broker_name: formData.brokerName,
        server_name: formData.serverName,
        account_number: formData.accountNumber,
        investor_password_encrypted: formData.investorPassword, // Should be encrypted
        sync_status: "pending"
      });

      if (error) throw error;

      toast.success("MT5 account connected successfully!");
      await fetchMT5Connection();
      setFormData({ brokerName: "", serverName: "", accountNumber: "", investorPassword: "" });
    } catch (error: any) {
      console.error("Error connecting MT5:", error);
      toast.error(error.message || "Failed to connect MT5 account");
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!mt5Connection) return;

    try {
      const { error } = await supabase
        .from("mt5_connections")
        .update({ is_active: false })
        .eq("id", mt5Connection.id);

      if (error) throw error;

      toast.success("MT5 account disconnected");
      setMt5Connection(null);
    } catch (error) {
      console.error("Error disconnecting:", error);
      toast.error("Failed to disconnect MT5 account");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = [".csv", ".html", ".htm"];
    const fileExt = file.name.substring(file.name.lastIndexOf("."));
    
    if (!validTypes.includes(fileExt.toLowerCase())) {
      toast.error("Please upload a valid MT5 report (.csv or .html)");
      return;
    }

    setUploading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in to upload files");
        return;
      }

      const formData = new FormData();
      formData.append("file", file);

      // Use direct fetch for FormData uploads
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-mt5-trades`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: formData
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Upload failed with status ${response.status}`);
      }

      const data = await response.json();

      if (!data || !data.importedCount) {
        throw new Error("No trades found in the file. Please check the file format.");
      }

      toast.success(`Successfully imported ${data.importedCount} trades!`);
      
      // Trigger AI analysis for imported trades
      if (data.tradeIds && data.tradeIds.length > 0) {
        toast.info("AI is analyzing your trades...");
        
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          toast.warning("Trades imported but AI analysis requires login");
          return;
        }

        const { error: analysisError } = await supabase.functions.invoke("analyze-trade-patterns", {
          body: { tradeIds: data.tradeIds }
        });
        
        if (analysisError) {
          console.error("AI analysis error:", analysisError);
          toast.warning("Trades imported but AI analysis failed");
        } else {
          toast.success("AI analysis complete!");
        }
      }
    } catch (error: any) {
      console.error("Error uploading file:", error);
      const errorMessage = error.message || "Failed to import trades. Please ensure the file is a valid MT5 report.";
      toast.error(errorMessage);
    } finally {
      setUploading(false);
      e.target.value = ""; // Reset file input
    }
  };

  const getSyncStatusBadge = (status: string) => {
    const configs: Record<string, { variant: "default" | "secondary" | "outline" | "destructive"; icon: any }> = {
      success: { variant: "default", icon: CheckCircle },
      pending: { variant: "secondary", icon: RefreshCw },
      syncing: { variant: "outline", icon: RefreshCw },
      error: { variant: "destructive", icon: AlertCircle }
    };
    const config = configs[status] || configs.pending;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
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
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Integrations</h1>
          <p className="text-muted-foreground">Connect your MT5 account or upload trade reports for automatic journaling</p>
        </div>

        {/* MT5 Auto-Sync Section */}
        <Card className="border-border mb-6">
          <CardHeader>
            <div className="flex items-center gap-3">
              <TrendingUp className="h-6 w-6 text-primary" />
              <div>
                <CardTitle className="text-foreground">MT5 Auto-Sync</CardTitle>
                <CardDescription>Connect your MetaTrader 5 account for automatic trade synchronization</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {mt5Connection ? (
              <div className="space-y-4">
                <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status</span>
                    {getSyncStatusBadge(mt5Connection.sync_status)}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Broker</span>
                    <span className="text-foreground font-medium">{mt5Connection.broker_name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Account</span>
                    <span className="text-foreground font-medium">{mt5Connection.account_number}</span>
                  </div>
                  {mt5Connection.last_sync_at && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Last Sync</span>
                      <span className="text-foreground font-medium">
                        {new Date(mt5Connection.last_sync_at).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleDisconnect} className="w-full">
                    Disconnect
                  </Button>
                </div>

                <div className="text-xs text-muted-foreground bg-primary/10 p-3 rounded border border-primary/20">
                  <strong>Connected:</strong> Your MT5 account is connected. Upload trade reports below to sync your trading history automatically.
                </div>
              </div>
            ) : (
              <form onSubmit={handleConnectMT5} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="brokerName">Broker Name</Label>
                  <Input
                    id="brokerName"
                    placeholder="e.g., XM Global, FXTM, IC Markets"
                    value={formData.brokerName}
                    onChange={(e) => setFormData({ ...formData, brokerName: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="serverName">Server Name</Label>
                  <Input
                    id="serverName"
                    placeholder="e.g., XMGlobal-MT5"
                    value={formData.serverName}
                    onChange={(e) => setFormData({ ...formData, serverName: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accountNumber">Account Number</Label>
                  <Input
                    id="accountNumber"
                    placeholder="Your MT5 account number"
                    value={formData.accountNumber}
                    onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="investorPassword">Investor (Read-Only) Password</Label>
                  <Input
                    id="investorPassword"
                    type="password"
                    placeholder="Read-only password"
                    value={formData.investorPassword}
                    onChange={(e) => setFormData({ ...formData, investorPassword: e.target.value })}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Investor password provides read-only access. We cannot execute trades.
                  </p>
                </div>

                <Button type="submit" className="w-full" disabled={connecting}>
                  {connecting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    "Connect MT5 Account"
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <Separator className="my-6" />

        {/* Manual Upload Section */}
        <Card className="border-border">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Upload className="h-6 w-6 text-primary" />
              <div>
                <CardTitle className="text-foreground">Manual Trade Import</CardTitle>
                <CardDescription>Upload your MT5 trade report (.csv or .html) to import trades</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <Label htmlFor="file-upload" className="cursor-pointer">
                <span className="text-foreground font-medium hover:text-primary transition-colors">
                  Choose file or drag and drop
                </span>
                <p className="text-sm text-muted-foreground mt-1">
                  Supported formats: .csv, .html
                </p>
              </Label>
              <Input
                id="file-upload"
                type="file"
                accept=".csv,.html,.htm"
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
              />
              {uploading && (
                <div className="mt-4 flex items-center justify-center gap-2 text-primary">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Importing trades...</span>
                </div>
              )}
            </div>

            <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded space-y-2">
              <p><strong>How to export from MT5:</strong></p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Open MT5 Terminal</li>
                <li>Go to "Account History" tab</li>
                <li>Right-click → "Save as Report"</li>
                <li>Choose HTML or CSV format</li>
                <li>Upload the file here</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Integrations;
