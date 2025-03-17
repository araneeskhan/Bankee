import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Switch,
  Animated,
  Dimensions,
  StatusBar
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from './styles';
import { auth, db, updateUserProfile, updateProfilePicture } from './firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import { formatDate } from './utils';
import { Toast } from './components/Toast';

const { width } = Dimensions.get('window');

const ProfileScreen = ({ navigation }) => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [toast, setToast] = useState({
    visible: false,
    message: '',
    type: 'info'
  });
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    // Start entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
    
    const user = auth.currentUser;
    if (!user) {
      navigation.replace('Auth');
      return;
    }

    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        setUserData(doc.data());
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      setToast({
        visible: true,
        message: 'You have been successfully logged out',
        type: 'info'
      });
      
      setTimeout(() => {
        navigation.replace('Auth');
      }, 1000);
    } catch (error) {
      setToast({
        visible: true,
        message: 'Error logging out. Please try again.',
        type: 'error'
      });
    }
  };

  const handlePickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please allow access to your photo library');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setUploadingImage(true);
        try {
          await updateProfilePicture(auth.currentUser.uid, result.assets[0].uri);
          setToast({
            visible: true,
            message: 'Profile picture updated successfully',
            type: 'success'
          });
        } catch (error) {
          setToast({
            visible: true,
            message: 'Failed to update profile picture',
            type: 'error'
          });
        } finally {
          setUploadingImage(false);
        }
      }
    } catch (error) {
      setToast({
        visible: true,
        message: error.message,
        type: 'error'
      });
    }
  };

  const toggleNotification = async (type) => {
    try {
      const notifications = {
        ...userData.notifications,
        [type]: !userData.notifications[type]
      };
      await updateUserProfile(auth.currentUser.uid, { notifications });
      setToast({
        visible: true,
        message: `${type.charAt(0).toUpperCase() + type.slice(1)} notifications ${userData.notifications[type] ? 'disabled' : 'enabled'}`,
        type: 'success'
      });
    } catch (error) {
      setToast({
        visible: true,
        message: error.message,
        type: 'error'
      });
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity 
          style={styles.notificationButton}
          onPress={() => navigation.navigate('Notifications')}
        >
          <FontAwesome5 name="bell" size={20} color={COLORS.text} />
          {userData?.unreadNotifications > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationCount}>
                {userData.unreadNotifications > 9 ? '9+' : userData.unreadNotifications}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <Animated.View 
          style={[
            styles.profileHeader,
            {
              opacity: fadeAnim,
              transform: [{ translateY }]
            }
          ]}
        >
          <LinearGradient
            colors={[COLORS.card, COLORS.cardLight]}
            style={styles.profileHeaderGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <TouchableOpacity 
              style={styles.profileImageContainer}
              onPress={handlePickImage}
              disabled={uploadingImage}
            >
              {uploadingImage ? (
                <View style={styles.profilePlaceholder}>
                  <ActivityIndicator color={COLORS.primary} />
                </View>
              ) : userData?.profilePicture ? (
                <Image 
                  source={{ uri: userData.profilePicture }} 
                  style={styles.profileImage} 
                />
              ) : (
                <View style={styles.profilePlaceholder}>
                  <Text style={styles.profileInitial}>
                    {userData?.name?.charAt(0) || 'U'}
                  </Text>
                </View>
              )}
              <View style={styles.editIconContainer}>
                <FontAwesome5 name="camera" size={12} color={COLORS.text} />
              </View>
            </TouchableOpacity>
            
            <Text style={styles.profileName}>{userData?.name || 'User'}</Text>
            <Text style={styles.profileEmail}>{userData?.email || 'No email'}</Text>
            
            <View style={styles.accountInfo}>
              <View style={styles.accountInfoItem}>
                <Text style={styles.accountInfoLabel}>Account Number</Text>
                <Text style={styles.accountInfoValue}>
                  {userData?.accountNumber?.replace(/(\d{4})/g, '$1 ').trim() || 'N/A'}
                </Text>
              </View>
              
              <View style={styles.accountInfoDivider} />
              
              <View style={styles.accountInfoItem}>
                <Text style={styles.accountInfoLabel}>IBAN</Text>
                <Text style={styles.accountInfoValue}>
                  {userData?.iban?.substring(0, 8) + '...' || 'N/A'}
                </Text>
              </View>
            </View>
            
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{userData?.balance ? `$${userData.balance.toFixed(2)}` : '$0.00'}</Text>
                <Text style={styles.statLabel}>Balance</Text>
              </View>
              
              <View style={styles.statDivider} />
              
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{userData?.transactions?.length || 0}</Text>
                <Text style={styles.statLabel}>Transactions</Text>
              </View>
              
              <View style={styles.statDivider} />
              
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{userData?.subscriptions?.length || 0}</Text>
                <Text style={styles.statLabel}>Subscriptions</Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          
          <View style={styles.infoItem}>
            <View style={styles.infoIconContainer}>
              <FontAwesome5 name="user" size={16} color={COLORS.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Full Name</Text>
              <Text style={styles.infoValue}>{userData?.name || 'Not set'}</Text>
            </View>
          </View>
          
          <View style={styles.infoItem}>
            <View style={styles.infoIconContainer}>
              <FontAwesome5 name="envelope" size={16} color={COLORS.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{userData?.email || 'Not set'}</Text>
            </View>
          </View>
          
          <View style={styles.infoItem}>
            <View style={styles.infoIconContainer}>
              <FontAwesome5 name="phone" size={16} color={COLORS.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Phone Number</Text>
              <Text style={styles.infoValue}>{userData?.phoneNumber || 'Not set'}</Text>
            </View>
          </View>
          
          <View style={styles.infoItem}>
            <View style={styles.infoIconContainer}>
              <FontAwesome5 name="map-marker-alt" size={16} color={COLORS.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Address</Text>
              <Text style={styles.infoValue}>{userData?.address || 'Not set'}</Text>
            </View>
          </View>
          
          <View style={styles.infoItem}>
            <View style={styles.infoIconContainer}>
              <FontAwesome5 name="calendar-alt" size={16} color={COLORS.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Date of Birth</Text>
              <Text style={styles.infoValue}>{userData?.dateOfBirth ? formatDate(userData.dateOfBirth) : 'Not set'}</Text>
            </View>
          </View>
          
          <View style={styles.infoItem}>
            <View style={styles.infoIconContainer}>
              <FontAwesome5 name="briefcase" size={16} color={COLORS.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Occupation</Text>
              <Text style={styles.infoValue}>{userData?.occupation || 'Not set'}</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingContent}>
              <View style={styles.settingIconContainer}>
                <FontAwesome5 name="bell" size={16} color={COLORS.primary} />
              </View>
              <Text style={styles.settingLabel}>Transaction Notifications</Text>
            </View>
            <Switch
              value={userData?.notifications?.transactions || false}
              onValueChange={() => toggleNotification('transactions')}
              trackColor={{ false: COLORS.cardLight, true: COLORS.primary + '80' }}
              thumbColor={userData?.notifications?.transactions ? COLORS.primary : COLORS.textSecondary}
            />
          </View>
          
          <View style={styles.settingItem}>
            <View style={styles.settingContent}>
              <View style={styles.settingIconContainer}>
                <FontAwesome5 name="shield-alt" size={16} color={COLORS.primary} />
              </View>
              <Text style={styles.settingLabel}>Security Alerts</Text>
            </View>
            <Switch
              value={userData?.notifications?.security || false}
              onValueChange={() => toggleNotification('security')}
              trackColor={{ false: COLORS.cardLight, true: COLORS.primary + '80' }}
              thumbColor={userData?.notifications?.security ? COLORS.primary : COLORS.textSecondary}
            />
          </View>
          
          <View style={styles.settingItem}>
            <View style={styles.settingContent}>
              <View style={styles.settingIconContainer}>
                <FontAwesome5 name="tag" size={16} color={COLORS.primary} />
              </View>
              <Text style={styles.settingLabel}>Marketing Notifications</Text>
            </View>
            <Switch
              value={userData?.notifications?.marketing || false}
              onValueChange={() => toggleNotification('marketing')}
              trackColor={{ false: COLORS.cardLight, true: COLORS.primary + '80' }}
              thumbColor={userData?.notifications?.marketing ? COLORS.primary : COLORS.textSecondary}
            />
          </View>
          
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => navigation.navigate('TransactionHistory')}
          >
            <View style={styles.settingContent}>
              <View style={styles.settingIconContainer}>
                <FontAwesome5 name="history" size={16} color={COLORS.primary} />
              </View>
              <Text style={styles.settingLabel}>Transaction History</Text>
            </View>
            <FontAwesome5 name="chevron-right" size={16} color={COLORS.textSecondary} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => Alert.alert('Coming Soon', 'This feature will be available in a future update.')}
          >
            <View style={styles.settingContent}>
              <View style={styles.settingIconContainer}>
                <FontAwesome5 name="lock" size={16} color={COLORS.primary} />
              </View>
              <Text style={styles.settingLabel}>Change Password</Text>
            </View>
            <FontAwesome5 name="chevron-right" size={16} color={COLORS.textSecondary} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => Alert.alert('Coming Soon', 'This feature will be available in a future update.')}
          >
            <View style={styles.settingContent}>
              <View style={styles.settingIconContainer}>
                <FontAwesome5 name="fingerprint" size={16} color={COLORS.primary} />
              </View>
              <Text style={styles.settingLabel}>Biometric Authentication</Text>
            </View>
            <FontAwesome5 name="chevron-right" size={16} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <FontAwesome5 name="sign-out-alt" size={20} color={COLORS.error} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
        
        <View style={styles.bottomSpacing} />
      </ScrollView>
      
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, visible: false })}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: COLORS.error,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationCount: {
    color: COLORS.text,
    fontSize: 10,
    fontWeight: 'bold',
  },
  profileHeader: {
    marginHorizontal: 20,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 24,
  },
  profileHeaderGradient: {
    padding: 24,
    alignItems: 'center',
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  profilePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.cardLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  profileInitial: {
    fontSize: 40,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  editIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.primary,
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.background,
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 24,
  },
  accountInfo: {
    flexDirection: 'row',
    backgroundColor: COLORS.cardLight,
    borderRadius: 16,
    padding: 16,
    width: '100%',
  },
  accountInfoItem: {
    flex: 1,
    alignItems: 'center',
  },
  accountInfoDivider: {
    width: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 16,
  },
  accountInfoLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  accountInfoValue: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.cardLight,
    borderRadius: 16,
    padding: 16,
    width: '100%',
    marginTop: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 16,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: COLORS.text,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  settingContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    color: COLORS.text,
  },
  logoutButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginTop: 32,
    marginHorizontal: 20,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.error,
    marginLeft: 8,
  },
  bottomSpacing: {
    height: 100,
  },
});

export default ProfileScreen;
