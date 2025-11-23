import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Search } from "lucide-react";
import PartnerCard from "./PartnerCard";

export default function PartnerFinder() {
  const [loading, setLoading] = useState(false);
  const [partners, setPartners] = useState<any[]>([]);
  const [filters, setFilters] = useState({
    experience_level: "",
    trading_style: [] as string[],
    timezone: ""
  });

  useEffect(() => {
    searchPartners();
  }, []);

  const searchPartners = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('find-accountability-partners', {
        body: { filters }
      });

      if (error) throw error;
      setPartners(data.partners || []);
    } catch (error: any) {
      console.error('Error searching partners:', error);
      toast.error(error.message || "Failed to search for partners");
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async (partnerId: string, message: string) => {
    try {
      const { error } = await supabase.functions.invoke('send-partner-request', {
        body: { partner_id: partnerId, message }
      });

      if (error) throw error;
      toast.success("Partnership request sent!");
      
      // Remove from list
      setPartners(partners.filter(p => p.user_id !== partnerId));
    } catch (error: any) {
      console.error('Error sending request:', error);
      toast.error(error.message || "Failed to send request");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Search Filters</CardTitle>
          <CardDescription>Find partners that match your criteria</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Experience Level</Label>
              <Select
                value={filters.experience_level}
                onValueChange={(value) => setFilters({ ...filters, experience_level: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Any level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Any level</SelectItem>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                  <SelectItem value="expert">Expert</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Timezone</Label>
              <Select
                value={filters.timezone}
                onValueChange={(value) => setFilters({ ...filters, timezone: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Any timezone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Any timezone</SelectItem>
                  <SelectItem value="EST">EST</SelectItem>
                  <SelectItem value="PST">PST</SelectItem>
                  <SelectItem value="GMT">GMT</SelectItem>
                  <SelectItem value="CET">CET</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button onClick={searchPartners} className="w-full" disabled={loading}>
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Search className="mr-2 h-4 w-4" />
                )}
                Search
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : partners.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No partners found matching your criteria.</p>
            <p className="text-sm text-muted-foreground mt-2">Try adjusting your filters or check back later.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {partners.map((partner) => (
            <PartnerCard
              key={partner.id}
              partner={partner}
              onSendRequest={handleSendRequest}
            />
          ))}
        </div>
      )}
    </div>
  );
}
