import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    ActivityIndicator,
    Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius, typography } from '../styles/theme';
import { registerWithEmail, loginWithEmail, resetPassword } from '../services/authStorage';
import { successFeedback, lightImpact } from '../services/haptics';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '../services/firebase';

GoogleSignin.configure({
    webClientId: '836407434116-760rshqee3fvi3qd9nmv532slpiivfib.apps.googleusercontent.com',
});

// ─── Glass Card ──────────────────────────────────────────────────────────────
const GlassCard = ({ children, style }) => (
    <View style={[styles.glassCard, style]}>
        <LinearGradient
            colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.04)', 'rgba(255,255,255,0.01)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
        />
        {children}
    </View>
);

// ─── Input ────────────────────────────────────────────────────────────────────
const Input = ({ label, icon, ...props }) => (
    <View style={styles.inputWrapper}>
        <Text style={styles.inputLabel}>{label}</Text>
        <View style={styles.inputContainer}>
            {icon ? <Text style={styles.inputIcon}>{icon}</Text> : null}
            <TextInput
                style={[styles.input, icon && { paddingLeft: 40 }]}
                placeholderTextColor="rgba(255,255,255,0.3)"
                autoCapitalize="none"
                {...props}
            />
        </View>
    </View>
);


// ─── Main Component ───────────────────────────────────────────────────────────
export default function WelcomeScreen({ onComplete }) {
    // mode: 'landing' | 'login' | 'signup'
    const [mode, setMode] = useState('landing');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);



    const validateEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

    // ── Login ─────────────────────────────────────────────────────────────────
    const handleLogin = async () => {
        lightImpact();
        if (!validateEmail(email)) {
            Alert.alert('E-mail inválido', 'Digite um e-mail válido.');
            return;
        }
        if (password.length < 6) {
            Alert.alert('Senha curta', 'A senha deve ter pelo menos 6 caracteres.');
            return;
        }
        setLoading(true);
        const result = await loginWithEmail(email, password);
        setLoading(false);
        if (result.success) {
            successFeedback();
            onComplete();
        } else {
            Alert.alert('Erro ao entrar', result.error);
        }
    };

    // ── Signup ────────────────────────────────────────────────────────────────
    const handleSignup = async () => {
        lightImpact();
        if (!name.trim()) {
            Alert.alert('Nome obrigatório', 'Por favor, informe seu nome.');
            return;
        }
        if (!validateEmail(email)) {
            Alert.alert('E-mail inválido', 'Digite um e-mail válido.');
            return;
        }
        if (password.length < 6) {
            Alert.alert('Senha curta', 'A senha deve ter pelo menos 6 caracteres.');
            return;
        }
        if (password !== confirmPassword) {
            Alert.alert('Senhas diferentes', 'As senhas não coincidem.');
            return;
        }
        setLoading(true);
        const result = await registerWithEmail(name, email, password);
        setLoading(false);
        if (result.success) {
            successFeedback();
            onComplete();
        } else {
            Alert.alert('Erro ao criar conta', result.error);
        }
    };

    // ── Forgot Password ───────────────────────────────────────────────────────
    const handleForgotPassword = async () => {
        lightImpact();
        if (!email.trim() || !validateEmail(email)) {
            Alert.alert(
                'Digite seu e-mail',
                'Por favor, digite seu e-mail no campo acima para que possamos enviar o link de recuperação.'
            );
            return;
        }

        setLoading(true);
        const result = await resetPassword(email);
        setLoading(false);

        if (result.success) {
            successFeedback();
            Alert.alert(
                'E-mail enviado! 📬',
                'Verifique sua caixa de entrada (e pasta de spam) para as instruções de recuperação de senha.'
            );
        } else {
            errorFeedback();
            Alert.alert('Erro', result.error);
        }
    };

    // ── Google ────────────────────────────────────────────────────────────────
    const handleGoogle = async () => {
        lightImpact();
        try {
            setLoading(true);
            await GoogleSignin.hasPlayServices();
            const userInfo = await GoogleSignin.signIn();
            // Pega o idToken independentemente da versão da biblioteca (v13+ retornaria em data.idToken)
            const idToken = userInfo?.data?.idToken || userInfo?.idToken;

            if (idToken) {
                const credential = GoogleAuthProvider.credential(idToken);
                await signInWithCredential(auth, credential);
                successFeedback();
                onComplete();
            } else {
                throw new Error('Nenhum token ID recebido do Google');
            }
        } catch (error) {
            console.error('Google Sign-In Error:', error);
            if (error.code !== 12501 && error.code !== 'SIGN_IN_CANCELLED') {
                Alert.alert('Erro', 'Não foi possível entrar com o Google.');
            }
        } finally {
            setLoading(false);
        }
    };

    const resetForm = (newMode) => {
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setName('');
        setShowPassword(false);
        setMode(newMode);
    };

    // ── Landing ───────────────────────────────────────────────────────────────
    if (mode === 'landing') {
        return (
            <View style={styles.container}>
                <LinearGradient
                    colors={['#0f172a', '#1e1b4b', '#0f172a']}
                    style={StyleSheet.absoluteFill}
                />
                <View style={styles.landingContent}>
                    {/* Logo */}
                    <View style={styles.logoArea}>
                        <Image
                            source={require('../../assets/logo.png')}
                            style={styles.logo}
                            resizeMode="contain"
                        />
                        <Text style={styles.appName}>MeusSuple</Text>
                        <Text style={styles.tagline}>Rastreador e lembrete de suplementos</Text>
                    </View>

                    {/* Buttons */}
                    <View style={styles.buttonArea}>
                        {/* Google */}
                        <TouchableOpacity style={styles.googleButton} onPress={handleGoogle}>
                            <GlassCard style={styles.googleCard}>
                                <Text style={styles.googleIcon}>G</Text>
                                <Text style={styles.googleText}>Continuar com Google</Text>
                            </GlassCard>
                        </TouchableOpacity>

                        {/* Divider */}
                        <View style={styles.divider}>
                            <View style={styles.dividerLine} />
                            <Text style={styles.dividerText}>ou</Text>
                            <View style={styles.dividerLine} />
                        </View>

                        {/* Email login */}
                        <TouchableOpacity
                            style={styles.emailButton}
                            onPress={() => resetForm('login')}
                        >
                            <LinearGradient
                                colors={['#818cf8', '#6366f1', '#4f46e5']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={StyleSheet.absoluteFill}
                            />
                            <Text style={styles.emailButtonIcon}>✉️</Text>
                            <Text style={styles.emailButtonText}>Entrar com E-mail</Text>
                        </TouchableOpacity>

                        {/* Create account */}
                        <TouchableOpacity
                            style={styles.signupLink}
                            onPress={() => resetForm('signup')}
                        >
                            <Text style={styles.signupLinkText}>
                                Não tem conta?{' '}
                                <Text style={styles.signupLinkHighlight}>Criar agora</Text>
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    }

    // ── Login / Signup Form ───────────────────────────────────────────────────
    const isLogin = mode === 'login';

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <LinearGradient
                colors={['#0f172a', '#1e1b4b', '#0f172a']}
                style={StyleSheet.absoluteFill}
            />
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.formContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Back button */}
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => resetForm('landing')}
                >
                    <Text style={styles.backButtonText}>← Voltar</Text>
                </TouchableOpacity>

                {/* Header */}
                <Text style={styles.formTitle}>
                    {isLogin ? '👋 Bem-vindo!' : '🚀 Criar Conta'}
                </Text>
                <Text style={styles.formSubtitle}>
                    {isLogin
                        ? 'Entre com seus dados para continuar'
                        : 'Preencha os dados para começar'}
                </Text>

                {/* Form Card */}
                <GlassCard style={styles.formCard}>
                    {!isLogin && (
                        <Input
                            label="Nome"
                            icon="👤"
                            value={name}
                            onChangeText={setName}
                            placeholder="Seu nome"
                            autoCapitalize="words"
                        />
                    )}

                    <Input
                        label="E-mail"
                        icon="✉️"
                        value={email}
                        onChangeText={setEmail}
                        placeholder="seu@email.com"
                        keyboardType="email-address"
                    />

                    <Input
                        label="Senha"
                        icon="🔒"
                        value={password}
                        onChangeText={setPassword}
                        placeholder="Mínimo 6 caracteres"
                        secureTextEntry={!showPassword}
                    />

                    {!isLogin && (
                        <Input
                            label="Confirmar senha"
                            icon="🔒"
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            placeholder="Repita a senha"
                            secureTextEntry={!showPassword}
                        />
                    )}

                    {/* Show/hide password */}
                    <TouchableOpacity
                        style={styles.showPasswordRow}
                        onPress={() => setShowPassword(!showPassword)}
                    >
                        <Text style={styles.showPasswordText}>
                            {showPassword ? '🙈 Ocultar senha' : '👁️ Mostrar senha'}
                        </Text>
                    </TouchableOpacity>

                    {isLogin && (
                        <TouchableOpacity
                            style={styles.forgotPasswordRow}
                            onPress={handleForgotPassword}
                        >
                            <Text style={styles.forgotPasswordText}>
                                Esqueceu a senha?
                            </Text>
                        </TouchableOpacity>
                    )}
                </GlassCard>

                {/* Submit */}
                <TouchableOpacity
                    style={styles.submitButton}
                    onPress={isLogin ? handleLogin : handleSignup}
                    disabled={loading}
                >
                    <LinearGradient
                        colors={['#818cf8', '#6366f1', '#4f46e5']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={StyleSheet.absoluteFill}
                    />
                    {loading
                        ? <ActivityIndicator color="#fff" />
                        : <Text style={styles.submitButtonText}>
                            {isLogin ? 'Entrar →' : 'Criar Conta →'}
                        </Text>
                    }
                </TouchableOpacity>

                {/* Switch mode */}
                <TouchableOpacity
                    style={styles.switchMode}
                    onPress={() => resetForm(isLogin ? 'signup' : 'login')}
                >
                    <Text style={styles.switchModeText}>
                        {isLogin
                            ? 'Não tem conta? '
                            : 'Já tem conta? '}
                        <Text style={styles.switchModeHighlight}>
                            {isLogin ? 'Criar agora' : 'Entrar'}
                        </Text>
                    </Text>
                </TouchableOpacity>

                {/* Disclaimer */}
                <Text style={styles.disclaimer}>
                    Seus dados ficam armazenados localmente no seu dispositivo 🔒
                </Text>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
    },

    // Landing
    landingContent: {
        flex: 1,
        justifyContent: 'space-between',
        padding: spacing.xl,
        paddingTop: 80,
        paddingBottom: 48,
    },
    logoArea: {
        alignItems: 'center',
    },
    logo: {
        width: 110,
        height: 110,
        marginBottom: spacing.md,
        borderRadius: 28,
        overflow: 'hidden',
    },
    appName: {
        fontSize: 36,
        fontWeight: '800',
        color: colors.text,
        letterSpacing: -1,
    },
    tagline: {
        ...typography.body,
        color: colors.textSecondary,
        marginTop: spacing.xs,
        textAlign: 'center',
    },
    buttonArea: {
        gap: spacing.md,
    },
    googleButton: {
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
    },
    googleCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.md,
        gap: spacing.sm,
    },
    googleIcon: {
        fontSize: 20,
        fontWeight: '900',
        color: '#fff',
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    },
    googleText: {
        color: colors.text,
        fontWeight: '600',
        fontSize: 16,
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    dividerText: {
        color: colors.textMuted,
        fontSize: 13,
    },
    emailButton: {
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.md,
        gap: spacing.sm,
    },
    emailButtonIcon: {
        fontSize: 18,
    },
    emailButtonText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 16,
    },
    signupLink: {
        alignItems: 'center',
        marginTop: spacing.xs,
    },
    signupLinkText: {
        color: colors.textSecondary,
        fontSize: 15,
    },
    signupLinkHighlight: {
        color: colors.primary,
        fontWeight: '700',
    },

    // Form
    scrollView: {
        flex: 1,
    },
    formContent: {
        padding: spacing.xl,
        paddingTop: 60,
        paddingBottom: 40,
    },
    backButton: {
        marginBottom: spacing.lg,
    },
    backButtonText: {
        color: colors.textSecondary,
        fontSize: 15,
    },
    formTitle: {
        fontSize: 30,
        fontWeight: '800',
        color: colors.text,
        marginBottom: spacing.xs,
    },
    formSubtitle: {
        ...typography.body,
        color: colors.textSecondary,
        marginBottom: spacing.xl,
    },
    glassCard: {
        borderRadius: borderRadius.xl,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        overflow: 'hidden',
        padding: spacing.lg,
    },
    formCard: {
        marginBottom: spacing.md,
    },
    inputWrapper: {
        marginBottom: spacing.md,
    },
    inputLabel: {
        color: colors.textSecondary,
        fontSize: 13,
        fontWeight: '600',
        marginBottom: spacing.xs,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    inputContainer: {
        position: 'relative',
        justifyContent: 'center',
    },
    inputIcon: {
        position: 'absolute',
        left: 12,
        zIndex: 1,
        fontSize: 16,
    },
    input: {
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderRadius: borderRadius.md,
        padding: spacing.md,
        color: colors.text,
        fontSize: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        paddingLeft: 40,
        ...Platform.select({ web: { outlineStyle: 'none' } }),
    },
    showPasswordRow: {
        alignItems: 'flex-end',
        marginTop: spacing.sm,
    },
    showPasswordText: {
        color: colors.textSecondary,
        fontSize: 13,
    },
    forgotPasswordRow: {
        alignItems: 'center',
        marginTop: spacing.md,
    },
    forgotPasswordText: {
        color: colors.primary,
        fontSize: 14,
        fontWeight: '600',
    },
    submitButton: {
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
        padding: spacing.lg,
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    submitButtonText: {
        color: '#fff',
        fontWeight: '800',
        fontSize: 17,
    },
    switchMode: {
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    switchModeText: {
        color: colors.textSecondary,
        fontSize: 15,
    },
    switchModeHighlight: {
        color: colors.primary,
        fontWeight: '700',
    },
    disclaimer: {
        textAlign: 'center',
        color: colors.textMuted,
        fontSize: 12,
        lineHeight: 18,
    },
});
