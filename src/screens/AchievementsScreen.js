import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../styles/theme';
import { getAllAchievements, getAchievementStats } from '../utils/achievements';
import { getProfile } from '../services/storage';
import { calculateWaterGoal } from '../services/aiSuggestions';
import { lightImpact } from '../services/haptics';

// Glass Card Component
const GlassCard = ({ children, style, variant = 'default' }) => {
    const getGradientColors = () => {
        switch (variant) {
            case 'water':
                return ['rgba(14, 165, 233, 0.15)', 'rgba(2, 132, 199, 0.08)', 'rgba(14, 165, 233, 0.03)'];
            case 'supplements':
                return ['rgba(99, 102, 241, 0.15)', 'rgba(79, 70, 229, 0.08)', 'rgba(99, 102, 241, 0.03)'];
            case 'success':
                return ['rgba(34, 197, 94, 0.15)', 'rgba(22, 163, 74, 0.08)', 'rgba(34, 197, 94, 0.03)'];
            case 'locked':
                return ['rgba(107, 114, 128, 0.1)', 'rgba(75, 85, 99, 0.05)', 'rgba(55, 65, 81, 0.02)'];
            default:
                return ['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.04)', 'rgba(255, 255, 255, 0.01)'];
        }
    };

    const getBorderColor = () => {
        switch (variant) {
            case 'water': return 'rgba(14, 165, 233, 0.3)';
            case 'supplements': return 'rgba(99, 102, 241, 0.3)';
            case 'success': return 'rgba(34, 197, 94, 0.3)';
            case 'locked': return 'rgba(107, 114, 128, 0.2)';
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

// Achievement Badge Component
const AchievementBadge = ({ achievement }) => {
    const variant = achievement.unlocked
        ? (achievement.category === 'water' ? 'water' :
            achievement.category === 'supplements' ? 'supplements' : 'success')
        : 'locked';

    return (
        <GlassCard style={styles.achievementCard} variant={variant}>
            <View style={styles.achievementRow}>
                <View style={[
                    styles.iconContainer,
                    !achievement.unlocked && styles.iconContainerLocked
                ]}>
                    <Text style={[
                        styles.achievementIcon,
                        !achievement.unlocked && styles.iconLocked
                    ]}>
                        {achievement.unlocked ? achievement.icon : '🔒'}
                    </Text>
                </View>

                <View style={styles.achievementInfo}>
                    <Text style={[
                        styles.achievementTitle,
                        !achievement.unlocked && styles.textLocked
                    ]}>
                        {achievement.title}
                    </Text>
                    <Text style={[
                        styles.achievementDescription,
                        !achievement.unlocked && styles.textLocked
                    ]}>
                        {achievement.description}
                    </Text>
                </View>

                {achievement.unlocked && (
                    <View style={styles.unlockedBadge}>
                        <Ionicons name="checkmark-circle" size={24} color="#22c55e" />
                    </View>
                )}
            </View>
        </GlassCard>
    );
};

export default function AchievementsScreen({ navigation }) {
    const [achievements, setAchievements] = useState([]);
    const [stats, setStats] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('all');

    const loadData = async () => {
        const profile = await getProfile();
        let goal = 2000;
        if (profile) {
            goal = profile.customWaterGoal || calculateWaterGoal(profile.weight, profile.gender);
        }

        const allAchievements = await getAllAchievements(goal);
        const achievementStats = await getAchievementStats(goal);

        setAchievements(allAchievements);
        setStats(achievementStats);
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    const categories = [
        { id: 'all', label: 'Todas', icon: '🏅' },
        { id: 'water', label: 'Água', icon: '💧' },
        { id: 'supplements', label: 'Suplementos', icon: '💊' },
        { id: 'general', label: 'Geral', icon: '⭐' },
    ];

    const filteredAchievements = selectedCategory === 'all'
        ? achievements
        : achievements.filter(a => a.category === selectedCategory);

    // Sort: unlocked first, then by category
    const sortedAchievements = [...filteredAchievements].sort((a, b) => {
        if (a.unlocked && !b.unlocked) return -1;
        if (!a.unlocked && b.unlocked) return 1;
        return 0;
    });

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
                <Text style={styles.title}>Conquistas 🏆</Text>
            </View>

            {/* Progress Summary */}
            {stats && (
                <View style={styles.progressSection}>
                    <GlassCard style={styles.progressCard}>
                        <View style={styles.progressHeader}>
                            <Text style={styles.progressTitle}>Seu Progresso</Text>
                            <Text style={styles.progressPercentage}>{stats.percentage}%</Text>
                        </View>

                        {/* Progress Bar */}
                        <View style={styles.progressBar}>
                            <LinearGradient
                                colors={['#f59e0b', '#eab308', '#22c55e']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={[styles.progressFill, { width: `${stats.percentage}%` }]}
                            />
                        </View>

                        <Text style={styles.progressText}>
                            {stats.unlocked} de {stats.total} conquistas desbloqueadas
                        </Text>

                        {/* Category Breakdown */}
                        <View style={styles.categoryBreakdown}>
                            <View style={styles.categoryItem}>
                                <Text style={styles.categoryEmoji}>💧</Text>
                                <Text style={styles.categoryCount}>
                                    {stats.byCategory.water.unlocked}/{stats.byCategory.water.total}
                                </Text>
                            </View>
                            <View style={styles.categoryDivider} />
                            <View style={styles.categoryItem}>
                                <Text style={styles.categoryEmoji}>💊</Text>
                                <Text style={styles.categoryCount}>
                                    {stats.byCategory.supplements.unlocked}/{stats.byCategory.supplements.total}
                                </Text>
                            </View>
                            <View style={styles.categoryDivider} />
                            <View style={styles.categoryItem}>
                                <Text style={styles.categoryEmoji}>⭐</Text>
                                <Text style={styles.categoryCount}>
                                    {stats.byCategory.general.unlocked}/{stats.byCategory.general.total}
                                </Text>
                            </View>
                        </View>
                    </GlassCard>
                </View>
            )}

            {/* Category Filter */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.categoryFilter}
                contentContainerStyle={styles.categoryFilterContent}
            >
                {categories.map(category => (
                    <TouchableOpacity
                        key={category.id}
                        style={[
                            styles.categoryButton,
                            selectedCategory === category.id && styles.categoryButtonActive
                        ]}
                        onPress={() => {
                            lightImpact();
                            setSelectedCategory(category.id);
                        }}
                    >
                        <Text style={styles.categoryButtonEmoji}>{category.icon}</Text>
                        <Text style={[
                            styles.categoryButtonText,
                            selectedCategory === category.id && styles.categoryButtonTextActive
                        ]}>
                            {category.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Achievements List */}
            <View style={styles.achievementsList}>
                {sortedAchievements.map(achievement => (
                    <AchievementBadge key={achievement.id} achievement={achievement} />
                ))}
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
    progressSection: {
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.lg,
    },
    glassCard: {
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        overflow: 'hidden',
        padding: spacing.md,
    },
    progressCard: {
        padding: spacing.lg,
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    progressTitle: {
        ...typography.body,
        fontWeight: '600',
    },
    progressPercentage: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#22c55e',
    },
    progressBar: {
        height: 10,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 5,
        overflow: 'hidden',
        marginBottom: spacing.sm,
    },
    progressFill: {
        height: '100%',
        borderRadius: 5,
    },
    progressText: {
        fontSize: 12,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: spacing.md,
    },
    categoryBreakdown: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
    },
    categoryItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    categoryEmoji: {
        fontSize: 16,
    },
    categoryCount: {
        fontSize: 12,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    categoryDivider: {
        width: 1,
        height: 16,
        backgroundColor: 'rgba(255,255,255,0.1)',
        marginHorizontal: spacing.lg,
    },
    categoryFilter: {
        marginBottom: spacing.md,
    },
    categoryFilterContent: {
        paddingHorizontal: spacing.lg,
        gap: spacing.sm,
    },
    categoryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.full,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        marginRight: spacing.sm,
        gap: spacing.xs,
    },
    categoryButtonActive: {
        backgroundColor: 'rgba(245, 158, 11, 0.2)',
        borderColor: 'rgba(245, 158, 11, 0.4)',
    },
    categoryButtonEmoji: {
        fontSize: 14,
    },
    categoryButtonText: {
        fontSize: 13,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    categoryButtonTextActive: {
        color: '#f59e0b',
    },
    achievementsList: {
        paddingHorizontal: spacing.lg,
        gap: spacing.sm,
    },
    achievementCard: {
        marginBottom: spacing.sm,
    },
    achievementRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
    },
    iconContainerLocked: {
        backgroundColor: 'rgba(107, 114, 128, 0.2)',
    },
    achievementIcon: {
        fontSize: 24,
    },
    iconLocked: {
        opacity: 0.5,
    },
    achievementInfo: {
        flex: 1,
    },
    achievementTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 2,
    },
    achievementDescription: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    textLocked: {
        opacity: 0.5,
    },
    unlockedBadge: {
        marginLeft: spacing.sm,
    },
    bottomSpacer: {
        height: 100,
    },
});
