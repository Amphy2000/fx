import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Terms = () => {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>1. Acceptance of Terms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              By accessing and using Amphy AI Trade Journal ("the Service"), you accept and agree to be bound by the terms and provisions of this agreement. If you do not agree to these terms, please do not use the Service.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>2. Use of Service</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Account Registration</h3>
              <p className="text-muted-foreground">
                You must create an account to use the Service. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Acceptable Use</h3>
              <p className="text-muted-foreground">
                You agree to use the Service only for lawful purposes and in accordance with these Terms. You agree not to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground mt-2">
                <li>Violate any applicable laws or regulations</li>
                <li>Infringe upon the rights of others</li>
                <li>Attempt to gain unauthorized access to the Service</li>
                <li>Upload malicious code or engage in any activity that disrupts the Service</li>
                <li>Use the Service to transmit spam or unsolicited messages</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>3. Subscription and Payment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Subscription Plans</h3>
              <p className="text-muted-foreground">
                The Service offers both free and paid subscription plans. Paid subscriptions are billed on a monthly or annual basis, as selected by you.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Payment Processing</h3>
              <p className="text-muted-foreground">
                All payments are processed securely through Paystack. By providing payment information, you authorize us to charge your payment method for the applicable fees.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Refund Policy</h3>
              <p className="text-muted-foreground">
                Refunds are handled on a case-by-case basis. Contact amphyai@outlook.com within 7 days of payment to request a refund. Lifetime subscriptions are non-refundable after 14 days.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>4. Intellectual Property</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              The Service and its original content, features, and functionality are owned by Amphy AI and are protected by international copyright, trademark, and other intellectual property laws.
            </p>
            <p className="text-muted-foreground">
              You retain all rights to the trading data and content you upload to the Service. By uploading content, you grant us a license to use, store, and display your content solely for the purpose of providing the Service to you.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>5. Data and Privacy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Your use of the Service is also governed by our Privacy Policy. We collect and process your data as described in our Privacy Policy to provide and improve the Service.
            </p>
            <p className="text-muted-foreground">
              We implement reasonable security measures to protect your data, but we cannot guarantee absolute security. You use the Service at your own risk.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>6. Limitation of Liability</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              The Service is provided "as is" without warranties of any kind. We do not guarantee that the Service will be uninterrupted, secure, or error-free.
            </p>
            <p className="text-muted-foreground">
              <strong>Trading Disclaimer:</strong> The Service is a journaling and analytics tool only. We do not provide financial advice, trading recommendations, or investment guidance. Any AI-generated insights are for informational purposes only. Trading involves risk, and you should consult with qualified financial professionals before making trading decisions.
            </p>
            <p className="text-muted-foreground">
              To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>7. Termination</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              We may terminate or suspend your account and access to the Service immediately, without prior notice, for any reason, including if you breach these Terms.
            </p>
            <p className="text-muted-foreground">
              You may cancel your subscription at any time through your account settings. Upon termination, your right to use the Service will immediately cease.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>8. Changes to Terms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              We reserve the right to modify these Terms at any time. We will notify you of any material changes by posting the new Terms on this page and updating the "Last updated" date.
            </p>
            <p className="text-muted-foreground">
              Your continued use of the Service after any changes constitutes your acceptance of the new Terms.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>9. Governing Law</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              These Terms shall be governed by and construed in accordance with applicable international laws, without regard to conflict of law provisions.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact Us</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              If you have any questions about these Terms of Service, please contact us at:
              <br />
              <a href="mailto:amphyai@outlook.com" className="text-primary hover:underline">
                amphyai@outlook.com
              </a>
            </p>
            <p className="text-muted-foreground mt-4 text-sm">
              Last updated: November 24, 2025
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Terms;
