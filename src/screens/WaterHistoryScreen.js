import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Dimensions,
    RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../styles/theme';
import { getWaterHistory, getProfile } from '../services/storage';
import { calculateWaterGoal } from '../services/aiSuggestions';
import { lightImpact } from '../services/haptics';

const { width: screenWidth } = Dimensions.get('window');

const PERIOD_OPTIONS = [
    { id: 'week', label: '7 dias', days: 7 },
    { id: 'twoWeeks', label: '14 dias', days: 14 },
    { id: 'month', label: '30 dias', days: 30 },
];

// Glass Card Component
const GlassCard = ({ children, style, variant = 'default' }) => {
    const getGradientColors = () => {
        switch (variant) {
            case 'water':
                return ['rgba(14, 165, 233, 0.15)', 'rgba(2, 132, 199, 0.08)', 'rgba(14, 165, 233, 0.03)'];
            case 'success':
                return ['rgba(34, 197, 94, 0.15)', 'rgba(22, 163, 74, 0.08)', 'rgba(34, 197, 94, 0.03)'];
            case 'warning':
                return ['rgba(245, 158, 11, 0.15)', 'rgba(217, 119, 6, 0.08)', 'rgba(245, 158, 11, 0.03)'];
            default:
                return ['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.04)', 'rgba(255, 255, 255, 0.01)'];
        }
    };

    const getBorderColor = () => {
        switch (variant) {
            case 'water': return 'rgba(14, 165, 233, 0.3)';
            case 'success': return 'rgba(34, 197, 94, 0.3)';
            case 'warning': return 'rgba(245, 158, 11, 0.3)';
            default: return 'rgba(255, 255, 255, 0.1)';
        }
    };

    return (
        <View style={[styles.glassCard, { borderColor: getBorderColor() }, style]}>
            <LinearGradient
                colors={getGradientColors()}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFill}
            />
            {children}
        </View>
    );
};

export default function WaterHistoryScreen({ navigation }) {
    const [history, setHistory] = useState([]);
    const [goal, setGoal] = useState(2000);
    const [selectedPeriod, setSelectedPeriod] = useState(PERIOD_OPTIONS[0]);
    const [refreshing, setRefreshing] = useState(false);

    const loadData = async () => {
        const profileData = await getProfile();
        const historyData = await getWaterHistory(selectedPeriod.days);

        setHistory(historyData);

        if (profileData) {
            if (profileData.customWaterGoal) {
                setGoal(profileData.customWaterGoal);
            } else if (profileData.weight) {
                setGoal(calculateWaterGoal(profileData.weight, profileData.gender));
            }
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [selectedPeriod])
    );

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    // Calculate stats
    const totalAmount = history.reduce((sum, day) => sum + day.amount, 0);
    const avgAmount = history.length > 0 ? Math.round(totalAmount / history.length) : 0;
    const daysOnGoal = history.filter(day => day.amount >= goal).length;
    const maxAmount = Math.max(...history.map(d => d.amount), goal);
    const bestDay = history.reduce((best, day) => day.amount > best.amount ? day : best, { amount: 0 });

    // Get day name for chart
    const getDayLabel = (dateStr) => {
        const date = new Date(dateStr + 'T12:00:00');
        return date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
    };

    const getMonthDay = (dateStr) => {
        const date = new Date(dateStr + 'T12:00:00');
        return date.getDate().toString();
    };

    return (
        <ScrollView
            style={styles.container}
            showsVerticalScrollIndicator={false}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
            }
        >
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => {
                        lightImpact();
                        navigation.goBack();
                    }}
                >
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.title}>Histórico de Hidratação</Text>
            </View>

            {/* Period Selector */}
            <View style={styles.periodSelector}>
                {PERIOD_OPTIONS.map((period) => (
                    <TouchableOpacity
                        key={period.id}
                        style={[
                            styles.periodButton,
                            selectedPeriod.id === period.id && styles.periodButtonActive,
                        ]}
                        onPress={() => {
                            lightImpact();
                            setSelectedPeriod(period);
                        }}
                    >
                        <Text style={[
                            styles.periodButtonText,
                            selectedPeriod.id === period.id && styles.periodButtonTextActive,
                        ]}>
                            {period.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Stats Summary */}
            <View style={styles.statsRow}>
                <GlassCard style={styles.statCard} variant="water">
                    <Text style={styles.statValue}>{avgAmount}ml</Text>
                    <Text style={styles.statLabel}>Média diária</Text>
                </GlassCard>

                <GlassCard style={styles.statCard} variant="success">
                    <Text style={[styles.statValue, { color: '#22c55e' }]}>{daysOnGoal}</Text>
                    <Text style={styles.statLabel}>Dias na meta</Text>
                </GlassCard>

                <GlassCard style={styles.statCard} variant="warning">
                    <Text style={[styles.statValue, { color: '#f59e0b' }]}>
                        {Math.round((daysOnGoal / history.length) * 100) || 0}%
                    </Text>
                    <Text style={styles.statLabel}>Consistência</Text>
                </GlassCard>
            </View>

            {/* Chart */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Consumo Diário</Text>
                <GlassCard style={styles.chartCard}>
                    {/* Goal line indicator */}
                    <View style={styles.goalLineContainer}>
                        <View style={styles.goalLine} />
                        <Text style={styles.goalLineLabel}>Meta: {goal}ml</Text>
                    </View>

                    {/* Bars */}
                    <View style={styles.chartContainer}>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.barsScrollContent}
                        >
                            {history.map((day, index) => {
                                const heightPercent = Math.min((day.amount / maxAmount) * 100, 100);
                                const isOnGoal = day.amount >= goal;
                                const isToday = day.date === new Date().toISOString().split('T')[0];

                                return (
                                    <View key={day.date} style={styles.barWrapper}>
                                        <View style={styles.barColumn}>
                                            {/* Amount */}
                                            <Text style={[
                                                styles.barAmount,
                                                isOnGoal && styles.barAmountSuccess
                                            ]}>
                                                {day.amount > 0 ? `${Math.round(day.amount / 100) / 10}L` : '-'}
                                            </Text>

                                            {/* Bar */}
                                            <View style={[styles.barBackground, { height: 120 }]}>
                                                <LinearGradient
                                                    colors={isOnGoal
                                                        ? ['#22c55e', '#16a34a']
                                                        : isToday
                                                            ? ['#f59e0b', '#d97706']
                                                            : ['#38bdf8', '#0ea5e9']
                                                    }
                                                    style={[
                                                        styles.bar,
                                                        { height: `${heightPercent}%` },
                                                    ]}
                                                />
                                            </View>

                                            {/* Day label */}
                                            <Text style={[
                                                styles.dayLabel,
                                                isToday && styles.todayLabel
                                            ]}>
                                                {selectedPeriod.days <= 7
                                                    ? getDayLabel(day.date)
                                                    : getMonthDay(day.date)}
                                            </Text>
                                        </View>
                                    </View>
                                );
                            })}
                        </ScrollView>
                    </View>

                    {/* Legend */}
                    <View style={styles.legend}>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: '#22c55e' }]} />
                            <Text style={styles.legendText}>Meta atingida</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: '#f59e0b' }]} />
                            <Text style={styles.legendText}>Hoje</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: '#0ea5e9' }]} />
                            <Text style={styles.legendText}>Outros dias</Text>
                        </View>
                    </View>
                </GlassCard>
            </View>

            {/* Insights */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Insights</Text>
                <GlassCard>
                    <View style={styles.insightRow}>
                        <Text style={styles.insightEmoji}>🏆</Text>
                        <View style={styles.insightContent}>
                            <Text style={styles.insightTitle}>Melhor dia</Text>
                            <Text style={styles.insightValue}>
                                {bestDay.amount > 0
                                    ? `${new Date(bestDay.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' })} - ${bestDay.amount}ml`
                                    : 'Nenhum dado'}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.insightRow}>
                        <Text style={styles.insightEmoji}>📊</Text>
                        <View style={styles.insightContent}>
                            <Text style={styles.insightTitle}>Total no período</Text>
                            <Text style={styles.insightValue}>
                                {(totalAmount / 1000).toFixed(1)}L em {history.length} dias
                            </Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.insightRow}>
                        <Text style={styles.insightEmoji}>💡</Text>
                        <View style={styles.insightContent}>
                            <Text style={styles.insightTitle}>Dica</Text>
                            <Text style={styles.insightValue}>
                                {avgAmount >= goal
                                    ? 'Excelente! Continue mantendo essa hidratação.'
                                    : `Tente beber mais ${goal - avgAmount}ml por dia para atingir sua meta.`}
                            </Text>
                        </View>
                    </View>
                </GlassCard>
            </View>

            <View style={styles.bottomSpacer} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.lg,
        paddingTop: spacing.xl,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
    },
    title: {
        ...typography.h2,
        flex: 1,
    },
    periodSelector: {
        flexDirection: 'row',
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.lg,
        gap: spacing.sm,
    },
    periodButton: {
        flex: 1,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.full,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
    },
    periodButtonActive: {
        backgroundColor: 'rgba(14, 165, 233, 0.2)',
        borderColor: 'rgba(14, 165, 233, 0.4)',
    },
    periodButtonText: {
        fontSize: 13,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    periodButtonTextActive: {
        color: '#38bdf8',
    },
    statsRow: {
        flexDirection: 'row',
        paddingHorizontal: spacing.lg,
        gap: spacing.sm,
        marginBottom: spacing.lg,
    },
    statCard: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: spacing.md,
    },
    statValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#38bdf8',
        marginBottom: 2,
    },
    statLabel: {
        fontSize: 11,
        color: colors.textSecondary,
    },
    section: {
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.lg,
    },
    sectionTitle: {
        ...typography.h3,
        marginBottom: spacing.md,
    },
    glassCard: {
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        overflow: 'hidden',
        padding: spacing.md,
    },
    chartCard: {
        paddingVertical: spacing.lg,
    },
    goalLineContainer: {
        position: 'absolute',
        left: spacing.md,
        right: spacing.md,
        top: 95,
        flexDirection: 'row',
        alignItems: 'center',
    },
    goalLine: {
        flex: 1,
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderStyle: 'dashed',
    },
    goalLineLabel: {
        fontSize: 9,
        color: colors.textSecondary,
        marginLeft: spacing.xs,
    },
    chartContainer: {
        marginTop: spacing.sm,
    },
    barsScrollContent: {
        paddingHorizontal: spacing.sm,
        alignItems: 'flex-end',
    },
    barWrapper: {
        width: 36,
        alignItems: 'center',
    },
    barColumn: {
        alignItems: 'center',
    },
    barAmount: {
        fontSize: 9,
        color: colors.textSecondary,
        marginBottom: 4,
    },
    barAmountSuccess: {
        color: '#22c55e',
    },
    barBackground: {
        width: 20,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 10,
        justifyContent: 'flex-end',
        overflow: 'hidden',
    },
    bar: {
        width: '100%',
        borderRadius: 10,
        minHeight: 4,
    },
    dayLabel: {
        fontSize: 9,
        color: colors.textSecondary,
        marginTop: 6,
        textTransform: 'capitalize',
    },
    todayLabel: {
        color: '#f59e0b',
        fontWeight: 'bold',
    },
    legend: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: spacing.lg,
        marginTop: spacing.lg,
        paddingTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    legendDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    legendText: {
        fontSize: 10,
        color: colors.textSecondary,
    },
    insightRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
    },
    insightEmoji: {
        fontSize: 24,
        marginRight: spacing.md,
    },
    insightContent: {
        flex: 1,
    },
    insightTitle: {
        fontSize: 12,
        color: colors.textSecondary,
        marginBottom: 2,
    },
    insightValue: {
        fontSize: 14,
        color: colors.text,
        fontWeight: '500',
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.05)',
        marginVertical: spacing.xs,
    },
    bottomSpacer: {
        height: 100,
    },
});
