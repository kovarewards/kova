import PostHog from 'posthog-react-native';

export const posthog = new PostHog(process.env.EXPO_PUBLIC_POSTHOG_KEY!, {
  host: 'https://us.i.posthog.com',
});

// The four numbers reviewed every week — nothing else matters yet.
export const track = {
  recViewed: (category: string, source: 'gps' | 'manual' | 'widget') =>
    posthog.capture('rec_viewed', { category, source }),
  recUsed: (category: string, valueCaptured: number) =>
    posthog.capture('rec_used', { category, value_captured: valueCaptured }),
  trialStarted: () => posthog.capture('trial_started'),
  cardApplicationStarted: (cardName: string) =>
    posthog.capture('card_application_started', { card_name: cardName }),
};
