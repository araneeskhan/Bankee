import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  SafeAreaView, 
  TouchableOpacity, 
  Image, 
  StatusBar,
  TextInput,
  Button,
  ActivityIndicator,
  Alert
} from 'react-native';
import { 
  Ionicons, 
  FontAwesome5 
} from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Camera } from 'expo-camera';
import { COLORS } from './styles';
import { auth, db } from './firebase';
import { 
  doc, 
  getDoc, 
  addDoc, 
  collection, 
  runTransaction 
} from 'firebase/firestore';

const QRCodeScreen = () => {
    const [hasPermission, setHasPermission] = useState(null);
    const [scanned, setScanned] = useState(false);
    const [activeTab, setActiveTab] = useState('scan');
    const [showQRCode, setShowQRCode] = useState(false);
    const [sendAmount, setSendAmount] = useState('');
    const [showSuccess, setShowSuccess] = useState(false);
    const [loading, setLoading] = useState(false);
    const [qrData, setQrData] = useState(null);
    
    useEffect(() => {
      (async () => {
        const { status } = await Camera.requestCameraPermissionsAsync();
        setHasPermission(status === 'granted');
      })();
    }, []);
    
    const handleBarCodeScanned = async ({ type, data }) => {
      try {
        setScanned(true);
        setLoading(true);

        const parsedData = JSON.parse(data);
        if (parsedData.type !== 'payment') {
          throw new Error('Invalid QR code');
        }

        const user = auth.currentUser;
        if (!user) throw new Error('User not authenticated');

        await runTransaction(db, async (transaction) => {
          // Get sender's document
          const senderRef = doc(db, 'users', user.uid);
          const senderDoc = await transaction.get(senderRef);

          // Get recipient's document
          const recipientRef = doc(db, 'users', parsedData.recipientId);
          const recipientDoc = await transaction.get(recipientRef);

          if (!senderDoc.exists() || !recipientDoc.exists()) {
            throw new Error('User document not found');
          }

          const senderBalance = senderDoc.data().balance;
          const recipientBalance = recipientDoc.data().balance;
          const amount = parsedData.amount;

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
              id: parsedData.recipientId,
              name: recipientDoc.data().fullName
            },
            category: 'QR Payment',
            status: 'completed'
          });

          // Recipient's transaction record
          await addDoc(collection(db, 'users', parsedData.recipientId, 'transactions'), {
            type: 'income',
            amount: amount,
            timestamp: timestamp,
            sender: {
              id: user.uid,
              name: senderDoc.data().fullName
            },
            category: 'QR Payment',
            status: 'completed'
          });
        });

        handlePaymentSuccess();
      } catch (error) {
        Alert.alert('Error', error.message);
        setScanned(false);
      } finally {
        setLoading(false);
      }
    };
    
    const handlePaymentSuccess = () => {
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setScanned(false);
        setShowQRCode(false);
        setSendAmount('');
      }, 2000);
    };
    
    const generateQRCode = () => {
      const user = auth.currentUser;
      if (!user) return;

      const amount = parseFloat(sendAmount);
      if (isNaN(amount) || amount <= 0) {
        Alert.alert('Error', 'Please enter a valid amount');
        return;
      }

      // Generate QR code data
      const qrData = {
        type: 'payment',
        recipientId: user.uid,
        amount: amount,
        timestamp: new Date().toISOString()
      };

      setQrData(JSON.stringify(qrData));
      setShowQRCode(true);
    };
    
    if (hasPermission === null) {
      return (
        <View style={styles.container}>
          <Text style={styles.text}>Requesting camera permission...</Text>
        </View>
      );
    }
    
    if (hasPermission === false) {
      return (
        <View style={styles.container}>
          <Text style={styles.text}>No access to camera</Text>
          <TouchableOpacity style={styles.permissionButton}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      );
    }
  
    if (loading) {
      return (
        <View style={styles.container}>
          <ActivityIndicator size={36} color={COLORS.primary} />
          <Text style={[styles.text, { marginTop: 16 }]}>Processing payment...</Text>
        </View>
      );
    }
  
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.scannerContainer}>
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'scan' && styles.activeTabButton]}
              onPress={() => {
                setActiveTab('scan');
                setShowQRCode(false);
              }}
            >
              <Text
                style={[styles.tabButtonText, activeTab === 'scan' && styles.activeTabButtonText]}
              >
                Scan QR
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'receive' && styles.activeTabButton]}
              onPress={() => {
                setActiveTab('receive');
              }}
            >
              <Text
                style={[styles.tabButtonText, activeTab === 'receive' && styles.activeTabButtonText]}
              >
                Receive Money
              </Text>
            </TouchableOpacity>
          </View>

          {activeTab === 'scan' ? (
            <View style={styles.scannerSection}>
              <Text style={styles.scannerTitle}>Scan to Pay</Text>
              <Text style={styles.scannerDescription}>
                Position the QR code within the frame to scan
              </Text>
              {!scanned && !showSuccess && (
                <View style={styles.barcodeBox}>
                  <Camera
                    style={StyleSheet.absoluteFillObject}
                    onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
                    barCodeScannerSettings={{
                      barCodeTypes: ['qr'],
                    }}
                  />
                  <View style={styles.scannerOverlay}>
                    <View style={styles.scannerMarker} />
                  </View>
                </View>
              )}
              {scanned && !showSuccess && (
                <TouchableOpacity
                  style={styles.rescanButton}
                  onPress={() => setScanned(false)}
                >
                  <Text style={styles.rescanButtonText}>Tap to Scan Again</Text>
                </TouchableOpacity>
              )}
              {showSuccess && (
                <View style={styles.successContainer}>
                  <View style={styles.successIconContainer}>
                    <Ionicons name="checkmark-circle" size={60} color={COLORS.success} />
                  </View>
                  <Text style={styles.successTitle}>Payment Successful!</Text>
                  <Text style={styles.successDescription}>
                    Your payment has been processed successfully.
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.receiveSection}>
              <Text style={styles.receiveTitle}>Receive Money</Text>
              <Text style={styles.receiveDescription}>
                Enter amount and generate QR code to receive payment
              </Text>
              
              <View style={styles.amountInputContainer}>
                <Text style={styles.currencySymbol}>$</Text>
                <TextInput
                  style={styles.amountInput}
                  value={sendAmount}
                  onChangeText={setSendAmount}
                  placeholder="0.00"
                  placeholderTextColor={COLORS.textSecondary}
                  keyboardType="numeric"
                />
              </View>
              
              {!showQRCode ? (
                <TouchableOpacity
                  style={styles.generateQRButton}
                  onPress={generateQRCode}
                  disabled={!sendAmount}
                >
                  <LinearGradient
                    colors={COLORS.gradient}
                    style={[
                      styles.generateQRButtonGradient,
                      !sendAmount && styles.disabledButton
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.generateQRButtonText}>Generate QR Code</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ) : (
                <View style={styles.qrCodeContainer}>
                  <View style={styles.qrCodeBox}>
                    <Image
                      source={{ uri: 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + qrData }}
                      style={styles.qrCode}
                    />
                  </View>
                  <Text style={styles.qrAmountText}>${sendAmount}</Text>
                  <TouchableOpacity
                    style={styles.resetButton}
                    onPress={() => {
                      setShowQRCode(false);
                      setSendAmount('');
                    }}
                  >
                    <Text style={styles.resetButtonText}>Reset</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </View>
      </SafeAreaView>
    );
};

// Add styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scannerContainer: {
    flex: 1,
    padding: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    marginBottom: 20,
    padding: 5,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTabButton: {
    backgroundColor: COLORS.primary,
  },
  tabButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  activeTabButtonText: {
    color: COLORS.text,
  },
  scannerSection: {
    flex: 1,
    alignItems: 'center',
  },
  scannerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 10,
  },
  scannerDescription: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 30,
  },
  barcodeBox: {
    width: 280,
    height: 280,
    overflow: 'hidden',
    borderRadius: 20,
    backgroundColor: COLORS.card,
  },
  scannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerMarker: {
    width: 200,
    height: 200,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: 10,
  },
  rescanButton: {
    marginTop: 30,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: COLORS.card,
    borderRadius: 8,
  },
  rescanButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  successContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 50,
  },
  successIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: `${COLORS.success}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 10,
  },
  successDescription: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  receiveSection: {
    flex: 1,
    alignItems: 'center',
  },
  receiveTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 10,
  },
  receiveDescription: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 30,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 15,
    marginBottom: 30,
    width: '100%',
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginRight: 10,
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    color: COLORS.text,
    fontWeight: 'bold',
  },
  generateQRButton: {
    width: '100%',
    height: 56,
    borderRadius: 12,
    overflow: 'hidden',
  },
  generateQRButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  generateQRButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  qrCodeContainer: {
    alignItems: 'center',
  },
  qrCodeBox: {
    padding: 20,
    backgroundColor: COLORS.text,
    borderRadius: 20,
    marginBottom: 20,
  },
  qrCode: {
    width: 200,
    height: 200,
  },
  qrAmountText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 30,
  },
  resetButton: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    backgroundColor: COLORS.card,
    borderRadius: 12,
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  text: {
    color: COLORS.text,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
  permissionButton: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    alignSelf: 'center',
  },
  permissionButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default QRCodeScreen;
