import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ImportRequest {
  list_id: string;
  contacts: Array<{
    email: string;
    first_name?: string;
    last_name?: string;
    custom_fields?: Record<string, any>;
    tags?: string[];
  }>;
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

    const { list_id, contacts }: ImportRequest = await req.json();

    console.log(`Importing ${contacts.length} contacts to list ${list_id}`);

    let imported = 0;
    let skipped = 0;
    let errors: string[] = [];

    for (const contact of contacts) {
      try {
        // Validate email
        if (!contact.email || !contact.email.includes("@")) {
          skipped++;
          errors.push(`Invalid email: ${contact.email}`);
          continue;
        }

        // Check if email is suppressed
        const { data: isSuppressed } = await supabaseClient
          .rpc("is_email_suppressed", { check_email: contact.email });

        if (isSuppressed) {
          skipped++;
          errors.push(`Email suppressed (unsubscribed or bounced): ${contact.email}`);
          continue;
        }

        // Insert or update contact
        const { data: existingContact } = await supabaseClient
          .from("email_contacts")
          .select("id")
          .eq("list_id", list_id)
          .eq("email", contact.email)
          .single();

        if (existingContact) {
          // Update existing
          const { error: updateError } = await supabaseClient
            .from("email_contacts")
            .update({
              first_name: contact.first_name,
              last_name: contact.last_name,
              custom_fields: contact.custom_fields || {},
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingContact.id);

          if (updateError) throw updateError;
        } else {
          // Insert new
          const { data: newContact, error: insertError } = await supabaseClient
            .from("email_contacts")
            .insert({
              list_id,
              email: contact.email,
              first_name: contact.first_name,
              last_name: contact.last_name,
              custom_fields: contact.custom_fields || {},
              source: "import",
            })
            .select()
            .single();

          if (insertError) throw insertError;

          // Add tags if provided
          if (contact.tags && contact.tags.length > 0 && newContact) {
            const tagInserts = contact.tags.map(tag => ({
              contact_id: newContact.id,
              tag: tag.trim(),
            }));

            await supabaseClient
              .from("email_contact_tags")
              .insert(tagInserts);
          }
        }

        imported++;
      } catch (error: any) {
        console.error(`Error importing ${contact.email}:`, error);
        skipped++;
        errors.push(`${contact.email}: ${error.message}`);
      }
    }

    console.log(`Import complete: ${imported} imported, ${skipped} skipped`);

    return new Response(
      JSON.stringify({
        success: true,
        imported,
        skipped,
        errors: errors.slice(0, 10), // Return first 10 errors
        total_errors: errors.length,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in import-email-contacts:", error);
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
