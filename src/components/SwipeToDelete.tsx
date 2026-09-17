import { ReactNode, useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { Text } from './AppText';
import { useTheme, type ThemeTokens } from '../lib/theme';

type Props = { onDelete: () => void; children: ReactNode };

// The swipe-to-reveal gesture is invisible to VoiceOver/TalkBack — those tools
// use swipe gestures for their own navigation, so the reveal never fires.
// accessibilityActions gives screen-reader users the same "Delete" action
// through the standard actions rotor instead.
export function SwipeToDelete({ onDelete, children }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <Swipeable
      overshootRight={false}
      renderRightActions={() => (
        <TouchableOpacity
          style={styles.action}
          onPress={onDelete}
          accessibilityRole="button"
          accessibilityLabel="Delete"
        >
          <Text style={styles.actionText}>Delete</Text>
        </TouchableOpacity>
      )}
    >
      <View
        accessibilityActions={[{ name: 'delete', label: 'Delete' }]}
        onAccessibilityAction={(e) => {
          if (e.nativeEvent.actionName === 'delete') onDelete();
        }}
      >
        {children}
      </View>
    </Swipeable>
  );
}

const makeStyles = (dark: ThemeTokens) => StyleSheet.create({
  action: {
    backgroundColor: dark.red, justifyContent: 'center', alignItems: 'center',
    width: 84, borderRadius: 18, height: '100%',
  },
  actionText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
});
