import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BIOMETRIC_ENABLED_KEY = '@bankee_biometric_enabled';
const SAVED_CREDENTIALS_KEY = '@bankee_saved_credentials';

export const BiometricService = {
  // Check if hardware supports biometrics
  isHardwareSupported: async () => {
    try {
      return await LocalAuthentication.hasHardwareAsync();
    } catch (error) {
      console.error('Biometric hardware check error:', error);
      return false;
    }
  },

  // Check if biometrics (Face ID / Fingerprint) are enrolled
  isEnrolled: async () => {
    try {
      return await LocalAuthentication.isEnrolledAsync();
    } catch (error) {
      console.error('Biometric enrollment check error:', error);
      return false;
    }
  },

  // Get supported biometric types (Face ID, Fingerprint, Iris)
  getSupportedTypes: async () => {
    try {
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      const typeNames = [];
      types.forEach(type => {
        if (type === LocalAuthentication.AuthenticationType.FINGERPRINT) {
          typeNames.push('Fingerprint');
        } else if (type === LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION) {
          typeNames.push('Face ID');
        } else if (type === LocalAuthentication.AuthenticationType.IRIS) {
          typeNames.push('Iris');
        }
      });
      return typeNames;
    } catch (error) {
      console.error('Biometric supported types error:', error);
      return [];
    }
  },

  // Trigger biometric authentication prompt
  authenticate: async (reason = 'Authenticate to access Bankee') => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: reason,
        fallbackLabel: 'Use Password',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });
      return result.success;
    } catch (error) {
      console.error('Biometric authentication error:', error);
      return false;
    }
  },

  // Check if user enabled biometrics setting
  isBiometricEnabled: async () => {
    try {
      const value = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
      return value === 'true';
    } catch (error) {
      return false;
    }
  },

  // Enable or disable biometrics preference
  setBiometricEnabled: async (enabled) => {
    try {
      await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, enabled ? 'true' : 'false');
      return true;
    } catch (error) {
      console.error('Set biometric enabled error:', error);
      return false;
    }
  },

  // Save credentials securely for biometric quick login
  saveCredentials: async (email, password) => {
    try {
      await AsyncStorage.setItem(SAVED_CREDENTIALS_KEY, JSON.stringify({ email, password }));
    } catch (error) {
      console.error('Save credentials error:', error);
    }
  },

  // Get saved credentials
  getSavedCredentials: async () => {
    try {
      const data = await AsyncStorage.getItem(SAVED_CREDENTIALS_KEY);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      return null;
    }
  },

  // Clear saved credentials
  clearSavedCredentials: async () => {
    try {
      await AsyncStorage.removeItem(SAVED_CREDENTIALS_KEY);
    } catch (error) {
      console.error('Clear credentials error:', error);
    }
  }
};
