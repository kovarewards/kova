import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View } from 'react-native';
import { HomeScreen } from './src/screens/Home';
import { OnboardingScreen } from './src/screens/Onboarding';
import { AuthScreen } from './src/screens/Auth';
import { supabase } from './src/lib/supabase';
import { dark } from './src/constants/theme';

type Screen = 'loading' | 'auth' | 'onboarding' | 'home';

export default function App() {
  const [screen, setScreen] = useState<Screen>('loading');

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

  return (
    <SafeAreaProvider>
      {screen === 'loading' && <View style={{ flex: 1, backgroundColor: dark.bg }} />}
      {screen === 'auth' && <AuthScreen />}
      {screen === 'onboarding' && <OnboardingScreen onContinue={() => setScreen('home')} />}
      {screen === 'home' && <HomeScreen />}
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}
