import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    Image,
    TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius, typography } from '../styles/theme';
import { getProfile, saveProfile } from '../services/storage';
import { getAuthUser, logout } from '../services/authStorage';
import { lightImpact, successFeedback, selectionFeedback } from '../services/haptics';

const GENDERS = [
    { id: 'male', label: 'Masculino', symbol: '♂' },
    { id: 'female', label: 'Feminino', symbol: '♀' },
];

const GOALS = [
    { id: 'manutencao', label: 'Manutenção', emoji: '⚖️' },
    { id: 'hipertrofia', label: 'Hipertrofia', emoji: '💪' },
    { id: 'emagrecimento', label: 'Emagrecimento', emoji: '🏃' },
];

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
    const [isEditing, setIsEditing] = useState(false);

    // Edit form state
    const [editGender, setEditGender] = useState('male');
    const [editWeight, setEditWeight] = useState('');
    const [editHeight, setEditHeight] = useState('');
    const [editGoal, setEditGoal] = useState('manutencao');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const profileData = await getProfile();
        const userData = await getAuthUser();
        setProfile(profileData);
        setAuthUser(userData);

        if (profileData) {
            setEditGender(profileData.gender || 'male');
            setEditWeight(profileData.weight?.toString() || '');
            setEditHeight(profileData.height?.toString() || '');
            setEditGoal(profileData.goal || 'manutencao');
        }
    };

    const handleEdit = () => {
        lightImpact();
        setIsEditing(true);
    };

    const handleCancelEdit = () => {
        lightImpact();
        setIsEditing(false);
        // Reset to original values
        if (profile) {
            setEditGender(profile.gender || 'male');
            setEditWeight(profile.weight?.toString() || '');
            setEditHeight(profile.height?.toString() || '');
            setEditGoal(profile.goal || 'manutencao');
        }
    };

    const handleSave = async () => {
        // Validate
        if (!editWeight || !editHeight) {
            Alert.alert('Atenção', 'Preencha peso e altura');
            return;
        }

        const weight = parseFloat(editWeight);
        const height = parseInt(editHeight);

        if (weight < 30 || weight > 300) {
            Alert.alert('Atenção', 'Peso deve estar entre 30 e 300 kg');
            return;
        }

        if (height < 100 || height > 250) {
            Alert.alert('Atenção', 'Altura deve estar entre 100 e 250 cm');
            return;
        }

        const updatedProfile = {
            ...profile,
            gender: editGender,
            weight,
            height,
            goal: editGoal,
        };

        const success = await saveProfile(updatedProfile);

        if (success) {
            setProfile(updatedProfile);
            setIsEditing(false);
            successFeedback();
            Alert.alert('Sucesso', 'Perfil atualizado!');
        } else {
            Alert.alert('Erro', 'Não foi possível salvar');
        }
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
        const goal = GOALS.find(g => g.id === goalId);
        return goal || { label: goalId, emoji: '🎯' };
    };

    const getGenderLabel = (genderId) => {
        return genderId === 'male' ? 'Masculino ♂' : 'Feminino ♀';
    };

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
                <Text style={styles.title}>Meu Perfil</Text>
                {!isEditing && (
                    <TouchableOpacity
                        style={styles.editButton}
                        onPress={handleEdit}
                    >
                        <Text style={styles.editButtonText}>✏️ Editar</Text>
                    </TouchableOpacity>
                )}
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

                {isEditing ? (
                    // EDIT MODE
                    <>
                        {/* Gender Selection */}
                        <Text style={styles.label}>Gênero</Text>
                        <View style={styles.genderContainer}>
                            {GENDERS.map((g) => (
                                <TouchableOpacity
                                    key={g.id}
                                    style={[
                                        styles.genderButton,
                                        editGender === g.id && styles.genderButtonActive,
                                    ]}
                                    onPress={() => {
                                        selectionFeedback();
                                        setEditGender(g.id);
                                    }}
                                >
                                    <LinearGradient
                                        colors={editGender === g.id
                                            ? g.id === 'male'
                                                ? ['rgba(59, 130, 246, 0.2)', 'rgba(59, 130, 246, 0.1)']
                                                : ['rgba(236, 72, 153, 0.2)', 'rgba(236, 72, 153, 0.1)']
                                            : ['rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.02)']}
                                        style={StyleSheet.absoluteFill}
                                    />
                                    <Text style={[
                                        styles.genderSymbol,
                                        { color: g.id === 'male' ? '#3b82f6' : '#ec4899' }
                                    ]}>
                                        {g.symbol}
                                    </Text>
                                    <Text style={[
                                        styles.genderLabel,
                                        editGender === g.id && styles.genderLabelActive,
                                    ]}>
                                        {g.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={styles.row}>
                            <View style={{ flex: 1, marginRight: spacing.sm }}>
                                <GlassCard style={styles.inputCard}>
                                    <Text style={styles.label}>Peso (kg) *</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={editWeight}
                                        onChangeText={setEditWeight}
                                        placeholder="70"
                                        placeholderTextColor={colors.textMuted}
                                        keyboardType="decimal-pad"
                                        maxLength={5}
                                        onFocus={() => lightImpact()}
                                    />
                                </GlassCard>
                            </View>
                            <View style={{ flex: 1, marginLeft: spacing.sm }}>
                                <GlassCard style={styles.inputCard}>
                                    <Text style={styles.label}>Altura (cm) *</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={editHeight}
                                        onChangeText={setEditHeight}
                                        placeholder="175"
                                        placeholderTextColor={colors.textMuted}
                                        keyboardType="numeric"
                                        maxLength={3}
                                        onFocus={() => lightImpact()}
                                    />
                                </GlassCard>
                            </View>
                        </View>

                        {/* Goal Selection */}
                        <Text style={styles.label}>Objetivo</Text>
                        <View style={styles.goalsContainer}>
                            {GOALS.map((g) => (
                                <TouchableOpacity
                                    key={g.id}
                                    style={[
                                        styles.goalButton,
                                        editGoal === g.id && styles.goalButtonActive,
                                    ]}
                                    onPress={() => {
                                        selectionFeedback();
                                        setEditGoal(g.id);
                                    }}
                                >
                                    <LinearGradient
                                        colors={editGoal === g.id
                                            ? ['rgba(99, 102, 241, 0.2)', 'rgba(99, 102, 241, 0.1)']
                                            : ['rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.02)']}
                                        style={StyleSheet.absoluteFill}
                                    />
                                    <Text style={styles.goalEmoji}>{g.emoji}</Text>
                                    <Text style={[
                                        styles.goalLabel,
                                        editGoal === g.id && styles.goalLabelActive,
                                    ]}>
                                        {g.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Save/Cancel Buttons */}
                        <View style={styles.editButtonRow}>
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={handleCancelEdit}
                            >
                                <LinearGradient
                                    colors={['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']}
                                    style={StyleSheet.absoluteFill}
                                />
                                <Text style={styles.cancelButtonText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.saveButton}
                                onPress={handleSave}
                            >
                                <LinearGradient
                                    colors={['#818cf8', '#6366f1', '#4f46e5']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={StyleSheet.absoluteFill}
                                />
                                <Text style={styles.saveButtonText}>💾 Salvar</Text>
                            </TouchableOpacity>
                        </View>
                    </>
                ) : (
                    // VIEW MODE
                    <>
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
                                <Text style={styles.goalCardLabel}>Objetivo</Text>
                                <Text style={styles.goalCardValue}>
                                    {getGoalLabel(profile.goal).emoji} {getGoalLabel(profile.goal).label}
                                </Text>
                            </GlassCard>
                        )}
                    </>
                )}
            </View>

            {/* Logout Button */}
            {!isEditing && (
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
            )}

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
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: {
        ...typography.h2,
    },
    editButton: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        backgroundColor: 'rgba(99, 102, 241, 0.2)',
        borderRadius: borderRadius.full,
        borderWidth: 1,
        borderColor: 'rgba(99, 102, 241, 0.3)',
    },
    editButtonText: {
        ...typography.bodySmall,
        color: colors.primary,
        fontWeight: '600',
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
    goalCardLabel: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        marginBottom: spacing.xs,
    },
    goalCardValue: {
        ...typography.h3,
    },
    label: {
        ...typography.body,
        fontWeight: '600',
        marginBottom: spacing.sm,
        marginTop: spacing.md,
    },
    genderContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: spacing.md,
    },
    genderButton: {
        flex: 1,
        padding: spacing.lg,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
        marginHorizontal: spacing.xs,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        overflow: 'hidden',
    },
    genderButtonActive: {
        borderColor: 'rgba(99, 102, 241, 0.5)',
    },
    genderSymbol: {
        fontSize: 32,
        marginBottom: spacing.xs,
        fontWeight: 'bold',
    },
    genderLabel: {
        ...typography.bodySmall,
        color: colors.textSecondary,
    },
    genderLabelActive: {
        color: colors.text,
        fontWeight: '600',
    },
    row: {
        flexDirection: 'row',
        marginBottom: spacing.md,
    },
    inputCard: {
        marginBottom: 0,
    },
    input: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: borderRadius.md,
        padding: spacing.md,
        color: colors.text,
        fontSize: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    goalsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: spacing.lg,
    },
    goalButton: {
        flex: 1,
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
        marginHorizontal: spacing.xs,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        overflow: 'hidden',
    },
    goalButtonActive: {
        borderColor: 'rgba(99, 102, 241, 0.5)',
    },
    goalEmoji: {
        fontSize: 24,
        marginBottom: spacing.xs,
    },
    goalLabel: {
        ...typography.caption,
        textAlign: 'center',
        color: colors.textSecondary,
    },
    goalLabelActive: {
        color: colors.text,
        fontWeight: '600',
    },
    editButtonRow: {
        flexDirection: 'row',
        marginTop: spacing.lg,
    },
    cancelButton: {
        flex: 1,
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
        marginRight: spacing.sm,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        overflow: 'hidden',
    },
    cancelButtonText: {
        color: colors.textSecondary,
        fontWeight: '600',
        fontSize: 16,
    },
    saveButton: {
        flex: 1,
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
        marginLeft: spacing.sm,
        overflow: 'hidden',
    },
    saveButtonText: {
        color: colors.text,
        fontWeight: 'bold',
        fontSize: 16,
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
