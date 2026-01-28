import { useParams, useSearchParams } from 'react-router-dom';
import { ChatWidget } from '@/components/widget/ChatWidget';
import { useEffect } from 'react';

const WidgetEmbed = () => {
  const { propertyId } = useParams<{ propertyId: string }>();
  const [searchParams] = useSearchParams();

  const primaryColor = searchParams.get('primaryColor') || 'hsl(221, 83%, 53%)';
  const textColor = searchParams.get('textColor') || 'hsl(0, 0%, 100%)';
  const borderColor = searchParams.get('borderColor') || 'hsl(0, 0%, 0%, 0.1)';
  const widgetSize = (searchParams.get('widgetSize') as 'small' | 'medium' | 'large') || 'medium';
  const borderRadius = parseInt(searchParams.get('borderRadius') || '16', 10);
  const greeting = searchParams.get('greeting') || 'Hi there! How can I help you today?';
  const autoOpen = searchParams.get('autoOpen') !== 'false'; // Default to true for embeds

  // Make the entire page transparent for iframe embedding
  useEffect(() => {
    // Force transparency with !important to override any CSS
    document.body.style.setProperty('background', 'transparent', 'important');
    document.documentElement.style.setProperty('background', 'transparent', 'important');
    document.body.style.setProperty('background-color', 'transparent', 'important');
    document.documentElement.style.setProperty('background-color', 'transparent', 'important');
    // Also remove the dark class if present to prevent dark mode styles
    document.documentElement.classList.remove('dark');
    // Add a class to identify embed mode
    document.body.classList.add('widget-embed-mode');
    document.documentElement.classList.add('widget-embed-mode');
    // Prevent scrollbars in small iframe sizes
    document.body.style.setProperty('overflow', 'hidden', 'important');
    
    return () => {
      document.body.style.background = '';
      document.documentElement.style.background = '';
      document.body.classList.remove('widget-embed-mode');
      document.documentElement.classList.remove('widget-embed-mode');
      document.body.style.overflow = '';
    };
  }, []);

  if (!propertyId) {
    return <div className="p-4 text-red-500">Property ID is required</div>;
  }

  return (
    <div 
      className="w-full h-full overflow-hidden"
      style={{ background: 'transparent' }}
    >
      <ChatWidget
        propertyId={propertyId}
        primaryColor={primaryColor}
        textColor={textColor}
        borderColor={borderColor}
        widgetSize={widgetSize}
        borderRadius={borderRadius}
        greeting={greeting}
        isPreview={false}
        autoOpen={autoOpen}
      />
    </div>
  );
};

export default WidgetEmbed;
