import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  SafeAreaView,
  FlatList,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { COLORS } from './styles';
import { auth, db } from './firebase';
import { collection, query, orderBy, onSnapshot, doc } from 'firebase/firestore';
import { formatDate } from './utils';

const TransactionHistoryScreen = ({ navigation }) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      navigation.replace('Auth');
      return;
    }

    // Get user data for account info
    const userRef = doc(db, 'users', user.uid);
    const unsubscribeUser = onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        setUserData(doc.data());
      }
    });

    // Get all transactions
    const transactionsRef = collection(db, 'users', user.uid, 'transactions');
    const q = query(transactionsRef, orderBy('timestamp', 'desc'));
    
    const unsubscribeTransactions = onSnapshot(q, (snapshot) => {
      const transactionsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        formattedDate: formatDate(doc.data().timestamp)
      }));
      setTransactions(transactionsData);
      setLoading(false);
    });

    return () => {
      unsubscribeUser();
      unsubscribeTransactions();
    };
  }, []);

  const filteredTransactions = transactions.filter(transaction => {
    if (filter === 'all') return true;
    return transaction.type === filter;
  });

  const renderTransactionItem = ({ item }) => {
    let icon, color, title, subtitle;
    
    switch (item.type) {
      case 'sent':
        icon = 'arrow-up';
        color = COLORS.error;
        title = item.description || `To ${item.to?.name || 'Unknown'}`;
        subtitle = `Account: ${item.to?.accountNumber || 'N/A'}`;
        break;
      case 'received':
        icon = 'arrow-down';
        color = COLORS.success;
        title = item.description || `From ${item.from?.name || 'Unknown'}`;
        subtitle = `Account: ${item.from?.accountNumber || 'N/A'}`;
        break;
      case 'subscription':
        icon = 'credit-card';
        color = COLORS.primary;
        title = item.description || 'Subscription';
        subtitle = `Service: ${item.name || 'Unknown'}`;
        break;
      case 'bill':
        icon = 'file-invoice-dollar';
        color = COLORS.primary;
        title = item.description || 'Bill Payment';
        subtitle = `Bill Number: ${item.billNumber || 'N/A'}`;
        break;
      default:
        icon = 'exchange-alt';
        color = COLORS.primary;
        title = item.description || 'Transaction';
        subtitle = 'General transaction';
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
          <Text style={styles.transactionTitle}>{title}</Text>
          <Text style={styles.transactionSubtitle}>{subtitle}</Text>
          <Text style={styles.transactionDate}>{item.formattedDate}</Text>
        </View>
        <View style={styles.transactionAmount}>
          <Text style={[
            styles.amountText,
            { color: item.type === 'received' ? COLORS.success : COLORS.error }
          ]}>
            {item.type === 'received' ? '+' : '-'}${item.amount.toFixed(2)}
          </Text>
          <Text style={styles.statusText}>
            {item.status === 'completed' ? 'Completed' : item.status}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderFilterButton = (filterType, label) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        filter === filterType ? styles.activeFilterButton : null
      ]}
      onPress={() => setFilter(filterType)}
    >
      <Text style={[
        styles.filterButtonText,
        filter === filterType ? styles.activeFilterText : null
      ]}>
        {label}
      </Text>
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
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <FontAwesome5 name="arrow-left" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transaction History</Text>
        <View style={{ width: 20 }} />
      </View>
      
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {renderFilterButton('all', 'All')}
          {renderFilterButton('sent', 'Sent')}
          {renderFilterButton('received', 'Received')}
          {renderFilterButton('subscription', 'Subscriptions')}
          {renderFilterButton('bill', 'Bills')}
        </ScrollView>
      </View>
      
      {filteredTransactions.length > 0 ? (
        <FlatList
          data={filteredTransactions}
          renderItem={renderTransactionItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.transactionsList}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <FontAwesome5 name="history" size={50} color={COLORS.textSecondary} />
          <Text style={styles.emptyText}>No transactions found</Text>
        </View>
      )}
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
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  filtersContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    marginRight: 8,
  },
  activeFilterButton: {
    backgroundColor: COLORS.primary,
  },
  filterButtonText: {
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  activeFilterText: {
    color: COLORS.text,
  },
  transactionsList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
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
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  transactionSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statusText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 16,
  },
});

export default TransactionHistoryScreen; 