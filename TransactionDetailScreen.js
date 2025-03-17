import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Share
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from './styles';
import { formatDate } from './utils';

const TransactionDetailScreen = ({ route, navigation }) => {
  const { transaction } = route.params;
  
  const isIncome = transaction.type === 'received';
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return COLORS.success;
      case 'pending':
        return COLORS.warning;
      case 'failed':
        return COLORS.error;
      default:
        return COLORS.textSecondary;
    }
  };
  
  const getTransactionIcon = () => {
    switch (transaction.type) {
      case 'sent':
        return 'arrow-up';
      case 'received':
        return 'arrow-down';
      case 'subscription':
        return 'credit-card';
      case 'bill':
        return 'file-invoice-dollar';
      default:
        return 'exchange-alt';
    }
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <FontAwesome5 name="arrow-left" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transaction Details</Text>
        <View style={{ width: 20 }} />
      </View>
      
      <ScrollView style={styles.content}>
        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <FontAwesome5 name={getTransactionIcon()} size={24} color={COLORS.text} />
          </View>
          
          <Text style={styles.amount}>
            {isIncome ? '+' : '-'}${transaction.amount.toFixed(2)}
          </Text>
          
          <Text style={styles.status}>
            {transaction.status || 'Completed'}
          </Text>
          
          <View style={styles.detailsContainer}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Date</Text>
              <Text style={styles.detailValue}>{formatDate(transaction.timestamp)}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Type</Text>
              <Text style={styles.detailValue}>{transaction.type}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Description</Text>
              <Text style={styles.detailValue}>{transaction.description || 'No description'}</Text>
            </View>
            
            {transaction.type === 'sent' && transaction.to && (
              <>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Recipient</Text>
                  <Text style={styles.detailValue}>{transaction.to.name}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Account Number</Text>
                  <Text style={styles.detailValue}>{transaction.to.accountNumber || 'N/A'}</Text>
                </View>
              </>
            )}
            
            {transaction.type === 'received' && transaction.from && (
              <>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Sender</Text>
                  <Text style={styles.detailValue}>{transaction.from.name}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Account Number</Text>
                  <Text style={styles.detailValue}>{transaction.from.accountNumber || 'N/A'}</Text>
                </View>
              </>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  content: {
    flex: 1,
    padding: 20,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  amount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  status: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 24,
  },
  detailsContainer: {
    width: '100%',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  detailLabel: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  detailValue: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '500',
  },
});

export default TransactionDetailScreen; 