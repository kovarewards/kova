import { useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View } from 'react-native';
import {
  useFonts, Inter_400Regular, Inter_600SemiBold,
  Inter_700Bold, Inter_800ExtraBold, Inter_900Black,
} from '@expo-google-fonts/inter';
import { HomeScreen } from './src/screens/Home';
import { OnboardingScreen } from './src/screens/Onboarding';
import { AuthScreen } from './src/screens/Auth';
import { RecommendationScreen, RecommendationTarget } from './src/screens/Recommendation';
import { WalletScreen } from './src/screens/Wallet';
import { AlertsScreen } from './src/screens/Alerts';
import { LedgerScreen } from './src/screens/Ledger';
import { ProfileScreen } from './src/screens/Profile';
import { TabKey } from './src/components/TabBar';
import { supabase } from './src/lib/supabase';
import { dark } from './src/constants/theme';

type Screen =
  | 'loading' | 'auth' | 'onboarding' | 'home' | 'recommendation'
  | 'wallet' | 'alerts' | 'ledger' | 'profile';

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold, Inter_900Black,
  });
  const [screen, setScreen] = useState<Screen>('loading');
  const [target, setTarget] = useState<RecommendationTarget | null>(null);
  const [onboardingReturnTo, setOnboardingReturnTo] = useState<'home' | 'wallet'>('home');
  const screenRef = useRef<Screen>('loading');
  useEffect(() => {
    screenRef.current = screen;
  }, [screen]);

  useEffect(() => {
    // Existing users with cards already in their wallet land on Home;
    // only someone with zero cards (a brand-new signup) needs Onboarding.
    async function routeForSession(session: Session) {
      const { count } = await supabase
        .from('user_cards')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', session.user.id);
      setScreen((count ?? 0) > 0 ? 'home' : 'onboarding');
    }

    supabase.auth.getSession().then(({ data }) => {
      if (screenRef.current !== 'loading') return;
      if (data.session) routeForSession(data.session);
      else setScreen('auth');
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setScreen('auth');
        return;
      }
      if (screenRef.current === 'loading' || screenRef.current === 'auth') {
        routeForSession(session);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!fontsLoaded) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={{ flex: 1, backgroundColor: dark.bg }} />
      </GestureHandlerRootView>
    );
  }

  function handleNavigateTab(tab: TabKey) {
    if (tab === 'home') setScreen('home');
    else if (tab === 'wallet') setScreen('wallet');
    else if (tab === 'alerts') setScreen('alerts');
    else if (tab === 'ledger') setScreen('ledger');
  }

  function handleAddCard(returnTo: 'home' | 'wallet') {
    setOnboardingReturnTo(returnTo);
    setScreen('onboarding');
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        {screen === 'loading' && <View style={{ flex: 1, backgroundColor: dark.bg }} />}
        {screen === 'auth' && <AuthScreen />}
        {screen === 'onboarding' && (
          <OnboardingScreen onContinue={() => setScreen(onboardingReturnTo)} />
        )}
        {screen === 'home' && (
          <HomeScreen
            onOpenRecommendation={(t) => {
              setTarget(t);
              setScreen('recommendation');
            }}
            onAddCard={() => handleAddCard('home')}
            onNavigateTab={handleNavigateTab}
            onOpenProfile={() => setScreen('profile')}
          />
        )}
        {screen === 'profile' && <ProfileScreen onBack={() => setScreen('home')} />}
        {screen === 'recommendation' && target && (
          <RecommendationScreen
            key={`${target.name}-${target.category}`}
            target={target}
            onBack={() => setScreen('home')}
            onNavigateTab={handleNavigateTab}
          />
        )}
        {screen === 'wallet' && (
          <WalletScreen onAddCard={() => handleAddCard('wallet')} onNavigateTab={handleNavigateTab} />
        )}
        {screen === 'alerts' && <AlertsScreen onNavigateTab={handleNavigateTab} />}
        {screen === 'ledger' && <LedgerScreen onNavigateTab={handleNavigateTab} />}
        <StatusBar style="light" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
