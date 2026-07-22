import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  ActivityIndicator
} from 'react-native';
import { COLORS } from './styles';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { auth, db } from './firebase';
import { collection, query, getDocs, doc, getDoc } from 'firebase/firestore';

export const SplitBillModal = ({ visible, onClose, currentBalance, onSplitComplete }) => {
  const [totalAmount, setTotalAmount] = useState('');
  const [description, setDescription] = useState('');
  const [contacts, setContacts] = useState([]);
  const [selectedContactIds, setSelectedContactIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingContacts, setFetchingContacts] = useState(true);

  useEffect(() => {
    if (visible) {
      fetchContacts();
    }
  }, [visible]);

  const fetchContacts = async () => {
    try {
      setFetchingContacts(true);
      const user = auth.currentUser;
      if (!user) return;

      const contactsRef = collection(db, 'users', user.uid, 'contacts');
      const snapshot = await getDocs(contactsRef);
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setContacts(list);
    } catch (error) {
      console.error('Fetch contacts error:', error);
    } finally {
      setFetchingContacts(false);
    }
  };

  const toggleSelectContact = (id) => {
    if (selectedContactIds.includes(id)) {
      setSelectedContactIds(selectedContactIds.filter(cId => cId !== id));
    } else {
      setSelectedContactIds([...selectedContactIds, id]);
    }
  };

  const numPeople = selectedContactIds.length + 1; // Includes user
  const amountPerPerson = parseFloat(totalAmount) > 0 ? (parseFloat(totalAmount) / numPeople).toFixed(2) : '0.00';

  const handleSendSplitRequests = async () => {
    const amount = parseFloat(totalAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid total bill amount.');
      return;
    }

    if (selectedContactIds.length === 0) {
      Alert.alert('No Contacts Selected', 'Please select at least one contact to split the bill with.');
      return;
    }

    setLoading(true);
    try {
      // Simulate sending split payment requests to selected contacts
      Alert.alert(
        'Split Request Sent! 🍕',
        `Total Bill: $${amount.toFixed(2)}\nSplit ${numPeople} ways ($${amountPerPerson} per person).\nPayment requests sent to ${selectedContactIds.length} contact(s).`
      );

      setTotalAmount('');
      setDescription('');
      setSelectedContactIds([]);
      if (onSplitComplete) onSplitComplete();
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
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <FontAwesome5 name="users" size={20} color={COLORS.primary} style={{ marginRight: 10 }} />
              <Text style={styles.title}>Split a Bill</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <FontAwesome5 name="times" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Bill Title / Reason</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Dinner, Rent, Concert Tickets"
              placeholderTextColor={COLORS.textSecondary}
              value={description}
              onChangeText={setDescription}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Total Amount ($)</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor={COLORS.textSecondary}
              value={totalAmount}
              onChangeText={text => setTotalAmount(text.replace(/[^0-9.]/g, ''))}
              keyboardType="decimal-pad"
            />
          </View>

          {parseFloat(totalAmount) > 0 && (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryText}>
                Split {numPeople} ways: <Text style={styles.highlightText}>${amountPerPerson}</Text> / person
              </Text>
              <Text style={styles.subSummaryText}>
                Your share: ${amountPerPerson} | Requesting from {selectedContactIds.length} contact(s)
              </Text>
            </View>
          )}

          <Text style={styles.sectionLabel}>Select Friends to Split With:</Text>

          {fetchingContacts ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 20 }} />
          ) : contacts.length === 0 ? (
            <Text style={styles.emptyText}>No saved contacts found. Add contacts first to split bills!</Text>
          ) : (
            <FlatList
              data={contacts}
              keyExtractor={item => item.id}
              style={{ maxHeight: 180 }}
              renderItem={({ item }) => {
                const isSelected = selectedContactIds.includes(item.id);
                return (
                  <TouchableOpacity
                    style={[styles.contactRow, isSelected && styles.contactRowSelected]}
                    onPress={() => toggleSelectContact(item.id)}
                  >
                    <View style={styles.avatarCircle}>
                      <Text style={styles.avatarText}>{item.name?.charAt(0) || 'C'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.contactName}>{item.name}</Text>
                      <Text style={styles.contactAcc}>{item.accountNumber}</Text>
                    </View>
                    <FontAwesome5
                      name={isSelected ? 'check-circle' : 'circle'}
                      size={20}
                      color={isSelected ? COLORS.primary : COLORS.textSecondary}
                    />
                  </TouchableOpacity>
                );
              }}
            />
          )}

          <TouchableOpacity
            style={[styles.submitButton, loading && { opacity: 0.7 }]}
            onPress={handleSendSplitRequests}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.text} />
            ) : (
              <LinearGradient
                colors={COLORS.gradient}
                style={styles.gradientButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.submitButtonText}>Request ${amountPerPerson} / person</Text>
              </LinearGradient>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  closeButton: {
    padding: 6,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: COLORS.inputBackground,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 50,
    color: COLORS.text,
    fontSize: 15,
  },
  summaryCard: {
    backgroundColor: 'rgba(114, 9, 183, 0.15)',
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    alignItems: 'center',
  },
  summaryText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '600',
  },
  highlightText: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  subSummaryText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  sectionLabel: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    marginVertical: 16,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: COLORS.inputBackground,
  },
  contactRowSelected: {
    borderColor: COLORS.primary,
    borderWidth: 1,
    backgroundColor: 'rgba(114, 9, 183, 0.1)',
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: COLORS.text,
    fontWeight: 'bold',
    fontSize: 14,
  },
  contactName: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  contactAcc: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  submitButton: {
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  gradientButton: {
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
