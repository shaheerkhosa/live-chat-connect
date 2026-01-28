import { useParams, useSearchParams } from 'react-router-dom';
import { ChatWidget } from '@/components/widget/ChatWidget';

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

  if (!propertyId) {
    return <div className="p-4 text-red-500">Property ID is required</div>;
  }

  return (
    <div className="w-full h-screen bg-transparent flex items-end justify-end p-0">
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
