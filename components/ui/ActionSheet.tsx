import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Sheet } from './Sheet';

export interface ActionSheetOption {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  destructive?: boolean;
  onPress: () => void;
}

interface ActionSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  options: ActionSheetOption[];
}

export function ActionSheet({ visible, onClose, title, options }: ActionSheetProps) {
  const handlePress = (option: ActionSheetOption) => {
    onClose();
    option.onPress();
  };

  return (
    <Sheet visible={visible} onClose={onClose}>
      <View className="gap-1 pb-2">
        {title ? <Text className="mb-2 px-1 text-sm font-medium text-text-muted">{title}</Text> : null}
        {options.map((option) => (
          <Pressable
            key={option.label}
            onPress={() => handlePress(option)}
            className="flex-row items-center gap-3 rounded-2xl px-3 py-3.5 active:bg-background"
          >
            {option.icon ? (
              <Ionicons name={option.icon} size={20} color={option.destructive ? '#EF4444' : '#1C1C1E'} />
            ) : null}
            <Text className={`text-base font-medium ${option.destructive ? 'text-error' : 'text-text'}`}>
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </Sheet>
  );
}
