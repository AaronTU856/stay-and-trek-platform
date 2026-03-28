import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { useAccessibility } from "../../context/AccessibilityContext";
import { useAuth } from "../_layout";
import * as SecureStore from 'expo-secure-store';
import IconButton from '../../components/IconButton';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const { largeText, darkMode } = useAccessibility();
  const { setUserToken, userToken } = useAuth();
  const router = useRouter();
  const titleFontSize = largeText ? 34 : 26;
  const bodyFontSize = largeText ? 18 : 16;

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
    <ScrollView
      style={[styles.container, darkMode && styles.containerDark]}
      contentContainerStyle={styles.contentWrap}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.heroCard, darkMode && styles.heroCardDark]}>
        <Text style={styles.eyebrow}>Mobile Guide</Text>
        <Text style={[styles.title, { fontSize: titleFontSize }, darkMode && styles.titleDark]}>Stay & Trek</Text>
        <Text style={[styles.heroText, { fontSize: bodyFontSize }, darkMode && styles.descriptionDark]}>
          Browse trails, compare stays and check key travel details in one place.
        </Text>
      </View>

      <View style={styles.iconRow}>
        <IconButton name="map-outline" iconSet="ionicon" label="View Map" bgColor="#1dba54" onPress={() => router.push('/map')} />
        <IconButton name="hiking" iconSet="fontawesome" label="Find Trails" bgColor="#c45a0ebf" onPress={() => router.push('/trails')} />
        <IconButton name="bed" iconSet="material" label="Find Stays" bgColor="#1565C0" onPress={() => router.push('/stay')} />
      </View>

      <View style={styles.moduleRow}>
        <View style={[styles.moduleCard, darkMode && styles.moduleCardDark]}>
          <Text style={[styles.moduleTitle, darkMode && styles.titleDark]}>Route Planning</Text>
          <Text style={[styles.moduleText, darkMode && styles.subtitleTextDark]}>Choose a trail and map a simple route to accommodation.</Text>
        </View>
        <View style={[styles.moduleCard, darkMode && styles.moduleCardDark]}>
          <Text style={[styles.moduleTitle, darkMode && styles.titleDark]}>Weather</Text>
          <Text style={[styles.moduleText, darkMode && styles.subtitleTextDark]}>Check current conditions before heading out.</Text>
        </View>
      </View>

      <View style={styles.contentArea}>
        {userToken ? (
           /* SECTION B: Logged In Quick Access */
          <View style={[styles.memberDashboard, darkMode && styles.moduleCardDark]}>
            <Text style={[styles.welcomeText, darkMode && styles.titleDark]}>Quick Access</Text>
            <Text style={[styles.subtitleText, darkMode && styles.subtitleTextDark]}>
              You are signed in. Use the main navigation above to browse trails, stays and the map.
            </Text>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push('/weather')}>
              <Text style={styles.secondaryButtonText}>Open Weather</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutButtonText}>Logout</Text>
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
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  containerDark: {
    backgroundColor: '#111827',
  },
  contentWrap: {
    paddingTop: 20,
    paddingHorizontal: 18,
    paddingBottom: 32,
  },
  heroCard: {
    width: '100%',
    backgroundColor: '#e8f4ea',
    borderRadius: 18,
    paddingVertical: 22,
    paddingHorizontal: 20,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#cfe4d4',
  },
  heroCardDark: {
    backgroundColor: '#1f2937',
    borderColor: '#374151',
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: '#2E7D32',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 10,
  },
  titleDark: {
    color: '#f9fafb',
  },
  heroText: {
    color: '#30433a',
    lineHeight: 24,
    fontWeight: '500',
  },
  iconRow: {
    flexDirection: 'row',
    marginTop: 4,
    justifyContent: 'space-evenly',
    width: '100%',
    flexWrap: 'wrap',
    paddingHorizontal: 6,
  },
  moduleRow: {
    width: '100%',
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
    marginBottom: 18,
  },
  moduleCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  moduleCardDark: {
    backgroundColor: '#1f2937',
    borderColor: '#374151',
  },
  moduleTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 6,
  },
  moduleText: {
    fontSize: 13,
    lineHeight: 19,
    color: '#5b6470',
  },
  contentArea: {
    width: '100%',
    justifyContent: 'flex-start',
    alignItems: 'center',
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
    marginBottom: 16,
  },
  subtitleTextDark: {
    color: '#d1d5db',
  },
  memberDashboard: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  secondaryButton: {
    backgroundColor: '#FFA000',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  secondaryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
    textAlign: 'center',
  },
  logoutButton: {
    marginTop: 12,
    backgroundColor: '#5478b590',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  logoutButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
    textAlign: 'center',
  },

  description: {
      fontSize: 16,
      textAlign: 'center',
      color: '#2E3A2F',          // soft forest tone instead of grey
      marginBottom: 16,
      lineHeight: 24,
      paddingHorizontal: 20,
      fontWeight: '500',
      letterSpacing: 0.3,
    },
  descriptionDark: {
    color: '#e5e7eb',
  },
  loginButton: {
    backgroundColor: '#2E7D32',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  loginButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
    textAlign: 'center',
  },
});
