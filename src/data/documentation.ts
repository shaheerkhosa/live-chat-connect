export interface DocTopic {
  id: string;
  title: string;
  description: string;
  whatItDoes: string;
  howToUse: string[];
  tips: string[];
  relatedTopics?: { title: string; path: string }[];
}

export interface DocSection {
  id: string;
  title: string;
  description: string;
  topics: DocTopic[];
}

export const documentationSections: DocSection[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    description: 'Learn the basics of Scaled Bot',
    topics: [
      {
        id: 'overview',
        title: 'Overview',
        description: 'Welcome to Scaled Bot - your AI-powered customer support solution.',
        whatItDoes: 'Scaled Bot helps you provide instant, 24/7 customer support through an intelligent chat widget on your website. It combines AI automation with human agent support to ensure your visitors always get the help they need.',
        howToUse: [
          'Create your first property (website) from the dashboard',
          'Customize your chat widget appearance and behavior',
          'Add team members to handle conversations',
          'Configure AI personas for automated responses',
          'Embed the widget on your website'
        ],
        tips: [
          'Start with one property to learn the system before adding more',
          'Test your widget thoroughly before going live',
          'Monitor conversations regularly to improve AI responses'
        ],
        relatedTopics: [
          { title: 'Creating Properties', path: '/documentation/getting-started/properties' },
          { title: 'Widget Customization', path: '/documentation/widget/customization' }
        ]
      },
      {
        id: 'properties',
        title: 'Creating Properties',
        description: 'Set up websites to manage with Scaled Bot.',
        whatItDoes: 'Properties represent the websites where you want to deploy chat support. Each property has its own widget settings, team assignments, and conversation history.',
        howToUse: [
          'Click "Add Property" from any property selector',
          'Enter your property name (e.g., "Main Website")',
          'Enter your domain (e.g., "example.com")',
          'Click "Create Property" to save'
        ],
        tips: [
          'Use descriptive names to easily identify properties',
          'You can manage multiple websites from one account',
          'Each property can have different widget colors and settings'
        ],
        relatedTopics: [
          { title: 'Widget Customization', path: '/documentation/widget/customization' },
          { title: 'Team Assignments', path: '/documentation/team/property-assignments' }
        ]
      }
    ]
  },
  {
    id: 'inbox',
    title: 'Inbox',
    description: 'Manage customer conversations',
    topics: [
      {
        id: 'conversations',
        title: 'Managing Conversations',
        description: 'View and respond to customer chats.',
        whatItDoes: 'The inbox shows all conversations from your websites. You can view active chats, respond to visitors, and close resolved conversations. Conversations are organized by status and property.',
        howToUse: [
          'Click on a conversation to open it in the chat panel',
          'Type your response in the message field',
          'Press Enter or click Send to deliver your message',
          'Use the close button to mark conversations as resolved'
        ],
        tips: [
          'Respond quickly - visitors may leave if they wait too long',
          'Use the visitor info panel to personalize your responses',
          'Closed conversations can be found in the Closed tab'
        ],
        relatedTopics: [
          { title: 'Visitor Information', path: '/documentation/inbox/visitor-info' },
          { title: 'Chat Panel', path: '/documentation/inbox/chat-panel' }
        ]
      },
      {
        id: 'chat-panel',
        title: 'Chat Panel',
        description: 'The interface for messaging visitors.',
        whatItDoes: 'The chat panel displays the full conversation history with a visitor. You can see all messages, send replies, and view visitor details. The panel updates in real-time as new messages arrive.',
        howToUse: [
          'Select a conversation from the list to open it',
          'Scroll up to view previous messages',
          'Type in the message field at the bottom',
          'Press Enter to send, or Shift+Enter for a new line'
        ],
        tips: [
          'Messages from AI are labeled so you know what was automated',
          'You can see when visitors are typing',
          'The visitor info sidebar shows helpful context'
        ],
        relatedTopics: [
          { title: 'Managing Conversations', path: '/documentation/inbox/conversations' },
          { title: 'Visitor Information', path: '/documentation/inbox/visitor-info' }
        ]
      },
      {
        id: 'visitor-info',
        title: 'Visitor Information',
        description: 'Understanding your visitors.',
        whatItDoes: 'The visitor info panel shows details about who you\'re chatting with. This includes their name, email, location, current page, and any other information collected during the conversation.',
        howToUse: [
          'Open a conversation to see visitor details in the sidebar',
          'Click on expandable sections to see more info',
          'Use this context to personalize your responses'
        ],
        tips: [
          'Visitors provide more info when asked naturally in conversation',
          'Enable lead capture to collect contact details automatically',
          'Location is detected automatically based on IP address'
        ],
        relatedTopics: [
          { title: 'Lead Capture', path: '/documentation/ai-support/lead-capture' },
          { title: 'Chat Panel', path: '/documentation/inbox/chat-panel' }
        ]
      }
    ]
  },
  {
    id: 'team',
    title: 'Team',
    description: 'Manage your support team',
    topics: [
      {
        id: 'inviting-agents',
        title: 'Inviting Agents',
        description: 'Add team members to handle conversations.',
        whatItDoes: 'Agents are team members who can respond to customer conversations. When you invite an agent, they receive an email with instructions to join your team and access the conversation dashboard.',
        howToUse: [
          'Go to Team Members from the sidebar',
          'Click the "Invite Agent" button',
          'Enter the agent\'s name and email address',
          'Select which properties they should have access to',
          'Click "Send Invitation" to invite them'
        ],
        tips: [
          'Agents receive an email invitation to join',
          'You can resend invitations if needed',
          'Assign agents to specific properties to organize workload'
        ],
        relatedTopics: [
          { title: 'Property Assignments', path: '/documentation/team/property-assignments' },
          { title: 'AI Personas', path: '/documentation/team/ai-personas' }
        ]
      },
      {
        id: 'property-assignments',
        title: 'Property Assignments',
        description: 'Control which websites agents can access.',
        whatItDoes: 'Property assignments determine which websites an agent can handle conversations for. This helps you organize your team when you have multiple websites or different specializations.',
        howToUse: [
          'Go to Team Members from the sidebar',
          'Find the agent you want to configure',
          'Click the properties dropdown in their row',
          'Check or uncheck properties to assign/unassign',
          'Changes save automatically'
        ],
        tips: [
          'Agents only see conversations from their assigned properties',
          'You can assign multiple agents to the same property',
          'Use this to create specialized teams for different websites'
        ],
        relatedTopics: [
          { title: 'Inviting Agents', path: '/documentation/team/inviting-agents' },
          { title: 'Creating Properties', path: '/documentation/getting-started/properties' }
        ]
      },
      {
        id: 'agent-avatars',
        title: 'Agent Avatars',
        description: 'Personalize agent profiles with photos.',
        whatItDoes: 'Avatars help visitors identify who they\'re chatting with. When an agent responds, their avatar appears next to their messages in the chat widget.',
        howToUse: [
          'Go to Team Members from the sidebar',
          'Click on an agent\'s avatar placeholder',
          'Select an image file from your computer',
          'The avatar uploads and saves automatically'
        ],
        tips: [
          'Use professional headshots for best results',
          'Square images work best (they\'ll be cropped to a circle)',
          'Keep file sizes reasonable for fast loading'
        ],
        relatedTopics: [
          { title: 'Inviting Agents', path: '/documentation/team/inviting-agents' },
          { title: 'AI Personas', path: '/documentation/team/ai-personas' }
        ]
      },
      {
        id: 'ai-personas',
        title: 'AI Personas',
        description: 'Create AI agents based on team members.',
        whatItDoes: 'AI personas are automated agents that can respond to conversations using AI. You can create them from scratch or base them on existing team members to maintain a consistent personality.',
        howToUse: [
          'Go to Team Members and find an agent',
          'Click the menu button and select "Create AI Persona"',
          'The AI persona is created with the agent\'s name and avatar',
          'Configure the persona in AI Support settings'
        ],
        tips: [
          'AI personas can handle conversations 24/7',
          'Link them to real agents for a seamless handoff experience',
          'Customize personality prompts in AI Support'
        ],
        relatedTopics: [
          { title: 'AI Personas Settings', path: '/documentation/ai-support/personas' },
          { title: 'Agent Avatars', path: '/documentation/team/agent-avatars' }
        ]
      }
    ]
  },
  {
    id: 'ai-support',
    title: 'AI Support',
    description: 'Configure automated AI responses',
    topics: [
      {
        id: 'personas',
        title: 'AI Personas',
        description: 'Create and manage AI agents.',
        whatItDoes: 'AI personas are automated agents that can greet visitors and respond to common questions. Each persona can have its own name, avatar, and personality to match your brand.',
        howToUse: [
          'Go to AI Support from the sidebar',
          'Click "Add AI Persona" to create a new one',
          'Enter a name and upload an avatar',
          'Add a personality prompt to define how it should respond',
          'Assign it to properties where it should be active'
        ],
        tips: [
          'Keep personality prompts specific and detailed',
          'Test your AI persona before going live',
          'You can have multiple personas for different purposes'
        ],
        relatedTopics: [
          { title: 'Base Prompt', path: '/documentation/ai-support/base-prompt' },
          { title: 'Behavior Settings', path: '/documentation/ai-support/behavior-settings' }
        ]
      },
      {
        id: 'behavior-settings',
        title: 'Behavior Settings',
        description: 'Control how AI responds to visitors.',
        whatItDoes: 'Behavior settings let you fine-tune how AI interacts with visitors. You can control response timing, typing indicators, and other details to make conversations feel natural.',
        howToUse: [
          'Go to AI Support from the sidebar',
          'Select a property to configure',
          'Scroll to the Behavior Settings section',
          'Adjust timing and response settings',
          'Click Save to apply changes'
        ],
        tips: [
          'Slower response times can feel more natural',
          'Enable smart typing for realistic typing indicators',
          'Test different settings to find what works best'
        ],
        relatedTopics: [
          { title: 'AI Personas', path: '/documentation/ai-support/personas' },
          { title: 'Escalation', path: '/documentation/ai-support/escalation' }
        ]
      },
      {
        id: 'escalation',
        title: 'Escalation Rules',
        description: 'When AI should hand off to humans.',
        whatItDoes: 'Escalation rules determine when AI should stop responding and notify a human agent. This ensures complex or sensitive issues get proper attention from your team.',
        howToUse: [
          'Go to AI Support from the sidebar',
          'Find the Escalation section',
          'Toggle on Auto Escalation',
          'Set the maximum AI messages before escalation',
          'Add keywords that should trigger immediate escalation'
        ],
        tips: [
          'Add keywords for urgent issues like "emergency" or "cancel"',
          'Lower message limits mean faster human handoff',
          'Monitor escalated conversations to improve AI responses'
        ],
        relatedTopics: [
          { title: 'Behavior Settings', path: '/documentation/ai-support/behavior-settings' },
          { title: 'Managing Conversations', path: '/documentation/inbox/conversations' }
        ]
      },
      {
        id: 'lead-capture',
        title: 'Lead Capture',
        description: 'Collect visitor contact information.',
        whatItDoes: 'Lead capture settings determine what contact information to collect from visitors. You can require info before chatting or use natural lead capture to ask during conversation.',
        howToUse: [
          'Go to AI Support from the sidebar',
          'Find the Lead Capture section',
          'Toggle on the fields you want to require',
          'Choose between upfront forms or natural capture',
          'Click Save to apply changes'
        ],
        tips: [
          'Requiring too much info may discourage visitors',
          'Email is the most valuable field to capture',
          'Natural capture feels less intrusive to visitors'
        ],
        relatedTopics: [
          { title: 'Visitor Information', path: '/documentation/inbox/visitor-info' },
          { title: 'Proactive Messages', path: '/documentation/ai-support/proactive-messages' }
        ]
      },
      {
        id: 'proactive-messages',
        title: 'Proactive Messages',
        description: 'Automatically engage visitors.',
        whatItDoes: 'Proactive messages automatically reach out to visitors after they\'ve been on your site for a set time. This can increase engagement and start more conversations.',
        howToUse: [
          'Go to AI Support from the sidebar',
          'Find the Proactive Messages section',
          'Toggle on proactive messaging',
          'Set the delay (seconds before sending)',
          'Write your proactive message',
          'Click Save to apply changes'
        ],
        tips: [
          'Keep messages friendly and helpful, not pushy',
          'Test different delays to find optimal timing',
          'Use questions to encourage responses'
        ],
        relatedTopics: [
          { title: 'Lead Capture', path: '/documentation/ai-support/lead-capture' },
          { title: 'Base Prompt', path: '/documentation/ai-support/base-prompt' }
        ]
      },
      {
        id: 'base-prompt',
        title: 'Base Prompt',
        description: 'Define core AI instructions.',
        whatItDoes: 'The base prompt is the foundation for all AI responses. It tells the AI who it is, what your business does, and how it should communicate with visitors.',
        howToUse: [
          'Go to AI Support from the sidebar',
          'Click "Edit Base Prompt" in the header',
          'Write instructions for your AI agent',
          'Include info about your business and services',
          'Click Save to apply changes'
        ],
        tips: [
          'Be specific about your products/services',
          'Include common FAQs and their answers',
          'Define the tone (friendly, professional, casual)',
          'Update regularly as your business changes'
        ],
        relatedTopics: [
          { title: 'AI Personas', path: '/documentation/ai-support/personas' },
          { title: 'Behavior Settings', path: '/documentation/ai-support/behavior-settings' }
        ]
      }
    ]
  },
  {
    id: 'widget',
    title: 'Widget',
    description: 'Customize and embed your chat widget',
    topics: [
      {
        id: 'customization',
        title: 'Widget Customization',
        description: 'Make the widget match your brand.',
        whatItDoes: 'Customize how your chat widget looks on your website. You can change colors, size, style, and greeting messages to match your brand identity.',
        howToUse: [
          'Go to Widget from the sidebar',
          'Select the property to customize',
          'Choose a style preset or customize colors',
          'Adjust size and border radius',
          'Preview changes in real-time'
        ],
        tips: [
          'Use your brand colors for consistency',
          'Test on both mobile and desktop views',
          'Keep the widget visible but not intrusive'
        ],
        relatedTopics: [
          { title: 'Colors & Branding', path: '/documentation/widget/colors-branding' },
          { title: 'Embed Code', path: '/documentation/widget/embed-code' }
        ]
      },
      {
        id: 'colors-branding',
        title: 'Colors & Branding',
        description: 'Match widget colors to your brand.',
        whatItDoes: 'Set custom colors for your chat widget. You can auto-extract colors from your website or manually set them to match your brand guidelines.',
        howToUse: [
          'Go to Widget from the sidebar',
          'Click "Auto-extract from website" to pull brand colors',
          'Or manually set primary, text, and border colors',
          'Use the color pickers to fine-tune',
          'Preview changes before saving'
        ],
        tips: [
          'Ensure good contrast for readability',
          'Test colors on different backgrounds',
          'Consider both light and dark themes'
        ],
        relatedTopics: [
          { title: 'Widget Customization', path: '/documentation/widget/customization' },
          { title: 'Style Presets', path: '/documentation/widget/style-presets' }
        ]
      },
      {
        id: 'style-presets',
        title: 'Style Presets',
        description: 'Quick-start with pre-made styles.',
        whatItDoes: 'Style presets are pre-configured widget designs that you can apply instantly. Choose from modern, classic, minimal, bold, or soft styles.',
        howToUse: [
          'Go to Widget from the sidebar',
          'Click on a style preset card',
          'The widget preview updates immediately',
          'Customize further if needed',
          'Save when you\'re happy with the look'
        ],
        tips: [
          'Presets are a great starting point',
          'You can customize any preset further',
          'Match the style to your website design'
        ],
        relatedTopics: [
          { title: 'Colors & Branding', path: '/documentation/widget/colors-branding' },
          { title: 'Widget Customization', path: '/documentation/widget/customization' }
        ]
      },
      {
        id: 'embed-code',
        title: 'Embed Code',
        description: 'Add the widget to your website.',
        whatItDoes: 'The embed code is a small snippet of JavaScript that you add to your website to display the chat widget. Once added, the widget appears automatically on all pages.',
        howToUse: [
          'Go to Widget from the sidebar',
          'Switch to the "Embed Code" tab',
          'Copy the code snippet',
          'Paste it before the closing </body> tag on your website',
          'Save and publish your website changes'
        ],
        tips: [
          'Add the code to your website template for all pages',
          'Test on a staging site before going live',
          'The widget loads asynchronously and won\'t slow your site'
        ],
        relatedTopics: [
          { title: 'Widget Customization', path: '/documentation/widget/customization' },
          { title: 'Creating Properties', path: '/documentation/getting-started/properties' }
        ]
      }
    ]
  },
  {
    id: 'integrations',
    title: 'Integrations',
    description: 'Connect with other tools',
    topics: [
      {
        id: 'salesforce',
        title: 'Salesforce',
        description: 'Export leads to Salesforce CRM.',
        whatItDoes: 'Connect Scaled Bot to your Salesforce account to automatically export visitor information as leads. Map conversation data to Salesforce fields for seamless CRM integration.',
        howToUse: [
          'Go to Salesforce from the sidebar',
          'Enter your Salesforce Client ID and Secret',
          'Click Connect to authorize the integration',
          'Configure field mappings',
          'Enable auto-export rules'
        ],
        tips: [
          'Create a Connected App in Salesforce first',
          'Test with manual exports before enabling auto-export',
          'Map all relevant fields for complete lead data'
        ],
        relatedTopics: [
          { title: 'Lead Capture', path: '/documentation/ai-support/lead-capture' },
          { title: 'Visitor Information', path: '/documentation/inbox/visitor-info' }
        ]
      },
      {
        id: 'slack',
        title: 'Slack',
        description: 'Get notifications in Slack.',
        whatItDoes: 'Connect Slack to receive notifications about new conversations and escalations. Your team can stay informed without constantly checking the dashboard.',
        howToUse: [
          'Go to Notifications from the sidebar',
          'Click "Connect to Slack"',
          'Authorize Scaled Bot in Slack',
          'Choose which channel to post notifications',
          'Configure notification triggers'
        ],
        tips: [
          'Use a dedicated channel for chat notifications',
          'Enable escalation alerts for urgent issues',
          'Test notifications after connecting'
        ],
        relatedTopics: [
          { title: 'Email Notifications', path: '/documentation/integrations/email' },
          { title: 'Escalation Rules', path: '/documentation/ai-support/escalation' }
        ]
      },
      {
        id: 'email',
        title: 'Email Notifications',
        description: 'Get alerts via email.',
        whatItDoes: 'Configure email notifications to alert team members about new conversations or escalations. Add multiple email addresses to notify different people.',
        howToUse: [
          'Go to Notifications from the sidebar',
          'Switch to the Email tab',
          'Add email addresses to notify',
          'Toggle which events trigger notifications',
          'Click Save to apply'
        ],
        tips: [
          'Add backup email addresses for coverage',
          'Use team distribution lists for group notifications',
          'Don\'t over-notify - focus on important events'
        ],
        relatedTopics: [
          { title: 'Slack Notifications', path: '/documentation/integrations/slack' },
          { title: 'Escalation Rules', path: '/documentation/ai-support/escalation' }
        ]
      }
    ]
  },
  {
    id: 'analytics',
    title: 'Analytics',
    description: 'Track performance and insights',
    topics: [
      {
        id: 'overview',
        title: 'Analytics Overview',
        description: 'Understanding your chat performance.',
        whatItDoes: 'Analytics show you how your chat widget is performing. Track page views, conversation counts, and visitor behavior to understand engagement.',
        howToUse: [
          'Go to Analytics from the sidebar',
          'Select a property to view its data',
          'Review charts and metrics',
          'Use date ranges to compare periods',
          'Export data if needed'
        ],
        tips: [
          'Check analytics regularly to spot trends',
          'Compare weekday vs weekend performance',
          'Use insights to improve AI responses'
        ],
        relatedTopics: [
          { title: 'Managing Conversations', path: '/documentation/inbox/conversations' },
          { title: 'Creating Properties', path: '/documentation/getting-started/properties' }
        ]
      }
    ]
  }
];

export function getSection(sectionId: string): DocSection | undefined {
  return documentationSections.find(s => s.id === sectionId);
}

export function getTopic(sectionId: string, topicId: string): DocTopic | undefined {
  const section = getSection(sectionId);
  return section?.topics.find(t => t.id === topicId);
}

export function getAllTopics(): { section: DocSection; topic: DocTopic }[] {
  const all: { section: DocSection; topic: DocTopic }[] = [];
  for (const section of documentationSections) {
    for (const topic of section.topics) {
      all.push({ section, topic });
    }
  }
  return all;
}
