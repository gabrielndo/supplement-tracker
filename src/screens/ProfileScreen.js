import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Animated,
    ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius, typography } from '../styles/theme';
import { getProfile, saveProfile } from '../services/storage';
import { selectionFeedback, successFeedback, errorFeedback, lightImpact } from '../services/haptics';

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
            case 'success':
                return ['rgba(34, 197, 94, 0.15)', 'rgba(22, 163, 74, 0.08)', 'rgba(34, 197, 94, 0.03)'];
            case 'warning':
                return ['rgba(245, 158, 11, 0.15)', 'rgba(217, 119, 6, 0.08)', 'rgba(245, 158, 11, 0.03)'];
            case 'error':
                return ['rgba(239, 68, 68, 0.15)', 'rgba(220, 38, 38, 0.08)', 'rgba(239, 68, 68, 0.03)'];
            default:
                return ['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.04)', 'rgba(255, 255, 255, 0.01)'];
        }
    };

    const getBorderColor = () => {
        switch (variant) {
            case 'primary':
                return 'rgba(99, 102, 241, 0.3)';
            case 'success':
                return 'rgba(34, 197, 94, 0.3)';
            case 'warning':
                return 'rgba(245, 158, 11, 0.3)';
            case 'error':
                return 'rgba(239, 68, 68, 0.3)';
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

export default function ProfileScreen({ navigation }) {
    const [step, setStep] = useState(1);
    const [name, setName] = useState('');
    const [gender, setGender] = useState('male');
    const [birthDate, setBirthDate] = useState('');
    const [weight, setWeight] = useState('');
    const [height, setHeight] = useState('');
    const [goal, setGoal] = useState('manutencao');
    const [isSaving, setIsSaving] = useState(false);
    const [fadeAnim] = useState(new Animated.Value(1));

    // Error states
    const [errors, setErrors] = useState({});

    const clearError = (field) => {
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: null }));
        }
    };

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        const profile = await getProfile();
        if (profile) {
            setName(profile.name || '');
            setGender(profile.gender || 'male');
            setBirthDate(profile.birthDate || '');
            setWeight(profile.weight?.toString() || '');
            setHeight(profile.height?.toString() || '');
            setGoal(profile.goal || 'manutencao');
        }
    };

    const calculateAge = (birthDateStr) => {
        if (!birthDateStr || birthDateStr.length !== 10) return null;
        const [day, month, year] = birthDateStr.split('/').map(Number);
        if (!day || !month || !year) return null;

        const birth = new Date(year, month - 1, day);
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();

        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return age;
    };

    const formatBirthDate = (text) => {
        const digits = text.replace(/\D/g, '');
        let formatted = '';
        if (digits.length > 0) {
            formatted = digits.slice(0, 2);
            if (digits.length > 2) {
                formatted += '/' + digits.slice(2, 4);
                if (digits.length > 4) {
                    formatted += '/' + digits.slice(4, 8);
                }
            }
        }
        return formatted;
    };

    const handleBirthDateChange = (text) => {
        setBirthDate(formatBirthDate(text));
    };

    const animateTransition = (nextStep) => {
        Animated.sequence([
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 150,
                useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 150,
                useNativeDriver: true,
            }),
        ]).start();

        setTimeout(() => setStep(nextStep), 150);
    };

    const validateStep1 = () => {
        const newErrors = {};

        if (!name.trim()) {
            newErrors.name = 'Informe seu nome';
        }

        const age = calculateAge(birthDate);
        if (!birthDate) {
            newErrors.birthDate = 'Informe sua data de nascimento';
        } else if (!age || age < 16 || age > 100) {
            newErrors.birthDate = 'Idade deve estar entre 16 e 100 anos';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const validateStep2 = () => {
        const newErrors = {};

        if (!weight) {
            newErrors.weight = 'Informe seu peso';
        } else if (parseFloat(weight) < 30 || parseFloat(weight) > 300) {
            newErrors.weight = 'Peso deve estar entre 30 e 300 kg';
        }

        if (!height) {
            newErrors.height = 'Informe sua altura';
        } else if (parseInt(height) < 100 || parseInt(height) > 250) {
            newErrors.height = 'Altura deve estar entre 100 e 250 cm';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNext = () => {
        if (step === 1 && validateStep1()) {
            animateTransition(2);
        }
    };

    const handleBack = () => {
        if (step === 2) {
            animateTransition(1);
        }
    };

    const handleSave = async () => {
        if (!validateStep2()) return;

        setIsSaving(true);

        const age = calculateAge(birthDate);
        const profile = {
            name: name.trim(),
            gender,
            birthDate,
            age,
            weight: parseFloat(weight),
            height: parseInt(height),
            goal,
            updatedAt: new Date().toISOString(),
        };

        const success = await saveProfile(profile);
        setIsSaving(false);

        if (success) {
            successFeedback();
            Alert.alert('Sucesso', 'Perfil salvo com sucesso!');
        } else {
            errorFeedback();
            Alert.alert('Erro', 'Não foi possível salvar o perfil');
        }
    };

    const age = calculateAge(birthDate);

    const bmi = weight && height
        ? (parseFloat(weight) / Math.pow(parseInt(height) / 100, 2)).toFixed(1)
        : null;

    const getBmiCategory = (bmi) => {
        if (bmi < 18.5) return { label: 'Abaixo do peso', variant: 'warning' };
        if (bmi < 25) return { label: 'Peso normal', variant: 'success' };
        if (bmi < 30) return { label: 'Sobrepeso', variant: 'warning' };
        return { label: 'Obesidade', variant: 'error' };
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* Progress Indicator */}
                <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                        <LinearGradient
                            colors={['#818cf8', '#6366f1', '#4f46e5']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={[styles.progressFill, { width: step === 1 ? '50%' : '100%' }]}
                        />
                    </View>
                    <Text style={styles.progressText}>Etapa {step} de 2</Text>
                </View>

                <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
                    {step === 1 ? (
                        // Step 1: Name, Gender and Birth Date
                        <View style={styles.stepContainer}>
                            <Text style={styles.stepTitle}>Vamos nos conhecer! 👋</Text>
                            <Text style={styles.stepSubtitle}>
                                Primeiro, me conta um pouco sobre você
                            </Text>

                            <GlassCard style={[styles.inputCard, errors.name && styles.inputCardError]}>
                                <Text style={styles.label}>Como posso te chamar? <Text style={styles.required}>*</Text></Text>
                                <TextInput
                                    style={[styles.input, errors.name && styles.inputError]}
                                    value={name}
                                    onChangeText={(text) => { setName(text); clearError('name'); }}
                                    placeholder="Seu nome"
                                    placeholderTextColor={colors.textMuted}
                                    onFocus={() => lightImpact()}
                                />
                                {errors.name && (
                                    <Text style={styles.errorText}>⚠️ {errors.name}</Text>
                                )}
                            </GlassCard>

                            {/* Gender Selection */}
                            <Text style={styles.sectionLabel}>Gênero</Text>
                            <View style={styles.genderContainer}>
                                {GENDERS.map((g) => (
                                    <TouchableOpacity
                                        key={g.id}
                                        style={[
                                            styles.genderButton,
                                            gender === g.id && styles.genderButtonActive,
                                        ]}
                                        onPress={() => {
                                            selectionFeedback();
                                            setGender(g.id);
                                        }}
                                    >
                                        <LinearGradient
                                            colors={gender === g.id
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
                                            gender === g.id && styles.genderLabelActive,
                                        ]}>
                                            {g.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <GlassCard style={[styles.inputCard, errors.birthDate && styles.inputCardError]}>
                                <Text style={styles.label}>Quando você nasceu? <Text style={styles.required}>*</Text></Text>
                                <TextInput
                                    style={[styles.input, errors.birthDate && styles.inputError]}
                                    value={birthDate}
                                    onChangeText={(text) => { handleBirthDateChange(text); clearError('birthDate'); }}
                                    placeholder="DD/MM/AAAA"
                                    placeholderTextColor={colors.textMuted}
                                    keyboardType="numeric"
                                    maxLength={10}
                                    onFocus={() => lightImpact()}
                                />
                                {errors.birthDate && (
                                    <Text style={styles.errorText}>⚠️ {errors.birthDate}</Text>
                                )}
                                {!errors.birthDate && age && age >= 16 && age <= 100 && (
                                    <View style={styles.ageDisplay}>
                                        <Text style={styles.ageText}>🎂 Você tem {age} anos</Text>
                                    </View>
                                )}
                            </GlassCard>

                            <TouchableOpacity
                                style={styles.nextButton}
                                onPress={() => {
                                    lightImpact();
                                    handleNext();
                                }}
                            >
                                <LinearGradient
                                    colors={['#818cf8', '#6366f1', '#4f46e5']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={StyleSheet.absoluteFill}
                                />
                                <Text style={styles.nextButtonText}>Continuar →</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        // Step 2: Weight, Height, and Goal
                        <View style={styles.stepContainer}>
                            <Text style={styles.stepTitle}>Suas medidas 📏</Text>
                            <Text style={styles.stepSubtitle}>
                                Isso ajuda a calcular dosagens personalizadas
                            </Text>

                            <View style={styles.row}>
                                <View style={{ flex: 1, marginRight: spacing.sm }}>
                                    <GlassCard style={[styles.inputCard, errors.weight && styles.inputCardError]}>
                                        <Text style={styles.label}>Peso (kg) <Text style={styles.required}>*</Text></Text>
                                        <TextInput
                                            style={[styles.input, errors.weight && styles.inputError]}
                                            value={weight}
                                            onChangeText={(text) => { setWeight(text); clearError('weight'); }}
                                            placeholder="70"
                                            placeholderTextColor={colors.textMuted}
                                            keyboardType="decimal-pad"
                                            maxLength={5}
                                            onFocus={() => lightImpact()}
                                        />
                                    </GlassCard>
                                    {errors.weight && (
                                        <Text style={styles.errorText}>⚠️ {errors.weight}</Text>
                                    )}
                                </View>
                                <View style={{ flex: 1, marginLeft: spacing.sm }}>
                                    <GlassCard style={[styles.inputCard, errors.height && styles.inputCardError]}>
                                        <Text style={styles.label}>Altura (cm) <Text style={styles.required}>*</Text></Text>
                                        <TextInput
                                            style={[styles.input, errors.height && styles.inputError]}
                                            value={height}
                                            onChangeText={(text) => { setHeight(text); clearError('height'); }}
                                            placeholder="175"
                                            placeholderTextColor={colors.textMuted}
                                            keyboardType="numeric"
                                            maxLength={3}
                                            onFocus={() => lightImpact()}
                                        />
                                    </GlassCard>
                                    {errors.height && (
                                        <Text style={styles.errorText}>⚠️ {errors.height}</Text>
                                    )}
                                </View>
                            </View>

                            {/* BMI Display */}
                            {bmi && !isNaN(parseFloat(bmi)) && (
                                <GlassCard variant={getBmiCategory(parseFloat(bmi)).variant} style={styles.bmiCard}>
                                    <Text style={styles.bmiTitle}>Seu IMC</Text>
                                    <Text style={styles.bmiValue}>{bmi}</Text>
                                    <View style={styles.bmiBadge}>
                                        <Text style={styles.bmiBadgeText}>
                                            {getBmiCategory(parseFloat(bmi)).label}
                                        </Text>
                                    </View>
                                </GlassCard>
                            )}

                            {/* Goal Selection */}
                            <Text style={styles.sectionLabel}>Qual seu objetivo?</Text>
                            <View style={styles.goalsContainer}>
                                {GOALS.map((g) => (
                                    <TouchableOpacity
                                        key={g.id}
                                        style={[
                                            styles.goalButton,
                                            goal === g.id && styles.goalButtonActive,
                                        ]}
                                        onPress={() => {
                                            selectionFeedback();
                                            setGoal(g.id);
                                        }}
                                    >
                                        <LinearGradient
                                            colors={goal === g.id
                                                ? ['rgba(99, 102, 241, 0.2)', 'rgba(99, 102, 241, 0.1)']
                                                : ['rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.02)']}
                                            style={StyleSheet.absoluteFill}
                                        />
                                        <Text style={styles.goalEmoji}>{g.emoji}</Text>
                                        <Text style={[
                                            styles.goalLabel,
                                            goal === g.id && styles.goalLabelActive,
                                        ]}>
                                            {g.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <View style={styles.buttonRow}>
                                <TouchableOpacity
                                    style={styles.backButton}
                                    onPress={() => {
                                        lightImpact();
                                        handleBack();
                                    }}
                                >
                                    <LinearGradient
                                        colors={['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']}
                                        style={StyleSheet.absoluteFill}
                                    />
                                    <Text style={styles.backButtonText}>← Voltar</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.saveButton}
                                    onPress={() => {
                                        lightImpact();
                                        handleSave();
                                    }}
                                    disabled={isSaving}
                                >
                                    <LinearGradient
                                        colors={['#818cf8', '#6366f1', '#4f46e5']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={StyleSheet.absoluteFill}
                                    />
                                    <Text style={styles.saveButtonText}>
                                        {isSaving ? 'Salvando...' : 'Salvar ✓'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </Animated.View>

                {/* Disclaimer */}
                <Text style={styles.disclaimer}>
                    ⚠️ As sugestões não substituem orientação profissional
                </Text>

                <View style={styles.bottomSpacer} />
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollView: {
        flex: 1,
    },
    progressContainer: {
        padding: spacing.lg,
        paddingTop: spacing.xl,
    },
    progressBar: {
        height: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: borderRadius.full,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: borderRadius.full,
    },
    progressText: {
        ...typography.caption,
        textAlign: 'center',
        marginTop: spacing.sm,
    },
    content: {
        flex: 1,
        padding: spacing.lg,
    },
    stepContainer: {
        flex: 1,
    },
    stepTitle: {
        ...typography.h2,
        marginBottom: spacing.xs,
    },
    stepSubtitle: {
        ...typography.bodySmall,
        marginBottom: spacing.xl,
    },
    glassCard: {
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        overflow: 'hidden',
        padding: spacing.md,
    },
    inputCard: {
        marginBottom: spacing.lg,
    },
    sectionLabel: {
        ...typography.body,
        fontWeight: '600',
        marginBottom: spacing.sm,
    },
    label: {
        ...typography.bodySmall,
        marginBottom: spacing.sm,
        color: colors.textSecondary,
    },
    input: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: borderRadius.md,
        padding: spacing.md,
        color: colors.text,
        fontSize: 18,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    inputError: {
        borderColor: 'rgba(239, 68, 68, 0.5)',
    },
    inputCardError: {
        borderColor: 'rgba(239, 68, 68, 0.4)',
    },
    errorText: {
        ...typography.caption,
        color: '#ef4444',
        marginTop: spacing.xs,
        marginBottom: spacing.sm,
    },
    required: {
        color: '#ef4444',
        fontWeight: 'bold',
    },
    genderContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: spacing.lg,
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
        fontSize: 48,
        marginBottom: spacing.sm,
        fontWeight: 'bold',
    },
    genderLabel: {
        ...typography.body,
        color: colors.textSecondary,
    },
    genderLabelActive: {
        color: colors.text,
        fontWeight: '600',
    },
    ageDisplay: {
        marginTop: spacing.sm,
        padding: spacing.sm,
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        borderRadius: borderRadius.sm,
        alignSelf: 'flex-start',
    },
    ageText: {
        ...typography.body,
        color: colors.primary,
    },
    row: {
        flexDirection: 'row',
    },
    bmiCard: {
        alignItems: 'center',
        marginBottom: spacing.lg,
        padding: spacing.lg,
    },
    bmiTitle: {
        ...typography.bodySmall,
        marginBottom: spacing.xs,
    },
    bmiValue: {
        fontSize: 48,
        fontWeight: 'bold',
        color: colors.text,
    },
    bmiBadge: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: borderRadius.full,
        marginTop: spacing.sm,
    },
    bmiBadgeText: {
        color: colors.text,
        fontWeight: '600',
        fontSize: 12,
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
    buttonRow: {
        flexDirection: 'row',
        marginTop: spacing.lg,
    },
    backButton: {
        flex: 1,
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
        marginRight: spacing.sm,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        overflow: 'hidden',
    },
    backButtonText: {
        color: colors.textSecondary,
        fontWeight: '600',
        fontSize: 16,
    },
    nextButton: {
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
        marginTop: spacing.lg,
        overflow: 'hidden',
    },
    nextButtonText: {
        color: colors.text,
        fontWeight: 'bold',
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
    disclaimer: {
        ...typography.caption,
        textAlign: 'center',
        padding: spacing.lg,
    },
    bottomSpacer: {
        height: 96,
    },
});
