import { Link } from 'react-router-dom';
import { documentationSections } from '@/data/documentation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BookOpen, 
  MessageSquare, 
  Users, 
  Bot, 
  Palette, 
  Plug, 
  BarChart3,
  ArrowRight
} from 'lucide-react';

const sectionIcons: Record<string, React.ReactNode> = {
  'getting-started': <BookOpen className="h-6 w-6" />,
  'inbox': <MessageSquare className="h-6 w-6" />,
  'team': <Users className="h-6 w-6" />,
  'ai-support': <Bot className="h-6 w-6" />,
  'widget': <Palette className="h-6 w-6" />,
  'integrations': <Plug className="h-6 w-6" />,
  'analytics': <BarChart3 className="h-6 w-6" />,
};

const Documentation = () => {
  return (
    <div className="max-w-4xl mx-auto py-12 px-6">
      {/* Hero */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-foreground mb-4">
          Documentation
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Learn how to get the most out of Scaled Bot. Find guides, tips, and detailed explanations for every feature.
        </p>
      </div>

      {/* Sections Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {documentationSections.map((section) => (
          <Card 
            key={section.id} 
            className="group hover:border-primary/50 transition-colors"
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  {sectionIcons[section.id] || <BookOpen className="h-6 w-6" />}
                </div>
                <div>
                  <CardTitle className="text-lg">{section.title}</CardTitle>
                  <CardDescription>{section.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {section.topics.slice(0, 4).map((topic) => (
                  <li key={topic.id}>
                    <Link
                      to={`/documentation/${section.id}/${topic.id}`}
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      <ArrowRight className="h-3 w-3" />
                      {topic.title}
                    </Link>
                  </li>
                ))}
                {section.topics.length > 4 && (
                  <li className="text-xs text-muted-foreground/70 pl-5">
                    +{section.topics.length - 4} more topics
                  </li>
                )}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Help */}
      <div className="mt-12 p-6 rounded-lg border border-border bg-muted/30 text-center">
        <h2 className="text-lg font-semibold text-foreground mb-2">
          Need more help?
        </h2>
        <p className="text-muted-foreground mb-4">
          Can't find what you're looking for? Reach out to our support team.
        </p>
        <Link 
          to="/dashboard/support"
          className="inline-flex items-center gap-2 text-primary hover:underline"
        >
          Contact Support
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
};

export default Documentation;
