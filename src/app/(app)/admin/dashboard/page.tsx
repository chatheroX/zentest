
'use client';

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, KeyRound, PlusCircle, Copy, Check, List, Users, Clock, ExternalLink } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { LicenseKeyTableType, UserTableType } from '@/types/supabase';
import { format } from 'date-fns';

interface DisplayLicenseKey extends LicenseKeyTableType['Row'] {
  claimed_by_username?: string | null;
}

export default function AdminDashboardPage() {
  const { user, supabase } = useAuth();
  const { toast } = useToast();

  const [newlyGeneratedKey, setNewlyGeneratedKey] = useState('');
  const [recentlyGeneratedKeys, setRecentlyGeneratedKeys] = useState<string[]>([]); // For immediate feedback
  const [allLicenseKeys, setAllLicenseKeys] = useState<DisplayLicenseKey[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingKeys, setIsLoadingKeys] = useState(true);
  const [copySuccess, setCopySuccess] = useState<Record<string, boolean>>({});

  const generateRandomKey = (): string => {
    const segments = Array(4).fill(null).map(() => 
      Math.random().toString(36).substring(2, 6).toUpperCase()
    );
    return segments.join('-');
  };

  const fetchAllLicenseKeys = useCallback(async () => {
    if (!supabase) {
      toast({ title: "Service Error", description: "Cannot connect to database service.", variant: "destructive" });
      setIsLoadingKeys(false);
      return;
    }
    setIsLoadingKeys(true);
    try {
      const { data: keys, error: keysError } = await supabase
        .from('license_keys')
        .select('*')
        .order('created_at', { ascending: false });

      if (keysError) throw keysError;

      if (keys && keys.length > 0) {
        const claimedUserIds = keys.filter(k => k.is_claimed && k.claimed_by_user_id).map(k => k.claimed_by_user_id!);
        let usersMap: Map<string, string> = new Map();

        if (claimedUserIds.length > 0) {
          const { data: usersData, error: usersError } = await supabase
            .from('users')
            .select('id, username')
            .in('id', claimedUserIds);
          
          if (usersError) console.warn("Failed to fetch usernames for claimed keys:", usersError.message);
          else usersData?.forEach(u => usersMap.set(u.id, u.username));
        }

        const displayKeys: DisplayLicenseKey[] = keys.map(key => ({
          ...key,
          claimed_by_username: key.claimed_by_user_id ? usersMap.get(key.claimed_by_user_id) || 'Unknown User' : null,
        }));
        setAllLicenseKeys(displayKeys);
      } else {
        setAllLicenseKeys([]);
      }
    } catch (e: any) {
      toast({ title: "Error Fetching Keys", description: e.message || "Could not load license keys.", variant: "destructive" });
      setAllLicenseKeys([]);
    } finally {
      setIsLoadingKeys(false);
    }
  }, [supabase, toast]);

  useEffect(() => {
    fetchAllLicenseKeys();
  }, [fetchAllLicenseKeys]);


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
        .insert({ key_value: keyVal, created_by_admin_id: user.id })
        .select('key_value, id, created_at, is_claimed') // Select more fields to update allLicenseKeys
        .single();

      if (error) throw error;
      
      if (data) {
        setNewlyGeneratedKey(data.key_value);
        setRecentlyGeneratedKeys(prev => [data.key_value!, ...prev].slice(0, 5)); 
        
        // Add to the main list immediately
        const newDisplayKey: DisplayLicenseKey = {
          ...data,
          id: data.id,
          claimed_at: null,
          claimed_by_user_id: null,
          claimed_by_username: null,
          created_by_admin_id: user.id,
          key_value: data.key_value
        };
        setAllLicenseKeys(prev => [newDisplayKey, ...prev]);

        toast({ title: "Success", description: `License key generated: ${data.key_value}` });
      } else {
        throw new Error("Failed to retrieve generated key from database.");
      }
    } catch (e: any) {
      toast({ title: "Error Generating Key", description: e.message || "Could not generate license key.", variant: "destructive" });
      setNewlyGeneratedKey('');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (key: string) => {
    navigator.clipboard.writeText(key).then(() => {
      setCopySuccess(prev => ({ ...prev, [key]: true }));
      toast({ description: "License key copied!" });
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
          <CardDescription>Create a unique license key. Generated keys will appear in the table below.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {newlyGeneratedKey && (
            <div className="p-3 bg-primary/10 border border-primary/30 rounded-lg">
              <Label htmlFor="generatedKeyDisplay" className="text-sm font-medium text-primary">Newly Generated Key:</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input id="generatedKeyDisplay" value={newlyGeneratedKey} readOnly className="ui-input text-lg font-mono tracking-wider flex-grow bg-background/30" />
                <Button variant="ghost" size="icon" onClick={() => copyToClipboard(newlyGeneratedKey)} title="Copy Key" className="text-primary hover:bg-primary/10">
                  {copySuccess[newlyGeneratedKey] ? <Check className="h-5 w-5 text-green-500" /> : <Copy className="h-5 w-5" />}
                </Button>
              </div>
            </div>
          )}
           {recentlyGeneratedKeys.length > 0 && !newlyGeneratedKey && (
             <p className="text-sm text-muted-foreground">Last generated key in this session: <span className="font-mono text-primary">{recentlyGeneratedKeys[0]}</span></p>
           )}
        </CardContent>
        <CardFooter>
          <Button onClick={handleGenerateKey} className="btn-gradient w-full sm:w-auto py-2.5 text-base" disabled={isGenerating}>
            {isGenerating ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <PlusCircle className="mr-2 h-4 w-4" />}
            {isGenerating ? 'Generating...' : 'Generate New Key'}
          </Button>
        </CardFooter>
      </Card>

      <Card className="ui-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><List className="h-5 w-5 text-primary" /> All License Keys</CardTitle>
          <CardDescription>List of all generated license keys and their claim status.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingKeys ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2 text-muted-foreground">Loading keys...</p>
            </div>
          ) : allLicenseKeys.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">No license keys found. Generate some to get started!</p>
          ) : (
            <ScrollArea className="max-h-[500px] pr-3 scrollbar-thin">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Key Value</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead><Users className="inline mr-1 h-4 w-4"/>Claimed By</TableHead>
                    <TableHead><Clock className="inline mr-1 h-4 w-4"/>Claimed At</TableHead>
                    <TableHead><Clock className="inline mr-1 h-4 w-4"/>Created At</TableHead>
                    <TableHead className="text-right">Copy</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allLicenseKeys.map((key) => (
                    <TableRow key={key.id}>
                      <TableCell className="font-mono text-sm tracking-wider text-foreground/90">{key.key_value}</TableCell>
                      <TableCell>
                        <Badge variant={key.is_claimed ? "secondary" : "default"} className={key.is_claimed ? "bg-amber-500/20 text-amber-700 dark:bg-amber-700/30 dark:text-amber-300 border-amber-500/30" : "bg-green-500/20 text-green-700 dark:bg-green-700/30 dark:text-green-300 border-green-500/30"}>
                          {key.is_claimed ? 'Claimed' : 'Unclaimed'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {key.claimed_by_username || (key.is_claimed ? 'N/A' : '—')}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {key.claimed_at ? format(new Date(key.claimed_at), 'MMM d, yyyy HH:mm') : '—'}
                      </TableCell>
                       <TableCell className="text-muted-foreground text-xs">
                        {format(new Date(key.created_at), 'MMM d, yyyy HH:mm')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => copyToClipboard(key.key_value)} title="Copy Key" className="h-8 w-8 text-primary/70 hover:bg-primary/10 hover:text-primary">
                          {copySuccess[key.key_value] ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

    