import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Dimensions,
    RefreshControl,
    TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius, typography } from '../styles/theme';
import { lightImpact } from '../services/haptics';
import {
    getStreak,
    getConsumptionHistory,
    getWaterHistory,
    getSupplements,
    getProfile,
} from '../services/storage';
import { calculateWaterGoal } from '../services/aiSuggestions';

const screenWidth = Dimensions.get('window').width;

// Glass Card Component
const GlassCard = ({ children, style, variant = 'default' }) => {
    const getGradientColors = () => {
        switch (variant) {
            case 'streak':
                return ['rgba(245, 158, 11, 0.2)', 'rgba(245, 158, 11, 0.1)', 'rgba(245, 158, 11, 0.03)'];
            case 'primary':
                return ['rgba(99, 102, 241, 0.15)', 'rgba(79, 70, 229, 0.08)', 'rgba(99, 102, 241, 0.03)'];
            case 'water':
                return ['rgba(14, 165, 233, 0.15)', 'rgba(2, 132, 199, 0.08)', 'rgba(14, 165, 233, 0.03)'];
            case 'success':
                return ['rgba(34, 197, 94, 0.15)', 'rgba(22, 163, 74, 0.08)', 'rgba(34, 197, 94, 0.03)'];
            case 'motivation':
                return ['rgba(99, 102, 241, 0.25)', 'rgba(79, 70, 229, 0.15)', 'rgba(99, 102, 241, 0.08)'];
            default:
                return ['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.04)', 'rgba(255, 255, 255, 0.01)'];
        }
    };

    const getBorderColor = () => {
        switch (variant) {
            case 'streak':
                return 'rgba(245, 158, 11, 0.4)';
            case 'primary':
                return 'rgba(99, 102, 241, 0.3)';
            case 'water':
                return 'rgba(14, 165, 233, 0.3)';
            case 'success':
                return 'rgba(34, 197, 94, 0.3)';
            case 'motivation':
                return 'rgba(99, 102, 241, 0.4)';
            default:
                return 'rgba(255, 255, 255, 0.1)';
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

// Glass Stat Card
const GlassStatCard = ({ value, label, hint, variant = 'default' }) => {
    const getValueColor = () => {
        switch (variant) {
            case 'primary':
                return colors.primary;
            case 'water':
                return colors.water;
            case 'success':
                return colors.success;
            case 'accent':
                return colors.accent;
            default:
                return colors.primary;
        }
    };

    const getGradientColors = () => {
        switch (variant) {
            case 'primary':
                return ['rgba(99, 102, 241, 0.12)', 'rgba(79, 70, 229, 0.06)', 'rgba(99, 102, 241, 0.02)'];
            case 'water':
                return ['rgba(14, 165, 233, 0.12)', 'rgba(2, 132, 199, 0.06)', 'rgba(14, 165, 233, 0.02)'];
            case 'success':
                return ['rgba(34, 197, 94, 0.12)', 'rgba(22, 163, 74, 0.06)', 'rgba(34, 197, 94, 0.02)'];
            case 'accent':
                return ['rgba(245, 158, 11, 0.12)', 'rgba(245, 158, 11, 0.06)', 'rgba(245, 158, 11, 0.02)'];
            default:
                return ['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.04)', 'rgba(255, 255, 255, 0.01)'];
        }
    };

    return (
        <View style={styles.statCard}>
            <LinearGradient
                colors={getGradientColors()}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFill}
            />
            <Text style={[styles.statValue, { color: getValueColor() }]}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
            <Text style={styles.statHint}>{hint}</Text>
        </View>
    );
};

export default function StatsScreen({ navigation }) {
    const [streak, setStreak] = useState(0);
    const [supplementHistory, setSupplementHistory] = useState([]);
    const [waterHistory, setWaterHistory] = useState([]);
    const [supplements, setSupplements] = useState([]);
    const [waterGoal, setWaterGoal] = useState(2000);
    const [refreshing, setRefreshing] = useState(false);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const loadData = async () => {
        const streakData = await getStreak();
        const suppHistory = await getConsumptionHistory(7);
        const watHistory = await getWaterHistory(7);
        const supps = await getSupplements();
        const profile = await getProfile();

        setStreak(streakData);
        setSupplementHistory(suppHistory);
        setWaterHistory(watHistory);
        setSupplements(supps);

        if (profile?.weight) {
            setWaterGoal(calculateWaterGoal(profile.weight, profile.gender));
        }
    };

    const onRefresh = async () => {
        lightImpact();
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    // Calculate stats
    const avgSupplementAdherence = supplementHistory.length > 0
        ? Math.round(supplementHistory.reduce((acc, day) => acc + day.percentage, 0) / supplementHistory.length)
        : 0;

    const avgWaterIntake = waterHistory.length > 0
        ? Math.round(waterHistory.reduce((acc, day) => acc + day.amount, 0) / waterHistory.length)
        : 0;

    const perfectDays = supplementHistory.filter(day => day.percentage === 100).length;

    const getStreakMessage = (streak) => {
        if (streak === 0) return 'Comece hoje sua sequência!';
        if (streak < 7) return 'Continue assim!';
        if (streak < 30) return 'Você está formando um hábito!';
        if (streak < 100) return 'Incrível dedicação!';
        return 'Você é uma inspiração!';
    };

    return (
        <ScrollView
            style={styles.container}
            showsVerticalScrollIndicator={false}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    tintColor={colors.primary}
                />
            }
        >
            <View style={styles.header}>
                <Text style={styles.title}>Estatísticas 📊</Text>
                <Text style={styles.subtitle}>
                    Acompanhe seu progresso e mantenha a consistência
                </Text>
            </View>

            {/* Streak Card */}
            <View style={styles.cardWrapper}>
                <GlassCard variant="streak">
                    <View style={styles.streakMain}>
                        <Text style={styles.streakEmoji}>🔥</Text>
                        <View>
                            <Text style={styles.streakNumber}>{streak}</Text>
                            <Text style={styles.streakLabel}>dias seguidos</Text>
                        </View>
                    </View>
                    <Text style={styles.streakMessage}>{getStreakMessage(streak)}</Text>

                    {/* Streak milestones */}
                    <View style={styles.milestonesContainer}>
                        {[7, 30, 100].map((milestone) => (
                            <View
                                key={milestone}
                                style={[
                                    styles.milestone,
                                    streak >= milestone && styles.milestoneAchieved,
                                ]}
                            >
                                <LinearGradient
                                    colors={streak >= milestone
                                        ? ['rgba(245, 158, 11, 0.8)', 'rgba(245, 158, 11, 0.6)']
                                        : ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']}
                                    style={StyleSheet.absoluteFill}
                                />
                                <Text style={[
                                    styles.milestoneText,
                                    streak >= milestone && styles.milestoneTextAchieved,
                                ]}>
                                    {milestone}
                                </Text>
                            </View>
                        ))}
                    </View>
                </GlassCard>
            </View>

            {/* Stats Grid */}
            <View style={styles.statsGrid}>
                <GlassStatCard
                    value={`${avgSupplementAdherence}%`}
                    label="Adesão Média"
                    hint="Suplementos"
                    variant="primary"
                />
                <GlassStatCard
                    value={`${avgWaterIntake}ml`}
                    label="Água Média"
                    hint="Por dia"
                    variant="water"
                />
                <GlassStatCard
                    value={perfectDays}
                    label="Dias Perfeitos"
                    hint="Últimos 7 dias"
                    variant="success"
                />
                <GlassStatCard
                    value={supplements.length}
                    label="Suplementos"
                    hint="Ativos"
                    variant="accent"
                />
            </View>

            {/* Supplement Chart */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Suplementos - Últimos 7 Dias</Text>
                <GlassCard variant="primary">
                    <View style={styles.chartContainer}>
                        {supplementHistory.map((day, index) => {
                            const barHeight = Math.max(4, (day.percentage / 100) * 100);
                            const isToday = index === supplementHistory.length - 1;
                            return (
                                <View key={index} style={styles.chartBar}>
                                    <Text style={styles.chartValue}>{day.percentage}%</Text>
                                    <View style={styles.barContainer}>
                                        <LinearGradient
                                            colors={day.percentage >= 100
                                                ? ['#4ade80', '#22c55e', '#16a34a']
                                                : day.percentage >= 50
                                                    ? ['#a5b4fc', '#818cf8', '#6366f1']
                                                    : ['#fcd34d', '#fbbf24', '#f59e0b']}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 0, y: 1 }}
                                            style={[styles.bar, { height: barHeight }]}
                                        />
                                    </View>
                                    <Text style={[styles.chartLabel, isToday && styles.chartLabelToday]}>
                                        {isToday ? 'Hoje' : new Date(day.date).toLocaleDateString('pt-BR', { weekday: 'short' }).slice(0, 3)}
                                    </Text>
                                </View>
                            );
                        })}
                    </View>
                </GlassCard>
            </View>

            {/* Water Chart */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Hidratação - Últimos 7 Dias</Text>
                <GlassCard variant="water">
                    <View style={styles.chartContainer}>
                        {waterHistory.map((day, index) => {
                            const percentage = Math.min(100, (day.amount / waterGoal) * 100);
                            const barHeight = Math.max(4, percentage);
                            const isToday = index === waterHistory.length - 1;
                            return (
                                <View key={index} style={styles.chartBar}>
                                    <Text style={styles.chartValue}>{Math.round(day.amount / 100) / 10}L</Text>
                                    <View style={styles.barContainer}>
                                        <LinearGradient
                                            colors={percentage >= 100
                                                ? ['#4ade80', '#22c55e', '#16a34a']
                                                : ['#7dd3fc', '#38bdf8', '#0ea5e9']}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 0, y: 1 }}
                                            style={[styles.bar, { height: barHeight }]}
                                        />
                                    </View>
                                    <Text style={[styles.chartLabel, isToday && styles.chartLabelToday]}>
                                        {isToday ? 'Hoje' : new Date(day.date).toLocaleDateString('pt-BR', { weekday: 'short' }).slice(0, 3)}
                                    </Text>
                                </View>
                            );
                        })}
                    </View>
                </GlassCard>
            </View>

            {/* Achievements Button */}
            <View style={styles.cardWrapper}>
                <TouchableOpacity
                    style={styles.achievementsButton}
                    onPress={() => {
                        lightImpact();
                        navigation.navigate('Achievements');
                    }}
                    activeOpacity={0.8}
                >
                    <LinearGradient
                        colors={['rgba(245, 158, 11, 0.2)', 'rgba(245, 158, 11, 0.1)']}
                        style={StyleSheet.absoluteFill}
                    />
                    <View style={styles.achievementsContent}>
                        <Text style={styles.achievementsEmoji}>🏆</Text>
                        <View style={styles.achievementsInfo}>
                            <Text style={styles.achievementsTitle}>Conquistas</Text>
                            <Text style={styles.achievementsSubtitle}>Veja suas medalhas e desafios</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#f59e0b" />
                    </View>
                </TouchableOpacity>
            </View>

            {/* Motivation */}
            <View style={styles.cardWrapper}>
                <GlassCard variant="motivation">
                    <View style={styles.motivationContent}>
                        <Text style={styles.motivationEmoji}>💪</Text>
                        <Text style={styles.motivationText}>
                            {streak > 0
                                ? `Você está em uma sequência de ${streak} dias! Continue assim e transforme seus objetivos em realidade.`
                                : 'Cada jornada começa com um primeiro passo. Registre seu consumo hoje e comece sua sequência!'
                            }
                        </Text>
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
        padding: spacing.lg,
        paddingTop: spacing.xl,
    },
    title: {
        ...typography.h2,
        marginBottom: spacing.xs,
    },
    subtitle: {
        ...typography.bodySmall,
    },
    cardWrapper: {
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.md,
    },
    glassCard: {
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        overflow: 'hidden',
        padding: spacing.lg,
    },

    streakMain: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    streakEmoji: {
        fontSize: 48,
        marginRight: spacing.md,
    },
    streakNumber: {
        fontSize: 48,
        fontWeight: 'bold',
        color: colors.accent,
    },
    streakLabel: {
        ...typography.body,
        color: colors.textSecondary,
    },
    streakMessage: {
        ...typography.body,
        color: colors.text,
        marginBottom: spacing.md,
    },
    milestonesContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    milestone: {
        width: 50,
        height: 50,
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    milestoneAchieved: {
        borderColor: 'rgba(245, 158, 11, 0.5)',
    },
    milestoneText: {
        ...typography.body,
        color: colors.textMuted,
        fontWeight: 'bold',
        zIndex: 1,
    },
    milestoneTextAchieved: {
        color: colors.text,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        padding: spacing.lg,
        justifyContent: 'space-between',
    },
    statCard: {
        width: (screenWidth - spacing.lg * 3) / 2,
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        marginBottom: spacing.md,
        alignItems: 'center',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },

    statValue: {
        fontSize: 28,
        fontWeight: 'bold',
        zIndex: 1,
    },
    statLabel: {
        ...typography.body,
        marginTop: spacing.xs,
        zIndex: 1,
    },
    statHint: {
        ...typography.caption,
        zIndex: 1,
    },
    section: {
        padding: spacing.lg,
    },
    sectionTitle: {
        ...typography.h3,
        marginBottom: spacing.md,
    },
    chartContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        height: 130,
        alignItems: 'flex-end',
    },
    chartBar: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'flex-end',
    },
    chartValue: {
        ...typography.caption,
        marginBottom: spacing.xs,
        fontSize: 10,
    },
    barContainer: {
        width: 24,
        height: 100,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: borderRadius.sm,
        overflow: 'hidden',
        justifyContent: 'flex-end',
    },
    bar: {
        width: '100%',
        borderRadius: borderRadius.sm,
    },
    chartLabel: {
        ...typography.caption,
        marginTop: spacing.sm,
        textTransform: 'capitalize',
    },
    chartLabelToday: {
        color: colors.primary,
        fontWeight: '600',
    },
    motivationContent: {
        alignItems: 'center',
    },
    motivationEmoji: {
        fontSize: 48,
        marginBottom: spacing.md,
    },
    motivationText: {
        ...typography.body,
        textAlign: 'center',
        lineHeight: 24,
    },
    bottomSpacer: {
        height: 96,
    },
    achievementsButton: {
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.3)',
        overflow: 'hidden',
        padding: spacing.lg,
    },
    achievementsContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    achievementsEmoji: {
        fontSize: 32,
        marginRight: spacing.md,
    },
    achievementsInfo: {
        flex: 1,
    },
    achievementsTitle: {
        ...typography.body,
        fontWeight: 'bold',
        color: '#f59e0b',
    },
    achievementsSubtitle: {
        ...typography.caption,
        color: colors.textSecondary,
    },
});
