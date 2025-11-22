import { Layout } from "@/components/Layout";
import { TradeScreenshotUpload } from "@/components/TradeScreenshotUpload";
import { TradeScreenshotBatchUpload } from "@/components/TradeScreenshotBatchUpload";
import { PatternsDashboard } from "@/components/PatternsDashboard";
import { BehavioralAlerts } from "@/components/BehavioralAlerts";
import { TradingAssistantChat } from "@/components/TradingAssistantChat";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, Camera, TrendingUp, MessageSquare, Images } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const AIFeatures = () => {
  const [extractedData, setExtractedData] = useState<any>(null);

  const handleDataExtracted = (data: any) => {
    setExtractedData(data);
    toast.success("Trade data extracted! You can now edit and save it.");
    // Could auto-fill a trade form here
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2 mb-2">
            <Brain className="w-8 h-8 text-primary" />
            AI-Powered Trading Features
          </h1>
          <p className="text-muted-foreground">
            Advanced AI analysis to improve your trading performance
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2">
            <Tabs defaultValue="upload" className="space-y-4">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="upload" className="flex items-center gap-2">
                  <Camera className="w-4 h-4" />
                  Single
                </TabsTrigger>
                <TabsTrigger value="batch" className="flex items-center gap-2">
                  <Images className="w-4 h-4" />
                  Batch
                </TabsTrigger>
                <TabsTrigger value="patterns" className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Patterns
                </TabsTrigger>
                <TabsTrigger value="behavior" className="flex items-center gap-2">
                  <Brain className="w-4 h-4" />
                  Behavior
                </TabsTrigger>
                <TabsTrigger value="assistant" className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Assistant
                </TabsTrigger>
              </TabsList>

              <TabsContent value="upload" className="space-y-4">
                <TradeScreenshotUpload onDataExtracted={handleDataExtracted} />
                
                {extractedData && (
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-semibold mb-2">Extracted Data:</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="font-medium">Pair:</span> {extractedData.pair}</div>
                      <div><span className="font-medium">Direction:</span> {extractedData.direction}</div>
                      <div><span className="font-medium">Entry:</span> {extractedData.entry_price}</div>
                      <div><span className="font-medium">Exit:</span> {extractedData.exit_price || 'Open'}</div>
                      {extractedData.stop_loss && (
                        <div><span className="font-medium">Stop Loss:</span> {extractedData.stop_loss}</div>
                      )}
                      {extractedData.take_profit && (
                        <div><span className="font-medium">Take Profit:</span> {extractedData.take_profit}</div>
                      )}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="batch">
                <TradeScreenshotBatchUpload />
              </TabsContent>

              <TabsContent value="patterns">
                <PatternsDashboard />
              </TabsContent>

              <TabsContent value="behavior">
                <div className="space-y-4">
                  <div className="prose prose-sm max-w-none">
                    <h3>Emotional Trading Detection</h3>
                    <p>
                      Our AI monitors your trading behavior in real-time to detect:
                    </p>
                    <ul>
                      <li><strong>Revenge Trading:</strong> Quick trades after losses with increased lot sizes</li>
                      <li><strong>Overtrading:</strong> Taking too many trades in a short period</li>
                      <li><strong>Lot Size Escalation:</strong> Progressive increase in position sizes</li>
                      <li><strong>FOMO Trading:</strong> Entering trades outside your strategy</li>
                    </ul>
                  </div>
                  <BehavioralAlerts />
                </div>
              </TabsContent>

              <TabsContent value="assistant">
                <TradingAssistantChat />
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-4">
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-6 rounded-lg border">
              <h3 className="font-semibold mb-3">How It Works</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <div className="flex items-center gap-2 font-medium mb-1">
                    <Camera className="w-4 h-4 text-primary" />
                    Screenshot Upload
                  </div>
                  <p className="text-muted-foreground">
                    Single or batch upload - AI extracts all trade data automatically
                  </p>
                </div>

                <div>
                  <div className="flex items-center gap-2 font-medium mb-1">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    Pattern Analysis
                  </div>
                  <p className="text-muted-foreground">
                    Discovers winning/losing patterns across pairs, times, and sessions
                  </p>
                </div>

                <div>
                  <div className="flex items-center gap-2 font-medium mb-1">
                    <Brain className="w-4 h-4 text-primary" />
                    Behavioral Detection
                  </div>
                  <p className="text-muted-foreground">
                    Identifies revenge trading, overtrading, and emotional decisions
                  </p>
                </div>

                <div>
                  <div className="flex items-center gap-2 font-medium mb-1">
                    <MessageSquare className="w-4 h-4 text-primary" />
                    Trading Assistant
                  </div>
                  <p className="text-muted-foreground">
                    Ask for second opinions on setups, get risk management advice
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-semibold mb-2">💎 AI Credits</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Screenshot extraction:</span>
                  <span className="font-medium">10 credits</span>
                </div>
                <div className="flex justify-between">
                  <span>Pattern analysis:</span>
                  <span className="font-medium">15 credits</span>
                </div>
                <div className="flex justify-between">
                  <span>Chat message:</span>
                  <span className="font-medium">5 credits</span>
                </div>
                <div className="flex justify-between">
                  <span>Behavior detection:</span>
                  <span className="font-medium">Free</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AIFeatures;
