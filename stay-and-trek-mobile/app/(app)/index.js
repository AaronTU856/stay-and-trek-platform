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
        <IconButton name="map-outline" iconSet="ionicon" label="View Map" bgColor="#1dba54" onPress={() => router.push('/map')} />
        <IconButton name="hiking" iconSet="fontawesome" label="Find Trails" bgColor="#c45a0ebf" onPress={() => router.push('/trails')} />
        <IconButton name="bed" iconSet="material" label="Find Stays" bgColor="#1565C0" onPress={() => router.push('/stay')} />
      </View>

        <View style={{ height: 1, backgroundColor: '#ccc', width: '80%', marginVertical: 24 }} />
        <Text style={styles.description}>
          Stay and Trek helps you discover trails, find nearby stays, check the weather, and save your favourite adventures all in one place.
        </Text>
        <Text style={styles.description}>
          Whether you`re a seasoned hiker or just looking for a weekend getaway, we`ve got you covered. Explore the beauty of nature with confidence and ease.
        </Text>

      <View style={styles.contentArea}>
        {userToken ? (
           /* SECTION B: Logged In Quick Access */
          <View style={styles.memberDashboard}>
            <Text style={styles.welcomeText}>Quick Access</Text>
            <Text style={styles.subtitleText}>
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
    marginTop: 10,
    justifyContent: 'space-evenly',
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
    marginBottom: 16,
  },
  memberDashboard: {
    width: '100%',
    alignItems: 'center',
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
