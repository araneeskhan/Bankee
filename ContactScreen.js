import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  Image,
  ScrollView,
  StatusBar,
  FlatList,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import { Ionicons, Feather, FontAwesome5 } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { auth, db } from './firebase';
import { 
  doc, 
  getDoc, 
  collection, 
  query, 
  where, 
  onSnapshot,
  addDoc,
  updateDoc,
  arrayUnion,
  runTransaction 
} from 'firebase/firestore';
import { ContactModal } from './ContactModal';

// Import COLORS from App.js or define here
const COLORS = {
  primary: "#0ACF83",
  background: "#0F0F0F",
  card: "#1E1E1E",
  text: "#FFFFFF",
  textSecondary: "#A0A0A0",
  warning: "#F8CF61",
  success: "#0ACF83",
  gradient: ["#0ACF83", "#00A86B"],
};

const ContactsScreen = () => {
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContact, setSelectedContact] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [sendAmount, setSendAmount] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      navigation.replace('Auth');
      return;
    }

    // Listen to user data and contacts
    const unsubscribeUser = onSnapshot(doc(db, 'users', user.uid), async (doc) => {
      if (doc.exists()) {
        const userData = doc.data();
        setUserData(userData);
        
        // Fetch contact details for each contact ID
        if (userData.contacts && userData.contacts.length > 0) {
          const contactsData = [];
          for (const contactId of userData.contacts) {
            const contactDoc = await getDoc(doc(db, 'users', contactId));
            if (contactDoc.exists()) {
              contactsData.push({
                id: contactDoc.id,
                ...contactDoc.data(),
                recent: true, // You can manage this based on transaction history
                favorite: false // You can add a favorites array to user data
              });
            }
          }
          setContacts(contactsData);
        }
      }
    });

    setLoading(false);

    return () => unsubscribeUser();
  }, []);

  const handleMoneyTransfer = async (amount, recipientId) => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      await runTransaction(db, async (transaction) => {
        // Get sender's document
        const senderRef = doc(db, 'users', user.uid);
        const senderDoc = await transaction.get(senderRef);

        // Get recipient's document
        const recipientRef = doc(db, 'users', recipientId);
        const recipientDoc = await transaction.get(recipientRef);

        if (!senderDoc.exists() || !recipientDoc.exists()) {
          throw new Error('User document not found');
        }

        const senderBalance = senderDoc.data().balance;
        const recipientBalance = recipientDoc.data().balance;

        // Check if sender has sufficient balance
        if (senderBalance < amount) {
          throw new Error('Insufficient funds');
        }

        // Update balances
        transaction.update(senderRef, {
          balance: senderBalance - amount
        });

        transaction.update(recipientRef, {
          balance: recipientBalance + amount
        });

        // Create transaction records
        const timestamp = new Date().toISOString();

        // Sender's transaction record
        await addDoc(collection(db, 'users', user.uid, 'transactions'), {
          type: 'expense',
          amount: amount,
          timestamp: timestamp,
          recipient: {
            id: recipientId,
            name: recipientDoc.data().fullName
          },
          category: 'Transfer',
          status: 'completed'
        });

        // Recipient's transaction record
        await addDoc(collection(db, 'users', recipientId, 'transactions'), {
          type: 'income',
          amount: amount,
          timestamp: timestamp,
          sender: {
            id: user.uid,
            name: senderDoc.data().fullName
          },
          category: 'Transfer',
          status: 'completed'
        });
      });

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        closeContactModal();
      }, 2000);
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const sendMoney = () => {
    const amount = parseFloat(sendAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    handleMoneyTransfer(amount, selectedContact.id);
  };

  const addContact = async (contactEmail) => {
    try {
      // Query for user with the given email
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', contactEmail));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        Alert.alert('Error', 'User not found');
        return;
      }

      const contactDoc = querySnapshot.docs[0];
      const user = auth.currentUser;

      // Add contact to user's contacts array
      await updateDoc(doc(db, 'users', user.uid), {
        contacts: arrayUnion(contactDoc.id)
      });

      Alert.alert('Success', 'Contact added successfully');
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const filteredContacts = contacts.filter(
    (contact) =>
      contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.phone.includes(searchQuery) ||
      contact.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const recentContacts = contacts.filter((contact) => contact.recent);
  const favoriteContacts = contacts.filter((contact) => contact.favorite);

  const openContactModal = (contact) => {
    setSelectedContact(contact);
    setShowModal(true);
  };

  const closeContactModal = () => {
    setShowModal(false);
    setSendAmount("");
  };

  const renderContact = ({ item }) => (
    <TouchableOpacity
      style={styles.contactCard}
      onPress={() => {
        openContactModal(item);
      }}
    >
      <Image source={{ uri: item.avatar }} style={styles.contactAvatar} />
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>{item.name}</Text>
        <Text style={styles.contactDetails}>{item.phone}</Text>
      </View>
      <TouchableOpacity
        style={styles.favoriteButton}
        onPress={() => {
          const updatedContacts = contacts.map((contact) =>
            contact.id === item.id
              ? { ...contact, favorite: !contact.favorite }
              : contact
          );
          setContacts(updatedContacts);
        }}
      >
        <Ionicons
          name={item.favorite ? "star" : "star-outline"}
          size={24}
          color={item.favorite ? COLORS.warning : COLORS.textSecondary}
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderRecentContact = ({ item }) => (
    <TouchableOpacity
      style={styles.recentContactItem}
      onPress={() => openContactModal(item)}
    >
      <Image source={{ uri: item.avatar }} style={styles.recentContactAvatar} />
      <Text style={styles.recentContactName}>{item.name.split(" ")[0]}</Text>
    </TouchableOpacity>
  );

  const handleContactPress = (contact) => {
    // Navigate to transfer screen or show transfer modal
    Alert.alert(
      'Transfer Money',
      `Send money to ${contact.name}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Continue',
          onPress: () => navigation.navigate('Transfer', { contact })
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.contactsHeader}>
        <Text style={styles.contactsTitle}>Contacts</Text>
        <TouchableOpacity style={styles.addContactButton} onPress={() => setShowAddModal(true)}>
          <FontAwesome5 name="plus" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons
          name="search"
          size={20}
          color={COLORS.textSecondary}
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search contacts..."
          placeholderTextColor={COLORS.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => setSearchQuery("")}
          >
            <Ionicons
              name="close-circle"
              size={20}
              color={COLORS.textSecondary}
            />
          </TouchableOpacity>
        ) : null}
      </View>

      {!searchQuery && recentContacts.length > 0 && (
        <View style={styles.recentContactsContainer}>
          <Text style={styles.recentContactsTitle}>Recent</Text>
          <FlatList
            data={recentContacts}
            renderItem={renderRecentContact}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.recentContactsList}
          />
        </View>
      )}

      {searchQuery && filteredContacts.length === 0 ? (
        <View style={styles.noResultsContainer}>
          <Feather name="users" size={50} color={COLORS.textSecondary} />
          <Text style={styles.noResultsText}>No contacts found</Text>
        </View>
      ) : (
        <FlatList
          data={searchQuery ? filteredContacts : contacts}
          renderItem={renderContact}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.contactsList}
          ListHeaderComponent={
            !searchQuery && favoriteContacts.length > 0 ? (
              <Text style={styles.contactsListHeader}>Favorites</Text>
            ) : null
          }
          ListFooterComponent={
            !searchQuery && favoriteContacts.length > 0 ? (
              <Text style={styles.contactsListHeader}>All Contacts</Text>
            ) : null
          }
          stickyHeaderIndices={
            !searchQuery && favoriteContacts.length > 0 ? [0] : []
          }
        />
      )}

      <Modal
        visible={showModal}
        transparent={true}
        animationType="slide"
        onRequestClose={closeContactModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {showSuccess ? (
              <View style={styles.successModalContent}>
                <View style={styles.successIconContainer}>
                  <Ionicons
                    name="checkmark-circle"
                    size={60}
                    color={COLORS.success}
                  />
                </View>
                <Text style={styles.successTitle}>Transfer Successful!</Text>
                <Text style={styles.successDescription}>
                  ${sendAmount} sent to {selectedContact?.name}
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.modalHeader}>
                  <TouchableOpacity onPress={closeContactModal}>
                    <Ionicons name="close" size={24} color={COLORS.text} />
                  </TouchableOpacity>
                  <Text style={styles.modalTitle}>Send Money</Text>
                  <View style={{ width: 24 }} />
                </View>

                <View style={styles.contactModalInfo}>
                  <Image
                    source={{ uri: selectedContact?.avatar }}
                    style={styles.modalAvatar}
                  />
                  <Text style={styles.modalContactName}>
                    {selectedContact?.name}
                  </Text>
                  <Text style={styles.modalContactDetails}>
                    {selectedContact?.phone}
                  </Text>
                </View>

                <View style={styles.amountInputContainer}>
                  <Text style={styles.currencySymbol}>$</Text>
                  <TextInput
                    style={styles.amountInput}
                    value={sendAmount}
                    onChangeText={setSendAmount}
                    placeholder="0.00"
                    placeholderTextColor={COLORS.textSecondary}
                    keyboardType="numeric"
                    autoFocus
                  />
                </View>

                <TouchableOpacity
                  style={styles.sendMoneyButton}
                  onPress={sendMoney}
                  disabled={!sendAmount}
                >
                  <LinearGradient
                    colors={COLORS.gradient}
                    style={[
                      styles.sendMoneyButtonGradient,
                      !sendAmount && styles.disabledButton,
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.sendMoneyButtonText}>Send Money</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      <ContactModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contactsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 10,
  },
  contactsTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.text,
  },
  addContactButton: {
    padding: 5,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    padding: 10,
    backgroundColor: COLORS.card,
    borderRadius: 5,
    color: COLORS.text,
  },
  clearButton: {
    padding: 5,
  },
  recentContactsContainer: {
    padding: 10,
  },
  recentContactsTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 10,
  },
  recentContactsList: {
    paddingHorizontal: 10,
  },
  recentContactItem: {
    padding: 10,
  },
  recentContactAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 10,
  },
  recentContactName: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.text,
  },
  noResultsContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  noResultsText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  contactsList: {
    padding: 10,
  },
  contactsListHeader: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.text,
    padding: 10,
  },
  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    backgroundColor: COLORS.card,
    borderRadius: 5,
  },
  contactAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 10,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.text,
  },
  contactDetails: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  favoriteButton: {
    padding: 5,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.overlay,
  },
  modalContainer: {
    backgroundColor: COLORS.card,
    padding: 20,
    borderRadius: 10,
    width: "80%",
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.text,
    flex: 1,
  },
  contactModalInfo: {
    alignItems: "center",
    marginBottom: 20,
  },
  modalAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 10,
  },
  modalContactName: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.text,
  },
  modalContactDetails: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  amountInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.text,
    marginRight: 10,
  },
  amountInput: {
    flex: 1,
    padding: 10,
    backgroundColor: COLORS.card,
    borderRadius: 5,
    color: COLORS.text,
  },
  sendMoneyButton: {
    padding: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 5,
    alignItems: "center",
  },
  sendMoneyButtonGradient: {
    flex: 1,
  },
  disabledButton: {
    backgroundColor: COLORS.textSecondary,
  },
  sendMoneyButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.text,
  },
  successModalContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  successIconContainer: {
    backgroundColor: COLORS.success,
    borderRadius: 50,
    padding: 20,
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 10,
  },
  successDescription: {
    fontSize: 14,
    color: COLORS.text,
  },
});

export default ContactsScreen;
