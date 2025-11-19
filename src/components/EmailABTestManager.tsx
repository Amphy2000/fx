import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Plus, Trophy, Pause, Play, TrendingUp } from "lucide-react";

export const EmailABTestManager = () => {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTest, setSelectedTest] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    test_type: "subject_line",
    campaign_id: "",
  });

  const [variants, setVariants] = useState([
    { name: "Variant A", subject_line: "", template_id: "", traffic_percentage: 50 },
    { name: "Variant B", subject_line: "", template_id: "", traffic_percentage: 50 },
  ]);

  // Get current user
  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  // Fetch A/B tests
  const { data: abTests, isLoading } = useQuery({
    queryKey: ["email-ab-tests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_ab_tests")
        .select(`
          *,
          email_campaigns(name),
          email_ab_variants(*)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Fetch campaigns for selection
  const { data: campaigns } = useQuery({
    queryKey: ["email-campaigns-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_campaigns")
        .select("id, name")
        .eq("status", "draft")
        .order("name");

      if (error) throw error;
      return data;
    },
  });

  // Fetch templates
  const { data: templates } = useQuery({
    queryKey: ["email-templates-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_templates")
        .select("id, name")
        .order("name");

      if (error) throw error;
      return data;
    },
  });

  // Create A/B test
  const createMutation = useMutation({
    mutationFn: async () => {
      // Create A/B test
      const { data: testData, error: testError } = await supabase
        .from("email_ab_tests")
        .insert({
          ...formData,
          created_by: currentUser?.id,
        })
        .select()
        .single();

      if (testError) throw testError;

      // Create variants
      const variantsToInsert = variants.map(v => ({
        ab_test_id: testData.id,
        name: v.name,
        subject_line: v.subject_line,
        template_id: v.template_id || null,
        traffic_percentage: v.traffic_percentage,
      }));

      const { error: variantsError } = await supabase
        .from("email_ab_variants")
        .insert(variantsToInsert);

      if (variantsError) throw variantsError;

      // Link test to campaign
      if (formData.campaign_id) {
        const { error: campaignError } = await supabase
          .from("email_campaigns")
          .update({ ab_test_id: testData.id })
          .eq("id", formData.campaign_id);

        if (campaignError) throw campaignError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-ab-tests"] });
      queryClient.invalidateQueries({ queryKey: ["email-campaigns-list"] });
      toast.success("A/B test created successfully");
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(`Failed to create A/B test: ${error.message}`);
    },
  });

  // Declare winner
  const declareWinnerMutation = useMutation({
    mutationFn: async ({ testId, variantId }: { testId: string; variantId: string }) => {
      const { error } = await supabase
        .from("email_ab_tests")
        .update({
          winner_variant_id: variantId,
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", testId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-ab-tests"] });
      toast.success("Winner declared successfully");
    },
    onError: (error: any) => {
      toast.error(`Failed to declare winner: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      test_type: "subject_line",
      campaign_id: "",
    });
    setVariants([
      { name: "Variant A", subject_line: "", template_id: "", traffic_percentage: 50 },
      { name: "Variant B", subject_line: "", template_id: "", traffic_percentage: 50 },
    ]);
  };

  const addVariant = () => {
    const currentPercentage = 100 / (variants.length + 1);
    const updatedVariants = variants.map(v => ({
      ...v,
      traffic_percentage: Math.floor(currentPercentage)
    }));
    
    setVariants([
      ...updatedVariants,
      {
        name: `Variant ${String.fromCharCode(65 + variants.length)}`,
        subject_line: "",
        template_id: "",
        traffic_percentage: Math.floor(currentPercentage)
      }
    ]);
  };

  const updateVariant = (index: number, field: string, value: any) => {
    const updated = [...variants];
    updated[index] = { ...updated[index], [field]: value };
    setVariants(updated);
  };

  const calculateMetrics = (variant: any) => {
    const openRate = variant.sent_count > 0 ? (variant.opened_count / variant.sent_count) * 100 : 0;
    const clickRate = variant.opened_count > 0 ? (variant.clicked_count / variant.opened_count) * 100 : 0;
    const conversionRate = variant.sent_count > 0 ? (variant.conversion_count / variant.sent_count) * 100 : 0;
    
    return { openRate, clickRate, conversionRate };
  };

  const getWinningVariant = (test: any) => {
    if (!test.email_ab_variants || test.email_ab_variants.length === 0) return null;
    
    return test.email_ab_variants.reduce((best: any, current: any) => {
      const bestMetrics = calculateMetrics(best);
      const currentMetrics = calculateMetrics(current);
      
      return currentMetrics.conversionRate > bestMetrics.conversionRate ? current : best;
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      running: "default",
      completed: "secondary",
      cancelled: "outline",
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Email A/B Tests</h2>
          <p className="text-muted-foreground">Compare variants to optimize campaign performance</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create A/B Test
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create A/B Test</DialogTitle>
              <DialogDescription>
                Set up variants to test different email elements
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Test Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Subject Line Test - Q1 Campaign"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Testing which subject line drives more opens"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Test Type</Label>
                  <Select value={formData.test_type} onValueChange={(value) => setFormData({ ...formData, test_type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="subject_line">Subject Line</SelectItem>
                      <SelectItem value="content">Content</SelectItem>
                      <SelectItem value="send_time">Send Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Campaign (Optional)</Label>
                  <Select value={formData.campaign_id} onValueChange={(value) => setFormData({ ...formData, campaign_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select campaign" />
                    </SelectTrigger>
                    <SelectContent>
                      {campaigns?.map((campaign) => (
                        <SelectItem key={campaign.id} value={campaign.id}>
                          {campaign.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-4">
                  <Label className="text-lg">Variants</Label>
                  <Button variant="outline" size="sm" onClick={addVariant}>
                    <Plus className="h-3 w-3 mr-1" />
                    Add Variant
                  </Button>
                </div>
                <div className="space-y-4">
                  {variants.map((variant, index) => (
                    <Card key={index}>
                      <CardHeader>
                        <CardTitle className="text-base">{variant.name}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {formData.test_type === "subject_line" && (
                          <div>
                            <Label>Subject Line</Label>
                            <Input
                              value={variant.subject_line}
                              onChange={(e) => updateVariant(index, "subject_line", e.target.value)}
                              placeholder={`Subject line for ${variant.name}`}
                            />
                          </div>
                        )}
                        {formData.test_type === "content" && (
                          <div>
                            <Label>Template</Label>
                            <Select
                              value={variant.template_id}
                              onValueChange={(value) => updateVariant(index, "template_id", value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select template" />
                              </SelectTrigger>
                              <SelectContent>
                                {templates?.map((template) => (
                                  <SelectItem key={template.id} value={template.id}>
                                    {template.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        <div>
                          <Label>Traffic Split: {variant.traffic_percentage}%</Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={variant.traffic_percentage}
                            onChange={(e) => updateVariant(index, "traffic_percentage", parseInt(e.target.value))}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button onClick={() => createMutation.mutate()} disabled={!formData.name}>
                Create Test
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-12">Loading A/B tests...</div>
      ) : (
        <div className="grid gap-6">
          {abTests?.map((test) => {
            const winning = getWinningVariant(test);
            
            return (
              <Card key={test.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">{test.name}</CardTitle>
                        {getStatusBadge(test.status)}
                        {test.winner_variant_id && (
                          <Badge variant="outline" className="bg-yellow-500/10">
                            <Trophy className="h-3 w-3 mr-1" />
                            Winner Declared
                          </Badge>
                        )}
                      </div>
                      <CardDescription>{test.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                      <div>
                        <span className="font-medium">Test Type:</span>{" "}
                        <span className="text-muted-foreground">{test.test_type.replace("_", " ")}</span>
                      </div>
                      <div>
                        <span className="font-medium">Campaign:</span>{" "}
                        <span className="text-muted-foreground">{test.email_campaigns?.name || "None"}</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {test.email_ab_variants?.map((variant: any) => {
                        const metrics = calculateMetrics(variant);
                        const isWinner = winning?.id === variant.id;
                        
                        return (
                          <Card key={variant.id} className={isWinner ? "border-primary" : ""}>
                            <CardHeader className="pb-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <CardTitle className="text-sm">{variant.name}</CardTitle>
                                  {isWinner && test.status === "running" && (
                                    <Badge variant="outline" className="bg-green-500/10">
                                      <TrendingUp className="h-3 w-3 mr-1" />
                                      Leading
                                    </Badge>
                                  )}
                                  {variant.id === test.winner_variant_id && (
                                    <Badge variant="outline" className="bg-yellow-500/10">
                                      <Trophy className="h-3 w-3 mr-1" />
                                      Winner
                                    </Badge>
                                  )}
                                </div>
                                {test.status === "running" && !test.winner_variant_id && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => declareWinnerMutation.mutate({ testId: test.id, variantId: variant.id })}
                                  >
                                    <Trophy className="h-3 w-3 mr-1" />
                                    Declare Winner
                                  </Button>
                                )}
                              </div>
                              {variant.subject_line && (
                                <CardDescription className="text-xs">{variant.subject_line}</CardDescription>
                              )}
                            </CardHeader>
                            <CardContent className="pb-3">
                              <div className="grid grid-cols-4 gap-4 text-xs">
                                <div>
                                  <div className="text-muted-foreground mb-1">Sent</div>
                                  <div className="font-bold">{variant.sent_count}</div>
                                </div>
                                <div>
                                  <div className="text-muted-foreground mb-1">Open Rate</div>
                                  <div className="font-bold">{metrics.openRate.toFixed(1)}%</div>
                                  <Progress value={metrics.openRate} className="h-1 mt-1" />
                                </div>
                                <div>
                                  <div className="text-muted-foreground mb-1">Click Rate</div>
                                  <div className="font-bold">{metrics.clickRate.toFixed(1)}%</div>
                                  <Progress value={metrics.clickRate} className="h-1 mt-1" />
                                </div>
                                <div>
                                  <div className="text-muted-foreground mb-1">Conversion</div>
                                  <div className="font-bold">{metrics.conversionRate.toFixed(1)}%</div>
                                  <Progress value={metrics.conversionRate} className="h-1 mt-1" />
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
