import React, { useState, useRef, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  SafeAreaView, 
  TouchableOpacity, 
  ScrollView, 
  Animated, 
  Dimensions,
  StatusBar,
  FlatList,
  Image,
  Alert,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { 
  Ionicons, 
  MaterialCommunityIcons, 
  FontAwesome5 
} from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from './styles';
import { formatCurrency, formatDate } from './utils';
import { auth, db, processTransaction } from './firebase';
import { 
  doc, 
  getDoc, 
  updateDoc, 
  addDoc, 
  collection, 
  query, 
  orderBy, 
  onSnapshot,
  runTransaction,
  limit
} from 'firebase/firestore';
import { TransferModal } from './TransferModal';
import { SubscriptionModal } from './SubscriptionModal';
import { ContactModal } from './ContactModal';

const { width: screenWidth } = Dimensions.get('window');
const cardWidth = screenWidth - 40;

const WalletScreen = ({ navigation }) => {
  const [activeWallet, setActiveWallet] = useState(0);
  const [wallets, setWallets] = useState([
    {
      id: '1',
      name: 'Main Account',
      balance: 5842.50,
      cardType: 'Visa',
      cardNumber: '•••• •••• •••• 4785',
      expiryDate: '09/28',
      color: COLORS.gradient
    },
    {
      id: '2',
      name: 'Savings',
      balance: 12340.75,
      cardType: 'Mastercard',
      cardNumber: '•••• •••• •••• 9218',
      expiryDate: '11/26',
      color: ['#5E5CE6', '#9198e5']
    }
  ]);
  
  const [transactions, setTransactions] = useState([]);
  
  const flatListRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);

  useEffect(() => {
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
        
        // Update wallets with real balance
        setWallets(prevWallets => [
          {
            ...prevWallets[0],
            balance: doc.data().balance || 0
          },
          ...prevWallets.slice(1)
        ]);
      }
      setLoading(false);
    });

    // Listen to transactions
    const transactionsRef = collection(db, 'users', user.uid, 'transactions');
    const q = query(transactionsRef, orderBy('timestamp', 'desc'), limit(20));
    
    const unsubscribeTransactions = onSnapshot(q, (snapshot) => {
      const transactionsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Format date for display
        date: new Date(doc.data().timestamp).toLocaleDateString()
      }));
      setTransactions(transactionsData);
    });

    return () => {
      unsubscribeUser();
      unsubscribeTransactions();
    };
  }, []);

  const handleWalletChange = (event) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / cardWidth);
    setActiveWallet(index);
  };
  
  const renderWalletCard = ({ item, index }) => {
    return (
      <View style={styles.walletCardContainer}>
        <LinearGradient
          colors={item.color}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.walletCard}
        >
          <View style={styles.walletCardHeader}>
            <Text style={styles.walletName}>{item.name}</Text>
            <Image 
              source={item.cardType === 'Visa' 
                ? require('./assets/visa-logo.png') 
                : require('./assets/mastercard-logo.png')} 
              style={styles.cardTypeIcon}
              resizeMode="contain"
            />
          </View>
          
          <Text style={styles.walletBalance}>${item.balance.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })}</Text>
          
          <View style={styles.walletCardFooter}>
            <Text style={styles.cardNumber}>{item.cardNumber}</Text>
            <Text style={styles.expiryDate}>Exp: {item.expiryDate}</Text>
          </View>
        </LinearGradient>
      </View>
    );
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
      <View style={styles.transactionItem}>
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
      </View>
    );
  };

  const handleTransaction = async (type, amount, recipient = null) => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await transaction.get(userRef);

        if (!userDoc.exists()) {
          throw new Error('User document does not exist!');
        }

        const newBalance = userDoc.data().balance + (type === 'income' ? amount : -amount);

        if (newBalance < 0) {
          throw new Error('Insufficient funds');
        }

        transaction.update(userRef, { balance: newBalance });

        // Add transaction record
        const transactionData = {
          type,
          amount,
          timestamp: new Date().toISOString(),
          recipient: recipient,
          status: 'completed'
        };

        await addDoc(collection(db, 'users', user.uid, 'transactions'), transactionData);

        if (recipient) {
          const recipientRef = doc(db, 'users', recipient.id);
          const recipientDoc = await transaction.get(recipientRef);

          if (recipientDoc.exists()) {
            transaction.update(recipientRef, {
              balance: recipientDoc.data().balance + amount
            });

            await addDoc(collection(db, 'users', recipient.id, 'transactions'), {
              ...transactionData,
              type: 'income',
              recipient: {
                id: user.uid,
                name: userDoc.data().fullName
              }
            });
          }
        }
      });

      Alert.alert('Success', 'Transaction completed successfully');
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    // The onSnapshot listeners will automatically update the data
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleSendMoney = async (contact, amount, description) => {
    if (!contact || !amount) return;
    
    try {
      setLoading(true);
      await processTransaction(
        auth.currentUser.uid,
        contact.userId,
        amount,
        description || `Payment to ${contact.name}`
      );
      
      // Show success message
      Alert.alert(
        'Success',
        `Successfully sent $${amount.toFixed(2)} to ${contact.name}`
      );
      
      // Close modal
      setShowContactModal(false);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }>
        <View style={styles.header}>
          <Text style={styles.screenTitle}>My Wallets</Text>
          <TouchableOpacity style={styles.addButton}>
            <Ionicons name="add-circle" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.walletsContainer}>
          <FlatList
            ref={flatListRef}
            data={wallets}
            renderItem={renderWalletCard}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={cardWidth}
            decelerationRate="fast"
            onMomentumScrollEnd={handleWalletChange}
            contentContainerStyle={styles.walletList}
          />
          
          <View style={styles.paginationContainer}>
            {wallets.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.paginationDot,
                  index === activeWallet && styles.paginationDotActive
                ]}
              />
            ))}
          </View>
        </View>
        
        <View style={styles.actionsContainer}>
          <View style={styles.actionsRow}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => setShowContactModal(true)}
            >
              <View style={[styles.actionButtonIcon, { backgroundColor: COLORS.primary + '20' }]}>
                <FontAwesome5 name="paper-plane" size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.actionButtonText}>Send Money</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionButton}>
              <View style={[styles.actionButtonIcon, { backgroundColor: COLORS.success + '20' }]}>
                <FontAwesome5 name="qrcode" size={20} color={COLORS.success} />
              </View>
              <Text style={styles.actionButtonText}>Scan QR</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionButton}>
              <View style={[styles.actionButtonIcon, { backgroundColor: COLORS.error + '20' }]}>
                <FontAwesome5 name="credit-card" size={20} color={COLORS.error} />
              </View>
              <Text style={styles.actionButtonText}>Pay Bills</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('TransactionHistory')}
            >
              <View style={[styles.actionButtonIcon, { backgroundColor: '#9370DB20' }]}>
                <FontAwesome5 name="history" size={20} color="#9370DB" />
              </View>
              <Text style={styles.actionButtonText}>History</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.transactionsContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Transaction History</Text>
            <View style={styles.filterContainer}>
              <TouchableOpacity style={styles.filterButton}>
                <Text style={styles.filterButtonText}>All</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.filterButton, styles.filterButtonInactive]}>
                <Text style={styles.filterButtonTextInactive}>Income</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.filterButton, styles.filterButtonInactive]}>
                <Text style={styles.filterButtonTextInactive}>Expense</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <FlatList
            data={transactions}
            renderItem={renderTransaction}
            keyExtractor={item => item.id}
            scrollEnabled={false}
            contentContainerStyle={styles.transactionsList}
          />
          
          <TouchableOpacity 
            style={styles.viewAllButton}
            onPress={() => navigation.navigate('TransactionHistory')}
          >
            <Text style={styles.viewAllButtonText}>View All Transactions</Text>
          </TouchableOpacity>
        </View>
        
        <View style={{height: 100}} />
      </ScrollView>

      <TransferModal
        visible={showTransferModal}
        onClose={() => {
          setShowTransferModal(false);
          setSelectedContact(null);
        }}
        contact={selectedContact}
        currentBalance={wallets[activeWallet].balance}
      />

      <SubscriptionModal
        visible={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
      />

      <ContactModal
        visible={showContactModal}
        onClose={() => setShowContactModal(false)}
        onSendMoney={handleSendMoney}
      />
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  walletsContainer: {
    marginBottom: 24,
  },
  walletList: {
    paddingHorizontal: 20,
  },
  walletCardContainer: {
    width: cardWidth,
    paddingRight: 20,
  },
  walletCard: {
    borderRadius: 24,
    padding: 24,
    height: 200,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  walletCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  walletName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  cardTypeIcon: {
    width: 50,
    height: 30,
  },
  walletBalance: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.text,
    marginVertical: 20,
  },
  walletCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardNumber: {
    fontSize: 16,
    color: COLORS.text,
    opacity: 0.8,
  },
  expiryDate: {
    fontSize: 14,
    color: COLORS.text,
    opacity: 0.8,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.textSecondary,
    marginHorizontal: 4,
    opacity: 0.5,
  },
  paginationDotActive: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
    opacity: 1,
  },
  actionsContainer: {
    marginHorizontal: 20,
    marginBottom: 32,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    alignItems: 'center',
  },
  actionButtonIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.cardLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionButtonText: {
    fontSize: 12,
    color: COLORS.text,
  },
  transactionsContainer: {
    marginHorizontal: 20,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 4,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  filterButtonInactive: {
    backgroundColor: 'transparent',
  },
  filterButtonText: {
    color: COLORS.text,
    fontWeight: '600',
    fontSize: 14,
  },
  filterButtonTextInactive: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  transactionsList: {
    marginTop: 8,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.cardLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  transactionDate: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  viewAllButton: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  viewAllButtonText: {
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: 16,
  }
});

export default WalletScreen;