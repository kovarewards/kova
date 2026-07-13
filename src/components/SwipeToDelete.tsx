import { ReactNode } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { Text } from './AppText';
import { dark } from '../constants/theme';

type Props = { onDelete: () => void; children: ReactNode };

export function SwipeToDelete({ onDelete, children }: Props) {
  return (
    <Swipeable
      overshootRight={false}
      renderRightActions={() => (
        <TouchableOpacity style={styles.action} onPress={onDelete}>
          <Text style={styles.actionText}>Delete</Text>
        </TouchableOpacity>
      )}
    >
      {children}
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  action: {
    backgroundColor: dark.red, justifyContent: 'center', alignItems: 'center',
    width: 84, borderRadius: 18, height: '100%',
  },
  actionText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
});
