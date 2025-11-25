import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Privacy = () => {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Privacy Policy & Data Collection</h1>
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Data We Collect</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Account Information</h3>
              <p className="text-muted-foreground">
                When you create an account, we collect your email address and full name to identify you and provide access to your trading journal.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Trading Data</h3>
              <p className="text-muted-foreground">
                We store all trade information you log, including entry/exit prices, profit/loss, emotions, notes, and screenshots. This data is used solely to provide you with insights and analytics.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Payment Information</h3>
              <p className="text-muted-foreground">
                Payment processing is handled securely by Paystack. We do not store your card details. We only retain transaction references and subscription status.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Feedback & Usage Data</h3>
              <p className="text-muted-foreground">
                When you submit feedback, we collect your ratings and comments to improve our service. We may also collect anonymized usage data to understand how users interact with the app.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>How We Use Your Data</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>To provide and maintain your trading journal</li>
              <li>To generate AI-powered insights and analytics</li>
              <li>To process payments and manage subscriptions</li>
              <li>To send important account and service updates</li>
              <li>To improve our product based on your feedback</li>
              <li>To prevent fraud and ensure security</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Data Security</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Your data is stored securely using industry-standard encryption. We implement Row-Level Security (RLS) to ensure you can only access your own data. All connections are encrypted using HTTPS/TLS.
            </p>
            <p className="text-muted-foreground">
              We do not sell, rent, or share your personal information with third parties for marketing purposes.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Your Rights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li><strong>Access:</strong> You can view all your data in the app at any time</li>
              <li><strong>Export:</strong> Request a copy of your data by contacting support</li>
              <li><strong>Delete:</strong> You can delete individual trades or request full account deletion</li>
              <li><strong>Modify:</strong> Update your profile and trade information anytime</li>
              <li><strong>Opt-out:</strong> Disable optional features like Telegram notifications</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Third-Party Services</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              We use the following third-party services:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li><strong>Paystack:</strong> Payment processing (subject to Paystack's privacy policy)</li>
              <li><strong>Telegram:</strong> Optional notifications (only if you enable it)</li>
              <li><strong>Lovable Cloud:</strong> Secure backend infrastructure and database</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact Us</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              If you have questions about this privacy policy or your data, contact us at:
              <br />
              <a href="mailto:amphyai@outlook.com" className="text-primary hover:underline">
                amphyai@outlook.com
              </a>
            </p>
            <p className="text-muted-foreground mt-4 text-sm">
              Last updated: October 28, 2025
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Privacy;
