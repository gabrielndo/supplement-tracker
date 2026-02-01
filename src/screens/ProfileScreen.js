import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius, typography } from '../styles/theme';
import { getProfile } from '../services/storage';
import { getAuthUser, logout } from '../services/authStorage';
import { lightImpact, successFeedback } from '../services/haptics';

// Glass Card Component
const GlassCard = ({ children, style, variant = 'default' }) => {
    const getGradientColors = () => {
        switch (variant) {
            case 'primary':
                return ['rgba(99, 102, 241, 0.15)', 'rgba(79, 70, 229, 0.08)', 'rgba(99, 102, 241, 0.03)'];
            case 'warning':
                return ['rgba(245, 158, 11, 0.15)', 'rgba(217, 119, 6, 0.08)', 'rgba(245, 158, 11, 0.03)'];
            default:
                return ['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.04)', 'rgba(255, 255, 255, 0.01)'];
        }
    };

    const getBorderColor = () => {
        switch (variant) {
            case 'primary':
                return 'rgba(99, 102, 241, 0.3)';
            case 'warning':
                return 'rgba(245, 158, 11, 0.3)';
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
                pointerEvents="none"
            />
            {children}
        </View>
    );
};

export default function ProfileScreen() {
    const [profile, setProfile] = useState(null);
    const [authUser, setAuthUser] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const profileData = await getProfile();
        const userData = await getAuthUser();
        setProfile(profileData);
        setAuthUser(userData);
    };

    const handleLogout = () => {
        Alert.alert(
            'Sair da Conta',
            'Tem certeza que deseja sair? Todos os seus dados serão apagados deste dispositivo.',
            [
                {
                    text: 'Cancelar',
                    style: 'cancel',
                    onPress: () => lightImpact(),
                },
                {
                    text: 'Sair',
                    style: 'destructive',
                    onPress: async () => {
                        await logout();
                        successFeedback();
                        // App will automatically redirect to WelcomeScreen
                        // Force app restart by throwing error
                        setTimeout(() => {
                            throw new Error('User logged out - reload app');
                        }, 100);
                    },
                },
            ]
        );
    };

    const bmi = profile?.weight && profile?.height
        ? (profile.weight / Math.pow(profile.height / 100, 2)).toFixed(1)
        : null;

    const getBmiCategory = (bmi) => {
        if (bmi < 18.5) return { label: 'Abaixo do peso', variant: 'warning' };
        if (bmi < 25) return { label: 'Peso normal', variant: 'primary' };
        if (bmi < 30) return { label: 'Sobrepeso', variant: 'warning' };
        return { label: 'Obesidade', variant: 'warning' };
    };

    const getGoalLabel = (goalId) => {
        const goals = {
            manutencao: { label: 'Manutenção', emoji: '⚖️' },
            hipertrofia: { label: 'Hipertrofia', emoji: '💪' },
            emagrecimento: { label: 'Emagrecimento', emoji: '🏃' },
        };
        return goals[goalId] || { label: goalId, emoji: '🎯' };
    };

    const getGenderLabel = (genderId) => {
        return genderId === 'male' ? 'Masculino ♂' : 'Feminino ♀';
    };

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
                <Text style={styles.title}>Meu Perfil</Text>
            </View>

            {/* Profile Photo & Name */}
            <GlassCard variant="primary" style={styles.profileCard}>
                <View style={styles.profileHeader}>
                    {authUser?.photoUrl ? (
                        <Image
                            source={{ uri: authUser.photoUrl }}
                            style={styles.profilePhoto}
                        />
                    ) : (
                        <View style={styles.profilePhotoPlaceholder}>
                            <Text style={styles.profilePhotoText}>
                                {authUser?.name?.charAt(0)?.toUpperCase() || '👤'}
                            </Text>
                        </View>
                    )}
                    <View style={styles.profileInfo}>
                        <Text style={styles.profileName}>{authUser?.name || 'Usuário'}</Text>
                        {authUser?.email && (
                            <Text style={styles.profileEmail}>{authUser.email}</Text>
                        )}
                        <View style={styles.authBadge}>
                            <Text style={styles.authBadgeText}>
                                {authUser?.authMethod === 'google' ? '🔗 Google' : '📝 Conta Local'}
                            </Text>
                        </View>
                    </View>
                </View>
            </GlassCard>

            {/* Personal Info Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Informações Pessoais</Text>

                <View style={styles.infoGrid}>
                    <GlassCard style={styles.infoCard}>
                        <Text style={styles.infoLabel}>Gênero</Text>
                        <Text style={styles.infoValue}>
                            {profile?.gender ? getGenderLabel(profile.gender) : '-'}
                        </Text>
                    </GlassCard>

                    <GlassCard style={styles.infoCard}>
                        <Text style={styles.infoLabel}>Idade</Text>
                        <Text style={styles.infoValue}>
                            {profile?.age ? `${profile.age} anos` : '-'}
                        </Text>
                    </GlassCard>
                </View>

                <View style={styles.infoGrid}>
                    <GlassCard style={styles.infoCard}>
                        <Text style={styles.infoLabel}>Peso</Text>
                        <Text style={styles.infoValue}>
                            {profile?.weight ? `${profile.weight} kg` : '-'}
                        </Text>
                    </GlassCard>

                    <GlassCard style={styles.infoCard}>
                        <Text style={styles.infoLabel}>Altura</Text>
                        <Text style={styles.infoValue}>
                            {profile?.height ? `${profile.height} cm` : '-'}
                        </Text>
                    </GlassCard>
                </View>

                {/* BMI Card */}
                {bmi && (
                    <GlassCard variant={getBmiCategory(parseFloat(bmi)).variant} style={styles.bmiCard}>
                        <Text style={styles.bmiLabel}>Índice de Massa Corporal (IMC)</Text>
                        <Text style={styles.bmiValue}>{bmi}</Text>
                        <View style={styles.bmiCategory}>
                            <Text style={styles.bmiCategoryText}>
                                {getBmiCategory(parseFloat(bmi)).label}
                            </Text>
                        </View>
                    </GlassCard>
                )}

                {/* Goal Card */}
                {profile?.goal && (
                    <GlassCard style={styles.goalCard}>
                        <Text style={styles.goalLabel}>Objetivo</Text>
                        <Text style={styles.goalValue}>
                            {getGoalLabel(profile.goal).emoji} {getGoalLabel(profile.goal).label}
                        </Text>
                    </GlassCard>
                )}
            </View>

            {/* Logout Button */}
            <View style={styles.section}>
                <TouchableOpacity
                    style={styles.logoutButton}
                    onPress={() => {
                        lightImpact();
                        handleLogout();
                    }}
                >
                    <LinearGradient
                        colors={['rgba(239, 68, 68, 0.2)', 'rgba(220, 38, 38, 0.1)']}
                        style={StyleSheet.absoluteFill}
                    />
                    <Text style={styles.logoutButtonText}>Sair da Conta 🚪</Text>
                </TouchableOpacity>
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
        paddingTop: spacing.xl * 2,
    },
    title: {
        ...typography.h2,
    },
    profileCard: {
        marginHorizontal: spacing.lg,
        marginBottom: spacing.lg,
        padding: spacing.lg,
    },
    profileHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    profilePhoto: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 3,
        borderColor: colors.primary,
    },
    profilePhotoPlaceholder: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(99, 102, 241, 0.2)',
        borderWidth: 2,
        borderColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    profilePhotoText: {
        fontSize: 36,
        fontWeight: 'bold',
        color: colors.primary,
    },
    profileInfo: {
        flex: 1,
        marginLeft: spacing.md,
    },
    profileName: {
        ...typography.h3,
        marginBottom: spacing.xs,
    },
    profileEmail: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        marginBottom: spacing.sm,
    },
    authBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        backgroundColor: 'rgba(99, 102, 241, 0.2)',
        borderRadius: borderRadius.full,
        borderWidth: 1,
        borderColor: 'rgba(99, 102, 241, 0.3)',
    },
    authBadgeText: {
        ...typography.caption,
        color: colors.primary,
        fontWeight: '600',
    },
    section: {
        padding: spacing.lg,
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
    infoGrid: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginBottom: spacing.sm,
    },
    infoCard: {
        flex: 1,
        padding: spacing.md,
    },
    infoLabel: {
        ...typography.caption,
        color: colors.textSecondary,
        marginBottom: spacing.xs,
    },
    infoValue: {
        ...typography.body,
        fontWeight: '600',
        fontSize: 18,
    },
    bmiCard: {
        alignItems: 'center',
        padding: spacing.lg,
        marginBottom: spacing.sm,
    },
    bmiLabel: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        marginBottom: spacing.xs,
    },
    bmiValue: {
        fontSize: 48,
        fontWeight: 'bold',
        color: colors.text,
    },
    bmiCategory: {
        marginTop: spacing.sm,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: borderRadius.full,
    },
    bmiCategoryText: {
        ...typography.body,
        fontWeight: '600',
    },
    goalCard: {
        padding: spacing.lg,
        alignItems: 'center',
    },
    goalLabel: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        marginBottom: spacing.xs,
    },
    goalValue: {
        ...typography.h3,
    },
    logoutButton: {
        padding: spacing.lg,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.3)',
        alignItems: 'center',
        overflow: 'hidden',
    },
    logoutButtonText: {
        ...typography.body,
        color: '#ef4444',
        fontWeight: 'bold',
    },
    bottomSpacer: {
        height: 96,
    },
});
