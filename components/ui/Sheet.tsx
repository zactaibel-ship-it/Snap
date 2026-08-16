import { useEffect } from 'react';
import { Modal, Pressable, View, type ModalProps } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface SheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  animationType?: ModalProps['animationType'];
}

export function Sheet({ visible, onClose, children }: SheetProps) {
  const insets = useSafeAreaInsets();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(visible ? 1 : 0, { duration: 220 });
  }, [visible, progress]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: progress.value * 0.4,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - progress.value) * 40 }],
    opacity: progress.value,
  }));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 justify-end">
        <Pressable className="absolute inset-0" onPress={onClose}>
          <Animated.View className="absolute inset-0 bg-black" style={backdropStyle} />
        </Pressable>
        <Animated.View
          className="rounded-t-3xl bg-surface px-5 pt-3"
          style={[{ paddingBottom: insets.bottom + 16 }, sheetStyle]}
        >
          <View className="mb-4 h-1.5 w-10 self-center rounded-full bg-border" />
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}
