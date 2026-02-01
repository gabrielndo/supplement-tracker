import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    RefreshControl,
    Animated,
    Pressable,
    Modal,
    TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius, typography } from '../styles/theme';
import {
    getProfile,
    getSupplements,
    getStreak,
    getConsumptionLog,
    getWaterLog,
    logConsumption,
    removeConsumption,
} from '../services/storage';
import { calculateWaterGoal } from '../services/aiSuggestions';
import { successFeedback, mediumImpact, lightImpact, errorFeedback } from '../services/haptics';
import { checkAndNotify } from '../utils/achievements';
import { scheduleStreakReminder } from '../services/notifications';

// Animated Glass Card Component
const GlassCard = ({ children, style, onPress, variant = 'default', disabled = false }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        if (disabled) return;
        Animated.spring(scaleAnim, {
            toValue: 0.97,
            useNativeDriver: true,
            damping: 15,
            stiffness: 300,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            damping: 10,
            stiffness: 200,
        }).start();
    };

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
            case 'empty':
                return ['rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.02)', 'rgba(255, 255, 255, 0.01)'];
            default:
                return ['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.04)', 'rgba(255, 255, 255, 0.01)'];
        }
    };

    const getBorderColor = () => {
        switch (variant) {
            case 'streak': return 'rgba(245, 158, 11, 0.4)';
            case 'primary': return 'rgba(99, 102, 241, 0.3)';
            case 'water': return 'rgba(14, 165, 233, 0.3)';
            case 'success': return 'rgba(34, 197, 94, 0.3)';
            case 'empty': return 'rgba(255, 255, 255, 0.15)';
            default: return 'rgba(255, 255, 255, 0.1)';
        }
    };

    if (onPress) {
        return (
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                <Pressable
                    onPress={onPress}
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                    disabled={disabled} // Actually we want it enabled to uncheck
                >
                    <View style={[styles.glassCard, { borderColor: getBorderColor() }, style]}>
                        <LinearGradient
                            colors={getGradientColors()}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 0, y: 1 }}
                            style={StyleSheet.absoluteFill}
                        />
                        {children}
                    </View>
                </Pressable>
            </Animated.View>
        );
    }

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

export default function HomeScreen({ navigation }) {
    const [profile, setProfile] = useState(null);
    const [supplements, setSupplements] = useState([]);
    const [streak, setStreak] = useState(0);
    const [todayLog, setTodayLog] = useState([]);
    const [waterData, setWaterData] = useState({ amount: 0 });
    const [waterGoal, setWaterGoal] = useState(2000);
    const [refreshing, setRefreshing] = useState(false);

    // Remove Modal State
    const [confirmRemoveVisible, setConfirmRemoveVisible] = useState(false);
    const [supplementToRemove, setSupplementToRemove] = useState(null);

    const today = new Date().toISOString().split('T')[0];

    const loadData = async () => {
        const profileData = await getProfile();
        const supplementsData = await getSupplements();
        const streakData = await getStreak();
        const todayLogData = await getConsumptionLog(today);
        const waterLogData = await getWaterLog(today);

        setProfile(profileData);
        setSupplements(supplementsData);
        setStreak(streakData);
        setTodayLog(todayLogData);
        setWaterData(waterLogData);

        if (profileData?.weight) {
            if (profileData.customWaterGoal) {
                setWaterGoal(profileData.customWaterGoal);
            } else {
                setWaterGoal(calculateWaterGoal(profileData.weight, profileData.gender));
            }
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const streakScale = useRef(new Animated.Value(1)).current;
    const prevStreak = useRef(0);

    // Schedule streak reminder when supplements exist
    useEffect(() => {
        if (supplements.length > 0) {
            scheduleStreakReminder();
        }
    }, [supplements.length]);

    useEffect(() => {
        if (streak > prevStreak.current && streak > 0) {
            // Animate pop
            Animated.sequence([
                Animated.timing(streakScale, {
                    toValue: 1.2,
                    duration: 150,
                    useNativeDriver: true,
                }),
                Animated.spring(streakScale, {
                    toValue: 1,
                    friction: 4,
                    useNativeDriver: true,
                })
            ]).start();
            mediumImpact();
        }
        prevStreak.current = streak;
    }, [streak]);

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    const handleToggleSupplement = async (supplementId) => {
        const isTaken = todayLog.includes(supplementId);

        if (isTaken) {
            // Open Remove Modal
            lightImpact();
            const supp = supplements.find(s => s.id === supplementId);
            setSupplementToRemove(supp);
            setConfirmRemoveVisible(true);
        } else {
            // Mark as taken
            successFeedback();
            await logConsumption(supplementId, today);
            await loadData();

            // Check for achievements
            await checkAndNotify(waterGoal);
        }
    };

    const confirmRemoveConsumption = async () => {
        if (supplementToRemove) {
            errorFeedback();
            await removeConsumption(supplementToRemove.id, today);
            await loadData();
        }
        setConfirmRemoveVisible(false);
        setSupplementToRemove(null);
    };

    const takenCount = todayLog.length;
    const totalSupplements = supplements.length;
    const progressPercent = totalSupplements > 0
        ? Math.round((takenCount / totalSupplements) * 100)
        : 0;

    const waterPercent = Math.min(100, Math.round((waterData.amount / waterGoal) * 100));

    return (
        <ScrollView
            style={styles.container}
            showsVerticalScrollIndicator={false}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
            }
        >
            {/* Welcome Section */}
            <View style={styles.header}>
                <Text style={styles.greeting}>
                    Olá, {profile?.name || 'Usuário'}! 👋
                </Text>
                <Text style={styles.date}>
                    {new Date().toLocaleDateString('pt-BR', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long'
                    })}
                </Text>
            </View>

            {/* Streak Card */}
            <View style={styles.cardWrapper}>
                <Animated.View style={{ transform: [{ scale: streakScale }] }}>
                    <GlassCard variant={streak > 0 ? "streak" : "empty"}>
                        <View style={styles.streakRow}>
                            <Text style={[styles.streakEmoji, { opacity: streak > 0 ? 1 : 0.5 }]}>
                                {streak > 0 ? "🔥" : "🔒"}
                            </Text>
                            <View style={styles.streakInfo}>
                                {streak > 0 ? (
                                    <>
                                        <Text style={styles.streakNumber}>{streak}</Text>
                                        <Text style={styles.streakLabel}>dias seguidos</Text>
                                    </>
                                ) : (
                                    <>
                                        <Text style={[styles.streakNumber, { color: colors.textSecondary, fontSize: 24 }]}>
                                            Comece hoje!
                                        </Text>
                                        <Text style={styles.streakLabel}>
                                            Registre um suplemento para iniciar
                                        </Text>
                                    </>
                                )}
                            </View>
                        </View>
                    </GlassCard>
                </Animated.View>
            </View>

            {/* Today's Progress */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Progresso de Hoje</Text>

                {/* Supplements Progress */}
                <GlassCard variant="primary" style={styles.progressCardMargin}>
                    <View style={styles.progressHeader}>
                        <Text style={styles.progressTitle}>💊 Suplementos</Text>
                        <Text style={styles.progressText}>{takenCount}/{totalSupplements}</Text>
                    </View>
                    <View style={styles.progressBar}>
                        <LinearGradient
                            colors={['#818cf8', '#6366f1', '#4f46e5']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={[styles.progressFill, { width: `${progressPercent}%` }]}
                        />
                    </View>
                </GlassCard>

                {/* Water Progress - Simple Bar */}
                <GlassCard
                    variant="water"
                    onPress={() => {
                        lightImpact();
                        navigation.navigate('Água');
                    }}
                >
                    <View style={styles.progressHeader}>
                        <Text style={styles.progressTitle}>💧 Água</Text>
                        <Text style={styles.progressTextWater}>
                            {waterData.amount}ml / {waterGoal}ml
                        </Text>
                    </View>
                    <View style={styles.progressBar}>
                        <LinearGradient
                            colors={['#38bdf8', '#0ea5e9', '#0284c7']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={[styles.progressFill, { width: `${waterPercent}%` }]}
                        />
                    </View>
                </GlassCard>
            </View>

            {/* Quick Actions */}
            {supplements.length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Check-in Diário</Text>
                    {supplements.map((supplement) => {
                        const isTaken = todayLog.includes(supplement.id);
                        return (
                            <GlassCard
                                key={supplement.id}
                                variant={isTaken ? 'success' : 'default'}
                                onPress={() => handleToggleSupplement(supplement.id)}
                                style={styles.supplementCardMargin}
                            >
                                <View style={styles.supplementRow}>
                                    <Text style={styles.supplementIcon}>{supplement.icon}</Text>
                                    <View style={styles.supplementInfo}>
                                        <Text style={styles.supplementName}>{supplement.name}</Text>
                                        <Text style={styles.supplementDosage}>
                                            {supplement.dosage} {supplement.unit}
                                        </Text>
                                    </View>
                                    <View style={styles.statusContainer}>
                                        <View style={[styles.statusBadge, isTaken && styles.statusBadgeTaken]}>
                                            <Text style={styles.statusText}>
                                                {isTaken ? '✓ Tomado' : 'Tomar'}
                                            </Text>
                                        </View>
                                        {isTaken && (
                                            <View style={styles.removeIconBadgeOutside}>
                                                <Text style={styles.removeIconText}>✕</Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            </GlassCard>
                        );
                    })}
                </View>
            )}

            {/* Empty State */}
            {!profile && (
                <View style={styles.cardWrapper}>
                    <GlassCard
                        variant="empty"
                        onPress={() => {
                            mediumImpact();
                            navigation.navigate('Perfil');
                        }}
                    >
                        <View style={styles.emptyContent}>
                            <Text style={styles.emptyEmoji}>👤</Text>
                            <Text style={styles.emptyTitle}>Configure seu perfil</Text>
                            <Text style={styles.emptyText}>
                                Adicione seus dados para receber sugestões personalizadas
                            </Text>
                        </View>
                    </GlassCard>
                </View>
            )}

            {supplements.length === 0 && (
                <View style={styles.cardWrapper}>
                    <GlassCard
                        variant="empty"
                        onPress={() => {
                            mediumImpact();
                            navigation.navigate('Suplementos');
                        }}
                    >
                        <View style={styles.emptyContent}>
                            <Text style={styles.emptyEmoji}>💊</Text>
                            <Text style={styles.emptyTitle}>Adicione seus suplementos</Text>
                            <Text style={styles.emptyText}>
                                Configure os suplementos que você toma diariamente
                            </Text>
                        </View>
                    </GlassCard>
                </View>
            )}

            <View style={styles.bottomSpacer} />

            {/* Confirm Remove Modal - Glass Style */}
            <Modal visible={confirmRemoveVisible} animationType="fade" transparent={true} onRequestClose={() => setConfirmRemoveVisible(false)}>
                <View style={styles.modalOverlayGlass}>
                    <View style={styles.glassModalContent}>
                        <Text style={styles.confirmTitle}>Desfazer registro?</Text>
                        <Text style={styles.confirmSubtitle}>
                            Marcar {supplementToRemove?.name} como não tomado.
                        </Text>
                        <View style={styles.deleteIconBig}>
                            <Text style={{ fontSize: 32 }}>🗑️</Text>
                        </View>
                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={styles.cancelButton} onPress={() => setConfirmRemoveVisible(false)}>
                                <Text style={styles.cancelButtonText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.deleteButton} onPress={confirmRemoveConsumption}>
                                <Text style={styles.deleteButtonText}>Remover</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
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
    greeting: {
        ...typography.h2,
        marginBottom: spacing.xs,
    },
    date: {
        ...typography.bodySmall,
        textTransform: 'capitalize',
    },
    cardWrapper: {
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.sm,
    },
    glassCard: {
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        overflow: 'hidden',
        padding: spacing.lg,
    },
    streakRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    streakEmoji: {
        fontSize: 48,
        marginRight: spacing.md,
    },
    streakInfo: {
        flex: 1,
    },
    streakNumber: {
        fontSize: 42,
        fontWeight: 'bold',
        color: colors.accent,
    },
    streakLabel: {
        ...typography.body,
        color: colors.textSecondary,
    },
    section: {
        padding: spacing.lg,
    },
    sectionTitle: {
        ...typography.h3,
        marginBottom: spacing.md,
    },
    progressCardMargin: {
        marginBottom: spacing.sm,
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    progressTitle: {
        ...typography.body,
    },
    progressText: {
        ...typography.bodySmall,
        color: colors.primary,
    },
    progressTextWater: {
        ...typography.bodySmall,
        color: colors.water,
    },
    progressBar: {
        height: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: borderRadius.full,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: borderRadius.full,
    },
    supplementCardMargin: {
        marginBottom: spacing.sm,
    },
    supplementRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    supplementIcon: {
        fontSize: 32,
        marginRight: spacing.md,
    },
    supplementInfo: {
        flex: 1,
    },
    supplementName: {
        ...typography.body,
        fontWeight: '600',
    },
    supplementDosage: {
        ...typography.bodySmall,
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    statusBadge: {
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.full,
    },
    statusBadgeTaken: {
        backgroundColor: colors.success,
    },
    statusText: {
        color: colors.text,
        fontWeight: '600',
        fontSize: 12,
    },
    removeIconBadgeOutside: {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.3)',
    },
    removeIconText: {
        color: '#EF4444',
        fontSize: 10,
        fontWeight: 'bold',
    },
    emptyContent: {
        alignItems: 'center',
    },
    emptyEmoji: {
        fontSize: 48,
        marginBottom: spacing.md,
    },
    emptyTitle: {
        ...typography.h3,
        marginBottom: spacing.xs,
    },
    emptyText: {
        ...typography.bodySmall,
        textAlign: 'center',
    },
    bottomSpacer: {
        height: 96,
    },
    modalOverlayGlass: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.lg,
    },
    glassModalContent: {
        backgroundColor: '#111827',
        borderRadius: borderRadius.xl,
        padding: spacing.xl,
        width: '85%',
        maxWidth: 350,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10,
    },
    confirmTitle: {
        ...typography.h3,
        textAlign: 'center',
        marginBottom: spacing.xs,
    },
    confirmSubtitle: {
        ...typography.bodySmall,
        textAlign: 'center',
        marginBottom: spacing.md,
        color: colors.textSecondary,
    },
    deleteIconBig: {
        marginBottom: spacing.lg,
        padding: spacing.md,
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderRadius: borderRadius.full,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: spacing.md,
        width: '100%',
    },
    cancelButton: {
        flex: 1,
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    cancelButtonText: {
        color: colors.textSecondary,
        fontWeight: '600',
    },
    deleteButton: {
        flex: 1,
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        borderWidth: 1,
        borderColor: colors.error,
    },
    deleteButtonText: {
        color: colors.error,
        fontWeight: 'bold',
    },
});
