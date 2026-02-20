import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useAccessibility } from "../../context/AccessibilityContext";
import { useAuth } from "../_layout";
import * as SecureStore from 'expo-secure-store';
import IconButton from '../../components/IconButton';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const { largeText } = useAccessibility();
  const { setUserToken } = useAuth();
  const router = useRouter();
  const titleFontSize = largeText ? 32 : 24;

  const handleLogout = async () => {
    try {
      await SecureStore.deleteItemAsync('userToken');
      await SecureStore.deleteItemAsync('refreshToken');
      setUserToken(null);
      console.log('✅ Logged out successfully');
    } catch (e) {
      console.log('❌ Logout error:', e);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { fontSize: titleFontSize }]}>Stay & Trek</Text>
      
      <View style={styles.iconRow}>
        <IconButton name="map-outline" iconSet="ionicon" label="View Map" bgColor="#2E7D32" onPress={() => router.push('/map')} />
        <IconButton name="hiking" iconSet="fontawesome" label="Find Trails" bgColor="#2E7D32" onPress={() => router.push('/trails')} />
        <IconButton name="bed" iconSet="material" label="Find Accommodation" bgColor="#1565C0" onPress={() => router.push('/stay')} />
        <IconButton name="sunny-outline" iconSet="ionicon" label="View Weather" bgColor="#FFA000" onPress={() => router.push('/weather')} />
      </View>

      <View style={styles.contentArea}>
        <Text style={styles.welcomeText}>Welcome to your hiking adventure!</Text>
        <Text style={styles.subtitleText}>Explore trails, find accommodation, and check the weather all in one app.</Text>
        
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>🚪 Logout (Test Login)</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 24,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 24,
  },
  iconRow: {
    flexDirection: 'row',
    marginTop: 12,
    justifyContent: 'center',
    width: '100%',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
  },
  contentArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
    color: '#333',
  },
  subtitleText: {
    fontSize: 14,
    textAlign: 'center',
    color: '#666',
    lineHeight: 20,
  },
  logoutButton: {
    marginTop: 24,
    backgroundColor: '#d32f2f',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  logoutButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});
