import { useState, useEffect } from 'react';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { BlogAnalytics } from '@/components/dashboard/BlogAnalytics';
import { Building2, Loader2 } from 'lucide-react';
import { useConversations } from '@/hooks/useConversations';
import { PropertySelector } from '@/components/PropertySelector';

const Analytics = () => {
  const { properties, loading, deleteProperty } = useConversations();
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | undefined>();

  // Auto-select first property when properties load
  useEffect(() => {
    if (properties.length > 0 && !selectedPropertyId) {
      setSelectedPropertyId(properties[0].id);
    }
  }, [properties, selectedPropertyId]);

  return (
    <div className="flex h-screen bg-sidebar">
      <DashboardSidebar />
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <PageHeader title="Lead Analytics">
          {loading ? (
            <div className="flex items-center gap-2 text-sidebar-foreground/60">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Loading...</span>
            </div>
          ) : properties.length > 0 ? (
            <PropertySelector
              properties={properties}
              selectedPropertyId={selectedPropertyId}
              onPropertyChange={setSelectedPropertyId}
              onDeleteProperty={deleteProperty}
              variant="header"
            />
          ) : null}
        </PageHeader>

        {/* Content */}
        <div className="flex-1 p-2 overflow-hidden">
          <div className="h-full overflow-auto scrollbar-hide rounded-lg border border-border/30 bg-background dark:bg-background/50 dark:backdrop-blur-sm p-6">
            <div className="max-w-4xl mx-auto">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : properties.length === 0 ? (
              <div className="text-center py-20">
                <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h2 className="text-lg font-semibold text-foreground mb-2">No Properties Yet</h2>
                <p className="text-muted-foreground">
                  Create a property first to start tracking analytics.
                </p>
              </div>
            ) : (
              <BlogAnalytics propertyId={selectedPropertyId} />
            )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;