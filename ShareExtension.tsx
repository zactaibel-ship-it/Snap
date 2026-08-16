import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { close, openHostApp, type InitialProps } from 'expo-share-extension';

function extractUrlFromText(text: string | undefined): string | null {
  if (!text) return null;
  const match = text.match(/https?:\/\/\S+/);
  return match ? match[0] : null;
}

/**
 * Root component for the iOS share extension target. When a TikTok or
 * Instagram Reel is shared to Snip, this hands the URL off to the main app
 * (via openHostApp, a custom-scheme deep link the app/extract.tsx route
 * picks up) and closes itself — the real extraction happens in the host app.
 */
export default function ShareExtension({ url, text }: InitialProps) {
  const [status, setStatus] = useState<'opening' | 'unsupported'>('opening');

  useEffect(() => {
    const sharedUrl = url ?? extractUrlFromText(text);
    if (!sharedUrl) {
      setStatus('unsupported');
      return;
    }

    openHostApp(`extract?url=${encodeURIComponent(sharedUrl)}`);
    const timeout = setTimeout(close, 600);
    return () => clearTimeout(timeout);
  }, [url, text]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#1B4332' }}>
      {status === 'opening' ? (
        <>
          <ActivityIndicator color="#FFFFFF" />
          <Text allowFontScaling={false} style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '600' }}>
            Opening Snip...
          </Text>
        </>
      ) : (
        <Text allowFontScaling={false} style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '600', textAlign: 'center' }}>
          Couldn&apos;t find a link to save.
        </Text>
      )}
    </View>
  );
}
