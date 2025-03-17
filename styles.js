import { StyleSheet } from 'react-native';

export const COLORS = {
  primary: '#00A86B',
  primaryDark: '#008F5D',
  primaryLight: '#33B685',
  
  success: '#4CAF50',
  error: '#F44336',
  warning: '#FFC107',
  info: '#2196F3',
  
  background: '#121212',
  card: '#1E1E1E',
  cardLight: '#2A2A2A',
  
  text: '#FFFFFF',
  textSecondary: '#B3B3B3',
  
  border: '#333333',
  notification: '#00A86B',
  
  gradient: ['#00A86B', '#008F5D'],
  cardGradient: ['#1E1E1E', '#2A2A2A'],
  
  inputBackground: 'rgba(255, 255, 255, 0.1)',
};

export const commonStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  seeAllText: {
    fontSize: 14,
    color: COLORS.primary,
  },
  // Add more common styles as needed
}); 