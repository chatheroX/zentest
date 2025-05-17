
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  Sidebar,
  SidebarHeader,
  SidebarTrigger,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { LogOut, Settings, Loader2, UserCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { CustomUser } from '@/types/supabase';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from '@/lib/utils';
import logoAsset from '../../../logo.png'; 
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  disabled?: boolean;
  group?: 'MAIN' | 'TOOLS' | 'OTHER';
}

interface SidebarElementsProps {
  navItems: NavItem[];
  userRoleDashboard: 'student' | 'teacher';
  user: CustomUser | null;
  signOut: () => Promise<void>; // signOut comes from AuthContext now
  authLoading: boolean;
  className?: string;
}

export function SidebarElements({ navItems, userRoleDashboard, user, signOut, authLoading, className }: SidebarElementsProps) {
  const pathname = usePathname();

  const mainNavItems = navItems.filter(item => !item.group || item.group === 'MAIN');

  const renderNavGroup = (items: NavItem[], groupLabel?: string) => {
    if (items.length === 0 && !groupLabel) return null;
    if (items.length === 0 && groupLabel) {
      return (
        <SidebarGroup className="pt-2 pb-1 px-2 group-data-[collapsible=icon]:hidden">
            <SidebarGroupLabel className="text-xs font-semibold uppercase text-sidebar-group-text tracking-wider">
                {groupLabel}
            </SidebarGroupLabel>
        </SidebarGroup>
      );
    }

    return (
      <>
        {groupLabel && (
            <SidebarGroup className="pt-2 pb-1 px-2 group-data-[collapsible=icon]:hidden">
                <SidebarGroupLabel className="text-xs font-semibold uppercase text-sidebar-group-text tracking-wider">
                    {groupLabel}
                </SidebarGroupLabel>
            </SidebarGroup>
        )}
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.href} className="px-2">
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith(item.href)}
                tooltip={{
                    children: item.label,
                    className: "group-data-[collapsible=icon]:block hidden bg-popover text-popover-foreground border-border shadow-sm rounded-sm"
                }}
                disabled={item.disabled}
                className="text-sm font-medium text-sidebar-foreground data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground data-[active=true]:shadow-lg hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-md transition-all duration-200 ease-in-out data-[active=true]:hover:bg-sidebar-primary/90"
                data-sidebar="menu-button"
              >
                <Link href={item.href} className="gap-2.5">
                  <item.icon className="h-4 w-4" />
                  <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </>
    );
  };


  return (
    <Sidebar
        collapsible="icon"
        className={cn("sidebar-glass", className)}
    >
      <SidebarHeader className="p-3 border-b border-sidebar-border/60 h-20 flex items-center">
        <div className="flex items-center justify-between w-full group-data-[collapsible=icon]:justify-center">
          <Link href="/" className="flex items-center gap-2 group-data-[collapsible=icon]:hidden">
            <Image src={logoAsset} alt="ZenTest Logo" width={160} height={45} className="h-16 w-auto" />
          </Link>
           <SidebarTrigger className="text-muted-foreground hover:text-foreground group-data-[collapsible=icon]:hidden" />
           <SidebarTrigger className="text-muted-foreground hover:text-foreground hidden group-data-[collapsible=icon]:flex" />
        </div>
      </SidebarHeader>

      <SidebarContent className="p-0 flex-grow flex flex-col">
        <div className="py-3 flex-grow">
            {renderNavGroup(mainNavItems, "Main Menu")}
        </div>

        <div className="mt-auto p-2 border-t border-sidebar-border/60">
             <SidebarMenu className="px-2">
                <SidebarMenuItem>
                <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith(`/${userRoleDashboard}/dashboard/profile`)}
                    tooltip={{
                        children: "My Profile",
                         className: "group-data-[collapsible=icon]:block hidden bg-popover text-popover-foreground border-border shadow-sm rounded-sm"
                    }}
                    className="text-sm font-medium text-sidebar-foreground data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground data-[active=true]:shadow-lg hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-md transition-all duration-200 ease-in-out data-[active=true]:hover:bg-sidebar-primary/90"
                     data-sidebar="menu-button"
                >
                    <Link href={`/${userRoleDashboard}/dashboard/profile`} className="gap-2.5">
                    <UserCircle className="h-4 w-4" />
                    <span className="group-data-[collapsible=icon]:hidden">My Profile</span>
                    </Link>
                </SidebarMenuButton>
                </SidebarMenuItem>
                 <SidebarMenuItem>
                <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith(`/${userRoleDashboard}/dashboard/settings`)}
                    tooltip={{
                        children: "Settings",
                         className: "group-data-[collapsible=icon]:block hidden bg-popover text-popover-foreground border-border shadow-sm rounded-sm"
                    }}
                    className="text-sm font-medium text-sidebar-foreground data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground data-[active=true]:shadow-lg hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-md transition-all duration-200 ease-in-out data-[active=true]:hover:bg-sidebar-primary/90"
                     data-sidebar="menu-button"
                >
                    <Link href={`/${userRoleDashboard}/dashboard/settings`} className="gap-2.5">
                    <Settings className="h-4 w-4" />
                    <span className="group-data-[collapsible=icon]:hidden">Settings</span>
                    </Link>
                </SidebarMenuButton>
                </SidebarMenuItem>
             </SidebarMenu>
        </div>
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-sidebar-border/60">
        {user && (
            <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2 overflow-hidden group-data-[collapsible=icon]:hidden">
                    <Avatar className="h-9 w-9 border-2 border-primary/20">
                        <AvatarImage src={user.avatar_url || undefined} alt={user.name || user.email || 'User'} />
                        <AvatarFallback className="text-xs bg-muted text-muted-foreground font-semibold">
                            {(user.name || user.email || 'U').substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col overflow-hidden">
                        <p className="text-sm font-medium text-foreground truncate" title={user.name || user.email || undefined}>
                        {user.name || user.email}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize truncate" title={user.role && user.user_id ? `${user.role} - ID: ${user.user_id}` : user.role || 'N/A'}>
                          {user.role || 'N/A'} {user.user_id && `- ID: ${user.user_id.substring(0,6)}..`}
                        </p>
                    </div>
                </div>
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            disabled={authLoading}
                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8 rounded-full"
                            aria-label="Logout"
                            title="Logout"
                        >
                        {authLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-popover border-border">
                        <AlertDialogHeader>
                        <AlertDialogTitle className="text-foreground">Confirm Logout</AlertDialogTitle>
                        <AlertDialogDescription className="text-muted-foreground">
                            Are you sure you want to log out?
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel className="btn-outline-subtle">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={signOut} className="btn-gradient-destructive">
                            Logout
                        </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        )}
        {!user && authLoading && (
            <div className="flex items-center justify-center h-10">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
