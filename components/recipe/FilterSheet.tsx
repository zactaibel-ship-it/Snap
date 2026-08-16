import { Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { DIETARY_TAGS, formatTagLabel } from '@/constants/recipeTags';
import { DEFAULT_FILTERS, type CookTimeFilter, type PlatformFilter, type RecipeFilters, type SortOption } from '@/lib/recipeFilters';

const PLATFORM_OPTIONS: { label: string; value: PlatformFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'YouTube', value: 'youtube' },
  { label: 'TikTok', value: 'tiktok' },
  { label: 'Instagram', value: 'instagram' },
];

const COOK_TIME_OPTIONS: { label: string; value: CookTimeFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Under 15 min', value: 'under15' },
  { label: 'Under 30 min', value: 'under30' },
  { label: 'Under 1 hour', value: 'under60' },
];

const SORT_OPTIONS: { label: string; value: SortOption }[] = [
  { label: 'Newest first', value: 'newest' },
  { label: 'Quickest first', value: 'quickest' },
  { label: 'A–Z', value: 'alphabetical' },
];

interface FilterSheetProps {
  visible: boolean;
  onClose: () => void;
  filters: RecipeFilters;
  onChange: (filters: RecipeFilters) => void;
}

function ChipRow<T extends string>({
  options,
  value,
  onSelect,
}: {
  options: { label: string; value: T }[];
  value: T;
  onSelect: (value: T) => void;
}) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onSelect(option.value)}
            className={`rounded-2xl border px-3.5 py-2 ${
              selected ? 'border-primary bg-primary' : 'border-border bg-surface'
            }`}
          >
            <Text className={`text-sm font-medium ${selected ? 'text-white' : 'text-text'}`}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function FilterSheet({ visible, onClose, filters, onChange }: FilterSheetProps) {
  const toggleDietary = (tag: string) => {
    const next = filters.dietary.includes(tag)
      ? filters.dietary.filter((item) => item !== tag)
      : [...filters.dietary, tag];
    onChange({ ...filters, dietary: next });
  };

  return (
    <Sheet visible={visible} onClose={onClose}>
      <View className="gap-5 pb-2">
        <View className="flex-row items-center justify-between">
          <Text className="text-xl font-bold text-text">Filter & sort</Text>
          <Pressable onPress={() => onChange(DEFAULT_FILTERS)}>
            <Text className="text-sm font-semibold text-primary">Reset</Text>
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} className="max-h-[420px]">
          <View className="gap-5">
            <View className="gap-2.5">
              <Text className="text-sm font-medium text-text-muted">Platform</Text>
              <ChipRow
                options={PLATFORM_OPTIONS}
                value={filters.platform}
                onSelect={(platform) => onChange({ ...filters, platform })}
              />
            </View>

            <View className="gap-2.5">
              <Text className="text-sm font-medium text-text-muted">Dietary</Text>
              <View className="flex-row flex-wrap gap-2">
                {DIETARY_TAGS.map((tag) => {
                  const selected = filters.dietary.includes(tag);
                  return (
                    <Pressable
                      key={tag}
                      onPress={() => toggleDietary(tag)}
                      className={`flex-row items-center gap-1.5 rounded-2xl border px-3.5 py-2 ${
                        selected ? 'border-primary bg-primary' : 'border-border bg-surface'
                      }`}
                    >
                      {selected ? <Ionicons name="checkmark" size={14} color="#FFFFFF" /> : null}
                      <Text className={`text-sm font-medium ${selected ? 'text-white' : 'text-text'}`}>
                        {formatTagLabel(tag)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View className="gap-2.5">
              <Text className="text-sm font-medium text-text-muted">Cook time</Text>
              <ChipRow
                options={COOK_TIME_OPTIONS}
                value={filters.cookTime}
                onSelect={(cookTime) => onChange({ ...filters, cookTime })}
              />
            </View>

            <View className="gap-2.5">
              <Text className="text-sm font-medium text-text-muted">Sort</Text>
              <ChipRow options={SORT_OPTIONS} value={filters.sort} onSelect={(sort) => onChange({ ...filters, sort })} />
            </View>
          </View>
        </ScrollView>

        <Button label="Done" onPress={onClose} />
      </View>
    </Sheet>
  );
}
