import { TrendingUp, ExternalLink, Users, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { mockBlogAnalytics } from '@/data/mockData';

export const BlogAnalytics = () => {
  const topBlogs = mockBlogAnalytics
    .sort((a, b) => b.leads - a.leads)
    .slice(0, 5);

  const totalLeads = mockBlogAnalytics.reduce((sum, blog) => sum + blog.leads, 0);
  const totalViews = mockBlogAnalytics.reduce((sum, blog) => sum + blog.views, 0);

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Total Views</span>
            </div>
            <p className="text-2xl font-bold text-foreground mt-1">
              {totalViews.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-accent/50 border-accent">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-accent-foreground" />
              <span className="text-sm text-muted-foreground">Total Leads</span>
            </div>
            <p className="text-2xl font-bold text-foreground mt-1">{totalLeads}</p>
          </CardContent>
        </Card>
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Avg Conv Rate</span>
            </div>
            <p className="text-2xl font-bold text-foreground mt-1">
              {((totalLeads / totalViews) * 100).toFixed(1)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top Performing Blogs */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Top 5 Performing Blogs
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {topBlogs.map((blog, index) => (
            <div
              key={blog.id}
              className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-xs font-bold text-primary">#{index + 1}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="font-medium text-sm text-foreground truncate">
                      {blog.title}
                    </h4>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {blog.slug}
                    </p>
                  </div>
                  <a
                    href={blog.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <Badge variant="secondary" className="text-xs">
                    {blog.views.toLocaleString()} views
                  </Badge>
                  <Badge variant="default" className="text-xs bg-primary/90">
                    {blog.leads} leads
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {((blog.leads / blog.views) * 100).toFixed(1)}% conv
                  </span>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};
