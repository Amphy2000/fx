import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Target, TrendingUp, Award, Edit2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const Setups = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [setups, setSetups] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSetup, setEditingSetup] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    rules: "",
    tags: "",
    keywords: ""
  });

  useEffect(() => {
    checkAuth();
    fetchSetups();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const fetchSetups = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await (supabase as any)
      .from("setups")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (data) {
      setSetups(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const setupData = {
      user_id: user.id,
      name: formData.name,
      description: formData.description,
      rules: formData.rules,
      tags: formData.tags.split(",").map(t => t.trim()).filter(t => t),
      keywords: formData.keywords.split(",").map(k => k.trim()).filter(k => k)
    };

    const { error } = editingSetup
      ? await (supabase as any).from("setups").update(setupData).eq("id", editingSetup.id)
      : await (supabase as any).from("setups").insert(setupData);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: editingSetup ? "Setup updated!" : "Setup created!",
        description: "Your trading setup has been saved."
      });
      setDialogOpen(false);
      resetForm();
      fetchSetups();
    }

    setLoading(false);
  };

  const handleEdit = (setup: any) => {
    setEditingSetup(setup);
    setFormData({
      name: setup.name,
      description: setup.description || "",
      rules: setup.rules,
      tags: setup.tags?.join(", ") || "",
      keywords: setup.keywords?.join(", ") || ""
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await (supabase as any).from("setups").delete().eq("id", id);
    
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({ title: "Setup deleted" });
      fetchSetups();
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      rules: "",
      tags: "",
      keywords: ""
    });
    setEditingSetup(null);
  };

  const getSetupStats = async (setupId: string) => {
    const { data } = await (supabase as any)
      .from("trades")
      .select("result, profit_loss")
      .eq("setup_id", setupId);

    if (!data) return { trades: 0, winRate: 0, avgPL: 0 };

    const trades = data.length;
    const wins = data.filter(t => t.result === "win").length;
    const winRate = trades > 0 ? ((wins / trades) * 100).toFixed(1) : "0";
    const avgPL = trades > 0 
      ? (data.reduce((sum, t) => sum + (t.profit_loss || 0), 0) / trades).toFixed(2)
      : "0";

    return { trades, winRate, avgPL };
  };

  return (
    <Layout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Trading Setups</h1>
            <p className="text-muted-foreground">Define and track your trading strategies</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Setup
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingSetup ? "Edit Setup" : "Create New Setup"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Setup Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g., Breakout Retest, Support Bounce"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Brief overview of this setup..."
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Entry Rules</Label>
                  <Textarea
                    value={formData.rules}
                    onChange={(e) => setFormData({...formData, rules: e.target.value})}
                    placeholder="1. Wait for breakout&#10;2. Confirmation candle&#10;3. Enter on retest..."
                    rows={6}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tags (comma separated)</Label>
                  <Input
                    value={formData.tags}
                    onChange={(e) => setFormData({...formData, tags: e.target.value})}
                    placeholder="scalping, momentum, reversal"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Keywords (for auto-tagging)</Label>
                  <Input
                    value={formData.keywords}
                    onChange={(e) => setFormData({...formData, keywords: e.target.value})}
                    placeholder="breakout, retest, support"
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? "Saving..." : editingSetup ? "Update" : "Create"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {setups.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Target className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No setups yet</h3>
              <p className="text-muted-foreground mb-4">Create your first trading setup to start tracking performance</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {setups.map((setup) => (
              <Card key={setup.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        <Award className="w-5 h-5 text-primary" />
                        {setup.name}
                      </CardTitle>
                      {setup.description && (
                        <CardDescription className="mt-2">{setup.description}</CardDescription>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(setup)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(setup.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Rules:</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">{setup.rules}</p>
                  </div>
                  
                  {setup.tags && setup.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {setup.tags.map((tag: string, idx: number) => (
                        <Badge key={idx} variant="secondary">{tag}</Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Setups;
