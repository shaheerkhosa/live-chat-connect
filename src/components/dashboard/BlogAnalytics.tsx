import { TrendingUp, ExternalLink, Users, MessageSquare, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePageAnalytics, TimeRange } from '@/hooks/usePageAnalytics';
import { cn } from '@/lib/utils';

const timeRangeOptions: { value: TimeRange; label: string }[] = [
  { value: 'week', label: 'Last 7 Days' },
  { value: 'month', label: 'Last 30 Days' },
  { value: 'all', label: 'All Time' },
];

export const BlogAnalytics = () => {
  const { data, totals, loading, error, timeRange, setTimeRange } = usePageAnalytics();

  const topPages = data.slice(0, 5);

  if (error) {
    return (
      <Card className="p-6">
        <p className="text-destructive text-center">{error}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Time Range Selector */}
      <div className="flex items-center gap-1 p-1 bg-muted rounded-lg w-fit">
        {timeRangeOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => setTimeRange(option.value)}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-md transition-all duration-200',
              timeRange === option.value
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Chat Opens</span>
            </div>
            <p className="text-2xl font-bold text-foreground mt-1">
              {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : totals.total_chat_opens.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-accent/50 border-accent">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-accent-foreground" />
              <span className="text-sm text-muted-foreground">Escalations</span>
            </div>
            <p className="text-2xl font-bold text-foreground mt-1">
              {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : totals.total_human_escalations}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Conv Rate</span>
            </div>
            <p className="text-2xl font-bold text-foreground mt-1">
              {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : `${totals.avg_conversion_rate.toFixed(1)}%`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top Performing Pages */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Top 5 Performing Pages
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : topPages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No analytics data yet.</p>
              <p className="text-sm mt-1">Data will appear once visitors start using the chat widget.</p>
            </div>
          ) : (
            topPages.map((page, index) => (
              <div
                key={page.url}
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-xs font-bold text-primary">#{index + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="font-medium text-sm text-foreground truncate">
                        {page.page_title || 'Untitled Page'}
                      </h4>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {page.url}
                      </p>
                    </div>
                    <a
                      href={page.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <Badge variant="secondary" className="text-xs">
                      {page.chat_opens.toLocaleString()} opens
                    </Badge>
                    <Badge variant="default" className="text-xs bg-primary/90">
                      {page.human_escalations} escalations
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {page.conversion_rate.toFixed(1)}% conv
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};
