import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { RecipePickerSheet } from '@/components/planner/RecipePickerSheet';
import { WeekGrid } from '@/components/planner/WeekGrid';
import { AddShoppingItemSheet } from '@/components/shopping/AddShoppingItemSheet';
import { RetailerCheckoutSheet } from '@/components/shopping/RetailerCheckoutSheet';
import { ShoppingItem } from '@/components/shopping/ShoppingItem';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { AISLE_GROUPS, getAisleGroup } from '@/constants/aisleGroups';
import { usePurchases } from '@/hooks/usePurchases';
import { useRecipes } from '@/hooks/useRecipes';
import {
  useAddRecipeToSlot,
  useFillWeek,
  useGenerateShoppingList,
  useMealPlanSlots,
  useWeekPlan,
} from '@/hooks/usePlanner';
import { useClearCompletedItems, useDeleteShoppingListItem, useShoppingListItems, useToggleShoppingItem } from '@/hooks/useShoppingList';
import { formatWeekRangeLabel, getMondayOfWeek } from '@/lib/api/planner';
import { usePaywallStore } from '@/stores/paywallStore';
import { useToastStore } from '@/stores/toastStore';
import type { MealPlanSlot, MealType, Recipe } from '@/lib/database.types';
import type { Retailer } from '@/lib/retailerLinks';

type PlannerTab = 'week' | 'shopping';

function addWeeks(dateString: string, weeks: number): string {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + weeks * 7);
  return getMondayOfWeek(date);
}

export default function PlannerScreen() {
  const [activeTab, setActiveTab] = useState<PlannerTab>('week');
  const currentWeekStartDate = useMemo(() => getMondayOfWeek(new Date()), []);
  const [weekStartDate, setWeekStartDate] = useState(currentWeekStartDate);

  const insets = useSafeAreaInsets();
  const showToast = useToastStore((state) => state.show);
  const { isPro } = usePurchases();
  const openPaywall = usePaywallStore((state) => state.open);

  const handleChangeWeek = (nextWeekStartDate: string) => {
    if (!isPro && nextWeekStartDate > currentWeekStartDate) {
      openPaywall('future_planning');
      return;
    }
    setWeekStartDate(nextWeekStartDate);
  };

  const { data: mealPlan } = useWeekPlan(weekStartDate);
  const { data: slots } = useMealPlanSlots(mealPlan?.id);
  const { data: recipes } = useRecipes();

  const addRecipeToSlot = useAddRecipeToSlot(mealPlan?.id);
  const fillWeek = useFillWeek(mealPlan?.id);
  const generateShoppingList = useGenerateShoppingList(mealPlan?.id);

  const [pickerTarget, setPickerTarget] = useState<{ dayOfWeek: number; mealType: MealType } | null>(null);

  const recipesById = useMemo(() => new Map((recipes ?? []).map((recipe) => [recipe.id, recipe])), [recipes]);

  const handlePressEmptySlot = (dayOfWeek: number, mealType: MealType) => {
    setPickerTarget({ dayOfWeek, mealType });
  };

  const handleSelectRecipe = (recipeId: string) => {
    if (!pickerTarget) return;
    addRecipeToSlot.mutate({ dayOfWeek: pickerTarget.dayOfWeek, mealType: pickerTarget.mealType, recipeId });
    setPickerTarget(null);
  };

  const handleFillWeek = async () => {
    try {
      const result = await fillWeek.mutateAsync();
      showToast(result.filled > 0 ? `Filled ${result.filled} dinner${result.filled === 1 ? '' : 's'}` : 'Your dinners are already planned');
    } catch (error) {
      Alert.alert('Something went wrong', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  const handleGenerateShoppingList = async () => {
    try {
      const result = await generateShoppingList.mutateAsync();
      const total = result.addedCount + result.mergedCount;
      showToast(total > 0 ? `Added ${total} ingredient${total === 1 ? '' : 's'} to your list` : 'Shopping list is already up to date');
      setActiveTab('shopping');
    } catch (error) {
      Alert.alert('Something went wrong', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="px-5 pb-2 pt-4">
        <Text className="text-3xl font-bold text-text">Planner</Text>
        <Text className="text-base text-text-muted">Your week of meals</Text>
      </View>

      <View className="flex-row gap-2 px-5 pb-3">
        <SegmentButton label="This Week" active={activeTab === 'week'} onPress={() => setActiveTab('week')} />
        <SegmentButton label="Shopping List" active={activeTab === 'shopping'} onPress={() => setActiveTab('shopping')} />
      </View>

      {activeTab === 'week' ? (
        <ThisWeekView
          weekStartDate={weekStartDate}
          onChangeWeek={handleChangeWeek}
          slots={slots ?? []}
          recipesById={recipesById}
          mealPlanId={mealPlan?.id}
          onPressEmptySlot={handlePressEmptySlot}
          onFillWeek={handleFillWeek}
          isFillingWeek={fillWeek.isPending}
          onGenerateShoppingList={handleGenerateShoppingList}
          isGeneratingShoppingList={generateShoppingList.isPending}
          bottomInset={insets.bottom}
        />
      ) : (
        <ShoppingListView recipesById={recipesById} bottomInset={insets.bottom} />
      )}

      <RecipePickerSheet
        visible={!!pickerTarget}
        onClose={() => setPickerTarget(null)}
        mealType={pickerTarget?.mealType ?? null}
        onSelectRecipe={(recipe) => handleSelectRecipe(recipe.id)}
      />
    </SafeAreaView>
  );
}

function SegmentButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-1 items-center rounded-2xl py-2.5 ${active ? 'bg-primary' : 'bg-surface'}`}
    >
      <Text className={`text-sm font-semibold ${active ? 'text-white' : 'text-text-muted'}`}>{label}</Text>
    </Pressable>
  );
}

interface ThisWeekViewProps {
  weekStartDate: string;
  onChangeWeek: (weekStartDate: string) => void;
  slots: MealPlanSlot[];
  recipesById: Map<string, Recipe>;
  mealPlanId: string | undefined;
  onPressEmptySlot: (dayOfWeek: number, mealType: MealType) => void;
  onFillWeek: () => void;
  isFillingWeek: boolean;
  onGenerateShoppingList: () => void;
  isGeneratingShoppingList: boolean;
  bottomInset: number;
}

function ThisWeekView({
  weekStartDate,
  onChangeWeek,
  slots,
  recipesById,
  mealPlanId,
  onPressEmptySlot,
  onFillWeek,
  isFillingWeek,
  onGenerateShoppingList,
  isGeneratingShoppingList,
  bottomInset,
}: ThisWeekViewProps) {
  const hasFilledSlots = (slots?.length ?? 0) > 0;

  return (
    <View className="flex-1">
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16, gap: 16 }}>
        <View className="flex-row items-center justify-between">
          <Pressable
            accessibilityLabel="Previous week"
            onPress={() => onChangeWeek(addWeeks(weekStartDate, -1))}
            className="h-9 w-9 items-center justify-center rounded-full bg-surface"
          >
            <Ionicons name="chevron-back" size={18} color="#1C1C1E" />
          </Pressable>
          <Text className="text-sm font-semibold text-text">{formatWeekRangeLabel(weekStartDate)}</Text>
          <Pressable
            accessibilityLabel="Next week"
            onPress={() => onChangeWeek(addWeeks(weekStartDate, 1))}
            className="h-9 w-9 items-center justify-center rounded-full bg-surface"
          >
            <Ionicons name="chevron-forward" size={18} color="#1C1C1E" />
          </Pressable>
        </View>

        <Button
          label="Fill My Week"
          variant="outline"
          onPress={onFillWeek}
          loading={isFillingWeek}
          icon={<Ionicons name="shuffle" size={16} color="#1B4332" />}
        />

        <View className="rounded-3xl bg-surface p-3" style={cardShadow}>
          <WeekGrid
            mealPlanId={mealPlanId}
            slots={slots ?? []}
            recipesById={recipesById}
            onPressEmptySlot={onPressEmptySlot}
          />
        </View>
      </ScrollView>

      <View className="border-t border-border bg-surface px-5 pt-3" style={{ paddingBottom: bottomInset + 12 }}>
        <Button
          label="Generate Shopping List"
          onPress={onGenerateShoppingList}
          disabled={!hasFilledSlots}
          loading={isGeneratingShoppingList}
        />
      </View>
    </View>
  );
}

interface ShoppingListViewProps {
  recipesById: Map<string, Recipe>;
  bottomInset: number;
}

function ShoppingListView({ recipesById, bottomInset }: ShoppingListViewProps) {
  const { data: items, isLoading } = useShoppingListItems();
  const toggleItem = useToggleShoppingItem();
  const deleteItem = useDeleteShoppingListItem();
  const clearCompleted = useClearCompletedItems();
  const { isPro } = usePurchases();
  const openPaywall = usePaywallStore((state) => state.open);

  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [checkoutRetailer, setCheckoutRetailer] = useState<Retailer | null>(null);

  const checkedCount = items?.filter((item) => item.checked).length ?? 0;
  const uncheckedItems = useMemo(() => items?.filter((item) => !item.checked) ?? [], [items]);

  const groups = useMemo(() => {
    const byGroup = new Map<string, typeof uncheckedItems>();
    for (const group of AISLE_GROUPS) byGroup.set(group, []);

    for (const item of items ?? []) {
      const group = getAisleGroup(item.aisle);
      byGroup.get(group)!.push(item);
    }

    return AISLE_GROUPS.map((group) => ({
      group,
      items: (byGroup.get(group) ?? []).sort((a, b) => Number(a.checked) - Number(b.checked)),
    })).filter((entry) => entry.items.length > 0);
  }, [items]);

  const toggleGroupCollapsed = (group: string) => {
    setCollapsedGroups((current) => {
      const next = new Set(current);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  };

  return (
    <View className="flex-1">
      <View className="flex-row items-center justify-between px-5 pb-2">
        <View className="flex-row items-center gap-2">
          <Text className="text-lg font-bold text-text">Shopping List</Text>
          {items && items.length > 0 ? (
            <View className="rounded-full bg-primary/10 px-2 py-0.5">
              <Text className="text-xs font-semibold text-primary">{items.length}</Text>
            </View>
          ) : null}
        </View>
        <View className="flex-row items-center gap-3">
          {checkedCount > 0 ? (
            <Pressable onPress={() => clearCompleted.mutate()}>
              <Text className="text-xs font-semibold text-primary">Clear completed</Text>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityLabel="Add item"
            onPress={() => setIsAddSheetOpen(true)}
            className="h-8 w-8 items-center justify-center rounded-full bg-primary"
          >
            <Ionicons name="add" size={18} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      {isLoading ? (
        <View className="gap-3 px-5">
          <SkeletonCard />
        </View>
      ) : !items || items.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <EmptyState
            illustration={<Ionicons name="cart-outline" size={48} color="#52B788" />}
            title="Your list is empty"
            description="Generate a shopping list from your meal plan, or add items yourself."
          />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 16 }}>
          {groups.map(({ group, items: groupItems }) => {
            const collapsed = collapsedGroups.has(group);
            return (
              <View key={group}>
                <Pressable
                  onPress={() => toggleGroupCollapsed(group)}
                  className="flex-row items-center justify-between bg-background px-5 py-2"
                >
                  <Text className="text-xs font-semibold uppercase text-text-muted">
                    {group} ({groupItems.length})
                  </Text>
                  <Ionicons name={collapsed ? 'chevron-down' : 'chevron-up'} size={14} color="#6B7280" />
                </Pressable>
                {!collapsed
                  ? groupItems.map((item) => (
                      <ShoppingItem
                        key={item.id}
                        item={item}
                        recipesById={recipesById}
                        onToggle={() => toggleItem.mutate({ id: item.id, checked: !item.checked })}
                        onDelete={() => deleteItem.mutate(item.id)}
                      />
                    ))
                  : null}
              </View>
            );
          })}
        </ScrollView>
      )}

      <View className="flex-row gap-3 border-t border-border bg-surface px-5 pt-3" style={{ paddingBottom: bottomInset + 12 }}>
        <Pressable
          className="flex-1"
          onPress={() => (isPro ? setCheckoutRetailer('tesco') : openPaywall('retailer_checkout'))}
        >
          <View className="min-h-[48px] items-center justify-center rounded-2xl bg-[#00539F]" style={!isPro ? { opacity: 0.4 } : undefined}>
            <Text className="text-base font-semibold text-white">Shop on Tesco</Text>
          </View>
          {!isPro && (
            <View className="absolute inset-0 items-center justify-center">
              <Ionicons name="lock-closed" size={16} color="#FFFFFF" />
            </View>
          )}
        </Pressable>
        <Pressable
          className="flex-1"
          onPress={() => (isPro ? setCheckoutRetailer('sainsburys') : openPaywall('retailer_checkout'))}
        >
          <View className="min-h-[48px] items-center justify-center rounded-2xl bg-[#FF8200]" style={!isPro ? { opacity: 0.4 } : undefined}>
            <Text className="text-base font-semibold text-white">Shop on Sainsbury&apos;s</Text>
          </View>
          {!isPro && (
            <View className="absolute inset-0 items-center justify-center">
              <Ionicons name="lock-closed" size={16} color="#FFFFFF" />
            </View>
          )}
        </Pressable>
      </View>

      <AddShoppingItemSheet visible={isAddSheetOpen} onClose={() => setIsAddSheetOpen(false)} />
      <RetailerCheckoutSheet
        visible={!!checkoutRetailer}
        onClose={() => setCheckoutRetailer(null)}
        retailer={checkoutRetailer}
        items={uncheckedItems}
      />
    </View>
  );
}

const cardShadow = {
  shadowColor: '#1C1C1E',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 2,
};
