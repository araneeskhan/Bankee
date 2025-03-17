import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  SafeAreaView, 
  TouchableOpacity, 
  ScrollView, 
  StatusBar,
  FlatList,
  Image,
  Alert,
  ActivityIndicator
} from 'react-native';
import { 
  Ionicons, 
  FontAwesome5,
  MaterialCommunityIcons
} from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from './styles';
import { formatCurrency } from './utils';
import { auth, db, purchaseSubscription, payBill } from './firebase';
import { collection, query, onSnapshot, doc, getDocs } from 'firebase/firestore';
import { SubscriptionModal } from './SubscriptionModal';
import { BillPaymentModal } from './BillPaymentModal';
import { Toast } from './components/Toast';

const services = [
  {
    id: '1',
    name: 'Netflix',
    description: 'Stream movies and TV shows',
    icon: require('./assets/netflix-icon.png'),
    color: ['#E50914', '#B81D24'],
    plans: [
      { id: 'monthly', name: 'Monthly', price: 9.99 },
      { id: 'quarterly', name: 'Quarterly', price: 27.99 },
      { id: 'yearly', name: 'Yearly', price: 99.99 }
    ]
  },
  {
    id: '2',
    name: 'Spotify',
    description: 'Music streaming service',
    icon: require('./assets/spotify-icon.png'),
    color: ['#1DB954', '#1AA34A'],
    plans: [
      { id: 'monthly', name: 'Monthly', price: 9.99 },
      { id: 'yearly', name: 'Yearly', price: 99.99 }
    ]
  },
  {
    id: '3',
    name: 'Amazon Prime',
    description: 'Shopping and entertainment',
    icon: require('./assets/amazon-icon.png'),
    color: ['#00A8E1', '#0082B4'],
    plans: [
      { id: 'monthly', name: 'Monthly', price: 12.99 },
      { id: 'yearly', name: 'Yearly', price: 119.99 }
    ]
  },
  {
    id: '4',
    name: 'Disney+',
    description: 'Disney, Marvel, Star Wars',
    icon: require('./assets/disney-icon.png'),
    color: ['#0063E5', '#0050B5'],
    plans: [
      { id: 'monthly', name: 'Monthly', price: 7.99 },
      { id: 'yearly', name: 'Yearly', price: 79.99 }
    ]
  },
  {
    id: '5',
    name: 'YouTube Premium',
    description: 'Ad-free videos and music',
    icon: require('./assets/youtube-icon.png'),
    color: ['#FF0000', '#CC0000'],
    plans: [
      { id: 'monthly', name: 'Monthly', price: 11.99 },
      { id: 'yearly', name: 'Yearly', price: 119.99 }
    ]
  },
  {
    id: '6',
    name: 'Apple TV+',
    description: 'Original shows and movies',
    icon: require('./assets/apple-tv-icon.png'),
    color: ['#000000', '#333333'],
    plans: [
      { id: 'monthly', name: 'Monthly', price: 4.99 },
      { id: 'yearly', name: 'Yearly', price: 49.99 }
    ]
  }
];

const ServiceScreen = ({ navigation }) => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState(null);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [toast, setToast] = useState({
    visible: false,
    message: '',
    type: 'success'
  });

  useEffect(() => {
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

  const handleServicePress = (service) => {
    setSelectedService(service);
    setShowSubscriptionModal(true);
  };

  const handleSubscribe = async (service, plan) => {
    try {
      setLoading(true);
      
      await purchaseSubscription(
        auth.currentUser.uid,
        {
          serviceId: service.id,
          serviceName: service.name,
          planId: plan.id,
          planName: plan.name,
          price: plan.price,
          description: `${service.name} ${plan.name} Subscription`
        }
      );
      
      setToast({
        visible: true,
        message: `Successfully subscribed to ${service.name} ${plan.name} plan!`,
        type: 'success'
      });
      
      setShowSubscriptionModal(false);
      setSelectedService(null);
    } catch (error) {
      setToast({
        visible: true,
        message: error.message,
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const renderServiceItem = ({ item }) => (
    <TouchableOpacity
      style={styles.serviceCard}
      onPress={() => handleServicePress(item)}
    >
      <LinearGradient
        colors={item.color}
        style={styles.serviceIconContainer}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Image source={item.icon} style={styles.serviceIcon} />
      </LinearGradient>
      <View style={styles.serviceInfo}>
        <Text style={styles.serviceName}>{item.name}</Text>
        <Text style={styles.serviceDescription}>{item.description}</Text>
      </View>
      <FontAwesome5 name="chevron-right" size={16} color={COLORS.textSecondary} />
    </TouchableOpacity>
  );

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
        <Text style={styles.headerTitle}>Services</Text>
        <TouchableOpacity>
          <FontAwesome5 name="search" size={20} color={COLORS.text} />
        </TouchableOpacity>
      </View>
      
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.featuredContainer}>
          <LinearGradient
            colors={['#4A00E0', '#8E2DE2']}
            style={styles.featuredCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.featuredContent}>
              <Text style={styles.featuredTitle}>Premium Services</Text>
              <Text style={styles.featuredSubtitle}>
                Subscribe to premium services with your account
              </Text>
              <TouchableOpacity style={styles.featuredButton}>
                <Text style={styles.featuredButtonText}>Explore All</Text>
              </TouchableOpacity>
            </View>
            <Image 
              source={require('./assets/services-illustration.png')} 
              style={styles.featuredImage}
              resizeMode="contain"
            />
          </LinearGradient>
        </View>
        
        <View style={styles.servicesContainer}>
          <Text style={styles.sectionTitle}>Popular Services</Text>
          <FlatList
            data={services}
            renderItem={renderServiceItem}
            keyExtractor={item => item.id}
            scrollEnabled={false}
          />
        </View>
        
        <View style={styles.subscriptionsContainer}>
          <Text style={styles.sectionTitle}>Your Subscriptions</Text>
          {userData?.subscriptions && userData.subscriptions.length > 0 ? (
            userData.subscriptions.map((subscription, index) => (
              <View key={index} style={styles.subscriptionItem}>
                <View style={styles.subscriptionInfo}>
                  <Text style={styles.subscriptionName}>{subscription.name}</Text>
                  <Text style={styles.subscriptionPlan}>{subscription.plan}</Text>
                </View>
                <Text style={styles.subscriptionPrice}>
                  ${subscription.price.toFixed(2)}
                </Text>
              </View>
            ))
          ) : (
            <View style={styles.emptySubscriptions}>
              <FontAwesome5 name="credit-card" size={40} color={COLORS.textSecondary} />
              <Text style={styles.emptyText}>No active subscriptions</Text>
            </View>
          )}
        </View>
      </ScrollView>
      
      <SubscriptionModal
        visible={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        service={selectedService}
        currentBalance={userData?.balance || 0}
        onSubscribe={handleSubscribe}
      />
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
  scrollView: {
    flex: 1,
  },
  featuredContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  featuredCard: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 20,
    overflow: 'hidden',
  },
  featuredContent: {
    flex: 1,
  },
  featuredTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  featuredSubtitle: {
    fontSize: 14,
    color: COLORS.text,
    opacity: 0.8,
    marginBottom: 16,
  },
  featuredButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },
  featuredButtonText: {
    color: COLORS.text,
    fontWeight: '600',
  },
  featuredImage: {
    width: 100,
    height: 100,
  },
  servicesContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
  },
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  serviceIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  serviceIcon: {
    width: 24,
    height: 24,
    tintColor: COLORS.text,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  serviceDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  subscriptionsContainer: {
    paddingHorizontal: 20,
    marginBottom: 100, // Extra space for tab bar
  },
  subscriptionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  subscriptionInfo: {
    flex: 1,
  },
  subscriptionName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  subscriptionPlan: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  subscriptionPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  emptySubscriptions: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 16,
  },
});

export default ServiceScreen;
  