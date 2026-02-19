import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import axios from 'axios'; // Or use your apiClient
import { API_BASE_URL } from '../../services/apiClient'; 
import { register } from '../../services/apiClient'; // Import the register function
import { KeyboardAvoidingView, Platform } from 'react-native';

const Register = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
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
    setLoading(true);

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
    } finally {
      // 3. Stop Loading (regardless of success or failure)
      setLoading(false);
    }
  };

    
  return (

    <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
    >

    <ScrollView contentContainerStyle={styles.container}></ScrollView>
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


    <TouchableOpacity 
        style={[styles.button, loading && styles.buttonDisabled]} 
        onPress={handleRegister}
        disabled={loading} // Prevent double-tapping
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Register</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, styles.loginButton]} onPress={() => router.push('/(auth)/login')}>
        <Text style={styles.loginButtonText}>Back to Login</Text>
      </TouchableOpacity>
    </ScrollView>
  </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({


  container: { flexGrow: 1, justifyContent: 'center', padding: 20, backgroundColor: '#a3a998' },

  buttonDisabled: {
    backgroundColor: '#a5d6a7', // Lighter green to show it's disabled
  },

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

  button: { 
    backgroundColor: '#2e7d32', 
    padding: 18, 
    borderRadius: 8, 
    alignItems: 'center' 
},
loginButton: { 
    backgroundColor: '#18648e', 
    padding: 18, 
    borderRadius: 8, 
    alignItems: 'center', 
    marginTop: 10 },

loginButtonText: {
    color: '#ffffff', 
    fontWeight: 'normal', 
    fontSize: 14, 
    textAlign: 'center' 
},
  
  buttonText: { 
    color: '#ffffff', 
    fontWeight: 'bold', 
    fontSize: 16, 
    textAlign: 'center' 
},



  
});

export default Register;