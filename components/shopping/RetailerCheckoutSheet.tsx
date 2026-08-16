import { FlatList, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';

import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { buildRetailerSearchUrl, RETAILER_LABELS, type Retailer } from '@/lib/retailerLinks';
import { useDisclosureStore } from '@/stores/disclosureStore';
import type { ShoppingListItem } from '@/lib/database.types';

const BATCH_SIZE = 3;

interface RetailerCheckoutSheetProps {
  visible: boolean;
  onClose: () => void;
  retailer: Retailer | null;
  items: ShoppingListItem[];
}

export function RetailerCheckoutSheet({ visible, onClose, retailer, items }: RetailerCheckoutSheetProps) {
  const hasSeenDisclosure = useDisclosureStore((state) => state.hasSeenAffiliateDisclosure);
  const dismissDisclosure = useDisclosureStore((state) => state.dismissAffiliateDisclosure);

  if (!retailer) return null;
  const label = RETAILER_LABELS[retailer];

  const openItem = (item: ShoppingListItem) => {
    WebBrowser.openBrowserAsync(buildRetailerSearchUrl(retailer, item));
  };

  const openFirstFew = async () => {
    // The in-app browser is a full-screen modal, so these open one after
    // another as each is dismissed rather than as separate tabs.
    for (const item of items.slice(0, BATCH_SIZE)) {
      // eslint-disable-next-line no-await-in-loop
      await WebBrowser.openBrowserAsync(buildRetailerSearchUrl(retailer, item));
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose}>
      <View className="gap-4 pb-2" style={{ height: 480 }}>
        <View className="gap-1">
          <Text className="text-xl font-bold text-text">Shop on {label}</Text>
          <Text className="text-sm text-text-muted">Tap an item to search for it on {label}.</Text>
        </View>

        {!hasSeenDisclosure ? (
          <View className="flex-row items-start gap-2 rounded-2xl bg-accent/10 p-3">
            <Ionicons name="information-circle" size={16} color="#1B4332" />
            <Text className="flex-1 text-xs leading-4 text-primary">
              Heads up: we may earn a small commission from purchases — it helps keep Snip free.
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Dismiss affiliate disclosure"
              onPress={dismissDisclosure}
              hitSlop={14}
            >
              <Ionicons name="close" size={16} color="#1B4332" />
            </Pressable>
          </View>
        ) : null}

        {items.length === 0 ? (
          <Text className="py-6 text-center text-sm text-text-muted">Your shopping list is empty.</Text>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => openItem(item)}
                accessibilityRole="button"
                accessibilityLabel={`Search for ${item.ingredient_name} on ${label}`}
                className="flex-row items-center justify-between border-b border-border py-3"
              >
                <View className="flex-1 pr-3">
                  <Text numberOfLines={1} className="text-sm font-medium text-text">
                    {item.ingredient_name}
                  </Text>
                  {item.quantity != null || item.unit ? (
                    <Text className="text-xs text-text-muted">
                      {[item.quantity, item.unit].filter(Boolean).join(' ')}
                    </Text>
                  ) : null}
                </View>
                <Ionicons name="open-outline" size={16} color="#6B7280" />
              </Pressable>
            )}
          />
        )}

        {items.length > 0 ? (
          <Button label={`Open first ${Math.min(BATCH_SIZE, items.length)} in ${label}`} variant="outline" onPress={openFirstFew} />
        ) : null}
      </View>
    </Sheet>
  );
}
