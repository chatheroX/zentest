
'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, KeyRound, PlusCircle, Copy, Check, List } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext'; // For admin user info
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function AdminDashboardPage() {
  const { user, supabase } = useAuth(); // Assuming admin user details are in `user`
  const { toast } = useToast();

  const [newLicenseKey, setNewLicenseKey] = useState('');
  const [generatedKeys, setGeneratedKeys] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copySuccess, setCopySuccess] = useState<Record<string, boolean>>({});

  const generateRandomKey = (): string => {
    const segments = Array(4).fill(null).map(() => 
      Math.random().toString(36).substring(2, 6).toUpperCase()
    );
    return segments.join('-');
  };

  const handleGenerateKey = async () => {
    if (!supabase || !user || user.role !== 'admin') {
      toast({ title: "Error", description: "Unauthorized or service error.", variant: "destructive" });
      return;
    }
    setIsGenerating(true);
    const keyVal = generateRandomKey();
    try {
      const { data, error } = await supabase
        .from('license_keys')
        .insert({
          key_value: keyVal,
          created_by_admin_id: user.id, // Assuming admin user object has 'id'
        })
        .select('key_value')
        .single();

      if (error) throw error;
      
      if (data?.key_value) {
        setNewLicenseKey(data.key_value);
        setGeneratedKeys(prev => [data.key_value!, ...prev].slice(0, 10)); // Keep last 10
        toast({ title: "Success", description: `License key generated: ${data.key_value}` });
      } else {
        throw new Error("Failed to retrieve generated key from database.");
      }
    } catch (e: any) {
      toast({ title: "Error Generating Key", description: e.message || "Could not generate license key.", variant: "destructive" });
      setNewLicenseKey('');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (key: string) => {
    navigator.clipboard.writeText(key).then(() => {
      setCopySuccess(prev => ({ ...prev, [key]: true }));
      toast({ description: "License key copied to clipboard!" });
      setTimeout(() => setCopySuccess(prev => ({ ...prev, [key]: false })), 2000);
    }).catch(() => {
      toast({ description: "Failed to copy key.", variant: "destructive" });
    });
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="flex justify-center items-center h-full py-10">
        <p className="text-destructive">Access Denied. You must be an admin.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-left">
        <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="mt-1 text-md text-muted-foreground">Manage license keys for user registration.</p>
      </div>

      <Card className="ui-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5 text-primary" /> Generate New License Key</CardTitle>
          <CardDescription>Create a new unique license key for user registration.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {newLicenseKey && (
            <div className="p-3 bg-primary/10 border border-primary/30 rounded-md">
              <Label htmlFor="generatedKeyDisplay" className="text-sm font-medium text-primary">Newly Generated Key:</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input id="generatedKeyDisplay" value={newLicenseKey} readOnly className="ui-input text-lg font-mono tracking-wider flex-grow bg-background/50" />
                <Button variant="ghost" size="icon" onClick={() => copyToClipboard(newLicenseKey)} title="Copy Key">
                  {copySuccess[newLicenseKey] ? <Check className="h-5 w-5 text-green-500" /> : <Copy className="h-5 w-5 text-primary" />}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button onClick={handleGenerateKey} className="btn-primary w-full sm:w-auto" disabled={isGenerating}>
            {isGenerating ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <PlusCircle className="mr-2 h-4 w-4" />}
            {isGenerating ? 'Generating...' : 'Generate New Key'}
          </Button>
        </CardFooter>
      </Card>

      {generatedKeys.length > 0 && (
        <Card className="ui-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><List className="h-5 w-5 text-primary" /> Recently Generated Keys</CardTitle>
            <CardDescription>List of the last 10 keys generated in this session for easy copying.</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-60 pr-3 scrollbar-thin">
              <ul className="space-y-2">
                {generatedKeys.map((key) => (
                  <li key={key} className="flex items-center justify-between p-2.5 bg-muted/50 rounded-md border">
                    <span className="font-mono text-sm text-foreground tracking-wider">{key}</span>
                    <Button variant="ghost" size="icon" onClick={() => copyToClipboard(key)} title="Copy Key" className="h-8 w-8">
                       {copySuccess[key] ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-primary" />}
                    </Button>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
