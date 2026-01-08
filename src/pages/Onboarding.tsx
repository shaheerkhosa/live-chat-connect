import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, ArrowLeft, Loader2, Check, Upload, User } from 'lucide-react';
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
  greetingPreset: string | null; // tracks which preset is selected, null = custom
  collectEmail: boolean;
  collectName: boolean;
  collectPhone: boolean;
  aiTone: 'friendly' | 'hopeful' | 'caring' | null;
  agentName: string;
  agentAvatarUrl: string | null;
}

const greetingPresets = [
  { label: 'Hopeful', value: "You've taken a brave first step. We're here to help. How can we support you today?" },
  { label: 'Caring', value: "We're so glad you reached out. You're not alone in this. How can we help?" },
  { label: 'Encouraging', value: "Recovery is possible, and it starts with a conversation. What's on your mind?" },
];

const defaultGreeting = greetingPresets[0].value;

const aiTonePrompts = {
  friendly: `You are a warm, conversational support assistant for a recovery center. Your job is to make visitors feel comfortable and gently guide them toward getting help.

Keep your responses natural and human. Write like you talk. Use contractions, vary your sentence lengths, and don't be afraid of the occasional short sentence. Or a fragment.

Some things to avoid:
- Never use em dashes or semicolons
- Don't start responses with "I" too often
- Skip the corporate-speak and jargon
- No bullet points unless someone asks for a list
- Avoid phrases like "I understand" or "I hear you" repeatedly

Be real. Be warm. Sometimes that means being brief. Other times you might share a bit more. Just... be human about it.`,

  hopeful: `You are an encouraging, hope-focused support assistant for a recovery center. Your role is to remind visitors that recovery is possible and celebrate the courage it takes to reach out.

Write like a real person. Mix up your sentence lengths. Some short. Others might run a little longer when you're making an important point about hope and healing.

Things to avoid:
- Em dashes and semicolons feel too formal
- Don't overuse "I" at the start of sentences  
- Skip the clinical language
- No bullet lists in regular conversation
- Vary how you show empathy, don't repeat the same phrases

Focus on hope without being cheesy about it. Acknowledge the hard stuff too. Recovery isn't easy, but reaching out? That's huge. Let people know that.`,

  caring: `You are an empathetic, supportive assistant for a recovery center. Your job is to listen, acknowledge feelings, and respond with genuine warmth.

Sound human. Real humans don't always speak in perfect sentences. They use contractions. Short thoughts sometimes. Longer ones when something matters.

Avoid these:
- Em dashes and semicolons feel stiff
- Starting too many sentences with "I"
- Therapy-speak and buzzwords
- Lists when someone just needs to be heard
- Saying "I understand" over and over

Be present. Sometimes the best response is simple. Other times you might reflect back what someone shared. Just don't sound like a chatbot, you know?`,
};

const Onboarding = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { createProperty, properties, loading: dataLoading } = useConversations();
  
  const [step, setStep] = useState<OnboardingStep>(1);
  const [isCreating, setIsCreating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [data, setData] = useState<OnboardingData>({
    websiteUrl: '',
    greeting: defaultGreeting,
    greetingPreset: 'Hopeful',
    collectEmail: true,
    collectName: false,
    collectPhone: false,
    aiTone: null,
    agentName: '',
    agentAvatarUrl: null,
  });

  const isValidDomain = (input: string) => {
    const trimmed = input.trim();
    if (!trimmed) return false;
    // Basic domain pattern: word.word (with optional subdomains)
    const domainRegex = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    // Remove protocol and path for validation
    const cleaned = trimmed.replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '');
    return domainRegex.test(cleaned);
  };

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
      collectPhone: data.collectPhone,
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

  // Allow skipping redirect if ?dev=1 is in URL (for testing)
  const [searchParams] = useSearchParams();
  const isDevMode = searchParams.get('dev') === '1';

  useEffect(() => {
    if (!isDevMode && !authLoading && user && !dataLoading && properties.length > 0) {
      navigate('/dashboard', { replace: true });
    }
  }, [authLoading, user, dataLoading, properties.length, navigate, isDevMode]);

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
              
              <div className="space-y-2">
                <Input
                  type="text"
                  placeholder="yourwebsite.com"
                  value={data.websiteUrl}
                  onChange={(e) => setData({ ...data, websiteUrl: e.target.value })}
                  className={cn(
                    "h-12 text-center text-lg",
                    data.websiteUrl.trim() && !isValidDomain(data.websiteUrl) && "border-destructive focus-visible:ring-destructive"
                  )}
                  autoFocus
                />
                {data.websiteUrl.trim() && !isValidDomain(data.websiteUrl) && (
                  <p className="text-sm text-destructive text-center">Please enter a valid domain (e.g., example.com)</p>
                )}
              </div>

              <div className="space-y-3">
                <Button
                  onClick={nextStep}
                  disabled={!isValidDomain(data.websiteUrl)}
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
                onChange={(e) => {
                  const newValue = e.target.value;
                  const matchingPreset = greetingPresets.find(p => p.value === newValue);
                  setData({ 
                    ...data, 
                    greeting: newValue,
                    greetingPreset: matchingPreset ? matchingPreset.label : null
                  });
                }}
                className="min-h-[100px] text-base"
                placeholder="Hi there! How can we help you today?"
              />

              <div className="flex flex-wrap gap-2 justify-center">
                {[...greetingPresets, ...(data.greetingPreset === null ? [{ label: 'Custom', value: data.greeting }] : [])].map((preset) => (
                  <Button
                    key={preset.label}
                    variant={data.greetingPreset === preset.label || (preset.label === 'Custom' && data.greetingPreset === null) ? "default" : "outline"}
                    size="sm"
                    onClick={() => setData({ ...data, greeting: preset.value, greetingPreset: preset.label === 'Custom' ? null : preset.label })}
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
                <ToggleCard
                  title="Ask for phone"
                  description="Enable direct outreach"
                  checked={data.collectPhone}
                  onChange={(checked) => setData({ ...data, collectPhone: checked })}
                />
              </div>

              <div className="space-y-3">
                <Button onClick={nextStep} className="w-full h-12">
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <button
                  onClick={() => {
                    setData({ ...data, collectEmail: false, collectName: false, collectPhone: false });
                    nextStep();
                  }}
                  className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Skip, don't collect info
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Create Your AI Persona */}
          {step === 4 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="text-center space-y-2">
                <h1 className="text-2xl font-semibold text-foreground">Create your AI persona</h1>
                <p className="text-muted-foreground">Give your assistant a name and personality</p>
              </div>

              {/* Avatar upload */}
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "w-20 h-20 rounded-full border-2 border-dashed flex items-center justify-center transition-all overflow-hidden",
                    data.agentAvatarUrl ? "border-primary" : "border-muted-foreground/30 hover:border-muted-foreground/50"
                  )}
                >
                  {data.agentAvatarUrl ? (
                    <img src={data.agentAvatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center">
                      <User className="h-6 w-6 mx-auto text-muted-foreground" />
                      <span className="text-xs text-muted-foreground mt-1 block">Add photo</span>
                    </div>
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const url = URL.createObjectURL(file);
                      setData({ ...data, agentAvatarUrl: url });
                    }
                  }}
                />
              </div>

              {/* Agent name */}
              <Input
                type="text"
                placeholder="Assistant name (e.g., Hope, Alex)"
                value={data.agentName}
                onChange={(e) => setData({ ...data, agentName: e.target.value })}
                className="h-12 text-center"
              />

              {/* Personality selection */}
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground text-center">Choose a personality</p>
                <div className="space-y-3">
                  {[
                    { value: 'friendly' as const, title: 'Friendly', description: 'Warm and conversational' },
                    { value: 'hopeful' as const, title: 'Hopeful', description: 'Encouraging and uplifting' },
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
                  Skip, use defaults
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
