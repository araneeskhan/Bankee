import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5 } from '@expo/vector-icons';
import { COLORS } from './styles';

const { width } = Dimensions.get('window');

const categories = [
  { id: '1', name: 'Subscriptions', amount: 312.45, percentage: 35, icon: 'credit-card', color: ['#4A00E0', '#8E2DE2'] },
  { id: '2', name: 'Utility Bills', amount: 240.00, percentage: 27, icon: 'file-invoice-dollar', color: ['#FF512F', '#DD2476'] },
  { id: '3', name: 'Food & Dining', amount: 180.50, percentage: 20, icon: 'utensils', color: ['#11998e', '#38ef7d'] },
  { id: '4', name: 'Transfers', amount: 120.00, percentage: 13, icon: 'paper-plane', color: ['#FF8008', '#FFC837'] },
  { id: '5', name: 'Shopping', amount: 45.00, percentage: 5, icon: 'shopping-bag', color: ['#00c6ff', '#0072ff'] },
];

export default function AnalyticsScreen({ navigation }) {
  const [selectedPeriod, setSelectedPeriod] = useState('Month');

  const totalSpent = categories.reduce((acc, cat) => acc + cat.amount, 0);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <FontAwesome5 name="arrow-left" size={18} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Expense Analytics</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Period Selector */}
        <View style={styles.periodContainer}>
          {['Week', 'Month', 'Year'].map(period => (
            <TouchableOpacity
              key={period}
              style={[
                styles.periodTab,
                selectedPeriod === period && styles.periodTabActive
              ]}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text style={[
                styles.periodText,
                selectedPeriod === period && styles.periodTextActive
              ]}>
                This {period}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Total Spend Card */}
        <LinearGradient
          colors={COLORS.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.summaryCard}
        >
          <Text style={styles.summaryLabel}>Total Expenses</Text>
          <Text style={styles.summaryAmount}>${totalSpent.toFixed(2)}</Text>
          <View style={styles.badgeRow}>
            <View style={styles.trendBadge}>
              <FontAwesome5 name="arrow-down" size={12} color="#4EBA6F" />
              <Text style={styles.trendBadgeText}> 8.5% vs last month</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Visual Bar Graph */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Category Spending Ratio</Text>
          <View style={styles.stackedBar}>
            {categories.map((cat, idx) => (
              <View
                key={cat.id}
                style={[
                  styles.barSegment,
                  {
                    width: `${cat.percentage}%`,
                    backgroundColor: cat.color[0],
                    borderTopLeftRadius: idx === 0 ? 6 : 0,
                    borderBottomLeftRadius: idx === 0 ? 6 : 0,
                    borderTopRightRadius: idx === categories.length - 1 ? 6 : 0,
                    borderBottomRightRadius: idx === categories.length - 1 ? 6 : 0,
                  }
                ]}
              />
            ))}
          </View>
        </View>

        {/* Category List */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Breakdown by Category</Text>
          {categories.map(cat => (
            <View key={cat.id} style={styles.categoryRow}>
              <LinearGradient
                colors={cat.color}
                style={styles.categoryIconBg}
              >
                <FontAwesome5 name={cat.icon} size={16} color="#FFF" />
              </LinearGradient>

              <View style={styles.categoryInfo}>
                <View style={styles.categoryLabelRow}>
                  <Text style={styles.categoryName}>{cat.name}</Text>
                  <Text style={styles.categoryAmount}>${cat.amount.toFixed(2)}</Text>
                </View>

                {/* Progress bar */}
                <View style={styles.progressBg}>
                  <LinearGradient
                    colors={cat.color}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.progressFill, { width: `${cat.percentage}%` }]}
                  />
                </View>
                <Text style={styles.percentageText}>{cat.percentage}% of total spend</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Financial Insight Alert */}
        <View style={styles.insightBox}>
          <FontAwesome5 name="lightbulb" size={20} color={COLORS.primary} style={{ marginRight: 12 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.insightTitle}>Smart Saving Tip</Text>
            <Text style={styles.insightBody}>
              Subscriptions make up 35% of your expenses this month. Review inactive services to save up to $80/mo.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  scrollView: {
    paddingHorizontal: 20,
  },
  periodContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 4,
    marginVertical: 14,
  },
  periodTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  periodTabActive: {
    backgroundColor: COLORS.primary,
  },
  periodText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  periodTextActive: {
    color: COLORS.text,
  },
  summaryCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    alignItems: 'center',
  },
  summaryLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    marginBottom: 4,
  },
  summaryAmount: {
    color: '#FFF',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: 'row',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  trendBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  sectionCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
  },
  stackedBar: {
    height: 14,
    flexDirection: 'row',
    width: '100%',
    backgroundColor: COLORS.inputBackground,
    borderRadius: 7,
    overflow: 'hidden',
  },
  barSegment: {
    height: '100%',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  categoryIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  categoryName: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '600',
  },
  categoryAmount: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: 'bold',
  },
  progressBg: {
    height: 6,
    backgroundColor: COLORS.inputBackground,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  percentageText: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  insightBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(114, 9, 183, 0.15)',
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 16,
    padding: 16,
    marginBottom: 30,
  },
  insightTitle: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  insightBody: {
    color: COLORS.text,
    fontSize: 13,
    lineHeight: 18,
  },
});
