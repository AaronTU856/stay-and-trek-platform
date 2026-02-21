import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '../_layout';
import { login } from '../../services/apiClient';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();
  const { setUserToken } = useAuth();
  const register = () => router.push('/(auth)/register');
  
  const handleLogin = async () => {
    try {
      console.log('🔐 Attempting login with username:', username);
      // Call login through apiClient
      const data = await login(username, password);
      console.log('✅ Login response:', data);

      // Save the JWT tokens
      await SecureStore.setItemAsync('userToken', data.access);
      await SecureStore.setItemAsync('refreshToken', data.refresh);
      console.log('💾 Tokens saved to SecureStore');

      // Update AuthContext to reflect login
      console.log('🔄 Updating AuthContext with token');
      setUserToken(data.access);

      Alert.alert("Success", "Welcome back!"); 
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert("Error", "Invalid username or password");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🥾 Stay & Trek ⛰️</Text>
      <TextInput 
        style={styles.input} 
        placeholder="Username" 
        value={username} 
        onChangeText={setUsername} 
        autoCapitalize="none"
      />
      <TextInput 
        style={styles.input} 
        placeholder="Password" 
        value={password} 
        onChangeText={setPassword} 
        secureTextEntry 
      />
      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Login</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.registerButton} onPress={register}>
        <Text style={styles.registerButtonText}>Not Registered? Register Here..</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.guestButton} onPress={() => router.replace('/map')}>
        <Text style={styles.guestButtonText}>Continue as Guest</Text>
      </TouchableOpacity>


    </View>
  );
}


const styles = StyleSheet.create({

  container: { flexGrow: 1, justifyContent: 'center', padding: 20, backgroundColor: '#a3a998' },

  title: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    marginBottom: 20, 
    color: '#175c1d', 
    textAlign: 'center' },

  input: { 
    borderWidth: 1, 
    borderColor: '#170d0d', 
    padding: 15, 
    borderRadius: 8, 
    marginBottom: 15,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#303731',
    placeholderTextColor: '#ffffff'
  },

  button: { 
    backgroundColor: '#2e7d32', 
    padding: 18, 
    borderRadius: 8, 
    alignItems: 'center' },
  
  buttonText: { 
    color: '#fff', 
    fontWeight: 'bold', 
    fontSize: 16 },
  
  registerButton: { 
    backgroundColor: '#18648e', 
    padding: 18, borderRadius: 8, 
    alignItems: 'center', 
    marginTop: 10 },

  registerButtonText: { 
    color: '#fff', 
    fontWeight: 'normal', 
    fontSize: 14 },

  guestButton: {
    marginTop: 15,
    padding: 12,
    borderWidth: 1,
    borderColor: '#2E7D32',
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    backgroundColor: '#4fa09f',
  },
  guestButtonText: {
    color: '#f7f9f7',
    fontWeight: '600',
  }
});