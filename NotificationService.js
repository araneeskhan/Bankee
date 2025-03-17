import { Alert } from 'react-native';
import { doc, collection, addDoc, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db, auth } from './firebase';
import { COLORS } from './styles';

export class NotificationService {
  static async createNotification(userId, notification) {
    try {
      const notificationData = {
        ...notification,
        read: false,
        timestamp: new Date().toISOString(),
      };
      
      await addDoc(collection(db, 'users', userId, 'notifications'), notificationData);
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  }

  static async markAsRead(userId, notificationId) {
    try {
      const notificationRef = doc(db, 'users', userId, 'notifications', notificationId);
      await updateDoc(notificationRef, { read: true });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  static getNotifications(userId, callback) {
    try {
      const notificationsRef = collection(db, 'users', userId, 'notifications');
      const q = query(notificationsRef, orderBy('timestamp', 'desc'), limit(50));
      
      return onSnapshot(q, (snapshot) => {
        const notifications = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        callback(notifications);
      });
    } catch (error) {
      console.error('Error getting notifications:', error);
      callback([]);
      return () => {};
    }
  }

  // Notification types
  static transactionSent(amount, recipient) {
    return {
      title: 'Money Sent',
      body: `You've sent $${amount.toFixed(2)} to ${recipient}`,
      type: 'transaction',
      icon: 'arrow-up',
      color: COLORS.error,
    };
  }

  static transactionReceived(amount, sender) {
    return {
      title: 'Money Received',
      body: `You've received $${amount.toFixed(2)} from ${sender}`,
      type: 'transaction',
      icon: 'arrow-down',
      color: COLORS.success,
    };
  }

  static subscriptionPurchased(name, amount) {
    return {
      title: 'Subscription Activated',
      body: `Your ${name} subscription for $${amount.toFixed(2)} has been activated`,
      type: 'subscription',
      icon: 'credit-card',
      color: COLORS.primary,
    };
  }

  static billPayment(name, amount) {
    return {
      title: 'Bill Payment',
      body: `Your ${name} bill payment of $${amount.toFixed(2)} was successful`,
      type: 'bill',
      icon: 'file-invoice-dollar',
      color: COLORS.primary,
    };
  }

  static securityAlert(message) {
    return {
      title: 'Security Alert',
      body: message,
      type: 'security',
      icon: 'shield-alt',
      color: COLORS.error,
    };
  }

  static accountUpdate(message) {
    return {
      title: 'Account Update',
      body: message,
      type: 'account',
      icon: 'user-circle',
      color: COLORS.primary,
    };
  }

  static moneySent(amount, recipientName) {
    return {
      title: 'Money Sent',
      body: `You sent $${amount.toFixed(2)} to ${recipientName}`,
      type: 'transaction',
      icon: 'paper-plane',
      color: COLORS.primary
    };
  }
  
  static moneyReceived(amount, senderName) {
    return {
      title: 'Money Received',
      body: `You received $${amount.toFixed(2)} from ${senderName}`,
      type: 'transaction',
      icon: 'arrow-down',
      color: COLORS.success
    };
  }
} 