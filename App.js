import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { 
  StyleSheet, 
  Text, 
  View, 
  SafeAreaView, 
  TouchableOpacity, 
  Image, 
  ScrollView, 
  Animated, 
  Dimensions,
  StatusBar, 
  FlatList, 
  Modal, 
  TextInput, 
  LogBox,
  Platform
} from 'react-native';
import { 
  Ionicons, 
  MaterialCommunityIcons, 
  FontAwesome5,
  Feather
} from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts } from 'expo-font';
import { Camera } from 'expo-camera';
import { COLORS } from './styles';
import { TabBar } from './components/TabBar';

// Import screens
import HomeScreen from './HomeScreen';
import WalletScreen from './WalletScreen';
import QRCodeScreen from './QRCodeScreen';
import ContactsScreen from './ContactsScreen';
import ServicesScreen from './ServiceScreen';
import ProfileScreen from './ProfileScreen';
import AuthScreen from './AuthScreen';
import SignUpScreen from './SignUpScreen';
import NotificationsScreen from './NotificationsScreen';
import TransactionHistoryScreen from './TransactionHistoryScreen';
import TransactionDetailScreen from './TransactionDetailScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Ignore specific warnings
LogBox.ignoreLogs([
  'Warning: ...',
  'Animated: `useNativeDriver`',
  'Non-serializable values were found in the navigation state',
  'Cannot read property'
]);

const TabBarIcon = ({ focused, icon, size = 22 }) => (
  <View style={{
    height: 50,
    width: 50,
    justifyContent: 'center',
    alignItems: 'center',
  }}>
    <FontAwesome5
      name={icon}
      size={size}
      color={focused ? COLORS.primary : COLORS.textSecondary}
    />
  </View>
);

function TabNavigator() {
  return (
    <Tab.Navigator
      tabBar={props => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon focused={focused} icon="home" />
          ),
        }}
      />
      <Tab.Screen
        name="Services"
        component={ServicesScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon focused={focused} icon="th-large" />
          ),
        }}
      />
      <Tab.Screen
        name="Scan"
        component={QRCodeScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={{
              width: 56,
              height: 56,
              backgroundColor: COLORS.primary,
              borderRadius: 28,
              marginBottom: Platform.OS === 'ios' ? 32 : 24,
              justifyContent: 'center',
              alignItems: 'center',
              shadowColor: COLORS.primary,
              shadowOffset: {
                width: 0,
                height: 4,
              },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 4,
            }}>
              <FontAwesome5 name="qrcode" size={24} color={COLORS.text} />
            </View>
          ),
          tabBarLabel: () => null,
        }}
      />
      <Tab.Screen
        name="Wallet"
        component={WalletScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon focused={focused} icon="wallet" />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon focused={focused} icon="user" />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer
      theme={{
        dark: true,
        colors: {
          primary: COLORS.primary,
          background: COLORS.background,
          card: COLORS.card,
          text: COLORS.text,
          border: COLORS.border,
          notification: COLORS.notification,
        }
      }}
    >
      <Stack.Navigator
        initialRouteName="Auth"
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: COLORS.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen 
          name="Auth" 
          component={AuthScreen}
          options={{ animation: 'fade' }}
        />
        <Stack.Screen 
          name="SignUp" 
          component={SignUpScreen}
        />
        <Stack.Screen 
          name="MainApp" 
          component={TabNavigator}
          options={{ animation: 'fade' }}
        />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="Contacts" component={ContactsScreen} />
        <Stack.Screen name="TransactionHistory" component={TransactionHistoryScreen} />
        <Stack.Screen name="TransactionDetail" component={TransactionDetailScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
