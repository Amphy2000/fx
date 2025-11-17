import { useState } from "react";
import { Layout } from "@/components/Layout";
import { JournalEntryForm } from "@/components/JournalEntryForm";
import { JournalEntriesList } from "@/components/JournalEntriesList";
import { JournalInsightsPanel } from "@/components/JournalInsightsPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, LineChart, List } from "lucide-react";

const Journal = () => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleEntrySaved = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <Layout>
      <div className="container mx-auto p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Trading Journal</h1>
          <p className="text-muted-foreground">
            Track your emotions, mindset, and get AI-powered insights on how they affect your trading
          </p>
        </div>

        <Tabs defaultValue="new-entry" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="new-entry" className="gap-2">
              <BookOpen className="h-4 w-4" />
              New Entry
            </TabsTrigger>
            <TabsTrigger value="entries" className="gap-2">
              <List className="h-4 w-4" />
              My Entries
            </TabsTrigger>
            <TabsTrigger value="insights" className="gap-2">
              <LineChart className="h-4 w-4" />
              AI Insights
            </TabsTrigger>
          </TabsList>

          <TabsContent value="new-entry" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <JournalEntryForm onEntrySaved={handleEntrySaved} />
              </div>
              <div>
                <JournalInsightsPanel />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="entries">
            <JournalEntriesList refreshTrigger={refreshTrigger} />
          </TabsContent>

          <TabsContent value="insights">
            <JournalInsightsPanel />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Journal;
