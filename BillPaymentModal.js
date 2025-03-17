import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator
} from 'react-native';
import { COLORS } from './styles';
import { FontAwesome5 } from '@expo/vector-icons';
import { processTransaction } from './firebase';
import { auth } from './firebase';

export const BillPaymentModal = ({ visible, onClose, service, currentBalance }) => {
  const [amount, setAmount] = useState('');
  const [billNumber, setBillNumber] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    if (!billNumber.trim()) {
      Alert.alert('Error', 'Please enter bill number');
      return;
    }

    const paymentAmount = parseFloat(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (paymentAmount > currentBalance) {
      Alert.alert('Error', 'Insufficient funds');
      return;
    }

    setLoading(true);
    try {
      await processTransaction(
        auth.currentUser.uid,
        'UTILITY_ACCOUNT', // You might want to create actual utility company accounts
        paymentAmount,
        `${service.name} Bill Payment - ${billNumber}`
      );
      Alert.alert('Success', `Successfully paid ${service.name} bill`);
      setAmount('');
      setBillNumber('');
      onClose();
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Pay {service?.name} Bill</Text>
            <TouchableOpacity onPress={onClose}>
              <FontAwesome5 name="times" size={20} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.serviceInfo}>
            <View style={[styles.serviceIcon, { backgroundColor: service?.color + '20' }]}>
              <FontAwesome5 name={service?.icon} size={24} color={service?.color} />
            </View>
            <Text style={styles.serviceName}>{service?.name}</Text>
          </View>

          <TextInput
            style={styles.input}
            placeholder="Bill Number"
            value={billNumber}
            onChangeText={setBillNumber}
            keyboardType="numeric"
          />

          <TextInput
            style={styles.input}
            placeholder="Amount"
            value={amount}
            onChangeText={text => {
              const cleaned = text.replace(/[^0-9.]/g, '');
              setAmount(cleaned);
            }}
            keyboardType="decimal-pad"
          />

          <Text style={styles.balanceText}>
            Available Balance: ${currentBalance.toFixed(2)}
          </Text>

          <TouchableOpacity
            style={[styles.payButton, loading && styles.disabledButton]}
            onPress={handlePayment}
            disabled={loading || !amount || !billNumber}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.text} />
            ) : (
              <Text style={styles.buttonText}>Pay Bill</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  // ... I can provide the styles if needed
}); 