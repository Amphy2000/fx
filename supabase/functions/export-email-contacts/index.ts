import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExportRequest {
  list_id: string;
  format?: "csv" | "json";
  include_tags?: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { list_id, format = "csv", include_tags = false }: ExportRequest = await req.json();

    console.log(`Exporting contacts from list ${list_id} as ${format}`);

    // Fetch contacts
    let query = supabaseClient
      .from("email_contacts")
      .select(`
        email,
        first_name,
        last_name,
        status,
        custom_fields,
        created_at,
        ${include_tags ? "email_contact_tags(tag)" : ""}
      `)
      .eq("list_id", list_id)
      .order("created_at", { ascending: false });

    const { data: contacts, error } = await query;

    if (error) throw error;

    // Handle empty list - return empty CSV/JSON with headers
    if (!contacts || contacts.length === 0) {
      if (format === "json") {
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Content-Disposition": `attachment; filename="contacts-${list_id}.json"`,
            ...corsHeaders,
          },
        });
      }
      
      // Return empty CSV with headers only
      const emptyCSV = "Email,First Name,Last Name,Status,Created At\n";
      return new Response(emptyCSV, {
        status: 200,
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="contacts-${list_id}.csv"`,
          ...corsHeaders,
        },
      });
    }

    // Type the contacts properly
    type Contact = {
      email: string;
      first_name?: string;
      last_name?: string;
      status: string;
      custom_fields?: Record<string, any>;
      created_at: string;
      email_contact_tags?: Array<{ tag: string }>;
    };
    
    const typedContacts = contacts as unknown as Contact[];

    if (format === "json") {
      // Return JSON format
      return new Response(JSON.stringify(typedContacts, null, 2), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="contacts-${list_id}.json"`,
          ...corsHeaders,
        },
      });
    }

    // Generate CSV
    const headers = [
      "Email",
      "First Name",
      "Last Name",
      "Status",
      "Created At",
    ];

    // Add custom field headers
    const customFieldKeys = new Set<string>();
    typedContacts.forEach(contact => {
      if (contact.custom_fields) {
        Object.keys(contact.custom_fields).forEach(key => customFieldKeys.add(key));
      }
    });
    headers.push(...Array.from(customFieldKeys));

    if (include_tags) {
      headers.push("Tags");
    }

    let csv = headers.join(",") + "\n";

    // Add rows
    for (const contact of typedContacts) {
      const row: string[] = [
        `"${contact.email || ""}"`,
        `"${contact.first_name || ""}"`,
        `"${contact.last_name || ""}"`,
        `"${contact.status || ""}"`,
        `"${contact.created_at || ""}"`,
      ];

      // Add custom field values
      customFieldKeys.forEach(key => {
        const value = contact.custom_fields?.[key] || "";
        row.push(`"${String(value).replace(/"/g, '""')}"`);
      });

      // Add tags
      if (include_tags) {
        const tags = contact.email_contact_tags?.map((t: any) => t.tag).join("; ") || "";
        row.push(`"${tags}"`);
      }

      csv += row.join(",") + "\n";
    }

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="contacts-${list_id}.csv"`,
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in export-email-contacts:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
