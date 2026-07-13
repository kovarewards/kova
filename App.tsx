import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View } from 'react-native';
import {
  useFonts, Inter_400Regular, Inter_600SemiBold,
  Inter_700Bold, Inter_800ExtraBold, Inter_900Black,
} from '@expo-google-fonts/inter';
import { HomeScreen } from './src/screens/Home';
import { OnboardingScreen } from './src/screens/Onboarding';
import { AuthScreen } from './src/screens/Auth';
import { RecommendationScreen, RecommendationTarget } from './src/screens/Recommendation';
import { supabase } from './src/lib/supabase';
import { dark } from './src/constants/theme';

type Screen = 'loading' | 'auth' | 'onboarding' | 'home' | 'recommendation';

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold, Inter_900Black,
  });
  const [screen, setScreen] = useState<Screen>('loading');
  const [target, setTarget] = useState<RecommendationTarget | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setScreen((prev) => (prev === 'loading' ? (data.session ? 'onboarding' : 'auth') : prev));
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setScreen((prev) => {
        if (!session) return 'auth';
        if (prev === 'loading' || prev === 'auth') return 'onboarding';
        return prev;
      });
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: dark.bg }} />;
  }

  return (
    <SafeAreaProvider>
      {screen === 'loading' && <View style={{ flex: 1, backgroundColor: dark.bg }} />}
      {screen === 'auth' && <AuthScreen />}
      {screen === 'onboarding' && <OnboardingScreen onContinue={() => setScreen('home')} />}
      {screen === 'home' && (
        <HomeScreen
          onOpenRecommendation={(t) => {
            setTarget(t);
            setScreen('recommendation');
          }}
        />
      )}
      {screen === 'recommendation' && target && (
        <RecommendationScreen
          key={`${target.name}-${target.category}`}
          target={target}
          onBack={() => setScreen('home')}
        />
      )}
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}
