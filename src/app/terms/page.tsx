import { AppHeader } from '@/components/shared/header';
import { AppFooter } from '@/components/shared/footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TermsOfServicePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader />
      <main className="flex-grow container py-12 px-4 md:px-6">
        <Card className="w-full max-w-3xl mx-auto ui-card shadow-lg">
          <CardHeader>
            <CardTitle className="text-3xl">Terms of Service</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 prose prose-sm sm:prose lg:prose-lg xl:prose-xl max-w-none dark:prose-invert prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground prose-ul:text-muted-foreground prose-li:marker:text-primary">
            <p><strong>Last Updated: {new Date().toLocaleDateString()}</strong></p>

            <p>Please read these Terms of Service ("Terms", "Terms of Service") carefully before using the ProctorChecker website and services (the "Service") operated by ProctorChecker ("us", "we", or "our").</p>

            <h2>1. Agreement to Terms</h2>
            <p>By accessing or using the Service, you agree to be bound by these Terms. If you disagree with any part of the terms, then you may not access the Service.</p>

            <h2>2. License Keys and Registration</h2>
            <p>Access to certain features of the Service requires registration using a valid license key provided by us or an authorized administrator. Each license key is for a single user registration and cannot be reused once claimed. You are responsible for maintaining the confidentiality of your account and password.</p>

            <h2>3. Use of Service</h2>
            <p>You agree to use the Service only for its intended purpose: to check system compatibility for proctored environments and manage approved reference links within Safe Exam Browser (SEB).</p>
            <p>You agree not to use the Service:</p>
            <ul>
              <li>In any way that violates any applicable national or international law or regulation.</li>
              <li>To engage in any activity that interferes with or disrupts the Service.</li>
              <li>To attempt to gain unauthorized access to any portion of the Service, other accounts, or computer systems.</li>
              <li>For any purpose other than legitimate system compatibility checking as facilitated by the Service.</li>
            </ul>
            <p>If using Safe Exam Browser (SEB) functionality through our Service, you agree to comply with all SEB usage guidelines and restrictions.</p>
            
            <h2>4. Intellectual Property</h2>
            <p>The Service and its original content (excluding Content provided by users, such as saved links), features, and functionality are and will remain the exclusive property of ProctorChecker and its licensors.</p>

            <h2>5. Termination</h2>
            <p>We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms (e.g., misuse of license keys, unauthorized access attempts).</p>

            <h2>6. Limitation of Liability</h2>
            <p>In no event shall ProctorChecker, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the Service. The Service is a tool to aid in compatibility checking; ultimate responsibility for system readiness for any specific proctored event lies with the user and the proctoring authority.</p>

            <h2>7. Disclaimer</h2>
            <p>Your use of the Service is at your sole risk. The Service is provided on an "AS IS" and "AS AVAILABLE" basis. The Service is provided without warranties of any kind, whether express or implied, including, but not limited to, implied warranties of merchantability, fitness for a particular purpose, non-infringement or course of performance. ProctorChecker does not warrant that the service will function uninterrupted, secure or available at any particular time or location; or that the results of using the service will meet your requirements for any specific proctored environment not explicitly supported by us.</p>

            <h2>8. Governing Law</h2>
            <p>These Terms shall be governed and construed in accordance with the laws of [Specify Your Jurisdiction, e.g., State of California, USA], without regard to its conflict of law provisions.</p>

            <h2>9. Changes</h2>
            <p>We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material, we will try to provide at least 30 days' notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.</p>

            <h2>10. Contact Us</h2>
            <p>If you have any questions about these Terms, please contact us at: support@proctorchecker.example.com (replace with your actual contact email).</p>
          </CardContent>
        </Card>
      </main>
      <AppFooter />
    </div>
  );
}

export const metadata = {
  title: 'Terms of Service | ProctorChecker',
};
