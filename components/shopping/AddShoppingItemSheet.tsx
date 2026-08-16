import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Sheet } from '@/components/ui/Sheet';
import { AISLE_GROUPS, getAisleForGroup, type AisleGroup } from '@/constants/aisleGroups';
import { useAddManualShoppingItem } from '@/hooks/useShoppingList';

interface AddShoppingItemSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function AddShoppingItemSheet({ visible, onClose }: AddShoppingItemSheetProps) {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('');
  const [aisleGroup, setAisleGroup] = useState<AisleGroup>('Other');
  const addItem = useAddManualShoppingItem();

  const handleClose = () => {
    setName('');
    setQuantity('');
    setUnit('');
    setAisleGroup('Other');
    onClose();
  };

  const handleAdd = async () => {
    if (!name.trim()) return;
    await addItem.mutateAsync({
      name: name.trim(),
      quantity: quantity.trim() ? Number(quantity) : null,
      unit: unit.trim() || null,
      aisle: getAisleForGroup(aisleGroup),
    });
    handleClose();
  };

  return (
    <Sheet visible={visible} onClose={handleClose}>
      <View className="gap-4 pb-2">
        <Text className="text-xl font-bold text-text">Add item</Text>

        <Input label="Ingredient" value={name} onChangeText={setName} placeholder="e.g. Olive oil" />

        <View className="flex-row gap-3">
          <View className="flex-1">
            <Input label="Qty" value={quantity} onChangeText={setQuantity} keyboardType="decimal-pad" />
          </View>
          <View className="flex-1">
            <Input label="Unit" value={unit} onChangeText={setUnit} placeholder="g, ml, tbsp..." />
          </View>
        </View>

        <View className="gap-2">
          <Text className="text-sm font-medium text-text">Aisle</Text>
          <View className="flex-row flex-wrap gap-2">
            {AISLE_GROUPS.map((group) => {
              const selected = aisleGroup === group;
              return (
                <Pressable
                  key={group}
                  onPress={() => setAisleGroup(group)}
                  accessibilityRole="button"
                  accessibilityLabel={`${group} aisle`}
                  accessibilityState={{ selected }}
                  className={`rounded-2xl border px-3 py-2 ${
                    selected ? 'border-primary bg-primary' : 'border-border bg-surface'
                  }`}
                >
                  <Text className={`text-xs font-medium ${selected ? 'text-white' : 'text-text'}`}>{group}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Button label="Add item" onPress={handleAdd} disabled={!name.trim()} loading={addItem.isPending} />
      </View>
    </Sheet>
  );
}
