import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Copy, DollarSign, Users, MousePointer, TrendingUp, Download, ExternalLink } from "lucide-react";
import { format } from "date-fns";

export default function AffiliateDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [clicks, setClicks] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Load affiliate profile
      const { data: profileData, error: profileError } = await supabase
        .from("affiliate_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (profileError) {
        if (profileError.code === "PGRST116") {
          navigate("/affiliate/apply");
          return;
        }
        throw profileError;
      }

      setProfile(profileData);

      // Load referrals
      const { data: referralsData } = await supabase
        .from("affiliate_referrals")
        .select("*")
        .eq("affiliate_id", profileData.id)
        .order("created_at", { ascending: false })
        .limit(10);

      setReferrals(referralsData || []);

      // Load clicks (last 7 days)
      const { data: clicksData } = await supabase
        .from("promo_code_clicks")
        .select("*")
        .eq("affiliate_id", profileData.id)
        .gte("clicked_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order("clicked_at", { ascending: false });

      setClicks(clicksData || []);

      // Load payouts
      const { data: payoutsData } = await supabase
        .from("affiliate_payouts")
        .select("*")
        .eq("affiliate_id", profileData.id)
        .order("requested_at", { ascending: false });

      setPayouts(payoutsData || []);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load affiliate data");
    } finally {
      setLoading(false);
    }
  };

  const copyPromoCode = () => {
    if (profile?.promo_code) {
      navigator.clipboard.writeText(profile.promo_code);
      toast.success("Promo code copied!");
    }
  };

  const copyAffiliateLink = () => {
    if (profile?.promo_code) {
      const link = `${window.location.origin}/pricing?ref=${profile.promo_code}`;
      navigator.clipboard.writeText(link);
      toast.success("Affiliate link copied!");
    }
  };

  const requestPayout = async () => {
    if (!profile || profile.pending_earnings < 50) {
      toast.error("Minimum payout amount is $50");
      return;
    }

    try {
      const { error } = await supabase.from("affiliate_payouts").insert({
        affiliate_id: profile.id,
        amount: profile.pending_earnings,
        status: "pending",
      });

      if (error) throw error;

      toast.success("Payout requested! We'll process it within 5-7 business days.");
      loadData();
    } catch (error) {
      console.error("Error requesting payout:", error);
      toast.error("Failed to request payout");
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (!profile) return null;

  const conversionRate = clicks.length > 0 
    ? ((referrals.length / clicks.length) * 100).toFixed(2) 
    : "0";

  return (
    <Layout>
      <div className="container py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              Affiliate Dashboard
            </h1>
            <p className="text-muted-foreground">Track your performance and earnings</p>
          </div>
          <Badge variant={profile.status === "active" ? "default" : "secondary"}>
            {profile.status.toUpperCase()}
          </Badge>
        </div>

        {profile.status === "pending" && (
          <Card className="mb-6 bg-yellow-500/10 border-yellow-500/20">
            <CardContent className="pt-6">
              <p className="text-sm">
                Your application is pending review. We'll notify you once it's approved!
              </p>
            </CardContent>
          </Card>
        )}

        {profile.status === "active" && (
          <>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${profile.total_earnings.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Pending: ${profile.pending_earnings.toFixed(2)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{profile.total_referrals}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Lifetime conversions
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Clicks (7 days)</CardTitle>
                  <MousePointer className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{clicks.length}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Conversion: {conversionRate}%
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Commission Rate</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{profile.commission_rate}%</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {profile.tier} tier
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Your Affiliate Links</CardTitle>
                <CardDescription>Share these with your audience to earn commissions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <div className="flex-1 flex items-center gap-2 bg-muted px-4 py-2 rounded-md">
                    <code className="flex-1 text-sm">{profile.promo_code}</code>
                    <Button size="sm" variant="ghost" onClick={copyPromoCode}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1 flex items-center gap-2 bg-muted px-4 py-2 rounded-md">
                    <code className="flex-1 text-sm truncate">
                      {window.location.origin}/pricing?ref={profile.promo_code}
                    </code>
                    <Button size="sm" variant="ghost" onClick={copyAffiliateLink}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => window.open(`/pricing?ref=${profile.promo_code}`, '_blank')}>
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2 mb-8">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Referrals</CardTitle>
                  <CardDescription>Your latest conversions</CardDescription>
                </CardHeader>
                <CardContent>
                  {referrals.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No referrals yet. Start sharing your link!</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Plan</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Commission</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {referrals.map((referral) => (
                          <TableRow key={referral.id}>
                            <TableCell className="font-medium">{referral.plan_type}</TableCell>
                            <TableCell>${referral.amount}</TableCell>
                            <TableCell className="text-primary">${referral.commission_amount}</TableCell>
                            <TableCell>
                              <Badge variant={referral.status === "completed" ? "default" : "secondary"}>
                                {referral.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Payouts</CardTitle>
                    <CardDescription>Your payout history</CardDescription>
                  </div>
                  <Button 
                    onClick={requestPayout} 
                    disabled={profile.pending_earnings < 50}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Request Payout
                  </Button>
                </CardHeader>
                <CardContent>
                  {payouts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No payouts yet. Minimum payout amount is $50.
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Amount</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payouts.map((payout) => (
                          <TableRow key={payout.id}>
                            <TableCell className="font-medium">${payout.amount}</TableCell>
                            <TableCell>{format(new Date(payout.requested_at), "MMM d, yyyy")}</TableCell>
                            <TableCell>
                              <Badge variant={payout.status === "completed" ? "default" : "secondary"}>
                                {payout.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
