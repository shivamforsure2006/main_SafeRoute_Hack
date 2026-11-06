import { Redirect } from 'expo-router';
import { useUserStore } from '@/store';

export default function Index() {
  const isAuthenticated = useUserStore((s) => s.isAuthenticated);
  if (!isAuthenticated) {
    return <Redirect href={'/auth' as any} />;
  }
  return <Redirect href="/(tabs)" />;
}
