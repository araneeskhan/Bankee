import React, { useState, useEffect } from 'react';
import { 
  Modal, 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet,
  Alert,
  ActivityIndicator,
  FlatList
} from 'react-native';
import { COLORS } from './styles';
import { processTransaction } from './firebase';
import { auth, db } from './firebase';
import { collection, query, getDocs } from 'firebase/firestore';
import { FontAwesome5 } from '@expo/vector-icons';

export const TransferModal = ({ visible, onClose, currentBalance }) => {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);

  useEffect(() => {
    loadContacts();
  }, [visible]);

  const loadContacts = async () => {
    if (!auth.currentUser) return;
    
    try {
      const contactsRef = collection(db, 'users', auth.currentUser.uid, 'contacts');
      const contactsSnap = await getDocs(contactsRef);
      const contactsList = contactsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setContacts(contactsList);
    } catch (error) {
      console.error('Load Contacts Error:', error);
      Alert.alert('Error', 'Failed to load contacts');
    }
  };

  const handleTransfer = async () => {
    if (!selectedContact) {
      Alert.alert('Error', 'Please select a contact');
      return;
    }

    const transferAmount = parseFloat(amount);
    if (isNaN(transferAmount) || transferAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (transferAmount > currentBalance) {
      Alert.alert('Error', 'Insufficient funds');
      return;
    }

    setLoading(true);
    try {
      await processTransaction(
        auth.currentUser.uid,
        selectedContact.userId,
        transferAmount,
        description || 'Money Transfer'
      );
      Alert.alert('Success', `Successfully sent $${transferAmount} to ${selectedContact.name}`);
      setAmount('');
      setDescription('');
      setSelectedContact(null);
      onClose();
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const renderContact = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.contactItem,
        selectedContact?.id === item.id && styles.selectedContact
      ]}
      onPress={() => setSelectedContact(item)}
    >
      <View style={styles.contactAvatar}>
        <Text style={styles.avatarText}>
          {item.name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>{item.name}</Text>
        <Text style={styles.contactAccount}>
          Acc: {item.accountNumber}
        </Text>
      </View>
    </TouchableOpacity>
  );

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
            <Text style={styles.title}>Send Money</Text>
            <TouchableOpacity onPress={onClose}>
              <FontAwesome5 name="times" size={20} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={contacts}
            renderItem={renderContact}
            keyExtractor={item => item.id}
            horizontal={true}
            showsHorizontalScrollIndicator={false}
            style={styles.contactsList}
          />

          <TextInput
            style={styles.amountInput}
            placeholder="Enter Amount"
            placeholderTextColor={COLORS.textSecondary}
            value={amount}
            onChangeText={text => {
              const cleaned = text.replace(/[^0-9.]/g, '');
              setAmount(cleaned);
            }}
            keyboardType="decimal-pad"
          />

          <TextInput
            style={styles.descriptionInput}
            placeholder="Add a note (optional)"
            placeholderTextColor={COLORS.textSecondary}
            value={description}
            onChangeText={setDescription}
            multiline
          />

          <TouchableOpacity
            style={[styles.sendButton, loading && styles.disabledButton]}
            onPress={handleTransfer}
            disabled={loading || !selectedContact || !amount}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.text} />
            ) : (
              <Text style={styles.buttonText}>Send Money</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  recipientInfo: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  recipientName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  recipientEmail: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  amountContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  amountInput: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  balanceText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  noteInput: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    color: COLORS.text,
    marginBottom: 20,
    minHeight: 100,
  },
  sendButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.7,
  },
  buttonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  contactItem: {
    padding: 10,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: 10,
    marginRight: 10,
  },
  selectedContact: {
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  contactAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactInfo: {
    marginLeft: 10,
  },
  contactName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  contactAccount: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  contactsList: {
    marginBottom: 20,
  },
  descriptionInput: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    color: COLORS.text,
    marginBottom: 20,
    minHeight: 100,
  },
}); 