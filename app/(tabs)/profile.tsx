import { Alert, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/hooks/useAuth';

export default function ProfileScreen() {
  const { profile, session, signOut } = useAuth();

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="px-5 pb-2 pt-4">
        <Text className="text-3xl font-bold text-text">Profile</Text>
      </View>

      <View className="gap-4 px-5 pt-2">
        <Card className="flex-row items-center gap-4">
          <Avatar uri={profile?.avatar_url} name={profile?.full_name ?? session?.user.email} size={56} />
          <View className="flex-1 gap-0.5">
            <Text className="text-lg font-semibold text-text">
              {profile?.full_name ?? 'Your account'}
            </Text>
            <Text className="text-sm text-text-muted">{session?.user.email}</Text>
          </View>
        </Card>

        <Card className="gap-3">
          <Text className="text-sm font-medium text-text-muted">Dietary preferences</Text>
          <View className="flex-row flex-wrap gap-2">
            {profile?.dietary_preferences.length ? (
              profile.dietary_preferences.map((preference) => (
                <Badge key={preference} label={preference} tone="primary" />
              ))
            ) : (
              <Text className="text-sm text-text-muted">None set</Text>
            )}
          </View>
        </Card>

        <Card className="gap-1.5">
          <Text className="text-sm font-medium text-text-muted">Preferred supermarket</Text>
          <Text className="text-base capitalize text-text">
            {profile?.supermarket_preference ?? 'Not set'}
          </Text>
        </Card>

        <Button label="Sign out" variant="outline" onPress={handleSignOut} />
      </View>
    </SafeAreaView>
  );
}
