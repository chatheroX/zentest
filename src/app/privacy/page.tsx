import { AppHeader } from '@/components/shared/header';
import { AppFooter } from '@/components/shared/footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function PrivacyPolicyPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader />
      <main className="flex-grow container py-12 px-4 md:px-6">
        <Card className="w-full max-w-3xl mx-auto shadow-lg">
          <CardHeader>
            <CardTitle className="text-3xl">Privacy Policy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 prose prose-sm sm:prose lg:prose-lg xl:prose-xl max-w-none">
            <p><strong>Last Updated: {new Date().toLocaleDateString()}</strong></p>
            
            <p>Welcome to ProctorPrep ("we," "our," or "us"). We are committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our services.</p>

            <h2>1. Information We Collect</h2>
            <p>We may collect personal information such as:</p>
            <ul>
              <li><strong>Personal Identifiers:</strong> Name, email address, student/teacher ID.</li>
              <li><strong>Account Credentials:</strong> Username, password.</li>
              <li><strong>Exam Data:</strong> Exam responses, scores, proctoring data (video/audio recordings if applicable and with consent), system information during exams.</li>
              <li><strong>Usage Data:</strong> IP address, browser type, operating system, pages visited, time spent on pages.</li>
            </ul>

            <h2>2. How We Use Your Information</h2>
            <p>We use your information to:</p>
            <ul>
              <li>Provide, operate, and maintain our services.</li>
              <li>Process exam submissions and manage user accounts.</li>
              <li>Ensure exam integrity and security through proctoring features.</li>
              <li>Communicate with you, including sending service updates and support.</li>
              <li>Improve our website and services.</li>
              <li>Comply with legal obligations.</li>
            </ul>

            <h2>3. Information Sharing and Disclosure</h2>
            <p>We do not sell your personal information. We may share your information with:</p>
            <ul>
              <li><strong>Educational Institutions:</strong> If you are using ProctorPrep through your school or university, we share relevant data with them.</li>
              <li><strong>Service Providers:</strong> Third-party vendors who assist us in operating our services (e.g., hosting, data analytics), under strict confidentiality agreements.</li>
              <li><strong>Legal Requirements:</strong> If required by law or to protect our rights.</li>
            </ul>

            <h2>4. Data Security</h2>
            <p>We implement appropriate technical and organizational measures to protect your personal information. However, no method of transmission over the Internet or electronic storage is 100% secure.</p>
            
            <h2>5. Your Rights</h2>
            <p>Depending on your jurisdiction, you may have rights such as accessing, correcting, or deleting your personal data. Please contact us to exercise these rights.</p>

            <h2>6. Cookies and Tracking Technologies</h2>
            <p>We use cookies and similar technologies to enhance your experience and analyze service usage. You can control cookie preferences through your browser settings.</p>

            <h2>7. Children's Privacy</h2>
            <p>Our services are not intended for children under 13 (or a higher age threshold depending on local laws) without parental consent or as directed by an educational institution.</p>

            <h2>8. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page.</p>

            <h2>9. Contact Us</h2>
            <p>If you have any questions about this Privacy Policy, please contact us at: privacy@proctorprep.example.com</p>
          </CardContent>
        </Card>
      </main>
      <AppFooter />
    </div>
  );
}

export const metadata = {
  title: 'Privacy Policy | ProctorPrep',
};
