import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowLeft, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useConversations } from '@/hooks/useConversations';
import { useAuth } from '@/hooks/useAuth';
import scaledBotLogo from '@/assets/scaled-bot-logo.png';
import { cn } from '@/lib/utils';

type OnboardingStep = 1 | 2 | 3 | 4 | 'complete';

interface OnboardingData {
  websiteUrl: string;
  greeting: string;
  collectEmail: boolean;
  collectName: boolean;
  aiTone: 'friendly' | 'professional' | 'caring' | null;
}

const defaultGreeting = "Hi there! How can we help you today?";

const aiTonePrompts = {
  friendly: "You are a warm, conversational assistant. Use casual language, emojis occasionally, and make visitors feel like they're chatting with a helpful friend.",
  professional: "You are a professional, business-like assistant. Use clear, concise language and maintain a polished, courteous tone throughout conversations.",
  caring: "You are an empathetic, supportive assistant. Listen actively, acknowledge feelings, and respond with warmth and understanding.",
};

const Onboarding = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { createProperty, properties, loading: dataLoading } = useConversations();
  
  const [step, setStep] = useState<OnboardingStep>(1);
  const [isCreating, setIsCreating] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    websiteUrl: '',
    greeting: defaultGreeting,
    collectEmail: true,
    collectName: false,
    aiTone: null,
  });

  const extractDomain = (url: string) => {
    try {
      const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
      return parsed.hostname.replace('www.', '');
    } catch {
      return url.replace('www.', '').split('/')[0];
    }
  };

  const handleComplete = async () => {
    setIsCreating(true);
    const domain = extractDomain(data.websiteUrl);
    
    const property = await createProperty(domain, domain, {
      greeting: data.greeting,
      collectEmail: data.collectEmail,
      collectName: data.collectName,
      basePrompt: data.aiTone ? aiTonePrompts[data.aiTone] : undefined,
    });
    
    setIsCreating(false);

    if (property) {
      setStep('complete');
    }
  };

  const nextStep = () => {
    if (step === 4) {
      handleComplete();
    } else if (typeof step === 'number') {
      setStep((step + 1) as OnboardingStep);
    }
  };

  const prevStep = () => {
    if (typeof step === 'number' && step > 1) {
      setStep((step - 1) as OnboardingStep);
    }
  };

  const skipToEnd = () => {
    handleComplete();
  };

  useEffect(() => {
    if (!authLoading && user && !dataLoading && properties.length > 0) {
      navigate('/dashboard', { replace: true });
    }
  }, [authLoading, user, dataLoading, properties.length, navigate]);

  if (authLoading || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    navigate('/auth');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-subtle flex flex-col">
      {/* Header */}
      <div className="p-6">
        <div className="flex items-center gap-2">
          <img src={scaledBotLogo} alt="Scaled Bot" className="h-8 w-8 rounded-lg" />
          <span className="font-semibold text-foreground">Scaled Bot</span>
        </div>
      </div>

      {/* Progress dots */}
      {step !== 'complete' && (
        <div className="flex justify-center gap-2 py-4">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={cn(
                "w-2 h-2 rounded-full transition-all duration-300",
                s === step ? "bg-primary w-6" : s < step ? "bg-primary" : "bg-muted-foreground/30"
              )}
            />
          ))}
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-4 pb-20">
        <div className="w-full max-w-md">
          {/* Step 1: Website URL */}
          {step === 1 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="text-center space-y-2">
                <h1 className="text-2xl font-semibold text-foreground">What's your website?</h1>
                <p className="text-muted-foreground">We'll set up your chat widget for this domain</p>
              </div>
              
              <Input
                type="text"
                placeholder="yourwebsite.com"
                value={data.websiteUrl}
                onChange={(e) => setData({ ...data, websiteUrl: e.target.value })}
                className="h-12 text-center text-lg"
                autoFocus
              />

              <div className="space-y-3">
                <Button
                  onClick={nextStep}
                  disabled={!data.websiteUrl.trim()}
                  className="w-full h-12"
                >
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Welcome Message */}
          {step === 2 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="text-center space-y-2">
                <h1 className="text-2xl font-semibold text-foreground">How should your bot greet visitors?</h1>
                <p className="text-muted-foreground">This is the first message they'll see</p>
              </div>
              
              <Textarea
                value={data.greeting}
                onChange={(e) => setData({ ...data, greeting: e.target.value })}
                className="min-h-[100px] text-base"
                placeholder="Hi there! How can we help you today?"
              />

              <div className="flex flex-wrap gap-2 justify-center">
                {[
                  { label: 'Friendly', value: "Hi there! 👋 How can I help you today?" },
                  { label: 'Professional', value: "Welcome. How may I assist you?" },
                  { label: 'Welcoming', value: "Hello! We're glad you're here. What can we help with?" },
                ].map((preset) => (
                  <Button
                    key={preset.label}
                    variant="outline"
                    size="sm"
                    onClick={() => setData({ ...data, greeting: preset.value })}
                    className="text-xs"
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>

              <div className="space-y-3">
                <Button onClick={nextStep} className="w-full h-12">
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <button
                  onClick={nextStep}
                  className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Skip
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Lead Capture */}
          {step === 3 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="text-center space-y-2">
                <h1 className="text-2xl font-semibold text-foreground">Collect visitor info before chat?</h1>
                <p className="text-muted-foreground">Ask visitors for their details upfront</p>
              </div>
              
              <div className="space-y-3">
                <ToggleCard
                  title="Ask for email"
                  description="Recommended for follow-ups"
                  checked={data.collectEmail}
                  onChange={(checked) => setData({ ...data, collectEmail: checked })}
                  recommended
                />
                <ToggleCard
                  title="Ask for name"
                  description="Personalize the conversation"
                  checked={data.collectName}
                  onChange={(checked) => setData({ ...data, collectName: checked })}
                />
              </div>

              <div className="space-y-3">
                <Button onClick={nextStep} className="w-full h-12">
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <button
                  onClick={() => {
                    setData({ ...data, collectEmail: false, collectName: false });
                    nextStep();
                  }}
                  className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Skip, don't collect info
                </button>
              </div>
            </div>
          )}

          {/* Step 4: AI Tone */}
          {step === 4 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="text-center space-y-2">
                <h1 className="text-2xl font-semibold text-foreground">How should your AI sound?</h1>
                <p className="text-muted-foreground">Pick a personality for your assistant</p>
              </div>
              
              <div className="space-y-3">
                {[
                  { value: 'friendly' as const, title: 'Friendly', description: 'Warm and conversational' },
                  { value: 'professional' as const, title: 'Professional', description: 'Clear and business-like' },
                  { value: 'caring' as const, title: 'Caring', description: 'Empathetic and supportive' },
                ].map((tone) => (
                  <ToneCard
                    key={tone.value}
                    title={tone.title}
                    description={tone.description}
                    selected={data.aiTone === tone.value}
                    onClick={() => setData({ ...data, aiTone: tone.value })}
                  />
                ))}
              </div>

              <div className="space-y-3">
                <Button onClick={nextStep} disabled={isCreating} className="w-full h-12">
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      Complete Setup
                      <Check className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
                <button
                  onClick={skipToEnd}
                  disabled={isCreating}
                  className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                >
                  Skip, use default
                </button>
              </div>
            </div>
          )}

          {/* Completion */}
          {step === 'complete' && (
            <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Check className="h-8 w-8 text-primary" />
              </div>
              
              <div className="space-y-2">
                <h1 className="text-2xl font-semibold text-foreground">You're all set!</h1>
                <p className="text-muted-foreground">Your chat widget is ready to go</p>
              </div>

              <Button onClick={() => navigate('/dashboard')} className="w-full h-12">
                Go to Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Back button */}
      {typeof step === 'number' && step > 1 && (
        <div className="fixed bottom-6 left-6">
          <Button variant="ghost" size="sm" onClick={prevStep}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>
      )}
    </div>
  );
};

// Toggle card component
const ToggleCard = ({
  title,
  description,
  checked,
  onChange,
  recommended,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  recommended?: boolean;
}) => (
  <button
    onClick={() => onChange(!checked)}
    className={cn(
      "w-full p-4 rounded-xl border-2 text-left transition-all",
      checked
        ? "border-primary bg-primary/5"
        : "border-border hover:border-muted-foreground/30"
    )}
  >
    <div className="flex items-center justify-between">
      <div>
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">{title}</span>
          {recommended && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
              Recommended
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
      </div>
      <div
        className={cn(
          "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
          checked ? "border-primary bg-primary" : "border-muted-foreground/30"
        )}
      >
        {checked && <Check className="h-3 w-3 text-primary-foreground" />}
      </div>
    </div>
  </button>
);

// Tone selection card
const ToneCard = ({
  title,
  description,
  selected,
  onClick,
}: {
  title: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={cn(
      "w-full p-4 rounded-xl border-2 text-left transition-all",
      selected
        ? "border-primary bg-primary/5"
        : "border-border hover:border-muted-foreground/30"
    )}
  >
    <div className="flex items-center justify-between">
      <div>
        <span className="font-medium text-foreground">{title}</span>
        <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
      </div>
      <div
        className={cn(
          "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
          selected ? "border-primary bg-primary" : "border-muted-foreground/30"
        )}
      >
        {selected && <Check className="h-3 w-3 text-primary-foreground" />}
      </div>
    </div>
  </button>
);

export default Onboarding;
