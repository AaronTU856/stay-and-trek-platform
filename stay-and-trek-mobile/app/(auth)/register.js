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

    // 1. Validation (Keep your logic, just use Alerts)
    if (!formData.username || !formData.email || !formData.password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (formData.password !== formData.cpassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    try {
        const data = await register(formData.username, formData.email, formData.password);

        Alert.alert("Success", "Account created! You can now log in.");
        router.replace('/(auth)/login');
    } catch (error) {
        console.error('Registration error:', error);

        // Handle Django's specific error responses
      const serverMessage = error.response?.data?.username?.[0] || 
                            error.response?.data?.email?.[0] || 
                            "Could not create account.";

        Alert.alert("Registration Failed", serverMessage);
    }

};

    
  return (
    <ScrollView contentContainerStyle={styles.container}>
       
      <Text style={styles.title}>🥾 Stay & Trek ⛰️</Text>
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

  container: { flexGrow: 1, justifyContent: 'center', padding: 20, backgroundColor: '#a3a998' },

  title: { 
    fontSize: 28, 
    fontWeight: 'bold',
    marginBottom: 20, 
    color: '#2e7d32', 
    textAlign: 'center'},

  input: { 
    borderWidth: 1, 
    borderColor: '#170d0d', 
    padding: 15, 
    borderRadius: 8, 
    marginBottom: 15,
    fontSize: 16,
    color: '#153a18',
    placeholderTextColor: '#ece7e7'
  },

  button: { backgroundColor: '#2e7d32', padding: 18, borderRadius: 8, alignItems: 'center' },
  
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  
});

export default Register;