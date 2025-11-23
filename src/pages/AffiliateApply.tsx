import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, DollarSign, Users, TrendingUp, Star } from "lucide-react";

export default function AffiliateApply() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    tier: "micro",
    applicationNotes: "",
    instagram: "",
    youtube: "",
    twitter: "",
    tiktok: "",
    website: "",
    paymentMethod: "",
    paymentDetails: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to apply");
        navigate("/auth");
        return;
      }

      // Check if already applied
      const { data: existing } = await supabase
        .from("affiliate_profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (existing) {
        toast.error("You have already applied for the affiliate program");
        navigate("/affiliate/dashboard");
        return;
      }

      // Generate promo code
      const { data: promoCodeData, error: promoError } = await supabase
        .rpc("generate_promo_code");

      if (promoError) throw promoError;

      const promoCode = promoCodeData as string;

      // Create affiliate profile
      const { error } = await supabase
        .from("affiliate_profiles")
        .insert({
          user_id: user.id,
          promo_code: promoCode,
          tier: formData.tier,
          application_notes: formData.applicationNotes,
          social_links: {
            instagram: formData.instagram,
            youtube: formData.youtube,
            twitter: formData.twitter,
            tiktok: formData.tiktok,
            website: formData.website,
          },
          payment_info: {
            method: formData.paymentMethod,
            details: formData.paymentDetails,
          },
          status: "pending",
        });

      if (error) throw error;

      toast.success("Application submitted! We'll review and get back to you soon.");
      navigate("/affiliate/dashboard");
    } catch (error) {
      console.error("Error applying:", error);
      toast.error("Failed to submit application. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="container max-w-4xl py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            Become an Affiliate
          </h1>
          <p className="text-muted-foreground">
            Join our affiliate program and earn commissions by referring traders to Amphy AI
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader>
              <DollarSign className="h-8 w-8 text-primary mb-2" />
              <CardTitle>30-40% Commission</CardTitle>
              <CardDescription>Earn recurring commissions on all referrals</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <Users className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Lifetime Cookies</CardTitle>
              <CardDescription>Get credit for all future purchases</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <TrendingUp className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Real-Time Tracking</CardTitle>
              <CardDescription>Monitor clicks, conversions, and earnings</CardDescription>
            </CardHeader>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Application Form</CardTitle>
            <CardDescription>Tell us about yourself and how you plan to promote Amphy AI</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="tier">Influencer Tier</Label>
                <Select
                  value={formData.tier}
                  onValueChange={(value) => setFormData({ ...formData, tier: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="micro">Micro (1K-10K followers) - 30% commission</SelectItem>
                    <SelectItem value="mid">Mid-Tier (10K-100K followers) - 35% commission</SelectItem>
                    <SelectItem value="macro">Macro (100K+ followers) - 40% commission</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold">Social Media Links</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="instagram">Instagram</Label>
                    <Input
                      id="instagram"
                      placeholder="@yourusername"
                      value={formData.instagram}
                      onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="youtube">YouTube</Label>
                    <Input
                      id="youtube"
                      placeholder="Channel URL"
                      value={formData.youtube}
                      onChange={(e) => setFormData({ ...formData, youtube: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="twitter">Twitter/X</Label>
                    <Input
                      id="twitter"
                      placeholder="@yourusername"
                      value={formData.twitter}
                      onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tiktok">TikTok</Label>
                    <Input
                      id="tiktok"
                      placeholder="@yourusername"
                      value={formData.tiktok}
                      onChange={(e) => setFormData({ ...formData, tiktok: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="website">Website (Optional)</Label>
                    <Input
                      id="website"
                      placeholder="https://yourwebsite.com"
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">How will you promote Amphy AI?</Label>
                <Textarea
                  id="notes"
                  placeholder="Tell us about your audience, content style, and promotion strategy..."
                  value={formData.applicationNotes}
                  onChange={(e) => setFormData({ ...formData, applicationNotes: e.target.value })}
                  rows={4}
                  required
                />
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold">Payment Information</h3>
                <div className="space-y-2">
                  <Label htmlFor="paymentMethod">Payment Method</Label>
                  <Select
                    value={formData.paymentMethod}
                    onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paypal">PayPal</SelectItem>
                      <SelectItem value="bank">Bank Transfer</SelectItem>
                      <SelectItem value="crypto">Cryptocurrency</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paymentDetails">Payment Details</Label>
                  <Input
                    id="paymentDetails"
                    placeholder="Email, account number, or wallet address"
                    value={formData.paymentDetails}
                    onChange={(e) => setFormData({ ...formData, paymentDetails: e.target.value })}
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Star className="mr-2 h-4 w-4" />
                    Submit Application
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
