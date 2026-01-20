import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { InfoIndicator } from '@/components/docs/InfoIndicator';

interface PageHeaderProps {
  title: string;
  children?: React.ReactNode;
  className?: string;
  docsLink?: string;
}

export const PageHeader = ({ title, children, className, docsLink }: PageHeaderProps) => {
  return (
    <div 
      className={cn(
        "h-16 shrink-0 flex items-center justify-between px-6 sticky top-0 z-10",
        "bg-sidebar text-sidebar-foreground",
        className
      )}
    >
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-semibold text-sidebar-foreground">{title}</h1>
        {docsLink && <InfoIndicator to={docsLink} size="md" variant="header" />}
      </div>
      {children && (
        <div className="flex items-center gap-2">
          {children}
        </div>
      )}
    </div>
  );
};

// Primary action button styled for dark header
export const HeaderButton = ({ 
  children, 
  variant = 'default',
  ...props 
}: React.ComponentProps<typeof Button> & { variant?: 'default' | 'outline' | 'ghost' }) => {
  const variantClasses = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/90',
    outline: 'border-sidebar-foreground/20 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground bg-transparent',
    ghost: 'text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent',
  };

  return (
    <Button 
      {...props}
      className={cn(variantClasses[variant], props.className)}
    >
      {children}
    </Button>
  );
};
