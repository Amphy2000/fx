import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, TrendingUp, MousePointer, CreditCard, CheckCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface AnalyticsSummary {
    date: string;
    page_views: number;
    claim_clicks: number;
    payment_inits: number;
    payment_successes: number;
    conversion_rate: number;
}

const BundleAnalytics = () => {
    const [analytics, setAnalytics] = useState<AnalyticsSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [totals, setTotals] = useState({
        page_views: 0,
        claim_clicks: 0,
        payment_inits: 0,
        payment_successes: 0,
        conversion_rate: 0
    });

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            console.log('[BundleAnalytics] Fetching from bundle_analytics_summary...');
            const { data, error } = await supabase
                .from('bundle_analytics_summary')
                .select('*')
                .order('date', { ascending: false })
                .limit(30);

            if (error) {
                console.error('[BundleAnalytics] View query error:', error);

                // Check if the table/view exists
                if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
                    toast.error("Database table missing. Please run migrations.");
                } else {
                    throw error;
                }
                return;
            }

            console.log('[BundleAnalytics] View data result:', data);

            if (data && data.length > 0) {
                setAnalytics(data);

                // Calculate totals
                const totals = data.reduce((acc, day) => ({
                    page_views: acc.page_views + (Number(day.page_views) || 0),
                    claim_clicks: acc.claim_clicks + (Number(day.claim_clicks) || 0),
                    payment_inits: acc.payment_inits + (Number(day.payment_inits) || 0),
                    payment_successes: acc.payment_successes + (Number(day.payment_successes) || 0),
                    conversion_rate: 0 // Will calculate below
                }), {
                    page_views: 0,
                    claim_clicks: 0,
                    payment_inits: 0,
                    payment_successes: 0,
                    conversion_rate: 0
                });

                // Calculate overall conversion rate
                totals.conversion_rate = totals.page_views > 0
                    ? Number(((totals.payment_successes / totals.page_views) * 100).toFixed(2))
                    : 0;

                console.log('[BundleAnalytics] Calculated totals:', totals);
                setTotals(totals);
            } else {
                console.log('[BundleAnalytics] No data returned from summary');
                setAnalytics([]);
                setTotals({
                    page_views: 0,
                    claim_clicks: 0,
                    payment_inits: 0,
                    payment_successes: 0,
                    conversion_rate: 0
                });
            }
        } catch (error: any) {
            console.error('[BundleAnalytics] Error fetching analytics:', error);
            toast.error(`Failed to load analytics: ${error.message || 'Check connection'}`);
        } finally {
            setLoading(false);
        }
    };

    const StatCard = ({ title, value, icon: Icon, description, color }: any) => (
        <Card className={`border-l-4 ${color}`}>
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                        {title}
                    </CardTitle>
                    <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                {description && (
                    <p className="text-xs text-muted-foreground mt-1">{description}</p>
                )}
            </CardContent>
        </Card>
    );

    if (loading) {
        return (
            <Layout>
                <div className="container mx-auto px-4 py-8">
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="container mx-auto px-4 py-8">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">Bundle Analytics Dashboard</h1>
                        <p className="text-muted-foreground">
                            Track your bundle offer performance and conversion metrics
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                console.log('[BundleAnalytics] Manual refresh requested');
                                fetchAnalytics();
                            }}
                            className="gap-2"
                        >
                            <RefreshCw className="h-4 w-4" />
                            Refresh
                        </Button>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={async () => {
                                try {
                                    toast.info("Sending test event...");
                                    const { error } = await supabase.from('bundle_analytics').insert({
                                        event_type: 'page_view',
                                        metadata: { test: true, source: 'admin_debug' }
                                    });
                                    if (error) throw error;
                                    toast.success("Test event sent! Refreshing...");
                                    setTimeout(fetchAnalytics, 1000);
                                } catch (err: any) {
                                    console.error('Test event failed:', err);
                                    toast.error(`Test failed: ${err.message}`);
                                }
                            }}
                            className="gap-2"
                        >
                            <MousePointer className="h-4 w-4" />
                            Test Event
                        </Button>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <StatCard
                        title="Page Views"
                        value={totals.page_views}
                        icon={BarChart3}
                        description="Total visitors"
                        color="border-l-blue-500 bg-blue-500/5"
                    />
                    <StatCard
                        title="Button Clicks"
                        value={totals.claim_clicks}
                        icon={MousePointer}
                        description={`${totals.page_views > 0 ? ((totals.claim_clicks / totals.page_views) * 100).toFixed(1) : 0}% click rate`}
                        color="border-l-yellow-500 bg-yellow-500/5"
                    />
                    <StatCard
                        title="Payment Started"
                        value={totals.payment_inits}
                        icon={CreditCard}
                        description={`${totals.claim_clicks > 0 ? ((totals.payment_inits / totals.claim_clicks) * 100).toFixed(1) : 0}% proceeded`}
                        color="border-l-orange-500 bg-orange-500/5"
                    />
                    <StatCard
                        title="Purchases"
                        value={totals.payment_successes}
                        icon={CheckCircle}
                        description={`₦${(totals.payment_successes * 15000).toLocaleString()} revenue`}
                        color="border-l-green-500 bg-green-500/5"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    <Card className="bg-gradient-to-br from-purple-500/10 to-transparent">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-purple-500" />
                                Overall Conversion Rate
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{totals.conversion_rate}%</div>
                            <p className="text-xs text-muted-foreground mt-1">Visitors to Purchase</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-yellow-500/10 to-transparent">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <MousePointer className="h-4 w-4 text-yellow-500" />
                                Click-to-Purchase Rate
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">
                                {totals.claim_clicks > 0
                                    ? ((totals.payment_successes / totals.claim_clicks) * 100).toFixed(2)
                                    : "0.00"}%
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">Button Clicks to Purchase</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Daily Breakdown */}
                <Card>
                    <CardHeader>
                        <CardTitle>Daily Breakdown (Last 30 Days)</CardTitle>
                        <CardDescription>
                            Detailed analytics by date
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left p-2">Date</th>
                                        <th className="text-right p-2">Views</th>
                                        <th className="text-right p-2">Clicks</th>
                                        <th className="text-right p-2">Started</th>
                                        <th className="text-right p-2">Purchased</th>
                                        <th className="text-right p-2">Conv. Rate</th>
                                        <th className="text-right p-2">Revenue</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {analytics.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="text-center p-8 text-muted-foreground">
                                                No data yet. Start promoting your bundle to see analytics!
                                            </td>
                                        </tr>
                                    ) : (
                                        analytics.map((day) => (
                                            <tr key={day.date} className="border-b hover:bg-muted/50">
                                                <td className="p-2">{new Date(day.date).toLocaleDateString()}</td>
                                                <td className="text-right p-2">{day.page_views || 0}</td>
                                                <td className="text-right p-2">{day.claim_clicks || 0}</td>
                                                <td className="text-right p-2">{day.payment_inits || 0}</td>
                                                <td className="text-right p-2 font-semibold">{day.payment_successes || 0}</td>
                                                <td className="text-right p-2">
                                                    <span className={`font-medium ${(day.conversion_rate || 0) > 2 ? 'text-green-500' :
                                                        (day.conversion_rate || 0) > 1 ? 'text-yellow-500' :
                                                            'text-muted-foreground'
                                                        }`}>
                                                        {day.conversion_rate || 0}%
                                                    </span>
                                                </td>
                                                <td className="text-right p-2">
                                                    ₦{((day.payment_successes || 0) * 15000).toLocaleString()}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                {/* Insights */}
                {totals.page_views > 0 && (
                    <Card className="mt-8 bg-primary/5 border-primary/20">
                        <CardHeader>
                            <CardTitle className="text-lg">Quick Insights</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                            {totals.conversion_rate > 2 && (
                                <p className="text-green-600">🎉 Excellent! Your conversion rate is above 2%</p>
                            )}
                            {totals.conversion_rate < 1 && totals.page_views > 20 && (
                                <p className="text-yellow-600">💡 Consider adding more social proof or testimonials</p>
                            )}
                            {totals.claim_clicks > 0 && totals.payment_inits === 0 && (
                                <p className="text-red-600">⚠️ Users are clicking but not reaching payment. Check for errors.</p>
                            )}
                            {totals.payment_inits > totals.payment_successes && totals.payment_inits > 0 && (
                                <p className="text-yellow-600">
                                    💳 {totals.payment_inits - totals.payment_successes} users started payment but didn't complete
                                </p>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>
        </Layout>
    );
};

export default BundleAnalytics;
