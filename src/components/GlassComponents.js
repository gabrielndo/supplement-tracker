import React, { useRef } from 'react';
import {
    TouchableOpacity,
    View,
    Text,
    StyleSheet,
    Animated,
    Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, borderRadius, spacing, typography, shadows } from '../styles/theme';
import { mediumImpact, lightImpact, successFeedback } from '../services/haptics';

/**
 * GlassButton - A button with Apple's Liquid Glass effect
 * Includes haptic feedback and smooth animations
 */
export const GlassButton = ({
    onPress,
    children,
    style,
    variant = 'default', // 'default', 'primary', 'success', 'danger', 'water'
    size = 'medium', // 'small', 'medium', 'large'
    disabled = false,
    haptic = true,
    icon,
    label,
}) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const opacityAnim = useRef(new Animated.Value(1)).current;

    const getGradientColors = () => {
        switch (variant) {
            case 'primary':
                return ['rgba(99, 102, 241, 0.3)', 'rgba(79, 70, 229, 0.2)', 'rgba(99, 102, 241, 0.1)'];
            case 'success':
                return ['rgba(34, 197, 94, 0.3)', 'rgba(22, 163, 74, 0.2)', 'rgba(34, 197, 94, 0.1)'];
            case 'danger':
                return ['rgba(239, 68, 68, 0.3)', 'rgba(220, 38, 38, 0.2)', 'rgba(239, 68, 68, 0.1)'];
            case 'water':
                return ['rgba(14, 165, 233, 0.3)', 'rgba(2, 132, 199, 0.2)', 'rgba(14, 165, 233, 0.1)'];
            default:
                return ['rgba(255, 255, 255, 0.12)', 'rgba(255, 255, 255, 0.06)', 'rgba(255, 255, 255, 0.02)'];
        }
    };

    const getBorderColor = () => {
        switch (variant) {
            case 'primary':
                return 'rgba(129, 140, 248, 0.4)';
            case 'success':
                return 'rgba(74, 222, 128, 0.4)';
            case 'danger':
                return 'rgba(248, 113, 113, 0.4)';
            case 'water':
                return 'rgba(56, 189, 248, 0.4)';
            default:
                return 'rgba(255, 255, 255, 0.15)';
        }
    };

    const getSizeStyles = () => {
        switch (size) {
            case 'small':
                return { paddingVertical: spacing.sm, paddingHorizontal: spacing.md };
            case 'large':
                return { paddingVertical: spacing.lg, paddingHorizontal: spacing.xl };
            default:
                return { paddingVertical: spacing.md, paddingHorizontal: spacing.lg };
        }
    };

    const handlePressIn = () => {
        Animated.parallel([
            Animated.spring(scaleAnim, {
                toValue: 0.96,
                useNativeDriver: true,
                damping: 15,
                stiffness: 300,
            }),
            Animated.timing(opacityAnim, {
                toValue: 0.85,
                duration: 100,
                useNativeDriver: true,
            }),
        ]).start();
    };

    const handlePressOut = () => {
        Animated.parallel([
            Animated.spring(scaleAnim, {
                toValue: 1,
                useNativeDriver: true,
                damping: 10,
                stiffness: 200,
            }),
            Animated.timing(opacityAnim, {
                toValue: 1,
                duration: 150,
                useNativeDriver: true,
            }),
        ]).start();
    };

    const handlePress = () => {
        if (haptic) {
            if (variant === 'success') {
                successFeedback();
            } else {
                mediumImpact();
            }
        }
        onPress?.();
    };

    return (
        <Animated.View
            style={[
                {
                    transform: [{ scale: scaleAnim }],
                    opacity: opacityAnim,
                },
            ]}
        >
            <Pressable
                onPress={handlePress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                disabled={disabled}
            >
                <View
                    style={[
                        styles.glassContainer,
                        {
                            borderColor: getBorderColor(),
                            opacity: disabled ? 0.5 : 1,
                        },
                        getSizeStyles(),
                        shadows.glass,
                        style,
                    ]}
                >
                    <LinearGradient
                        colors={getGradientColors()}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                        style={StyleSheet.absoluteFill}
                    />
                    {/* Glass highlight effect */}
                    <View style={styles.glassHighlight} />

                    {/* Content */}
                    <View style={styles.contentContainer}>
                        {icon && <Text style={styles.icon}>{icon}</Text>}
                        {label && <Text style={styles.label}>{label}</Text>}
                        {children}
                    </View>
                </View>
            </Pressable>
        </Animated.View>
    );
};

/**
 * GlassCard - A card with Liquid Glass effect
 */
export const GlassCard = ({ children, style, variant = 'default' }) => {
    const getGradientColors = () => {
        switch (variant) {
            case 'primary':
                return ['rgba(99, 102, 241, 0.15)', 'rgba(79, 70, 229, 0.08)', 'rgba(99, 102, 241, 0.03)'];
            case 'water':
                return ['rgba(14, 165, 233, 0.15)', 'rgba(2, 132, 199, 0.08)', 'rgba(14, 165, 233, 0.03)'];
            default:
                return ['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.04)', 'rgba(255, 255, 255, 0.01)'];
        }
    };

    return (
        <View style={[styles.glassCardContainer, shadows.md, style]}>
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

/**
 * AnimatedIconButton - Animated icon button with glass effect
 */
export const AnimatedIconButton = ({
    icon,
    label,
    onPress,
    variant = 'default',
    haptic = true,
    style,
}) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;

    const handlePressIn = () => {
        Animated.parallel([
            Animated.spring(scaleAnim, {
                toValue: 0.92,
                useNativeDriver: true,
                damping: 12,
                stiffness: 400,
            }),
            Animated.timing(rotateAnim, {
                toValue: 1,
                duration: 100,
                useNativeDriver: true,
            }),
        ]).start();
    };

    const handlePressOut = () => {
        Animated.parallel([
            Animated.spring(scaleAnim, {
                toValue: 1,
                useNativeDriver: true,
                damping: 8,
                stiffness: 250,
            }),
            Animated.timing(rotateAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start();
    };

    const handlePress = () => {
        if (haptic) {
            lightImpact();
        }
        onPress?.();
    };

    const rotation = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '-5deg'],
    });

    const getGradientColors = () => {
        switch (variant) {
            case 'primary':
                return ['rgba(99, 102, 241, 0.25)', 'rgba(79, 70, 229, 0.15)'];
            case 'water':
                return ['rgba(14, 165, 233, 0.25)', 'rgba(2, 132, 199, 0.15)'];
            case 'success':
                return ['rgba(34, 197, 94, 0.25)', 'rgba(22, 163, 74, 0.15)'];
            default:
                return ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)'];
        }
    };

    return (
        <Animated.View
            style={[
                {
                    transform: [
                        { scale: scaleAnim },
                        { rotate: rotation },
                    ],
                },
                style,
            ]}
        >
            <Pressable
                onPress={handlePress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
            >
                <View style={styles.iconButtonContainer}>
                    <LinearGradient
                        colors={getGradientColors()}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[StyleSheet.absoluteFill, { borderRadius: borderRadius.lg }]}
                    />
                    <View style={styles.iconButtonHighlight} />
                    <Text style={styles.iconButtonIcon}>{icon}</Text>
                    {label && <Text style={styles.iconButtonLabel}>{label}</Text>}
                </View>
            </Pressable>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    glassContainer: {
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
    },

    contentContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
    },
    icon: {
        fontSize: 24,
        marginRight: spacing.sm,
    },
    label: {
        ...typography.body,
        fontWeight: '600',
    },
    glassCardContainer: {
        borderRadius: borderRadius.xl,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        overflow: 'hidden',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
    },
    iconButtonContainer: {
        width: 'auto',
        minWidth: 70,
        aspectRatio: 1,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.md,
    },
    iconButtonHighlight: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '40%',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderTopLeftRadius: borderRadius.lg - 1,
        borderTopRightRadius: borderRadius.lg - 1,
    },
    iconButtonIcon: {
        fontSize: 28,
        marginBottom: spacing.xs,
    },
    iconButtonLabel: {
        ...typography.caption,
        fontWeight: '600',
        textAlign: 'center',
    },
});
