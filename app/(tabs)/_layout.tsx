import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { useAuth } from '@/hooks/useAuth';
import type { SupermarketPreference } from '@/lib/database.types';

const DIETARY_OPTIONS = [
  'Vegetarian',
  'Vegan',
  'Pescatarian',
  'Gluten-free',
  'Dairy-free',
  'Nut-free',
];

const SUPERMARKET_OPTIONS: { label: string; value: SupermarketPreference }[] = [
  { label: 'Tesco', value: 'tesco' },
  { label: "Sainsbury's", value: 'sainsburys' },
  { label: 'Both', value: 'both' },
];

function OnboardingSheet() {
  const { needsOnboarding, completeOnboarding } = useAuth();
  const [dietaryPreferences, setDietaryPreferences] = useState<string[]>([]);
  const [supermarketPreference, setSupermarketPreference] = useState<SupermarketPreference | null>(
    null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleDietary = (option: string) => {
    setDietaryPreferences((current) =>
      current.includes(option) ? current.filter((item) => item !== option) : [...current, option]
    );
  };

  const handleSubmit = async () => {
    if (!supermarketPreference) return;
    setIsSubmitting(true);
    try {
      await completeOnboarding(dietaryPreferences, supermarketPreference);
    } catch (error) {
      Alert.alert('Something went wrong', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet visible={needsOnboarding} onClose={() => {}}>
      <View className="gap-6 pb-2">
        <View className="gap-1.5">
          <Text className="text-xl font-bold text-text">Tell us your preferences</Text>
          <Text className="text-sm text-text-muted">
            We&apos;ll use this to tailor recipes and your shopping list.
          </Text>
        </View>

        <View className="gap-2.5">
          <Text className="text-sm font-medium text-text">Dietary preferences</Text>
          <View className="flex-row flex-wrap gap-2">
            {DIETARY_OPTIONS.map((option) => {
              const selected = dietaryPreferences.includes(option);
              return (
                <Pressable
                  key={option}
                  onPress={() => toggleDietary(option)}
                  className={`rounded-2xl border px-4 py-2.5 ${
                    selected ? 'border-primary bg-primary' : 'border-border bg-surface'
                  }`}
                >
                  <Text className={`text-sm font-medium ${selected ? 'text-white' : 'text-text'}`}>
                    {option}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View className="gap-2.5">
          <Text className="text-sm font-medium text-text">Preferred supermarket</Text>
          <View className="flex-row flex-wrap gap-2">
            {SUPERMARKET_OPTIONS.map((option) => {
              const selected = supermarketPreference === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => setSupermarketPreference(option.value)}
                  className={`rounded-2xl border px-4 py-2.5 ${
                    selected ? 'border-primary bg-primary' : 'border-border bg-surface'
                  }`}
                >
                  <Text className={`text-sm font-medium ${selected ? 'text-white' : 'text-text'}`}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Button
          label="Continue"
          onPress={handleSubmit}
          loading={isSubmitting}
          disabled={!supermarketPreference}
        />
      </View>
    </Sheet>
  );
}

export default function TabsLayout() {
  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#1B4332',
          tabBarInactiveTintColor: '#6B7280',
          tabBarStyle: {
            backgroundColor: '#FFFFFF',
            borderTopColor: '#E5E7EB',
            borderTopWidth: 1,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="discover"
          options={{
            title: 'Discover',
            tabBarIcon: ({ color, size }) => <Ionicons name="compass" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="planner"
          options={{
            title: 'Planner',
            tabBarIcon: ({ color, size }) => <Ionicons name="calendar" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, size }) => <Ionicons name="person" color={color} size={size} />,
          }}
        />
      </Tabs>
      <OnboardingSheet />
    </>
  );
}
