import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Browser fallback for the native map tab.
export default function MapWebFallback() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>Web Demo</Text>
        <Text style={styles.title}>Interactive map is available on the native app</Text>
        <Text style={styles.body}>
          The full map screen uses native map components, so the browser demo shows the
          rest of the Stay & Trek mobile flow instead.
        </Text>
        <Text style={styles.body}>
          For your FYP demo on web, you can still show trails, accommodation, weather,
          sign-in, and trail details from the tabs below.
        </Text>

        <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/trails')}>
          <Text style={styles.primaryButtonText}>Open Trails</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push('/stay')}>
          <Text style={styles.secondaryButtonText}>Browse Stays</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push('/weather')}>
          <Text style={styles.secondaryButtonText}>Open Weather</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#eef4ea',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 24,
    borderWidth: 1,
    borderColor: '#d6e2d0',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  eyebrow: {
    color: '#2E7D32',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  title: {
    color: '#17351d',
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
    marginBottom: 12,
  },
  body: {
    color: '#425046',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#2E7D32',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: '#f4f8f1',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#c8d8c2',
  },
  secondaryButtonText: {
    color: '#214f29',
    fontSize: 15,
    fontWeight: '600',
  },
});
