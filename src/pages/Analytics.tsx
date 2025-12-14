import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { BlogAnalytics } from '@/components/dashboard/BlogAnalytics';
import { BarChart3 } from 'lucide-react';

const Analytics = () => {
  return (
    <div className="flex h-screen bg-gradient-subtle">
      <DashboardSidebar />
      
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="h-16 border-b border-border flex items-center px-6 bg-card/90 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center glow-primary">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">Lead Analytics</h1>
              <p className="text-sm text-muted-foreground">Track blog performance & lead sources</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-4xl">
            <BlogAnalytics />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
