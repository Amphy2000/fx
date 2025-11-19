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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Sparkles, Trash2, Edit } from "lucide-react";

export const EmailPersonalizationManager = () => {
  const queryClient = useQueryClient();
  const [isBlockOpen, setIsBlockOpen] = useState(false);
  const [isRuleOpen, setIsRuleOpen] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState<any>(null);
  
  const [blockData, setBlockData] = useState({
    name: "",
    description: "",
    block_type: "text",
    content: {},
  });

  const [ruleData, setRuleData] = useState({
    name: "",
    description: "",
    rule_type: "user_attribute",
    conditions: {},
    content_block_id: "",
    priority: 0,
    is_active: true,
  });

  // Get current user
  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  // Fetch content blocks
  const { data: blocks } = useQuery({
    queryKey: ["email-content-blocks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_content_blocks")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Fetch personalization rules
  const { data: rules } = useQuery({
    queryKey: ["email-personalization-rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_personalization_rules")
        .select("*, email_content_blocks(name)")
        .order("priority", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Create content block
  const createBlockMutation = useMutation({
    mutationFn: async (data: typeof blockData) => {
      const { error } = await supabase.from("email_content_blocks").insert({
        ...data,
        created_by: currentUser?.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-content-blocks"] });
      toast.success("Content block created");
      setIsBlockOpen(false);
      resetBlockForm();
    },
    onError: (error: any) => {
      toast.error(`Failed: ${error.message}`);
    },
  });

  // Create personalization rule
  const createRuleMutation = useMutation({
    mutationFn: async (data: typeof ruleData) => {
      const { error } = await supabase.from("email_personalization_rules").insert({
        ...data,
        created_by: currentUser?.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-personalization-rules"] });
      toast.success("Rule created");
      setIsRuleOpen(false);
      resetRuleForm();
    },
    onError: (error: any) => {
      toast.error(`Failed: ${error.message}`);
    },
  });

  // Delete block
  const deleteBlockMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("email_content_blocks")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-content-blocks"] });
      toast.success("Block deleted");
    },
  });

  // Toggle rule active status
  const toggleRuleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("email_personalization_rules")
        .update({ is_active })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-personalization-rules"] });
      toast.success("Rule updated");
    },
  });

  const resetBlockForm = () => {
    setBlockData({
      name: "",
      description: "",
      block_type: "text",
      content: {},
    });
    setSelectedBlock(null);
  };

  const resetRuleForm = () => {
    setRuleData({
      name: "",
      description: "",
      rule_type: "user_attribute",
      conditions: {},
      content_block_id: "",
      priority: 0,
      is_active: true,
    });
  };

  const getBlockTypeIcon = (type: string) => {
    switch (type) {
      case "text": return "📝";
      case "image": return "🖼️";
      case "button": return "🔘";
      case "product": return "🛒";
      case "dynamic": return "⚡";
      default: return "📦";
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="blocks" className="w-full">
        <TabsList>
          <TabsTrigger value="blocks">Content Blocks</TabsTrigger>
          <TabsTrigger value="rules">Personalization Rules</TabsTrigger>
        </TabsList>

        <TabsContent value="blocks" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Content Blocks</h3>
              <p className="text-sm text-muted-foreground">Reusable content for personalized emails</p>
            </div>
            <Dialog open={isBlockOpen} onOpenChange={setIsBlockOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Block
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh]">
                <DialogHeader>
                  <DialogTitle>Create Content Block</DialogTitle>
                  <DialogDescription>
                    Create reusable content for dynamic email personalization
                  </DialogDescription>
                </DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto pr-2 -mr-2">
                  <div className="space-y-4">
                  <div>
                    <Label>Block Name</Label>
                    <Input
                      value={blockData.name}
                      onChange={(e) => setBlockData({ ...blockData, name: e.target.value })}
                      placeholder="High-Value Product Recommendation"
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={blockData.description}
                      onChange={(e) => setBlockData({ ...blockData, description: e.target.value })}
                      placeholder="Shows products for users with high engagement"
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label>Block Type</Label>
                    <Select value={blockData.block_type} onValueChange={(value) => setBlockData({ ...blockData, block_type: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="image">Image</SelectItem>
                        <SelectItem value="button">Button</SelectItem>
                        <SelectItem value="product">Product</SelectItem>
                        <SelectItem value="dynamic">Dynamic</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Content (JSON)</Label>
                    <Textarea
                      value={JSON.stringify(blockData.content, null, 2)}
                      onChange={(e) => {
                        try {
                          setBlockData({ ...blockData, content: JSON.parse(e.target.value) });
                        } catch {}
                      }}
                      placeholder='{"html": "<p>Dynamic content here</p>", "variables": ["user_name"]}'
                      rows={5}
                      className="font-mono text-sm"
                    />
                  </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsBlockOpen(false)}>Cancel</Button>
                  <Button onClick={() => createBlockMutation.mutate(blockData)} disabled={!blockData.name}>
                    Create Block
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {blocks?.map((block) => (
              <Card key={block.id}>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <span>{getBlockTypeIcon(block.block_type)}</span>
                    {block.name}
                  </CardTitle>
                  <CardDescription>{block.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Badge variant="secondary">{block.block_type}</Badge>
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm("Delete this content block?")) {
                        deleteBlockMutation.mutate(block.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Personalization Rules</h3>
              <p className="text-sm text-muted-foreground">Define when to show specific content</p>
            </div>
            <Dialog open={isRuleOpen} onOpenChange={setIsRuleOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Rule
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh]">
                <DialogHeader>
                  <DialogTitle>Create Personalization Rule</DialogTitle>
                  <DialogDescription>
                    Define conditions for showing personalized content
                  </DialogDescription>
                </DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto pr-2 -mr-2">
                  <div className="space-y-4">
                  <div>
                    <Label>Rule Name</Label>
                    <Input
                      value={ruleData.name}
                      onChange={(e) => setRuleData({ ...ruleData, name: e.target.value })}
                      placeholder="Show Premium Content to Lifetime Users"
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={ruleData.description}
                      onChange={(e) => setRuleData({ ...ruleData, description: e.target.value })}
                      rows={2}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Rule Type</Label>
                      <Select value={ruleData.rule_type} onValueChange={(value) => setRuleData({ ...ruleData, rule_type: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user_attribute">User Attribute</SelectItem>
                          <SelectItem value="behavior">Behavior</SelectItem>
                          <SelectItem value="engagement">Engagement</SelectItem>
                          <SelectItem value="segment">Segment</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Priority</Label>
                      <Input
                        type="number"
                        value={ruleData.priority}
                        onChange={(e) => setRuleData({ ...ruleData, priority: parseInt(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Content Block</Label>
                    <Select value={ruleData.content_block_id} onValueChange={(value) => setRuleData({ ...ruleData, content_block_id: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select block" />
                      </SelectTrigger>
                      <SelectContent>
                        {blocks?.map((block) => (
                          <SelectItem key={block.id} value={block.id}>
                            {block.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Conditions (JSON)</Label>
                    <Textarea
                      value={JSON.stringify(ruleData.conditions, null, 2)}
                      onChange={(e) => {
                        try {
                          setRuleData({ ...ruleData, conditions: JSON.parse(e.target.value) });
                        } catch {}
                      }}
                      placeholder='{"subscription_tier": "lifetime", "trades_count": {"gt": 50}}'
                      rows={4}
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={ruleData.is_active}
                      onCheckedChange={(checked) => setRuleData({ ...ruleData, is_active: checked })}
                    />
                    <Label>Active</Label>
                  </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsRuleOpen(false)}>Cancel</Button>
                  <Button onClick={() => createRuleMutation.mutate(ruleData)} disabled={!ruleData.name || !ruleData.content_block_id}>
                    Create Rule
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-3">
            {rules?.map((rule) => (
              <Card key={rule.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Sparkles className="h-4 w-4" />
                          {rule.name}
                        </CardTitle>
                        <Badge variant={rule.is_active ? "default" : "secondary"}>
                          {rule.is_active ? "Active" : "Inactive"}
                        </Badge>
                        <Badge variant="outline">Priority: {rule.priority}</Badge>
                      </div>
                      <CardDescription>{rule.description}</CardDescription>
                    </div>
                    <Switch
                      checked={rule.is_active}
                      onCheckedChange={(checked) => toggleRuleMutation.mutate({ id: rule.id, is_active: checked })}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm space-y-2">
                    <div>
                      <span className="font-medium">Type:</span> <Badge variant="outline">{rule.rule_type}</Badge>
                    </div>
                    <div>
                      <span className="font-medium">Block:</span>{" "}
                      <span className="text-muted-foreground">{rule.email_content_blocks?.name}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
