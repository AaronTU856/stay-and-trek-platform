import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import axios from 'axios'; // Or use your apiClient
import { API_BASE_URL } from '../../services/apiClient'; 
import { register } from '../../services/apiClient'; // Import the register function

const Register = () => {
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    cpassword: '',
  });

  const handleRegister = async () => {
    try {
        const data = await register(formData.username, formData.email, formData.password);

        Alert.alert("Success", "Account created! You can now log in.");
        router.replace('/(auth)/login');
    } catch (error) {
        console.error('Registration error:', error);
        Alert.alert("Registration Failed", error.response?.data?.username?.[0] || "Could not create account. Username might be taken.");
    }

    // 1. Validation (Keep your logic, just use Alerts)
    if (formData.password !== formData.cpassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    try {
      // 2. Connect to Django
      // Note: Django default User model usually requires username, email, password
      const response = await axios.post(`${API_BASE_URL}/api/register/`, {
        username: formData.username,
        email: formData.email,
        password: formData.password,
      });

      if (response.status === 201 || response.status === 200) {
        Alert.alert("Success", "Account created! Please login.");
        router.replace('/(auth)/login');
      }
    } catch (error) {
      console.error(error.response?.data);
      Alert.alert("Registration Failed", error.response?.data?.username?.[0] || "Something went wrong");
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Create Account</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Username"
        value={formData.username}
        onChangeText={(val) => setFormData({...formData, username: val})}
      />

      <TextInput
        style={styles.input}
        placeholder="Email"
        keyboardType="email-address"
        value={formData.email}
        onChangeText={(val) => setFormData({...formData, email: val})}
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={formData.password}
        onChangeText={(val) => setFormData({...formData, password: val})}
      />

      <TextInput
        style={styles.input}
        placeholder="Confirm Password"
        secureTextEntry
        value={formData.cpassword}
        onChangeText={(val) => setFormData({...formData, cpassword: val})}
      />

      <TouchableOpacity style={styles.button} onPress={handleRegister}>
        <Text style={styles.buttonText}>Register</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 20, color: '#2e7d32' },
  input: { borderWidth: 1, borderColor: '#ddd', padding: 15, borderRadius: 8, marginBottom: 15 },
  button: { backgroundColor: '#2e7d32', padding: 18, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});

export default Register;