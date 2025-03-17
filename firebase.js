import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, getDoc, updateDoc, addDoc, query, where, getDocs, runTransaction } from 'firebase/firestore';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { NotificationService } from './NotificationService';
import { COLORS } from './styles';

const firebaseConfig = {
  apiKey: "AIzaSyC44aTsCOOGA_sXMVAovFjMNaoKrGXZOxY",
  authDomain: "bankee-82592.firebaseapp.com",
  projectId: "bankee-82592",
  storageBucket: "bankee-82592.firebasestorage.app",
  messagingSenderId: "962949102346",
  appId: "1:962949102346:web:82a03514595e16f23418f3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with persistence
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

const db = getFirestore(app);

// Helper functions for generating account numbers
const generateRandomDigits = (length) => {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += Math.floor(Math.random() * 10);
  }
  return result;
};

const generateAccountNumber = () => {
  // Generate 16-digit account number
  return `${generateRandomDigits(16)}`;
};

const generateIBAN = () => {
  // Format: PK + 2 check digits + 20 digits
  const bankCode = '0123'; // 4-digit bank code
  const accountDigits = generateRandomDigits(16);
  return `PK${bankCode}${accountDigits}`;
};

// User related functions
export const createUserProfile = async (userId, userData) => {
  try {
    const accountNumber = generateAccountNumber();
    const iban = generateIBAN();
    
    const userProfile = {
      ...userData,
      accountNumber,
      iban,
      balance: 1000, // Initial balance for testing
      contacts: [],
      subscriptions: [],
      createdAt: new Date().toISOString(),
      // Additional profile fields
      phoneNumber: userData.phoneNumber || '',
      address: userData.address || '',
      dateOfBirth: userData.dateOfBirth || null,
      occupation: userData.occupation || '',
      profilePicture: userData.profilePicture || null,
      notifications: {
        transactions: true,
        marketing: false,
        security: true
      },
      kycVerified: false,
      lastLogin: new Date().toISOString(),
      // Remove Platform dependency
      deviceInfo: {
        lastUpdated: new Date().toISOString()
      }
    };

    await setDoc(doc(db, 'users', userId), userProfile);
    return userProfile;
  } catch (error) {
    console.error('Create User Error:', error);
    throw error;
  }
};

export const getUserProfile = async (userId) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    return userDoc.exists() ? userDoc.data() : null;
  } catch (error) {
    throw error;
  }
};

// Contact related functions
export const addContact = async (userId, contactData) => {
  try {
    if (!contactData.accountNumber || !contactData.name) {
      throw new Error('Name and account number are required');
    }

    // Check if contact exists in users collection
    const userQuery = query(
      collection(db, 'users'), 
      where('accountNumber', '==', contactData.accountNumber.trim())
    );
    
    const userSnapshot = await getDocs(userQuery);
    
    if (userSnapshot.empty) {
      throw new Error('Account number not found');
    }

    // Don't allow adding yourself as contact
    if (userSnapshot.docs[0].id === userId) {
      throw new Error('Cannot add yourself as a contact');
    }

    const contactUser = userSnapshot.docs[0];
    // Check if contact already exists
    const existingContactRef = doc(db, 'users', userId, 'contacts', contactUser.id);
    const existingContact = await getDoc(existingContactRef);
    
    if (existingContact.exists()) {
      throw new Error('Contact already exists');
    }

    await setDoc(existingContactRef, {
      userId: contactUser.id,
      name: contactData.name.trim(),
      accountNumber: contactData.accountNumber.trim(),
      addedAt: new Date().toISOString(),
    });

    return { 
      id: contactUser.id,
      ...contactData,
      balance: contactUser.data().balance 
    };
  } catch (error) {
    console.error('Add Contact Error:', error);
    throw error;
  }
};

// Transaction related functions
export const processTransaction = async (senderId, receiverId, amount, description) => {
  try {
    await runTransaction(db, async (transaction) => {
      // Get sender document
      const senderRef = doc(db, 'users', senderId);
      const senderDoc = await transaction.get(senderRef);
      
      if (!senderDoc.exists()) {
        throw new Error('Sender account not found');
      }
      
      // Get receiver document
      const receiverRef = doc(db, 'users', receiverId);
      const receiverDoc = await transaction.get(receiverRef);
      
      if (!receiverDoc.exists()) {
        throw new Error('Receiver account not found');
      }
      
      // Check if sender has enough balance
      const senderBalance = senderDoc.data().balance || 0;
      if (senderBalance < amount) {
        throw new Error('Insufficient funds');
      }
      
      // Update sender balance
      transaction.update(senderRef, {
        balance: senderBalance - amount
      });
      
      // Update receiver balance
      const receiverBalance = receiverDoc.data().balance || 0;
      transaction.update(receiverRef, {
        balance: receiverBalance + amount
      });
      
      // Record transaction for sender
      const senderTransactionRef = doc(collection(db, 'users', senderId, 'transactions'));
      transaction.set(senderTransactionRef, {
        type: 'sent',
        amount: amount,
        description: description,
        to: {
          userId: receiverId,
          name: receiverDoc.data().name || 'Unknown'
        },
        timestamp: new Date().toISOString(),
        status: 'completed'
      });
      
      // Record transaction for receiver
      const receiverTransactionRef = doc(collection(db, 'users', receiverId, 'transactions'));
      transaction.set(receiverTransactionRef, {
        type: 'received',
        amount: amount,
        description: description,
        from: {
          userId: senderId,
          name: senderDoc.data().name || 'Unknown'
        },
        timestamp: new Date().toISOString(),
        status: 'completed'
      });
      
      // Create notification for sender
      await NotificationService.createNotification(
        senderId,
        NotificationService.moneySent(amount, receiverDoc.data().name)
      );
      
      // Create notification for receiver
      await NotificationService.createNotification(
        receiverId,
        NotificationService.moneyReceived(amount, senderDoc.data().name)
      );
    });
    
    return true;
  } catch (error) {
    console.error('Transaction Error:', error);
    throw error;
  }
};

// Subscription related functions
export const purchaseSubscription = async (userId, subscriptionData) => {
  try {
    await runTransaction(db, async (transaction) => {
      // Get user document
      const userRef = doc(db, 'users', userId);
      const userDoc = await transaction.get(userRef);
      
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }
      
      // Check if user has enough balance
      const userBalance = userDoc.data().balance || 0;
      if (userBalance < subscriptionData.price) {
        throw new Error('Insufficient funds');
      }
      
      // Update user balance
      transaction.update(userRef, {
        balance: userBalance - subscriptionData.price
      });
      
      // Add subscription to user's subscriptions
      const subscriptionRef = doc(collection(db, 'users', userId, 'subscriptions'));
      transaction.set(subscriptionRef, {
        ...subscriptionData,
        startDate: new Date().toISOString(),
        status: 'active',
        autoRenew: true
      });
      
      // Record transaction
      const transactionRef = doc(collection(db, 'users', userId, 'transactions'));
      transaction.set(transactionRef, {
        type: 'subscription',
        amount: subscriptionData.price,
        description: subscriptionData.description,
        name: subscriptionData.serviceName,
        plan: subscriptionData.planName,
        timestamp: new Date().toISOString(),
        status: 'completed'
      });
      
      // Create notification
      await NotificationService.createNotification(
        userId,
        NotificationService.subscriptionPurchased(
          subscriptionData.serviceName,
          subscriptionData.price
        )
      );
    });
    
    return true;
  } catch (error) {
    console.error('Subscription Error:', error);
    throw error;
  }
};

// Profile related functions
export const updateUserProfile = async (userId, updates) => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      ...updates,
      updatedAt: new Date().toISOString()
    });

    // Create notification for important updates
    if (updates.email || updates.phoneNumber || updates.password) {
      await NotificationService.createNotification(
        userId,
        NotificationService.accountUpdate('Your account information has been updated')
      );
    }
  } catch (error) {
    console.error('Update Profile Error:', error);
    throw error;
  }
};

export const updateProfilePicture = async (userId, imageUri) => {
  try {
    // Implement image upload to Firebase Storage
    const response = await fetch(imageUri);
    const blob = await response.blob();
    
    const storageRef = ref(storage, `profilePictures/${userId}`);
    await uploadBytes(storageRef, blob);
    
    const downloadURL = await getDownloadURL(storageRef);
    
    await updateUserProfile(userId, {
      profilePicture: downloadURL
    });
    
    return downloadURL;
  } catch (error) {
    console.error('Update Profile Picture Error:', error);
    throw error;
  }
};

// Add this function for bill payments
export const payBill = async (userId, billData) => {
  try {
    await runTransaction(db, async (transaction) => {
      const userRef = doc(db, 'users', userId);
      const userDoc = await transaction.get(userRef);

      if (!userDoc.exists()) {
        throw new Error('User not found');
      }

      const userBalance = userDoc.data().balance;
      if (userBalance < billData.amount) {
        throw new Error('Insufficient funds');
      }

      // Deduct balance
      transaction.update(userRef, { 
        balance: userBalance - billData.amount
      });

      // Record transaction
      await addDoc(collection(db, 'users', userId, 'transactions'), {
        type: 'bill',
        amount: billData.amount,
        description: `${billData.name} Bill Payment - ${billData.billNumber}`,
        timestamp: new Date().toISOString(),
        status: 'completed'
      });

      // Create notification
      await NotificationService.createNotification(
        userId,
        NotificationService.billPayment(billData.name, billData.amount)
      );
    });
  } catch (error) {
    throw error;
  }
};

export { auth, db };
export default app; 