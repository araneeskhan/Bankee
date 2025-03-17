import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  StatusBar,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from './styles';
import { auth, db, createUserProfile } from './firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { LoadingSpinner } from './LoadingSpinner';
import DateTimePicker from '@react-native-community/datetimepicker';

const { width, height } = Dimensions.get('window');

const SignUpScreen = ({ navigation }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    phoneNumber: '',
    dateOfBirth: new Date(),
    address: '',
    occupation: '',
  });

  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleSignUp = async () => {
    if (loading) return;
    setLoading(true);

    try {
      const { email, password, ...profileData } = formData;
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await createUserProfile(userCredential.user.uid, {
        email,
        ...profileData,
      });
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setFormData({ ...formData, dateOfBirth: selectedDate });
    }
  };

  const renderInput = (placeholder, value, onChangeText, options = {}) => (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>{placeholder}</Text>
      <TextInput
        style={[
          styles.input,
          options.multiline && { height: 100, textAlignVertical: 'top' }
        ]}
        placeholder={`Enter your ${placeholder.toLowerCase()}`}
        placeholderTextColor={COLORS.textSecondary}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={options.secure}
        multiline={options.multiline}
        keyboardType={options.keyboardType}
        autoCapitalize={options.autoCapitalize || 'none'}
        {...options}
      />
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Create Account</Text>
      <Text style={styles.stepDescription}>
        Enter your email and create a strong password
      </Text>
      {renderInput('Email', formData.email, 
        (text) => setFormData({ ...formData, email: text }),
        { keyboardType: 'email-address' }
      )}
      {renderInput('Password', formData.password,
        (text) => setFormData({ ...formData, password: text }),
        { secure: true }
      )}
      {renderInput('Confirm Password', formData.confirmPassword,
        (text) => setFormData({ ...formData, confirmPassword: text }),
        { secure: true }
      )}
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Personal Information</Text>
      <Text style={styles.stepDescription}>
        Tell us more about yourself
      </Text>
      {renderInput('Full Name', formData.name,
        (text) => setFormData({ ...formData, name: text }),
        { autoCapitalize: 'words' }
      )}
      {renderInput('Phone Number', formData.phoneNumber,
        (text) => setFormData({ ...formData, phoneNumber: text }),
        { keyboardType: 'phone-pad' }
      )}
      <TouchableOpacity
        style={styles.dateInputContainer}
        onPress={() => setShowDatePicker(true)}
      >
        <Text style={styles.inputLabel}>Date of Birth</Text>
        <View style={styles.dateInput}>
          <Text style={styles.dateText}>
            {formData.dateOfBirth.toLocaleDateString()}
          </Text>
          <FontAwesome5 name="calendar" size={16} color={COLORS.textSecondary} />
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Additional Details</Text>
      <Text style={styles.stepDescription}>
        Help us know you better
      </Text>
      {renderInput('Address', formData.address,
        (text) => setFormData({ ...formData, address: text }),
        { multiline: true, autoCapitalize: 'sentences' }
      )}
      {renderInput('Occupation', formData.occupation,
        (text) => setFormData({ ...formData, occupation: text }),
        { autoCapitalize: 'words' }
      )}
    </View>
  );

  const validateStep = () => {
    switch (step) {
      case 1:
        if (!formData.email || !formData.password || !formData.confirmPassword) {
          Alert.alert('Error', 'Please fill in all fields');
          return false;
        }
        if (formData.password !== formData.confirmPassword) {
          Alert.alert('Error', 'Passwords do not match');
          return false;
        }
        return true;
      case 2:
        if (!formData.name || !formData.phoneNumber) {
          Alert.alert('Error', 'Please fill in all fields');
          return false;
        }
        return true;
      case 3:
        if (!formData.address || !formData.occupation) {
          Alert.alert('Error', 'Please fill in all fields');
          return false;
        }
        return true;
      default:
        return false;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={[COLORS.background, COLORS.card]}
        style={styles.gradient}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidView}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => navigation.goBack()}
              >
                <FontAwesome5 name="arrow-left" size={20} color={COLORS.text} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Create Account</Text>
              <View style={{ width: 40 }} />
            </View>

            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill,
                    { width: `${(step / 3) * 100}%` }
                  ]} 
                />
              </View>
              <Text style={styles.progressText}>Step {step} of 3</Text>
            </View>

            <View style={styles.formContainer}>
              {step === 1 && renderStep1()}
              {step === 2 && renderStep2()}
              {step === 3 && renderStep3()}

              {showDatePicker && (
                <DateTimePicker
                  value={formData.dateOfBirth}
                  mode="date"
                  display="default"
                  onChange={handleDateChange}
                  maximumDate={new Date()}
                  minimumDate={new Date(1900, 0, 1)}
                />
              )}

              <View style={styles.buttonContainer}>
                {step > 1 && (
                  <TouchableOpacity
                    style={[styles.button, styles.backButton]}
                    onPress={() => setStep(step - 1)}
                  >
                    <Text style={styles.backButtonText}>Back</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[
                    styles.button, 
                    styles.nextButton,
                    loading && styles.disabledButton
                  ]}
                  onPress={() => {
                    if (validateStep()) {
                      if (step < 3) {
                        setStep(step + 1);
                      } else {
                        handleSignUp();
                      }
                    }
                  }}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color={COLORS.text} />
                  ) : (
                    <Text style={styles.nextButtonText}>
                      {step === 3 ? 'Create Account' : 'Continue'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Auth')}>
                <Text style={styles.loginText}>Login</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardAvoidView: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  progressBar: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.textSecondary,
    marginRight: 10,
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  progressText: {
    color: COLORS.text,
    fontSize: 14,
  },
  formContainer: {
    marginBottom: 30,
  },
  stepContainer: {
    marginBottom: 30,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
  },
  stepDescription: {
    color: COLORS.textSecondary,
    fontSize: 16,
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    color: COLORS.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dateInputContainer: {
    marginBottom: 16,
  },
  dateInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  dateText: {
    color: COLORS.text,
    fontSize: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
  },
  button: {
    flex: 1,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  backButton: {
    backgroundColor: COLORS.card,
  },
  nextButton: {
    backgroundColor: COLORS.primary,
  },
  backButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  nextButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  footerText: {
    color: COLORS.text,
    fontSize: 14,
  },
  loginText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  gradient: {
    flex: 1,
  },
  disabledButton: {
    opacity: 0.5,
  },
});

export default SignUpScreen; 