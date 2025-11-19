import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Eye } from "lucide-react";
// @ts-ignore - react-email-editor doesn't have types
import EmailEditor from "react-email-editor";

export const EmailTemplateManager = () => {
  const queryClient = useQueryClient();
  const emailEditorRef = useRef<any>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [useVisualEditor, setUseVisualEditor] = useState(true);
  
  const [formData, setFormData] = useState({
    name: "",
    subject: "",
    preview_text: "",
    category: "general",
    html_content: "",
  });

  // Fetch templates
  const { data: templates, isLoading } = useQuery({
    queryKey: ["email-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Get current user
  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  // Export design from visual editor
  const exportHtml = async () => {
    return new Promise<string>((resolve) => {
      if (emailEditorRef.current && useVisualEditor) {
        emailEditorRef.current.exportHtml((data: any) => {
          const { html } = data;
          resolve(html);
        });
      } else {
        resolve(formData.html_content);
      }
    });
  };

  // Create template
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const htmlContent = await exportHtml();
      const { error } = await supabase.from("email_templates").insert({
        ...data,
        html_content: htmlContent,
        created_by: currentUser?.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      toast.success("Template created successfully");
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(`Failed to create template: ${error.message}`);
    },
  });

  // Update template
  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData & { id: string }) => {
      const { id, ...updateData } = data;
      const htmlContent = await exportHtml();
      const { error } = await supabase
        .from("email_templates")
        .update({ ...updateData, html_content: htmlContent })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      toast.success("Template updated successfully");
      setIsEditOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(`Failed to update template: ${error.message}`);
    },
  });

  // Delete template
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("email_templates")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      toast.success("Template deleted successfully");
    },
    onError: (error: any) => {
      toast.error(`Failed to delete template: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      subject: "",
      preview_text: "",
      category: "general",
      html_content: "",
    });
    setSelectedTemplate(null);
  };

  const handleEdit = (template: any) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      subject: template.subject,
      preview_text: template.preview_text || "",
      category: template.category,
      html_content: template.html_content,
    });
    setIsEditOpen(true);
  };

  const handlePreview = (template: any) => {
    setSelectedTemplate(template);
    setIsPreviewOpen(true);
  };

  const defaultTemplate = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
    .content { padding: 30px; background: #f9f9f9; }
    .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Amphy AI</h1>
    </div>
    <div class="content">
      <h2>Hello {{name}}!</h2>
      <p>This is your email content.</p>
      <center>
        <a href="https://fx.lovable.app/dashboard" class="button">View Dashboard</a>
      </center>
    </div>
  </div>
</body>
</html>`;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Email Templates</h2>
          <p className="text-muted-foreground">Create and manage email templates</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setFormData({ ...formData, html_content: defaultTemplate })}>
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Email Template</DialogTitle>
              <DialogDescription>
                Create a new email template. Use {`{{name}}, {{email}}`} as variables.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mb-4">
              <div className="flex items-center gap-2">
                <Label>Editor Mode:</Label>
                <Button
                  variant={useVisualEditor ? "default" : "outline"}
                  size="sm"
                  onClick={() => setUseVisualEditor(true)}
                >
                  Visual
                </Button>
                <Button
                  variant={!useVisualEditor ? "default" : "outline"}
                  size="sm"
                  onClick={() => setUseVisualEditor(false)}
                >
                  HTML
                </Button>
              </div>
            </div>

            <Tabs defaultValue="design" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="design">Design</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>
              <TabsContent value="design" className="space-y-4">
                <div className="grid gap-4">
                  <div>
                    <Label>Template Name</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Welcome Email"
                    />
                  </div>
                  <div>
                    <Label>Subject</Label>
                    <Input
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      placeholder="Welcome to Amphy AI"
                    />
                  </div>
                  <div>
                    <Label>Preview Text</Label>
                    <Input
                      value={formData.preview_text}
                      onChange={(e) => setFormData({ ...formData, preview_text: e.target.value })}
                      placeholder="Get started with your trading journal"
                    />
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General</SelectItem>
                        <SelectItem value="welcome">Welcome</SelectItem>
                        <SelectItem value="notification">Notification</SelectItem>
                        <SelectItem value="marketing">Marketing</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {useVisualEditor ? (
                    <div>
                      <Label>Email Design</Label>
                      <div className="border rounded-lg overflow-hidden" style={{ height: "600px" }}>
                        <EmailEditor
                          ref={emailEditorRef}
                          minHeight="600px"
                          options={{
                            appearance: {
                              theme: "modern_light",
                            },
                            mergeTags: {
                              name: { name: "Name", value: "{{name}}", sample: "John Doe" },
                              email: { name: "Email", value: "{{email}}", sample: "john@example.com" },
                            },
                          }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Available variables: {`{{name}}, {{email}}`}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <Label>HTML Content</Label>
                      <textarea
                        value={formData.html_content}
                        onChange={(e) => setFormData({ ...formData, html_content: e.target.value })}
                        rows={15}
                        className="w-full p-3 border rounded-md font-mono text-sm"
                      />
                    </div>
                  )}
                </div>
              </TabsContent>
              <TabsContent value="preview">
                <div className="border rounded-lg p-4 bg-white">
                  <iframe
                    srcDoc={formData.html_content.replace(/\{\{name\}\}/g, "John Doe").replace(/\{\{email\}\}/g, "john@example.com")}
                    className="w-full h-[500px] border-0"
                    title="Preview"
                  />
                </div>
              </TabsContent>
            </Tabs>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button onClick={() => createMutation.mutate(formData)} disabled={!formData.name || !formData.subject || !formData.html_content}>
                Create Template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-12">Loading templates...</div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {templates?.map((template) => (
            <Card key={template.id}>
              <CardHeader>
                <CardTitle className="text-lg">{template.name}</CardTitle>
                <CardDescription>{template.subject}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Category:</span> {template.category}
                  </div>
                  <div>
                    <span className="font-medium">Created:</span>{" "}
                    {new Date(template.created_at).toLocaleDateString()}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => handlePreview(template)}>
                  <Eye className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleEdit(template)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (confirm("Are you sure you want to delete this template?")) {
                      deleteMutation.mutate(template.id);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Email Template</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="design">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="design">Design</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>
            <TabsContent value="design" className="space-y-4">
              <div className="grid gap-4">
                <div>
                  <Label>Template Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Subject</Label>
                  <Input
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Preview Text</Label>
                  <Input
                    value={formData.preview_text}
                    onChange={(e) => setFormData({ ...formData, preview_text: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Category</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="welcome">Welcome</SelectItem>
                      <SelectItem value="notification">Notification</SelectItem>
                      <SelectItem value="marketing">Marketing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>HTML Content</Label>
                  <Textarea
                    value={formData.html_content}
                    onChange={(e) => setFormData({ ...formData, html_content: e.target.value })}
                    rows={15}
                    className="font-mono text-sm"
                  />
                </div>
              </div>
            </TabsContent>
            <TabsContent value="preview">
              <div className="border rounded-lg p-4 bg-white">
                <iframe
                  srcDoc={formData.html_content.replace(/{{name}}/g, "John Doe").replace(/{{email}}/g, "john@example.com")}
                  className="w-full h-[500px] border-0"
                  title="Preview"
                />
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button onClick={() => updateMutation.mutate({ ...formData, id: selectedTemplate?.id })}>
              Update Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{selectedTemplate?.name}</DialogTitle>
            <DialogDescription>{selectedTemplate?.subject}</DialogDescription>
          </DialogHeader>
          <div className="border rounded-lg overflow-hidden bg-white">
            <iframe
              srcDoc={selectedTemplate?.html_content.replace(/{{name}}/g, "John Doe").replace(/{{email}}/g, "john@example.com")}
              className="w-full h-[600px] border-0"
              title="Preview"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};