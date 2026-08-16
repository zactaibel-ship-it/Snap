import { Image, Text, View } from 'react-native';

interface AvatarProps {
  uri?: string | null;
  name?: string | null;
  size?: number;
}

function getInitials(name?: string | null) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export function Avatar({ uri, name, size = 40 }: AvatarProps) {
  const dimensionStyle = { width: size, height: size, borderRadius: size / 2 };

  if (uri) {
    return <Image source={{ uri }} style={dimensionStyle} />;
  }

  return (
    <View className="items-center justify-center bg-primary-light" style={dimensionStyle}>
      <Text className="font-semibold text-white" style={{ fontSize: size * 0.4 }}>
        {getInitials(name)}
      </Text>
    </View>
  );
}
