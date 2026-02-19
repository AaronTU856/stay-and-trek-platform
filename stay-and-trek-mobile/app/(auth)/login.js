import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleLogin = async () => {
    try {
      // Point this to your Django Docker IP
      const response = await axios.post('http://10.46.73.34:8000/api/token/', {
        username,
        password,
      });

      // Save the JWT
      await SecureStore.setItemAsync('userToken', response.data.access);
      
      Alert.alert("Success", "Welcome back!");
      
      // Redirect to the main map/app
      router.replace('/(tabs)'); 
    } catch (error) {
      Alert.alert("Error", "Invalid username or password");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Stay & Trek Login</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ddd', padding: 15, borderRadius: 8, marginBottom: 15 },
  button: { backgroundColor: '#2e7d32', padding: 15, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold' }
});