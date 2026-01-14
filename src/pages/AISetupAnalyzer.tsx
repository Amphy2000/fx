import { useCallback, useEffect, useRef, useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CreditCostBadge } from "@/components/CreditCostBadge";
import { useNavigate } from "react-router-dom";
import { CreditsGuard } from "@/components/CreditsGuard";
import { CREDIT_COSTS } from "@/utils/creditManager";

const ANALYSIS_COST = CREDIT_COSTS.setup_analysis;
const MAX_AUTO_RETRIES = 5;

export default function AISetupAnalyzer() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [retryIn, setRetryIn] = useState<number | null>(null);
  const retryAttemptsRef = useRef(0);
  const navigate = useNavigate();

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      setAnalysis(null);
      setRetryIn(null);
      retryAttemptsRef.current = 0;
      setAnalyzing(false);
    }
  };

  const runAnalysis = useCallback(async () => {
    if (!selectedImage) {
      setAnalyzing(false);
      return;
    }

    let pendingRetry = false;

    try {
      const { data, error } = await supabase.functions.invoke('analyze-setup-image', {
        body: { image: selectedImage }
      });

      if (error) {
        const status = (error as any)?.context?.status;
        const body = (error as any)?.context?.body;

        if (status === 429) {
          let retryAfter = 30;
          try {
            const parsed = typeof body === 'string' ? JSON.parse(body) : body;
            if (typeof parsed?.retryAfter === 'number') retryAfter = parsed.retryAfter;
          } catch {
            // ignore
          }

          if (retryAttemptsRef.current < MAX_AUTO_RETRIES) {
            retryAttemptsRef.current += 1;
            pendingRetry = true;
            setRetryIn(retryAfter);
            toast.message(`AI rate limited. Retrying in ${retryAfter}s...`);
            return;
          }
        }

        if (error.message?.includes('Insufficient credits')) {
          toast.error("Insufficient credits. Please upgrade your plan.", {
            action: {
              label: "Upgrade",
              onClick: () => navigate("/pricing")
            }
          });
          return;
        }

        throw error;
      }

      setRetryIn(null);
      retryAttemptsRef.current = 0;

      // Clean up the analysis text: remove asterisks and excessive formatting
      const cleanedAnalysis = (data.analysis as string)
        .replace(/\*\*/g, '') // Remove bold markdown
        .replace(/\*/g, '') // Remove remaining asterisks
        .replace(/#{1,6}\s/g, '') // Remove markdown headers
        .trim();

      setAnalysis(cleanedAnalysis);
      toast.success(`Analysis complete! ${data.creditsRemaining} credits remaining`);
    } catch (error: any) {
      console.error('Analysis error:', error);
      toast.error(error.message || "Failed to analyze setup");
    } finally {
      if (!pendingRetry) {
        setAnalyzing(false);
      }
    }
  }, [navigate, selectedImage]);

  useEffect(() => {
    if (retryIn === null) return;

    if (retryIn <= 0) {
      setRetryIn(null);
      void runAnalysis();
      return;
    }

    const t = window.setTimeout(() => {
      setRetryIn((prev) => (prev === null ? null : prev - 1));
    }, 1000);

    return () => window.clearTimeout(t);
  }, [retryIn, runAnalysis]);

  const analyzeSetup = async () => {
    if (!selectedImage) {
      toast.error("Please upload an image first");
      return;
    }

    retryAttemptsRef.current = 0;
    setRetryIn(null);
    setAnalyzing(true);
    void runAnalysis();
  };

  return (
    <Layout>
      <CreditsGuard requiredCredits={ANALYSIS_COST} featureName="AI Setup Analyzer">
        <div className="container mx-auto px-8 py-10 max-w-5xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">AI Setup Analyzer</h1>
          <p className="text-muted-foreground">
            Upload your trading chart or setup for honest AI feedback
          </p>
          <div className="mt-2">
            <CreditCostBadge cost={ANALYSIS_COST} />
          </div>
        </div>

        <div className="grid gap-6">
          {/* Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload Setup Image
              </CardTitle>
              <CardDescription>
                Upload a screenshot of your trading setup or chart
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-8 hover:border-primary/50 transition-colors">
                {selectedImage ? (
                  <div className="w-full space-y-4">
                    <img
                      src={selectedImage}
                      alt="Selected setup"
                      className="w-full max-h-96 object-contain rounded-lg"
                    />
                    <Button
                      onClick={() => document.getElementById('image-upload')?.click()}
                      variant="outline"
                      className="w-full"
                    >
                      Change Image
                    </Button>
                  </div>
                ) : (
                  <div className="text-center space-y-4">
                    <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Click to upload or drag and drop</p>
                      <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 10MB</p>
                    </div>
                    <Button
                      onClick={() => document.getElementById('image-upload')?.click()}
                      variant="outline"
                    >
                      Select Image
                    </Button>
                  </div>
                )}
                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
              </div>

              {selectedImage && (
                <Button
                  onClick={analyzeSetup}
                  disabled={analyzing}
                  className="w-full"
                  size="lg"
                >
                  {analyzing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {retryIn !== null ? `Rate limited — retrying in ${retryIn}s...` : "Analyzing..."}
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Analyze Setup
                    </>
                  )}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Analysis Results */}
          {analysis && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  AI Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none dark:prose-invert overflow-hidden">
                  <div className="whitespace-pre-wrap text-sm leading-relaxed break-words">
                    {analysis}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      </CreditsGuard>
    </Layout>
  );
}
