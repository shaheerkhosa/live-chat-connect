import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  MessageSquare,
  Users, 
  Globe, 
  Settings, 
  BarChart3, 
  Code, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Archive,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { mockAgents } from '@/data/mockData';
import scaledBotLogo from '@/assets/scaled-bot-logo.png';

interface SidebarItemProps {
  to: string;
  icon: React.ElementType;
  label: string;
  badge?: number;
  collapsed: boolean;
}

const SidebarItem = ({ to, icon: Icon, label, badge, collapsed }: SidebarItemProps) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <NavLink
      to={to}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
        "hover:bg-sidebar-accent group",
        isActive 
          ? "bg-sidebar-accent text-sidebar-accent-foreground" 
          : "text-sidebar-foreground/70 hover:text-sidebar-foreground"
      )}
    >
      <Icon className={cn(
        "h-5 w-5 flex-shrink-0 transition-colors",
        isActive ? "text-sidebar-primary" : "group-hover:text-sidebar-primary"
      )} />
      {!collapsed && (
        <>
          <span className="font-medium flex-1">{label}</span>
          {badge && badge > 0 && (
            <span className="bg-sidebar-primary text-sidebar-primary-foreground text-xs font-semibold px-2 py-0.5 rounded-full">
              {badge}
            </span>
          )}
        </>
      )}
      {collapsed && badge && badge > 0 && (
        <span className="absolute -top-1 -right-1 bg-sidebar-primary text-sidebar-primary-foreground text-xs font-semibold w-5 h-5 flex items-center justify-center rounded-full">
          {badge}
        </span>
      )}
    </NavLink>
  );
};

const SidebarSection = ({ title, children, collapsed }: { title: string; children: React.ReactNode; collapsed: boolean }) => (
  <div className="space-y-1">
    {!collapsed && (
      <h3 className="px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50 mb-2">
        {title}
      </h3>
    )}
    {children}
  </div>
);

export const DashboardSidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const currentAgent = mockAgents[0];

  return (
    <aside 
      className={cn(
        "h-screen bg-sidebar flex flex-col border-r border-sidebar-border transition-all duration-300",
        collapsed ? "w-[68px]" : "w-64"
      )}
    >
      {/* Logo */}
      <div className={cn(
        "h-16 flex items-center border-b border-sidebar-border px-4",
        collapsed ? "justify-center" : "justify-between"
      )}>
        {!collapsed && (
          <div className="flex items-center gap-2">
            <img src={scaledBotLogo} alt="Scaled Bot" className="h-8 w-8 rounded-lg" />
            <span className="font-bold text-lg text-sidebar-foreground">Scaled Bot</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-6 scrollbar-thin">
        <SidebarSection title="Inbox" collapsed={collapsed}>
          <SidebarItem to="/dashboard" icon={Inbox} label="All Conversations" badge={3} collapsed={collapsed} />
          <SidebarItem to="/dashboard/active" icon={MessageSquare} label="Active" badge={2} collapsed={collapsed} />
          <SidebarItem to="/dashboard/pending" icon={Clock} label="Pending" badge={1} collapsed={collapsed} />
          <SidebarItem to="/dashboard/closed" icon={Archive} label="Closed" collapsed={collapsed} />
        </SidebarSection>

        <SidebarSection title="Manage" collapsed={collapsed}>
          <SidebarItem to="/dashboard/properties" icon={Globe} label="Properties" collapsed={collapsed} />
          <SidebarItem to="/dashboard/agents" icon={Users} label="Agents" collapsed={collapsed} />
          <SidebarItem to="/dashboard/analytics" icon={BarChart3} label="Analytics" collapsed={collapsed} />
        </SidebarSection>

        <SidebarSection title="Setup" collapsed={collapsed}>
          <SidebarItem to="/dashboard/widget" icon={Code} label="Widget Code" collapsed={collapsed} />
          <SidebarItem to="/dashboard/settings" icon={Settings} label="Settings" collapsed={collapsed} />
        </SidebarSection>
      </nav>

      {/* User Profile */}
      <div className={cn(
        "border-t border-sidebar-border p-3",
        collapsed ? "flex justify-center" : ""
      )}>
        <div className={cn(
          "flex items-center gap-3 p-2 rounded-lg hover:bg-sidebar-accent transition-colors cursor-pointer",
          collapsed ? "justify-center" : ""
        )}>
          <div className="relative">
            <Avatar className="h-9 w-9">
              <AvatarImage src={currentAgent.avatar} />
              <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-sm">
                {currentAgent.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <span className={cn(
              "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-sidebar",
              currentAgent.status === 'online' ? "bg-status-online" : 
              currentAgent.status === 'away' ? "bg-status-away" : "bg-status-offline"
            )} />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{currentAgent.name}</p>
              <p className="text-xs text-sidebar-foreground/60 capitalize">{currentAgent.status}</p>
            </div>
          )}
          {!collapsed && (
            <Button variant="ghost" size="icon" className="text-sidebar-foreground/60 hover:text-sidebar-foreground">
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </aside>
  );
};
