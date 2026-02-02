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
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { colors, spacing, borderRadius, typography } from '../styles/theme';
import { saveAuthUser } from '../services/authStorage';
import { successFeedback, lightImpact } from '../services/haptics';

WebBrowser.maybeCompleteAuthSession();

// Glass Card Component
const GlassCard = ({ children, style }) => (
    <View style={[styles.glassCard, style]}>
        <LinearGradient
            colors={['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.04)', 'rgba(255, 255, 255, 0.01)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
        />
        {children}
    </View>
);

export default function WelcomeScreen({ onComplete }) {
    const [showManualSignup, setShowManualSignup] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);

    // Google Sign-In configuration
    const [request, response, promptAsync] = Google.useAuthRequest({
        androidClientId: 'YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com',
        iosClientId: 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com',
        webClientId: 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com',
    });

    React.useEffect(() => {
        if (response?.type === 'success') {
            handleGoogleSignIn(response.authentication.accessToken);
        }
    }, [response]);

    const handleGoogleSignIn = async (token) => {
        try {
            setLoading(true);
            // Fetch user info from Google
            const userInfoResponse = await fetch(
                'https://www.googleapis.com/userinfo/v2/me',
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            const userInfo = await userInfoResponse.json();

            const user = {
                id: userInfo.id,
                name: userInfo.name,
                email: userInfo.email,
                photoUrl: userInfo.picture,
                authMethod: 'google',
            };

            await saveAuthUser(user);
            successFeedback();
            onComplete();
        } catch (error) {
            console.error('Google sign-in error:', error);
            Alert.alert('Erro', 'Não foi possível fazer login com Google');
        } finally {
            setLoading(false);
        }
    };

    const handleManualSignup = async () => {
        if (!name.trim()) {
            Alert.alert('Atenção', 'Por favor, informe seu nome');
            return;
        }

        try {
            setLoading(true);
            const user = {
                id: `manual_${Date.now()}`,
                name: name.trim(),
                email: email.trim() || null,
                photoUrl: null,
                authMethod: 'manual',
            };

            await saveAuthUser(user);
            successFeedback();
            onComplete();
        } catch (error) {
            console.error('Signup error:', error);
            Alert.alert('Erro', 'Não foi possível criar conta');
        } finally {
            setLoading(false);
        }
    };

    if (showManualSignup) {
        return (
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                    <View style={styles.content}>
                        <Text style={styles.title}>Criar Conta Pessoal</Text>
                        <Text style={styles.subtitle}>
                            Informe seus dados para começar
                        </Text>

                        <GlassCard style={styles.inputCard}>
                            <Text style={styles.label}>Nome *</Text>
                            <TextInput
                                style={styles.input}
                                value={name}
                                onChangeText={setName}
                                placeholder="Seu nome completo"
                                placeholderTextColor={colors.textMuted}
                                autoFocus
                                onFocus={() => lightImpact()}
                            />
                        </GlassCard>

                        <GlassCard style={styles.inputCard}>
                            <Text style={styles.label}>Email (opcional)</Text>
                            <TextInput
                                style={styles.input}
                                value={email}
                                onChangeText={setEmail}
                                placeholder="seu@email.com"
                                placeholderTextColor={colors.textMuted}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                onFocus={() => lightImpact()}
                            />
                        </GlassCard>

                        <TouchableOpacity
                            style={styles.primaryButton}
                            onPress={handleManualSignup}
                            disabled={loading}
                        >
                            <LinearGradient
                                colors={['#818cf8', '#6366f1', '#4f46e5']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={StyleSheet.absoluteFill}
                            />
                            {loading ? (
                                <ActivityIndicator color={colors.text} />
                            ) : (
                                <Text style={styles.primaryButtonText}>Continuar →</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => {
                                lightImpact();
                                setShowManualSignup(false);
                            }}
                            disabled={loading}
                        >
                            <Text style={styles.backButtonText}>← Voltar</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <View style={styles.logoContainer}>
                    <Image
                        source={require('../../assets/logo.png')}
                        style={styles.logoImage}
                        resizeMode="contain"
                    />
                    <Text style={styles.appName}>MeusSuple</Text>
                    <Text style={styles.tagline}>
                        Rastreador e lembrete de suplementos
                    </Text>
                </View>

                <View style={styles.buttonsContainer}>
                    <TouchableOpacity
                        style={styles.manualButton}
                        onPress={() => {
                            lightImpact();
                            setShowManualSignup(true);
                        }}
                        disabled={loading}
                    >
                        <LinearGradient
                            colors={['#818cf8', '#6366f1', '#4f46e5']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={StyleSheet.absoluteFill}
                        />
                        <Text style={styles.manualButtonText}>Começar Agora</Text>
                    </TouchableOpacity>
                </View>

                <Text style={styles.disclaimer}>
                    Ao continuar, você concorda com nossos termos de uso
                </Text>
            </View>
        </View>
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
    content: {
        flex: 1,
        padding: spacing.xl,
        justifyContent: 'center',
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: spacing.xxxl,
    },
    logoImage: {
        width: 120,
        height: 120,
        marginBottom: spacing.lg,
    },
    appName: {
        ...typography.h1,
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: spacing.sm,
    },
    tagline: {
        ...typography.body,
        textAlign: 'center',
        color: colors.textSecondary,
        maxWidth: 280,
    },
    title: {
        ...typography.h2,
        marginBottom: spacing.xs,
    },
    subtitle: {
        ...typography.bodySmall,
        marginBottom: spacing.xl,
    },
    buttonsContainer: {
        gap: spacing.md,
    },
    googleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.lg,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        overflow: 'hidden',
        gap: spacing.sm,
    },
    googleIcon: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.text,
    },
    googleButtonText: {
        ...typography.body,
        fontWeight: '600',
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: spacing.md,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    dividerText: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        marginHorizontal: spacing.md,
    },
    manualButton: {
        padding: spacing.lg,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
        overflow: 'hidden',
    },
    manualButtonText: {
        ...typography.body,
        fontWeight: 'bold',
    },
    primaryButton: {
        padding: spacing.lg,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
        marginTop: spacing.lg,
        overflow: 'hidden',
    },
    primaryButtonText: {
        ...typography.body,
        fontWeight: 'bold',
    },
    backButton: {
        padding: spacing.md,
        alignItems: 'center',
        marginTop: spacing.md,
    },
    backButtonText: {
        ...typography.body,
        color: colors.textSecondary,
    },
    glassCard: {
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        overflow: 'hidden',
        padding: spacing.md,
    },
    inputCard: {
        marginBottom: spacing.md,
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
        fontSize: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    disclaimer: {
        ...typography.caption,
        textAlign: 'center',
        marginTop: spacing.xl,
        color: colors.textSecondary,
    },
});
