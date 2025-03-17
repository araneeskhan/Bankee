import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { COLORS } from './styles';

export const LoadingSpinner = ({ text }) => (
  <View style={styles.container}>
    <ActivityIndicator size={36} color={COLORS.primary} />
    {text && <Text style={styles.text}>{text}</Text>}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: COLORS.text,
    fontSize: 16,
    marginTop: 12,
  },
}); 