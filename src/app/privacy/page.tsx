import { AppHeader } from '@/components/shared/header';
import { AppFooter } from '@/components/shared/footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function PrivacyPolicyPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader />
      <main className="flex-grow container py-12 px-4 md:px-6">
        <Card className="w-full max-w-3xl mx-auto ui-card shadow-lg">
          <CardHeader>
            <CardTitle className="text-3xl">Privacy Policy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 prose prose-sm sm:prose lg:prose-lg xl:prose-xl max-w-none dark:prose-invert prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground prose-ul:text-muted-foreground prose-li:marker:text-primary">
            <p><strong>Last Updated: {new Date().toLocaleDateString()}</strong></p>
            
            <p>Welcome to ProctorChecker ("we," "our," or "us"). We are committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our services related to system compatibility checking for proctored environments.</p>

            <h2>1. Information We Collect</h2>
            <p>We may collect personal information such as:</p>
            <ul>
              <li><strong>Account Credentials:</strong> Username, hashed password (we never store plain text passwords).</li>
              <li><strong>License Key Information:</strong> Details of the license key used for registration.</li>
              <li><strong>User Configuration:</strong> Saved links for compatibility checking purposes, avatar preferences.</li>
              <li><strong>Usage Data:</strong> IP address, browser type, operating system, pages visited, time spent on pages, interactions with the compatibility check features. This is standard analytics data to improve our service.</li>
            </ul>
            <p>We do NOT collect video/audio recordings or screen captures as part of the standard ProctorChecker compatibility service.</p>

            <h2>2. How We Use Your Information</h2>
            <p>We use your information to:</p>
            <ul>
              <li>Provide, operate, and maintain our ProctorChecker services.</li>
              <li>Manage user accounts and process registrations via license keys.</li>
              <li>Enable you to save and manage links for system compatibility checks within SEB.</li>
              <li>Communicate with you, including sending service updates and support.</li>
              <li>Improve our website and services.</li>
              <li>Ensure the security and integrity of our platform.</li>
              <li>Comply with legal obligations.</li>
            </ul>

            <h2>3. Information Sharing and Disclosure</h2>
            <p>We do not sell your personal information. We may share your information only in limited circumstances:</p>
            <ul>
              <li><strong>Service Providers:</strong> Third-party vendors who assist us in operating our services (e.g., hosting, database management, analytics), under strict confidentiality agreements.</li>
              <li><strong>Legal Requirements:</strong> If required by law, such as to comply with a subpoena or other legal process, or to protect our rights, property, or safety, or that of others.</li>
            </ul>

            <h2>4. Data Security</h2>
            <p>We implement appropriate technical and organizational measures to protect your personal information (e.g., password hashing, secure connections). However, no method of transmission over the Internet or electronic storage is 100% secure.</p>
            
            <h2>5. Your Rights</h2>
            <p>Depending on your jurisdiction, you may have rights such as accessing, correcting, or deleting your personal data. You can manage your saved links and some profile information directly through your dashboard. For other requests, please contact us.</p>

            <h2>6. Cookies and Tracking Technologies</h2>
            <p>We use essential cookies for session management (e.g., to keep you logged in). We may also use cookies for analytics to understand how our service is used. You can control cookie preferences through your browser settings.</p>

            <h2>7. Children's Privacy</h2>
            <p>Our services are not intended for children under the age of 13 (or a higher age threshold depending on local laws) without verifiable parental consent or as directed by an educational institution (though ProctorChecker is primarily a B2B tool or for individual users over this age).</p>

            <h2>8. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. We will notify you of any significant changes by posting the new policy on this page and updating the "Last Updated" date.</p>

            <h2>9. Contact Us</h2>
            <p>If you have any questions about this Privacy Policy, please contact us at: privacy@proctorchecker.example.com (replace with your actual contact email).</p>
          </CardContent>
        </Card>
      </main>
      <AppFooter />
    </div>
  );
}

export const metadata = {
  title: 'Privacy Policy | ProctorChecker',
};
