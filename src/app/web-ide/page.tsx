
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CodeXml } from "lucide-react";

export default function WebIdePage() {
  return (
    <div className="flex flex-col items-center justify-center">
      <Card className="w-full max-w-2xl modern-card">
        <CardHeader className="text-center">
          <CodeXml className="h-16 w-16 text-primary mx-auto mb-4" strokeWidth={1.5} />
          <CardTitle className="text-3xl">Web IDE</CardTitle>
          <CardDescription className="text-lg text-muted-foreground">
            This is the placeholder page for the Web Integrated Development Environment.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-muted-foreground">
            Functionality for the code editor, file tree, and execution environment will be implemented here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
