import { AppHeader } from '@/components/shared/header';
import { AppFooter } from '@/components/shared/footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TermsOfServicePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader />
      <main className="flex-grow container py-12 px-4 md:px-6">
        <Card className="w-full max-w-3xl mx-auto shadow-lg">
          <CardHeader>
            <CardTitle className="text-3xl">Terms of Service</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 prose prose-sm sm:prose lg:prose-lg xl:prose-xl max-w-none">
            <p><strong>Last Updated: {new Date().toLocaleDateString()}</strong></p>

            <p>Please read these Terms of Service ("Terms", "Terms of Service") carefully before using the ProctorPrep website and services (the "Service") operated by ProctorPrep ("us", "we", or "our").</p>

            <h2>1. Agreement to Terms</h2>
            <p>By accessing or using the Service, you agree to be bound by these Terms. If you disagree with any part of the terms, then you may not access the Service.</p>

            <h2>2. Accounts</h2>
            <p>When you create an account with us, you must provide information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our Service.</p>
            <p>You are responsible for safeguarding the password that you use to access the Service and for any activities or actions under your password.</p>

            <h2>3. Use of Service</h2>
            <p>You agree not to use the Service:</p>
            <ul>
              <li>In any way that violates any applicable national or international law or regulation.</li>
              <li>To engage in any activity that interferes with or disrupts the Service.</li>
              <li>To attempt to gain unauthorized access to any Mfaortion of the Service, other accounts, or computer systems.</li>
              <li>For any academic dishonesty, including cheating on exams or assisting others in doing so.</li>
            </ul>
            <p>If using Safe Exam Browser (SEB) functionality, you agree to comply with all SEB usage guidelines and restrictions as specified by your institution and ProctorPrep.</p>
            
            <h2>4. Intellectual Property</h2>
            <p>The Service and its original content (excluding Content provided by users), features, and functionality are and will remain the exclusive property of ProctorPrep and its licensors.</p>

            <h2>5. Termination</h2>
            <p>We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.</p>

            <h2>6. Limitation of Liability</h2>
            <p>In no event shall ProctorPrep, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the Service.</p>

            <h2>7. Disclaimer</h2>
            <p>Your use of the Service is at your sole risk. The Service is provided on an "AS IS" and "AS AVAILABLE" basis. The Service is provided without warranties of any kind, whether express or implied.</p>

            <h2>8. Governing Law</h2>
            <p>These Terms shall be governed and construed in accordance with the laws of [Your Jurisdiction], without regard to its conflict of law provisions.</p>

            <h2>9. Changes</h2>
            <p>We reserve the right, at our sole discretion, to modify or replace these Terms at any time. We will try to provide at least 30 days' notice prior to any new terms taking effect.</p>

            <h2>10. Contact Us</h2>
            <p>If you have any questions about these Terms, please contact us at: support@proctorprep.example.com</p>
          </CardContent>
        </Card>
      </main>
      <AppFooter />
    </div>
  );
}

export const metadata = {
  title: 'Terms of Service | ProctorPrep',
};
