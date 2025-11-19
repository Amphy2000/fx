-- Create email lists table
CREATE TABLE IF NOT EXISTS public.email_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  total_contacts INTEGER DEFAULT 0,
  active_contacts INTEGER DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create email contacts table with custom fields
CREATE TABLE IF NOT EXISTS public.email_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES public.email_lists(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  custom_fields JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'active', -- 'active', 'unsubscribed', 'bounced', 'complained'
  source TEXT, -- 'manual', 'import', 'api', 'form'
  last_activity_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(list_id, email)
);

-- Create contact tags table
CREATE TABLE IF NOT EXISTS public.email_contact_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.email_contacts(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(contact_id, tag)
);

-- Create unsubscribes table
CREATE TABLE IF NOT EXISTS public.email_unsubscribes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  reason TEXT,
  campaign_id UUID REFERENCES public.email_campaigns(id) ON DELETE SET NULL,
  unsubscribed_at TIMESTAMPTZ DEFAULT now()
);

-- Create bounces table
CREATE TABLE IF NOT EXISTS public.email_bounces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  bounce_type TEXT NOT NULL, -- 'hard', 'soft', 'complaint'
  reason TEXT,
  campaign_id UUID REFERENCES public.email_campaigns(id) ON DELETE SET NULL,
  bounced_at TIMESTAMPTZ DEFAULT now()
);

-- Create content blocks table for personalization
CREATE TABLE IF NOT EXISTS public.email_content_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  block_type TEXT NOT NULL, -- 'text', 'image', 'button', 'product', 'dynamic'
  content JSONB NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create personalization rules table
CREATE TABLE IF NOT EXISTS public.email_personalization_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  rule_type TEXT NOT NULL, -- 'user_attribute', 'behavior', 'engagement', 'segment'
  conditions JSONB NOT NULL,
  content_block_id UUID REFERENCES public.email_content_blocks(id) ON DELETE CASCADE,
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_contact_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_unsubscribes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_bounces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_content_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_personalization_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage email lists"
  ON public.email_lists FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage email contacts"
  ON public.email_contacts FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage contact tags"
  ON public.email_contact_tags FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can insert unsubscribes"
  ON public.email_unsubscribes FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view unsubscribes"
  ON public.email_unsubscribes FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view bounces"
  ON public.email_bounces FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert bounces"
  ON public.email_bounces FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can manage content blocks"
  ON public.email_content_blocks FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage personalization rules"
  ON public.email_personalization_rules FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes
CREATE INDEX idx_email_contacts_list_id ON public.email_contacts(list_id);
CREATE INDEX idx_email_contacts_email ON public.email_contacts(email);
CREATE INDEX idx_email_contacts_status ON public.email_contacts(status);
CREATE INDEX idx_email_contact_tags_contact_id ON public.email_contact_tags(contact_id);
CREATE INDEX idx_email_contact_tags_tag ON public.email_contact_tags(tag);
CREATE INDEX idx_email_unsubscribes_email ON public.email_unsubscribes(email);
CREATE INDEX idx_email_bounces_email ON public.email_bounces(email);
CREATE INDEX idx_email_bounces_bounce_type ON public.email_bounces(bounce_type);
CREATE INDEX idx_email_personalization_rules_active ON public.email_personalization_rules(is_active);

-- Function to update list contact counts
CREATE OR REPLACE FUNCTION public.update_list_contact_counts()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE email_lists 
    SET total_contacts = total_contacts + 1,
        active_contacts = active_contacts + CASE WHEN NEW.status = 'active' THEN 1 ELSE 0 END
    WHERE id = NEW.list_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status != OLD.status THEN
      UPDATE email_lists
      SET active_contacts = active_contacts + 
          CASE 
            WHEN NEW.status = 'active' THEN 1
            WHEN OLD.status = 'active' THEN -1
            ELSE 0
          END
      WHERE id = NEW.list_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE email_lists
    SET total_contacts = total_contacts - 1,
        active_contacts = active_contacts - CASE WHEN OLD.status = 'active' THEN 1 ELSE 0 END
    WHERE id = OLD.list_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for contact count updates
DROP TRIGGER IF EXISTS update_list_counts ON public.email_contacts;
CREATE TRIGGER update_list_counts
  AFTER INSERT OR UPDATE OR DELETE ON public.email_contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_list_contact_counts();

-- Function to check if email is unsubscribed or bounced
CREATE OR REPLACE FUNCTION public.is_email_suppressed(check_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM email_unsubscribes WHERE email = check_email
    UNION
    SELECT 1 FROM email_bounces WHERE email = check_email AND bounce_type = 'hard'
  );
END;
$$;