# Bankee - Modern Mobile Banking Application 💳✨

[![React Native](https://img.shields.io/badge/React_Native-0.81-61DAFB?style=flat&logo=react)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-v54.0-000000?style=flat&logo=expo)](https://expo.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-v11.4-FFCA28?style=flat&logo=firebase)](https://firebase.google.com/)

Bankee is a state-of-the-art, feature-rich mobile banking application built with **React Native** and **Expo**, powered by **Firebase**. It offers a premium, modern dark-themed banking experience with real-time financial tracking, biometric security, card controls, split bill payments, expense analytics, and target savings vaults.

---

## ✨ Features & Capabilities

### 🔐 1. Advanced Biometric Authentication
- **Face ID & Fingerprint Login**: Fast and secure authentication using `expo-local-authentication`.
- **Encrypted Local Credentials**: Saved session tokens for seamless biometric access.
- **Biometric Preference Toggle**: Enable or disable biometric authentication directly in profile settings.

### 💳 2. Card Management & Security Controls
- **Interactive Virtual Cards**: Beautiful gradient credit/debit cards (Visa & Mastercard).
- **Freeze / Unfreeze Card**: Lock your card instantly to block unauthorized transactions.
- **Biometric Details & CVV Reveal**: Reveal full 16-digit card numbers and CVV codes guarded by biometric verification.

### 🍕 3. Split Bill & Money Requests
- **Group Bill Splitting**: Select friends, calculate per-person amounts, and send payment requests.
- **Instant Payment Request Triggers**: Track who owes what with automated user prompts.

### 📊 4. Expense Analytics & Visual Categories
- **Categorized Breakdown**: Visual progress bars for Shopping, Utilities, Dining, Subscriptions, and Transfers.
- **Time Period Filters**: Filter spending ratios by *This Week*, *This Month*, or *This Year*.
- **Smart Saving Tips**: Insights and alert indicators to help optimize budget allocations.

### 🎯 5. Savings Vaults & Target Goals
- **Goal-Based Savings**: Create custom savings vaults (e.g., *Vacation Fund*, *Emergency Vault*, *New Car*).
- **Goal Progress Tracking**: Live visual progress indicators showing percentages achieved.

### 📄 6. Digital Receipt Export & Sharing
- **Export Receipts**: Generate formatted digital transaction receipts.
- **Native Sharing**: Share receipts via PDF/Text using native device share options.

### 💸 7. Real-Time Transfers & Wallet Operations
- **P2P Money Transfers**: Send money instantly using 16-digit Account Numbers or IBANs.
- **Atomic Transactions**: Powered by Firebase Firestore ACID transactions for guaranteed accuracy.
- **QR Code Scanning**: Scan recipient QR codes via `expo-camera` to transfer funds.

### 🛍️ 8. Subscriptions & Utility Bill Payments
- **Digital Subscriptions**: Subscribe to Netflix, Spotify, Amazon Prime, Disney+, YouTube Premium, Apple TV+.
- **Utility Payments**: Pay electricity, water, gas, and internet bills directly from your wallet.

---

## 🛠️ Technology Stack

- **Core**: React Native (v0.76.7) & Expo SDK (v52)
- **Backend & Database**: Firebase (v11.4.0) — Firestore Realtime Database, Authentication, Cloud Storage
- **Security & Hardware**: `expo-local-authentication`, `expo-camera`, `expo-image-picker`
- **Navigation**: React Navigation (Native Stack & Bottom Tabs)
- **Storage & State**: `@react-native-async-storage/async-storage`
- **Styling**: Custom dark mode theme, `expo-linear-gradient`, `@expo/vector-icons`

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Expo Go app on iOS/Android or an emulator

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/araneeskhan/Bankee.git
   cd Bankee
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Firebase Setup:**
   - Create a project on [Firebase Console](https://console.firebase.google.com/).
   - Enable **Authentication** (Email/Password) and **Cloud Firestore Database**.
   - Create a `firebase.config.js` file in the root directory (or use the configured `firebase.js`).

4. **Run the Application:**
   ```bash
   npm start
   ```
   Scan the QR code with **Expo Go** or press `a` for Android Emulator / `i` for iOS Simulator.

---

## 👤 Author

**Anees Ur Rehman**  
GitHub: [@araneeskhan](https://github.com/araneeskhan)

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
