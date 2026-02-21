import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useAccessibility } from "../../context/AccessibilityContext";
import { useAuth } from "../_layout";
import * as SecureStore from 'expo-secure-store';
import IconButton from '../../components/IconButton';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const { largeText } = useAccessibility();
  const { setUserToken, userToken } = useAuth();
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
      
      {/* SECTION A: Constant Features */}
      <View style={styles.iconRow}>
        <IconButton name="map-outline" iconSet="ionicon" label="View Map" bgColor="#2E7D32" onPress={() => router.push('/map')} />
        <IconButton name="hiking" iconSet="fontawesome" label="Find Trails" bgColor="#2E7D32" onPress={() => router.push('/trails')} />
        <IconButton name="bed" iconSet="material" label="Find Accommodation" bgColor="#1565C0" onPress={() => router.push('/stay')} />
      </View>

      <View style={styles.contentArea}>
        {userToken ? (
           /* SECTION B: Logged In Extra Features */
          <View style={styles.memberDashboard}>
            <Text style={styles.welcomeText}>Member Dashboard</Text>
            <View style={styles.iconRow}>
              <IconButton name="sunny-outline" iconSet="ionicon" label="Weather" bgColor="#FFA000" onPress={() => router.push('/weather')} />
              <IconButton name="heart" iconSet="ionicon" label="Favorites" bgColor="#d32f2f" onPress={() => router.push('/favorites')} />
              <IconButton name="settings-outline" iconSet="ionicon" label="Settings" bgColor="#607d8b" onPress={() => router.push('/settings')} />
            </View>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutButtonText}>🚪 Logout</Text>
            </TouchableOpacity>
      </View>
        ) : (
          /* This state should technically be bypassed by your layout redirect, 
             but it's good for a fallback */
          <TouchableOpacity style={styles.loginButton} onPress={() => router.push('/login')}>
            <Text style={styles.loginButtonText}>Sign In to Explore More</Text>
          </TouchableOpacity>
        )}
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
