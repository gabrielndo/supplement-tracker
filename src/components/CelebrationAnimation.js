import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Particle configuration
const PARTICLE_COUNT = 50;
const COLORS = [
    '#38bdf8', // Water blue
    '#0ea5e9', // Sky blue  
    '#22c55e', // Success green
    '#fbbf24', // Yellow
    '#f97316', // Orange
    '#a855f7', // Purple
    '#ec4899', // Pink
    '#ffffff', // White
];

const EMOJIS = ['💧', '🎉', '✨', '🌊', '💦', '⭐'];

/**
 * CelebrationAnimation - Confetti/particles animation for goal completion
 * @param {boolean} visible - Whether to show the animation
 * @param {function} onComplete - Callback when animation finishes
 */
const CelebrationAnimation = ({ visible, onComplete }) => {
    const particles = useRef(
        Array(PARTICLE_COUNT).fill(null).map(() => ({
            x: new Animated.Value(Math.random() * screenWidth),
            y: new Animated.Value(-50),
            rotation: new Animated.Value(0),
            scale: new Animated.Value(0),
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
            emoji: Math.random() > 0.7 ? EMOJIS[Math.floor(Math.random() * EMOJIS.length)] : null,
            size: Math.random() * 12 + 6,
            delay: Math.random() * 500,
        }))
    ).current;

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const centerScale = useRef(new Animated.Value(0)).current;
    const centerOpacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            startAnimation();
        }
    }, [visible]);

    const startAnimation = () => {
        // Fade in overlay
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
        }).start();

        // Center celebration
        Animated.sequence([
            Animated.parallel([
                Animated.spring(centerScale, {
                    toValue: 1,
                    tension: 50,
                    friction: 7,
                    useNativeDriver: true,
                }),
                Animated.timing(centerOpacity, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]),
            Animated.delay(1500),
            Animated.parallel([
                Animated.timing(centerScale, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(centerOpacity, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]),
        ]).start();

        // Animate particles
        particles.forEach((particle, index) => {
            const endX = Math.random() * screenWidth;
            const endY = screenHeight + 100;

            Animated.sequence([
                Animated.delay(particle.delay),
                Animated.parallel([
                    // Scale in
                    Animated.spring(particle.scale, {
                        toValue: 1,
                        tension: 50,
                        friction: 8,
                        useNativeDriver: true,
                    }),
                    // Fall down
                    Animated.timing(particle.y, {
                        toValue: endY,
                        duration: 2500 + Math.random() * 1000,
                        useNativeDriver: true,
                    }),
                    // Drift sideways
                    Animated.timing(particle.x, {
                        toValue: endX,
                        duration: 2500 + Math.random() * 1000,
                        useNativeDriver: true,
                    }),
                    // Rotate
                    Animated.timing(particle.rotation, {
                        toValue: 360 * (Math.random() > 0.5 ? 1 : -1),
                        duration: 2500,
                        useNativeDriver: true,
                    }),
                ]),
            ]).start();
        });

        // Complete animation cleanup
        setTimeout(() => {
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start(() => {
                // Reset particles
                particles.forEach(particle => {
                    particle.x.setValue(Math.random() * screenWidth);
                    particle.y.setValue(-50);
                    particle.rotation.setValue(0);
                    particle.scale.setValue(0);
                });
                centerScale.setValue(0);
                centerOpacity.setValue(0);

                if (onComplete) onComplete();
            });
        }, 3000);
    };

    if (!visible) return null;

    return (
        <Animated.View style={[styles.container, { opacity: fadeAnim }]} pointerEvents="none">
            {/* Particles */}
            {particles.map((particle, index) => (
                <Animated.View
                    key={index}
                    style={[
                        styles.particle,
                        {
                            transform: [
                                { translateX: particle.x },
                                { translateY: particle.y },
                                { scale: particle.scale },
                                {
                                    rotate: particle.rotation.interpolate({
                                        inputRange: [0, 360],
                                        outputRange: ['0deg', '360deg'],
                                    }),
                                },
                            ],
                        },
                    ]}
                >
                    {particle.emoji ? (
                        <Text style={{ fontSize: particle.size }}>{particle.emoji}</Text>
                    ) : (
                        <View
                            style={[
                                styles.confetti,
                                {
                                    backgroundColor: particle.color,
                                    width: particle.size,
                                    height: particle.size * 0.6,
                                },
                            ]}
                        />
                    )}
                </Animated.View>
            ))}

            {/* Center celebration badge */}
            <Animated.View
                style={[
                    styles.centerBadge,
                    {
                        transform: [{ scale: centerScale }],
                        opacity: centerOpacity,
                    },
                ]}
            >
                <LinearGradient
                    colors={['rgba(34, 197, 94, 0.2)', 'rgba(59, 130, 246, 0.1)']}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                />
                <Text style={styles.celebrationEmoji}>🎉</Text>
                <Text style={styles.celebrationTitle}>Meta Atingida!</Text>
                <Text style={styles.celebrationSubtitle}>Parabéns pela hidratação!</Text>
            </Animated.View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        zIndex: 1000,
    },
    particle: {
        position: 'absolute',
    },
    confetti: {
        borderRadius: 2,
    },
    centerBadge: {
        position: 'absolute',
        top: '35%',
        left: '15%',
        right: '15%',
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        borderRadius: 24,
        padding: 32,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(34, 197, 94, 0.4)',
        shadowColor: '#22c55e',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    celebrationEmoji: {
        fontSize: 64,
        marginBottom: 12,
    },
    celebrationTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#22c55e',
        marginBottom: 8,
    },
    celebrationSubtitle: {
        fontSize: 14,
        color: '#9ca3af',
    },
});

export default CelebrationAnimation;
