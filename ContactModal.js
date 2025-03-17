import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  Image
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from './styles';
import { auth, db } from './firebase';
import { collection, query, getDocs, addDoc, where } from 'firebase/firestore';
import { Toast } from './components/Toast';

export const ContactModal = ({ visible, onClose, onSendMoney }) => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedContact, setSelectedContact] = useState(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [step, setStep] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState({
    visible: false,
    message: '',
    type: 'success'
  });

  useEffect(() => {
    if (visible) {
      fetchContacts();
    } else {
      // Reset state when modal closes
      setSelectedContact(null);
      setAmount('');
      setDescription('');
      setStep(1);
      setSearchQuery('');
    }
  }, [visible]);

  const fetchContacts = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      // First, get all users except the current user
      const usersRef = collection(db, 'users');
      const usersQuery = query(usersRef, where('__name__', '!=', user.uid));
      const usersSnapshot = await getDocs(usersQuery);
      
      const usersList = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        userId: doc.id, // Add this to ensure userId is available
        name: doc.data().name,
        accountNumber: doc.data().accountNumber,
        ...doc.data()
      }));
      
      setContacts(usersList);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      Alert.alert('Error', 'Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  const handleContactSelect = (contact) => {
    setSelectedContact(contact);
    setStep(2);
  };

  const handleSend = () => {
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      showToast('Please enter a valid amount');
      return;
    }

    onSendMoney(selectedContact, parseFloat(amount), description);
  };

  const showToast = (message) => {
    // Custom toast implementation
    Alert.alert('', message, [{ text: 'OK' }], { cancelable: true });
  };

  const addNewContact = async () => {
    // Implementation for adding a new contact
    Alert.prompt(
      'Add New Contact',
      'Enter account number',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Search',
          onPress: async (accountNumber) => {
            if (!accountNumber || accountNumber.length < 16) {
              showToast('Please enter a valid 16-digit account number');
              return;
            }
            
            try {
              setLoading(true);
              // Search for user with this account number
              const usersRef = collection(db, 'users');
              const q = query(usersRef, where('accountNumber', '==', accountNumber));
              const snapshot = await getDocs(q);
              
              if (snapshot.empty) {
                showToast('No user found with this account number');
                setLoading(false);
                return;
              }
              
              const userDoc = snapshot.docs[0];
              const userData = userDoc.data();
              
              // Add to contacts
              const user = auth.currentUser;
              await addDoc(collection(db, 'users', user.uid, 'contacts'), {
                userId: userDoc.id,
                name: userData.name,
                accountNumber: userData.accountNumber,
                email: userData.email,
                timestamp: new Date().toISOString()
              });
              
              showToast(`${userData.name} added to contacts`);
              fetchContacts();
            } catch (error) {
              console.error('Error adding contact:', error);
              showToast('Failed to add contact');
            } finally {
              setLoading(false);
            }
          }
        }
      ],
      'plain-text'
    );
  };

  const filteredContacts = contacts.filter(contact => 
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.accountNumber.includes(searchQuery)
  );

  const renderContactItem = ({ item }) => (
    <TouchableOpacity
      style={styles.contactItem}
      onPress={() => handleContactSelect(item)}
    >
      <LinearGradient
        colors={[COLORS.primary + '40', COLORS.primaryDark + '40']}
        style={styles.contactAvatar}
      >
        <Text style={styles.contactInitial}>
          {item.name.charAt(0).toUpperCase()}
        </Text>
      </LinearGradient>
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>{item.name}</Text>
        <Text style={styles.contactAccount}>
          {item.accountNumber.replace(/(\d{4})/g, '$1 ').trim()}
        </Text>
      </View>
      <FontAwesome5 name="chevron-right" size={16} color={COLORS.textSecondary} />
    </TouchableOpacity>
  );

  const renderStep1 = () => (
    <>
      <View style={styles.header}>
        <Text style={styles.title}>Send Money</Text>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <FontAwesome5 name="times" size={20} color={COLORS.text} />
        </TouchableOpacity>
      </View>
      
      <View style={styles.searchContainer}>
        <FontAwesome5 name="search" size={16} color={COLORS.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search contacts..."
          placeholderTextColor={COLORS.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
      
      <View style={styles.contactsHeader}>
        <Text style={styles.contactsTitle}>Your Contacts</Text>
        <TouchableOpacity onPress={addNewContact}>
          <Text style={styles.addContactText}>+ Add New</Text>
        </TouchableOpacity>
      </View>
      
      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />
      ) : filteredContacts.length === 0 ? (
        <View style={styles.emptyState}>
          <FontAwesome5 name="users" size={40} color={COLORS.textSecondary} />
          <Text style={styles.emptyText}>
            {searchQuery ? 'No contacts found' : 'No contacts yet'}
          </Text>
          {!searchQuery && (
            <TouchableOpacity 
              style={styles.addContactButton}
              onPress={addNewContact}
            >
              <Text style={styles.addContactButtonText}>Add Contact</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredContacts}
          renderItem={renderContactItem}
          keyExtractor={item => item.id}
          style={styles.contactsList}
          showsVerticalScrollIndicator={false}
        />
      )}
    </>
  );

  const renderStep2 = () => (
    <>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setStep(1)}>
          <FontAwesome5 name="arrow-left" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Send Money</Text>
        <TouchableOpacity onPress={onClose}>
          <FontAwesome5 name="times" size={20} color={COLORS.text} />
        </TouchableOpacity>
      </View>
      
      <View style={styles.selectedContact}>
        <LinearGradient
          colors={[COLORS.primary + '40', COLORS.primaryDark + '40']}
          style={styles.contactAvatar}
        >
          <Text style={styles.contactInitial}>
            {selectedContact?.name.charAt(0).toUpperCase()}
          </Text>
        </LinearGradient>
        <View style={styles.contactInfo}>
          <Text style={styles.contactName}>{selectedContact?.name}</Text>
          <Text style={styles.contactAccount}>
            {selectedContact?.accountNumber.replace(/(\d{4})/g, '$1 ').trim()}
          </Text>
        </View>
      </View>
      
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Amount</Text>
        <View style={styles.amountInputContainer}>
          <Text style={styles.currencySymbol}>$</Text>
          <TextInput
            style={styles.amountInput}
            placeholder="0.00"
            placeholderTextColor={COLORS.textSecondary}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            autoFocus
          />
        </View>
      </View>
      
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Description (Optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="What's this for?"
          placeholderTextColor={COLORS.textSecondary}
          value={description}
          onChangeText={setDescription}
        />
      </View>
      
      <TouchableOpacity 
        style={[
          styles.sendButton,
          (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) && styles.disabledButton
        ]}
        onPress={handleSend}
        disabled={!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0}
      >
        <Text style={styles.sendButtonText}>Send Money</Text>
      </TouchableOpacity>
    </>
  );

  const handleSendMoney = async () => {
    if (!selectedContact || !amount) {
      setToast({
        visible: true,
        message: 'Please select a contact and enter an amount',
        type: 'error'
      });
      return;
    }
    
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setToast({
        visible: true,
        message: 'Please enter a valid amount',
        type: 'error'
      });
      return;
    }
    
    try {
      await onSendMoney(selectedContact, amountNum, description);
      setToast({
        visible: true,
        message: `Successfully sent $${amountNum.toFixed(2)} to ${selectedContact.name}`,
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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {step === 1 ? renderStep1() : renderStep2()}
        </View>
      </View>
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, visible: false })}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    height: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 24,
    height: 50,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 16,
  },
  contactsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  contactsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  addContactText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  loader: {
    marginTop: 40,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 16,
  },
  addContactButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 24,
  },
  addContactButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  contactsList: {
    paddingBottom: 24,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  contactAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  contactInitial: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  contactAccount: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  selectedContact: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    color: COLORS.text,
    fontSize: 16,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 24,
    fontWeight: 'bold',
  },
  sendButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.7,
  },
  sendButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
});