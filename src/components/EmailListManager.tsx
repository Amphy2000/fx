import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Upload, Download, Users, Trash2, Edit, UserPlus, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export const EmailListManager = () => {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isManageContactsOpen, setIsManageContactsOpen] = useState(false);
  const [selectedList, setSelectedList] = useState<any>(null);
  const [editingList, setEditingList] = useState<any>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [contactEmail, setContactEmail] = useState("");
  const [contactData, setContactData] = useState({
    firstName: "",
    lastName: "",
    tags: "",
  });
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  // Get current user
  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  // Fetch lists
  const { data: lists, isLoading } = useQuery({
    queryKey: ["email-lists"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_lists")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Create list
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("email_lists").insert({
        ...data,
        created_by: currentUser?.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-lists"] });
      toast.success("List created successfully");
      setIsCreateOpen(false);
      setFormData({ name: "", description: "" });
    },
    onError: (error: any) => {
      toast.error(`Failed to create list: ${error.message}`);
    },
  });

  // Fetch contacts for selected list
  const { data: listContacts } = useQuery({
    queryKey: ["email-contacts", selectedList?.id],
    queryFn: async () => {
      if (!selectedList?.id) return [];
      const { data, error } = await supabase
        .from("email_contacts")
        .select("*")
        .eq("list_id", selectedList.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedList?.id && isManageContactsOpen,
  });

  // Update list
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { error } = await supabase
        .from("email_lists")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-lists"] });
      toast.success("List updated successfully");
      setIsEditOpen(false);
      setEditingList(null);
      setFormData({ name: "", description: "" });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update list: ${error.message}`);
    },
  });

  // Delete list
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("email_lists")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-lists"] });
      toast.success("List deleted successfully");
    },
    onError: (error: any) => {
      toast.error(`Failed to delete list: ${error.message}`);
    },
  });

  // Add contact to list
  const addContactMutation = useMutation({
    mutationFn: async ({ listId, contact }: { listId: string; contact: any }) => {
      const { data: insertedContact, error } = await supabase
        .from("email_contacts")
        .insert({
          list_id: listId,
          email: contact.email,
          first_name: contact.firstName || "",
          last_name: contact.lastName || "",
          status: "active",
        })
        .select()
        .single();

      if (error) throw error;

      // Add tags if provided
      if (contact.tags && insertedContact) {
        const tags = contact.tags.split(",").map((t: string) => t.trim()).filter(Boolean);
        if (tags.length > 0) {
          const tagInserts = tags.map((tag: string) => ({
            contact_id: insertedContact.id,
            tag,
          }));
          const { error: tagError } = await supabase
            .from("email_contact_tags")
            .insert(tagInserts);
          if (tagError) console.error("Failed to add tags:", tagError);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-contacts"] });
      queryClient.invalidateQueries({ queryKey: ["email-lists"] });
      toast.success("Contact added successfully");
      setContactEmail("");
      setContactData({ firstName: "", lastName: "", tags: "" });
    },
    onError: (error: Error) => {
      toast.error(`Failed to add contact: ${error.message}`);
    },
  });

  // Delete contact
  const deleteContactMutation = useMutation({
    mutationFn: async (contactId: string) => {
      const { error } = await supabase
        .from("email_contacts")
        .delete()
        .eq("id", contactId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-contacts"] });
      queryClient.invalidateQueries({ queryKey: ["email-lists"] });
      toast.success("Contact removed successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove contact: ${error.message}`);
    },
  });

  // Import all registered users
  const importAllUsersMutation = useMutation({
    mutationFn: async (listId: string) => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, email, full_name");

      if (error) throw error;

      const contacts = profiles
        .filter(p => p.email)
        .map(p => {
          const names = p.full_name?.split(" ") || [];
          return {
            list_id: listId,
            email: p.email,
            first_name: names[0] || "",
            last_name: names.slice(1).join(" ") || "",
            source: "app_users",
          };
        });

      const { data, error: insertError } = await supabase
        .from("email_contacts")
        .upsert(contacts, { onConflict: "list_id,email" });

      if (insertError) throw insertError;
      return contacts.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["email-lists"] });
      toast.success(`Successfully imported ${count} app users`);
    },
    onError: (error: any) => {
      toast.error(`Failed to import users: ${error.message}`);
    },
  });

  // Import contacts
  const importMutation = useMutation({
    mutationFn: async ({ listId, file }: { listId: string; file: File }) => {
      const text = await file.text();
      const lines = text.split("\n").filter(line => line.trim());
      
      // Parse CSV
      const contacts = [];
      const headers = lines[0].toLowerCase().split(",").map(h => h.trim().replace(/"/g, ""));
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map(v => v.trim().replace(/"/g, ""));
        const contact: any = {};
        
        headers.forEach((header, index) => {
          if (header === "email") contact.email = values[index];
          else if (header === "first_name" || header === "first name" || header === "firstname") {
            contact.first_name = values[index];
          }
          else if (header === "last_name" || header === "last name" || header === "lastname") {
            contact.last_name = values[index];
          }
          else if (header === "tags") {
            contact.tags = values[index] ? values[index].split(";").map((t: string) => t.trim()) : [];
          }
          else if (values[index]) {
            if (!contact.custom_fields) contact.custom_fields = {};
            contact.custom_fields[header] = values[index];
          }
        });
        
        if (contact.email) {
          contacts.push(contact);
        }
      }

      const { data, error } = await supabase.functions.invoke("import-email-contacts", {
        body: { list_id: listId, contacts },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["email-lists"] });
      toast.success(`Imported ${data.imported} contacts, skipped ${data.skipped}`);
      if (data.total_errors > 0) {
        toast.warning(`${data.total_errors} errors occurred during import`);
      }
      setIsImportOpen(false);
      setImportFile(null);
    },
    onError: (error: any) => {
      toast.error(`Import failed: ${error.message}`);
    },
  });

  // Export contacts
  const exportMutation = useMutation({
    mutationFn: async ({ listId, format }: { listId: string; format: "csv" | "json" }) => {
      const { data, error } = await supabase.functions.invoke("export-email-contacts", {
        body: { list_id: listId, format, include_tags: true },
      });

      if (error) throw error;
      
      // Create download
      const blob = new Blob([format === "json" ? JSON.stringify(data, null, 2) : data], {
        type: format === "json" ? "application/json" : "text/csv",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `contacts-${listId}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    },
    onSuccess: () => {
      toast.success("Contacts exported successfully");
    },
    onError: (error: any) => {
      toast.error(`Export failed: ${error.message}`);
    },
  });

  const handleImport = () => {
    if (!selectedList || !importFile) return;
    importMutation.mutate({ listId: selectedList.id, file: importFile });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Email Lists</h2>
          <p className="text-muted-foreground">Manage your contact lists and segments</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create List
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Email List</DialogTitle>
              <DialogDescription>
                Create a new contact list to organize your subscribers
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>List Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Newsletter Subscribers"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Main newsletter list for weekly updates"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button onClick={() => createMutation.mutate(formData)} disabled={!formData.name}>
                Create List
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-12">Loading lists...</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {lists?.map((list) => (
            <Card key={list.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {list.name}
                </CardTitle>
                <CardDescription>{list.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Contacts:</span>
                    <Badge variant="secondary">{list.total_contacts}</Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Active:</span>
                    <Badge variant="default">{list.active_contacts}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    Created {new Date(list.created_at).toLocaleDateString()}
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <div className="flex gap-1 flex-wrap w-full">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingList(list);
                      setFormData({ name: list.name, description: list.description || "" });
                      setIsEditOpen(true);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedList(list);
                      setIsManageContactsOpen(true);
                    }}
                  >
                    <UserPlus className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedList(list);
                      setIsImportOpen(true);
                    }}
                  >
                    <Upload className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => importAllUsersMutation.mutate(list.id)}
                    disabled={importAllUsersMutation.isPending}
                  >
                    <Users className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportMutation.mutate({ listId: list.id, format: "csv" })}
                    disabled={exportMutation.isPending || (list.total_contacts || 0) === 0}
                    title={(list.total_contacts || 0) === 0 ? "No contacts to export" : "Export contacts"}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm("Are you sure? This will delete all contacts in this list.")) {
                        deleteMutation.mutate(list.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Edit List Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Email List</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>List Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Newsletter Subscribers"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe this list..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (editingList) {
                  updateMutation.mutate({
                    id: editingList.id,
                    data: {
                      name: formData.name,
                      description: formData.description,
                    },
                  });
                }
              }}
              disabled={!formData.name || updateMutation.isPending}
            >
              Update List
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Contacts Dialog */}
      <Dialog open={isManageContactsOpen} onOpenChange={setIsManageContactsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Manage Contacts - {selectedList?.name}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4">
            {/* Add Contact Form */}
            <div className="border rounded-lg p-4 space-y-3 bg-accent/20">
              <h3 className="font-medium">Add New Contact</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <Label>First Name</Label>
                  <Input
                    value={contactData.firstName}
                    onChange={(e) => setContactData({ ...contactData, firstName: e.target.value })}
                    placeholder="John"
                  />
                </div>
                <div>
                  <Label>Last Name</Label>
                  <Input
                    value={contactData.lastName}
                    onChange={(e) => setContactData({ ...contactData, lastName: e.target.value })}
                    placeholder="Doe"
                  />
                </div>
                <div className="col-span-2">
                  <Label>Tags (comma-separated)</Label>
                  <Input
                    value={contactData.tags}
                    onChange={(e) => setContactData({ ...contactData, tags: e.target.value })}
                    placeholder="vip, premium, active-trader"
                  />
                </div>
              </div>
              <Button
                onClick={() => {
                  if (selectedList?.id && contactEmail) {
                    addContactMutation.mutate({
                      listId: selectedList.id,
                      contact: {
                        email: contactEmail,
                        firstName: contactData.firstName,
                        lastName: contactData.lastName,
                        tags: contactData.tags,
                      },
                    });
                  }
                }}
                disabled={!contactEmail || addContactMutation.isPending}
                className="w-full"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add Contact
              </Button>
            </div>

            {/* Contact List */}
            <div>
              <h3 className="font-medium mb-2">Current Contacts ({listContacts?.length || 0})</h3>
              <div className="border rounded-lg max-h-[250px] overflow-y-auto">
                <div className="p-4 space-y-2">
                  {listContacts?.map((contact: any) => (
                    <div
                      key={contact.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{contact.email}</p>
                        {(contact.first_name || contact.last_name) && (
                          <p className="text-sm text-muted-foreground">
                            {contact.first_name} {contact.last_name}
                          </p>
                        )}
                        {contact.source && (
                          <Badge variant="outline" className="text-xs mt-1">
                            {contact.source}
                          </Badge>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm("Remove this contact from the list?")) {
                            deleteContactMutation.mutate(contact.id);
                          }
                        }}
                        disabled={deleteContactMutation.isPending}
                      >
                        <X className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  {(!listContacts || listContacts.length === 0) && (
                    <p className="text-center text-muted-foreground py-8">
                      No contacts yet. Add your first contact above.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Contacts</DialogTitle>
            <DialogDescription>
              Upload a CSV file with email addresses and contact information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>List: {selectedList?.name}</Label>
            </div>
            <div>
              <Label>CSV File</Label>
              <Input
                type="file"
                accept=".csv"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              />
              <p className="text-xs text-muted-foreground mt-2">
                Required columns: email. Optional: first_name, last_name, tags, custom fields
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsImportOpen(false)}>Cancel</Button>
            <Button onClick={handleImport} disabled={!importFile || importMutation.isPending}>
              {importMutation.isPending ? "Importing..." : "Import Contacts"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
