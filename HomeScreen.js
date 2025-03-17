import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Image,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Animated
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from './styles';
import { auth, db } from './firebase';
import { collection, query, orderBy, limit, onSnapshot, doc } from 'firebase/firestore';
import { formatCurrency, formatDate } from './utils';

const { width } = Dimensions.get('window');

const HomeScreen = ({ navigation }) => {
  const [userData, setUserData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showBalance, setShowBalance] = useState(true);
  
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

    // Listen to user data changes
    const userRef = doc(db, 'users', user.uid);
    const unsubscribeUser = onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        setUserData(doc.data());
      }
      setLoading(false);
    });

    // Listen to transactions
    const transactionsRef = collection(db, 'users', user.uid, 'transactions');
    const q = query(transactionsRef, orderBy('timestamp', 'desc'), limit(5));
    
    const unsubscribeTransactions = onSnapshot(q, (snapshot) => {
      const transactionsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: new Date(doc.data().timestamp).toLocaleDateString()
      }));
      setTransactions(transactionsData);
    });

    return () => {
      unsubscribeUser();
      unsubscribeTransactions();
    };
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    // The onSnapshot listeners will automatically update the data
    setTimeout(() => setRefreshing(false), 1000);
  };

  const renderTransaction = ({ item }) => {
    let icon, color, title;
    
    switch (item.type) {
      case 'sent':
        icon = 'arrow-up';
        color = COLORS.error;
        title = item.description || `To ${item.to?.name || 'Unknown'}`;
        break;
      case 'received':
        icon = 'arrow-down';
        color = COLORS.success;
        title = item.description || `From ${item.from?.name || 'Unknown'}`;
        break;
      case 'subscription':
        icon = 'credit-card';
        color = COLORS.primary;
        title = item.description || 'Subscription';
        break;
      case 'bill':
        icon = 'file-invoice-dollar';
        color = COLORS.primary;
        title = item.description || 'Bill Payment';
        break;
      default:
        icon = 'exchange-alt';
        color = COLORS.primary;
        title = item.description || 'Transaction';
    }
    
    return (
      <TouchableOpacity style={styles.transactionItem}>
        <View style={[styles.transactionIcon, { backgroundColor: color + '20' }]}>
          <FontAwesome5 name={icon} size={16} color={color} />
        </View>
        <View style={styles.transactionInfo}>
          <Text style={styles.transactionTitle}>{title}</Text>
          <Text style={styles.transactionDate}>{item.date}</Text>
        </View>
        <Text style={[
          styles.transactionAmount,
          { color: item.type === 'received' ? COLORS.success : COLORS.error }
        ]}>
          {item.type === 'received' ? '+' : '-'}${item.amount.toFixed(2)}
        </Text>
      </TouchableOpacity>
    );
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
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header with profile and notifications */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.profileButton}
            onPress={() => navigation.navigate('Profile')}
          >
            {userData?.profilePicture ? (
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
          </TouchableOpacity>
          
          <View style={styles.headerCenter}>
            <Text style={styles.welcomeText}>
              Welcome back,
            </Text>
            <Text style={styles.nameText}>
              {userData?.name || 'User'}
            </Text>
          </View>
          
          <TouchableOpacity 
            style={styles.notificationButton}
            onPress={() => navigation.navigate('Notifications')}
          >
            <FontAwesome5 name="bell" size={22} color={COLORS.text} />
            {userData?.unreadNotifications > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationCount}>
                  {userData.unreadNotifications > 9 ? '9+' : userData.unreadNotifications}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
        
        {/* Balance Card */}
        <Animated.View 
          style={[
            styles.balanceCard,
            {
              opacity: fadeAnim,
              transform: [{ translateY }]
            }
          ]}
        >
          <LinearGradient
            colors={COLORS.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.balanceGradient}
          >
            <View style={styles.balanceHeader}>
              <Text style={styles.balanceTitle}>Total Balance</Text>
              <TouchableOpacity 
                onPress={() => setShowBalance(!showBalance)}
                style={styles.eyeButton}
              >
                <FontAwesome5 
                  name={showBalance ? 'eye-slash' : 'eye'} 
                  size={18} 
                  color={COLORS.text} 
                />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.balanceAmount}>
              {showBalance ? formatCurrency(userData?.balance || 0) : '• • • • • •'}
            </Text>
            
            <View style={styles.balanceFooter}>
              <View style={styles.accountInfo}>
                <Text style={styles.accountLabel}>Account Number</Text>
                <Text style={styles.accountValue}>
                  {userData?.accountNumber?.replace(/(\d{4})/g, '$1 ').trim() || 'N/A'}
                </Text>
              </View>
              
              <TouchableOpacity 
                style={styles.addMoneyButton}
                onPress={() => navigation.navigate('Wallet')}
              >
                <FontAwesome5 name="wallet" size={16} color={COLORS.text} />
                <Text style={styles.addMoneyText}>Wallet</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </Animated.View>
        
        {/* Quick Actions */}
        <Animated.View 
          style={[
            styles.quickActionsSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: translateY }]
            }
          ]}
        >
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity 
              style={styles.quickAction}
              onPress={() => navigation.navigate('Wallet')}
            >
              <LinearGradient
                colors={[COLORS.primary + '20', COLORS.primary + '10']}
                style={styles.quickActionIcon}
              >
                <FontAwesome5 name="paper-plane" size={20} color={COLORS.primary} />
              </LinearGradient>
              <Text style={styles.quickActionText}>Send</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickAction}
              onPress={() => navigation.navigate('QRCode')}
            >
              <LinearGradient
                colors={[COLORS.success + '20', COLORS.success + '10']}
                style={styles.quickActionIcon}
              >
                <FontAwesome5 name="qrcode" size={20} color={COLORS.success} />
              </LinearGradient>
              <Text style={styles.quickActionText}>QR Code</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickAction}
              onPress={() => navigation.navigate('Services')}
            >
              <LinearGradient
                colors={[COLORS.error + '20', COLORS.error + '10']}
                style={styles.quickActionIcon}
              >
                <FontAwesome5 name="credit-card" size={20} color={COLORS.error} />
              </LinearGradient>
              <Text style={styles.quickActionText}>Pay Bills</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickAction}
              onPress={() => navigation.navigate('Contacts')}
            >
              <LinearGradient
                colors={['#9370DB20', '#9370DB10']}
                style={styles.quickActionIcon}
              >
                <FontAwesome5 name="user-plus" size={20} color="#9370DB" />
              </LinearGradient>
              <Text style={styles.quickActionText}>Contacts</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
        
        {/* Recent Transactions */}
        <View style={styles.transactionsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            <TouchableOpacity 
              onPress={() => navigation.navigate('TransactionHistory')}
            >
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          
          {transactions.length === 0 ? (
            <View style={styles.emptyTransactions}>
              <FontAwesome5 name="exchange-alt" size={40} color={COLORS.textSecondary} />
              <Text style={styles.emptyText}>No transactions yet</Text>
              <TouchableOpacity 
                style={styles.startTransactionButton}
                onPress={() => navigation.navigate('Wallet')}
              >
                <Text style={styles.startTransactionText}>Make Your First Transaction</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={transactions}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const isIncome = item.type === 'received';
                let icon, color;
                
                switch (item.type) {
                  case 'sent':
                    icon = 'arrow-up';
                    color = COLORS.error;
                    break;
                  case 'received':
                    icon = 'arrow-down';
                    color = COLORS.success;
                    break;
                  case 'subscription':
                    icon = 'credit-card';
                    color = COLORS.primary;
                    break;
                  case 'bill':
                    icon = 'file-invoice-dollar';
                    color = '#9370DB';
                    break;
                  default:
                    icon = 'exchange-alt';
                    color = COLORS.primary;
                }
                
                return (
                  <TouchableOpacity 
                    style={styles.transactionItem}
                    onPress={() => navigation.navigate('TransactionDetail', { transaction: item })}
                  >
                    <View style={[styles.transactionIcon, { backgroundColor: color + '20' }]}>
                      <FontAwesome5 name={icon} size={16} color={color} />
                    </View>
                    
                    <View style={styles.transactionInfo}>
                      <Text style={styles.transactionTitle}>
                        {item.description || (isIncome ? 
                          `From ${item.from?.name || 'Unknown'}` : 
                          `To ${item.to?.name || 'Unknown'}`)}
                      </Text>
                      <Text style={styles.transactionDate}>{item.formattedDate}</Text>
                    </View>
                    
                    <Text style={[
                      styles.transactionAmount,
                      { color: isIncome ? COLORS.success : COLORS.error }
                    ]}>
                      {isIncome ? '+' : '-'}{formatCurrency(item.amount)}
                    </Text>
                  </TouchableOpacity>
                );
              }}
              scrollEnabled={false}
              style={styles.transactionsList}
            />
          )}
        </View>
        
        {/* Promotions or Tips */}
        <View style={styles.promotionsSection}>
          <Text style={styles.sectionTitle}>Financial Tips</Text>
          
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.promotionsScroll}
          >
            <TouchableOpacity style={styles.promotionCard}>
              <LinearGradient
                colors={['#4A00E0', '#8E2DE2']}
                style={styles.promotionGradient}
              >
                <FontAwesome5 name="piggy-bank" size={24} color={COLORS.text} />
                <Text style={styles.promotionTitle}>Save Smart</Text>
                <Text style={styles.promotionDescription}>
                  Set up automatic transfers to your savings account
                </Text>
              </LinearGradient>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.promotionCard}>
              <LinearGradient
                colors={['#00B4DB', '#0083B0']}
                style={styles.promotionGradient}
              >
                <FontAwesome5 name="chart-line" size={24} color={COLORS.text} />
                <Text style={styles.promotionTitle}>Track Expenses</Text>
                <Text style={styles.promotionDescription}>
                  Monitor your spending patterns to save more
                </Text>
              </LinearGradient>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.promotionCard}>
              <LinearGradient
                colors={['#FF416C', '#FF4B2B']}
                style={styles.promotionGradient}
              >
                <FontAwesome5 name="shield-alt" size={24} color={COLORS.text} />
                <Text style={styles.promotionTitle}>Security First</Text>
                <Text style={styles.promotionDescription}>
                  Enable biometric authentication for extra security
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </View>
        
        {/* Bottom spacing for tab bar */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  profileButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  profilePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.primary + '30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitial: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  headerCenter: {
    flex: 1,
    marginLeft: 15,
  },
  welcomeText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  nameText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: COLORS.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notificationCount: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: 'bold',
  },
  balanceCard: {
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  balanceGradient: {
    padding: 24,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  balanceTitle: {
    fontSize: 16,
    color: COLORS.text,
    opacity: 0.8,
  },
  eyeButton: {
    padding: 4,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 24,
  },
  balanceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  accountInfo: {
    flex: 1,
  },
  accountLabel: {
    fontSize: 12,
    color: COLORS.text,
    opacity: 0.7,
    marginBottom: 4,
  },
  accountValue: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '600',
  },
  addMoneyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  addMoneyText: {
    color: COLORS.text,
    fontWeight: '600',
    marginLeft: 8,
  },
  quickActionsSection: {
    marginTop: 30,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickAction: {
    width: (width - 60) / 4,
    alignItems: 'center',
    marginBottom: 16,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    color: COLORS.text,
    textAlign: 'center',
  },
  transactionsSection: {
    marginTop: 30,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  seeAllText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  emptyTransactions: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 16,
    marginBottom: 24,
  },
  startTransactionButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  startTransactionText: {
    color: COLORS.text,
    fontWeight: 'bold',
  },
  transactionsList: {
    marginBottom: 16,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  promotionsSection: {
    marginTop: 30,
    paddingHorizontal: 20,
  },
  promotionsScroll: {
    marginBottom: 16,
  },
  promotionCard: {
    width: width * 0.7,
    height: 150,
    borderRadius: 16,
    overflow: 'hidden',
    marginRight: 16,
  },
  promotionGradient: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  promotionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 12,
    marginBottom: 8,
  },
  promotionDescription: {
    fontSize: 14,
    color: COLORS.text,
    opacity: 0.8,
  },
  bottomSpacing: {
    height: 100,
  },
});

export default HomeScreen;