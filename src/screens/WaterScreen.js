import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Modal,
    Dimensions,
    Platform,
    Alert,
    PanResponder,
    Pressable,
    Animated,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Accelerometer } from 'expo-sensors';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Svg, { Path, Defs, ClipPath, G, LinearGradient as SvgLinearGradient, Stop, RadialGradient, Rect, Circle } from 'react-native-svg';
import { colors, spacing, borderRadius, typography } from '../styles/theme';
import { getProfile, getWaterLog, addWaterEntry, getWaterHistory, removeWaterEntry, getWaterReminders, saveWaterReminders, saveProfile, hasShownCelebrationToday, markCelebrationShown } from '../services/storage';
import { calculateWaterGoal } from '../services/aiSuggestions';
import { mediumImpact, successFeedback, lightImpact, errorFeedback, selectionFeedback } from '../services/haptics';
import HourlyWaterChart from '../components/HourlyWaterChart';
import CelebrationAnimation from '../components/CelebrationAnimation';
import { checkAndNotify } from '../utils/achievements';
import { scheduleWaterReminder, cancelWaterReminders } from '../services/notifications';

const { width: screenWidth } = Dimensions.get('window');

// Liquid Glass Theme Colors
const GLASS_COLORS = {
    glassBorder: 'rgba(255, 255, 255, 0.5)',
    glassSurface: 'rgba(255, 255, 255, 0.1)',
    highlight: 'rgba(255, 255, 255, 0.6)',
    waterPrimary: '#00C6FB',
    waterSecondary: '#005BEA',
    bubbles: 'rgba(255, 255, 255, 0.4)',
    activeButtonBg: 'rgba(0, 198, 251, 0.15)',
    activeButtonBorder: 'rgba(0, 198, 251, 0.4)',
};

const QUICK_ADD_OPTIONS = [
    { amount: 200, label: '200ml', emoji: '🥤' },
    { amount: 300, label: '300ml', emoji: '🥛' },
    { amount: 500, label: '500ml', emoji: '🍶' },
];

const REMINDER_PRESETS = [
    { value: 30, unit: 'min', label: '30 min' },
    { value: 1, unit: 'h', label: '1 h' },
    { value: 2, unit: 'h', label: '2 h' },
    { value: 3, unit: 'h', label: '3 h' },
];

// Helper for percentage color (Red -> Yellow -> Green)
const getPercentageColor = (percentage) => {
    if (percentage >= 100) return '#22c55e'; // Success Green
    if (percentage <= 0) return '#ef4444'; // Error Red

    // Simple breakpoints
    if (percentage < 25) return '#ef4444'; // Red
    if (percentage < 50) return '#f97316'; // Orange
    if (percentage < 75) return '#eab308'; // Yellow
    return '#84cc16'; // Lime Green
};

const getMotivationalMessage = (percentage) => {
    if (percentage >= 100) return null;
    if (percentage <= 0) return "Comece o dia se hidratando!";
    if (percentage < 30) return "Um bom começo!";
    if (percentage < 50) return "Continue assim, hidrate-se!";
    if (percentage < 80) return "Passou da metade, excelente!";
    return "Falta bem pouco para a meta!";
};

// Animated Glass Card Component (Shared with Home)
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
                    disabled={disabled}
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

// Liquid Glass Cup Component
const GlassWaterCup = ({ fillPercent, tiltX, waveOffset }) => {
    const cupHeight = 300; // Increased by 10% (272->300)
    const cupWidth = 200;

    // Clamp between 0 and 100
    const clampedPercent = Math.min(Math.max(fillPercent, 0), 100);
    const waterHeight = (clampedPercent / 100) * cupHeight;
    const waterY = cupHeight - waterHeight;

    const wave1Y = waterY + Math.sin(waveOffset) * 5;
    const wave2Y = waterY + Math.sin(waveOffset + 1.5) * 4;

    const cupPath = `
        M0 0
        L20 ${cupHeight - 20}
        Q25 ${cupHeight} 60 ${cupHeight}
        H140
        Q175 ${cupHeight} 180 ${cupHeight - 20}
        L200 0
        Z
    `;

    return (
        <View style={styles.cupContainer}>
            <Svg width={cupWidth} height={cupHeight} viewBox={`0 0 ${cupWidth} ${cupHeight}`}>
                <Defs>
                    {/* Water Gradient */}
                    <SvgLinearGradient id="waterGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <Stop offset="0%" stopColor="#00C6FB" stopOpacity="0.9" />
                        <Stop offset="50%" stopColor="#005BEA" stopOpacity="0.85" />
                        <Stop offset="100%" stopColor="#002966" stopOpacity="0.95" />
                    </SvgLinearGradient>

                    {/* Glass Surface Gradient */}
                    <SvgLinearGradient id="glassGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <Stop offset="0%" stopColor="rgba(255,255,255,0.1)" />
                        <Stop offset="20%" stopColor="rgba(255,255,255,0.05)" />
                        <Stop offset="50%" stopColor="rgba(255,255,255,0)" />
                        <Stop offset="80%" stopColor="rgba(255,255,255,0.05)" />
                        <Stop offset="100%" stopColor="rgba(255,255,255,0.2)" />
                    </SvgLinearGradient>

                    <ClipPath id="cupClip">
                        <Path d={cupPath} />
                    </ClipPath>
                </Defs>

                {/* Water Content */}
                <G clipPath="url(#cupClip)">
                    {/* Back Wave */}
                    <Path
                        d={`M-50 ${wave1Y} Q${cupWidth / 2} ${wave2Y - 15} ${cupWidth + 50} ${wave1Y} V${cupHeight + 50} H-50 Z`}
                        fill="#00C6FB"
                        opacity="0.4"
                    />

                    {/* Front Wave (Main Fill) */}
                    <Path
                        d={`M-50 ${wave2Y} Q${cupWidth / 2} ${wave1Y + 15} ${cupWidth + 50} ${wave2Y} V${cupHeight + 50} H-50 Z`}
                        fill="url(#waterGradient)"
                    />

                    {/* Bubbles */}
                    {clampedPercent > 10 && <Circle cx="50" cy={waterY + 60} r="3" fill={GLASS_COLORS.bubbles} opacity="0.6" />}
                    {clampedPercent > 30 && <Circle cx="120" cy={waterY + 120} r="5" fill={GLASS_COLORS.bubbles} opacity="0.4" />}
                    {clampedPercent > 50 && <Circle cx="80" cy={waterY + 180} r="2" fill={GLASS_COLORS.bubbles} opacity="0.5" />}
                    {clampedPercent > 20 && <Circle cx="150" cy={waterY + 90} r="4" fill={GLASS_COLORS.bubbles} opacity="0.5" />}
                </G>

                {/* Glass Highlights */}
                <Path
                    d={`M10 10 L25 ${cupHeight - 25} Q28 ${cupHeight - 5} 40 ${cupHeight - 5}`}
                    stroke="rgba(255,255,255,0.3)"
                    strokeWidth="4"
                    fill="none"
                    strokeLinecap="round"
                />
                <Path
                    d={`M190 10 L175 ${cupHeight - 25} Q172 ${cupHeight - 5} 160 ${cupHeight - 5}`}
                    stroke="rgba(255,255,255,0.2)"
                    strokeWidth="2"
                    fill="none"
                    strokeLinecap="round"
                />
                <Path d={`M0 0 H200`} stroke="rgba(255,255,255,0.4)" strokeWidth="2" />
                <Path d={cupPath} stroke={GLASS_COLORS.glassBorder} strokeWidth="2" fill="none" />
            </Svg>

            <View style={styles.percentOverlay}>
                <Text style={[styles.percentText, { color: getPercentageColor(clampedPercent) }]}>{Math.round(clampedPercent)}%</Text>
                {/* Motivational Message */}
                {getMotivationalMessage(clampedPercent) && (
                    <Text style={styles.motivationalText}>
                        {getMotivationalMessage(clampedPercent)}
                    </Text>
                )}
            </View>
        </View>
    );
};

// Custom Vertical Slider Component
const VerticalSlider = ({ value, max, onChange, height = 300 }) => {
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onStartShouldSetPanResponderCapture: () => true,
            onMoveShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponderCapture: () => true,
            onPanResponderGrant: (evt) => handleTouch(evt.nativeEvent.locationY),
            onPanResponderMove: (evt) => handleTouch(evt.nativeEvent.locationY),
        })
    ).current;

    const handleTouch = (y) => {
        // Clamp y between 0 and height
        const clampedY = Math.max(0, Math.min(y, height));
        // Invert Y (0 is top, needs to be max; height is bottom, needs to be 0)
        const percentage = 1 - (clampedY / height);
        // Ensure integer
        const newValue = Math.round(percentage * max);
        onChange(newValue);
    };

    return (
        <View
            style={{
                height,
                width: 60,
                backgroundColor: 'rgba(255,255,255,0.05)',
                borderRadius: 30,
                overflow: 'hidden',
                justifyContent: 'flex-end',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.1)',
                alignItems: 'center'
            }}
            {...panResponder.panHandlers}
        >
            {/* Background Tick Marks */}
            <View style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 10, justifyContent: 'space-between', paddingVertical: 10 }}>
                {[...Array(5)].map((_, i) => (
                    <View key={i} style={{ width: 6, height: 1, backgroundColor: 'rgba(255,255,255,0.2)' }} />
                ))}
            </View>

            <LinearGradient
                colors={[GLASS_COLORS.waterPrimary, GLASS_COLORS.waterSecondary]}
                style={{ height: `${(value / max) * 100}%`, width: '100%' }}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
            />
            {/* Knob (Top of water) */}
            <View style={{
                position: 'absolute',
                bottom: `${(value / max) * 100}%`,
                marginBottom: -10,
                width: '100%',
                height: 20,
                backgroundColor: 'rgba(255,255,255,0.3)',
                borderTopWidth: 1,
                borderColor: 'rgba(255,255,255,0.8)'
            }} />
        </View>
    );
};

export default function WaterScreen({ navigation }) {
    const [profile, setProfile] = useState(null);
    const [todayData, setTodayData] = useState({ amount: 0, entries: [] });
    const [goal, setGoal] = useState(2000);
    const [history, setHistory] = useState([]);

    // Modals
    const [modalVisible, setModalVisible] = useState(false);
    const [reminderModalVisible, setReminderModalVisible] = useState(false);
    const [confirmRemoveVisible, setConfirmRemoveVisible] = useState(false);
    const [editGoalVisible, setEditGoalVisible] = useState(false);

    const [entryToRemove, setEntryToRemove] = useState(null);
    const [customAmount, setCustomAmount] = useState(0);
    const [newGoal, setNewGoal] = useState('');
    const [reminderSettings, setReminderSettings] = useState({
        enabled: false,
        intervalValue: '1',
        intervalUnit: 'h',
    });
    const [tempSettings, setTempSettings] = useState({
        intervalValue: '1',
        intervalUnit: 'h',
    });

    const [tiltX, setTiltX] = useState(0);
    const [waveOffset, setWaveOffset] = useState(0);
    const animationRef = useRef(null);

    // Celebration state
    const [showCelebration, setShowCelebration] = useState(false);
    const [celebrationShownToday, setCelebrationShownToday] = useState(false);

    const today = new Date().toISOString().split('T')[0];

    useFocusEffect(
        useCallback(() => {
            loadData();
            startWaveAnimation();

            let subscription;
            const startAccelerometer = async () => {
                if (Platform.OS === 'web') return;
                try {
                    await Accelerometer.setUpdateInterval(150);
                    subscription = Accelerometer.addListener(({ x }) => setTiltX(x));
                } catch (error) {
                    console.log('Accelerometer not available:', error);
                }
            };

            startAccelerometer();

            return () => {
                if (subscription) {
                    subscription.remove();
                }
                // Fallback safe cleanup
                if (Platform.OS !== 'web') {
                    Accelerometer.removeAllListeners();
                }

                if (animationRef.current) {
                    cancelAnimationFrame(animationRef.current);
                    animationRef.current = null;
                }
            };
        }, [])
    );

    const startWaveAnimation = () => {
        let lastTime = 0;
        const animate = (currentTime) => {
            if (currentTime - lastTime > 40) {
                setWaveOffset((prev) => prev + 0.05);
                lastTime = currentTime;
            }
            animationRef.current = requestAnimationFrame(animate);
        };
        animationRef.current = requestAnimationFrame(animate);
    };

    const loadData = async () => {
        const profileData = await getProfile();
        const waterData = await getWaterLog(today);
        const historyData = await getWaterHistory(7);
        const remindersData = await getWaterReminders();
        const alreadyCelebrated = await hasShownCelebrationToday();

        setProfile(profileData);
        setTodayData(waterData);
        setHistory(historyData);
        setCelebrationShownToday(alreadyCelebrated);

        if (remindersData && !Array.isArray(remindersData)) {
            setReminderSettings(remindersData);
        } else {
            // Default if empty or legacy array
            setReminderSettings({ enabled: false, intervalValue: '1', intervalUnit: 'h' });
        }

        // Load goal: Use Custom Goal if explicit, otherwise calculate
        if (profileData) {
            if (profileData.customWaterGoal) {
                setGoal(profileData.customWaterGoal);
            } else if (profileData.weight) {
                setGoal(calculateWaterGoal(profileData.weight, profileData.gender));
            }
        }
    };

    const handleUpdateGoal = async () => {
        const goalValue = parseInt(newGoal);
        if (isNaN(goalValue) || goalValue <= 500) {
            Alert.alert('Erro', 'A meta deve ser maior que 500ml');
            return;
        }

        successFeedback();
        setGoal(goalValue);

        // Save to profile
        if (profile) {
            const updatedProfile = { ...profile, customWaterGoal: goalValue };
            await saveProfile(updatedProfile);
            setProfile(updatedProfile);
        }
        setEditGoalVisible(false);
    };

    const handleAddWater = async (amount) => {
        successFeedback();
        const updated = await addWaterEntry(today, amount);
        if (updated) {
            setTodayData(updated);
            setHistory(await getWaterHistory(7));

            // Check if goal just reached and celebration not shown yet
            const newPercentage = Math.round((updated.amount / goal) * 100);
            if (newPercentage >= 100 && !celebrationShownToday) {
                setShowCelebration(true);
                setCelebrationShownToday(true);
                await markCelebrationShown();
            }

            // Check for achievements
            await checkAndNotify(goal);
        }
    };

    const confirmRemoveEntry = async () => {
        errorFeedback();
        if (entryToRemove !== null) {
            const updated = await removeWaterEntry(today, entryToRemove);
            if (updated) {
                setTodayData(updated);
                setHistory(await getWaterHistory(7));
            }
        }
        setConfirmRemoveVisible(false);
        setEntryToRemove(null);
    };

    const toggleReminder = async () => {
        const newSettings = { ...reminderSettings, enabled: !reminderSettings.enabled };

        if (newSettings.enabled) {
            successFeedback();
            const min = newSettings.intervalUnit === 'h'
                ? parseInt(newSettings.intervalValue) * 60
                : parseInt(newSettings.intervalValue);
            await scheduleWaterReminder(min);
        } else {
            await cancelWaterReminders();
        }

        setReminderSettings(newSettings);
        await saveWaterReminders(newSettings);
    };

    const saveReminderSettings = async () => {
        // Validate
        const val = parseInt(tempSettings.intervalValue);
        if (isNaN(val) || val <= 0) {
            Alert.alert('Erro', 'Valor inválido');
            return;
        }

        // Check Max 24h
        let totalMinutes = val;
        if (tempSettings.intervalUnit === 'h') totalMinutes = val * 60;

        if (totalMinutes > 1440) {
            Alert.alert('Erro', 'O intervalo máximo é de 24 horas (1440 min).');
            return;
        }

        const newSettings = { ...reminderSettings, ...tempSettings, enabled: true };

        // Schedule new reminder
        await cancelWaterReminders();
        await scheduleWaterReminder(totalMinutes);

        setReminderSettings(newSettings);
        await saveWaterReminders(newSettings);
        setReminderModalVisible(false);
        successFeedback();
    };

    const handlePresetSelect = (preset) => {
        setTempSettings({
            intervalValue: preset.value.toString(),
            intervalUnit: preset.unit
        });
        selectionFeedback();
    };

    const percentage = Math.min(100, Math.round((todayData.amount / goal) * 100));
    const remaining = Math.max(0, goal - todayData.amount);
    const displayEntries = todayData.entries.map((entry, index) => ({ ...entry, originalIndex: index })).reverse();

    return (
        <View style={{ flex: 1 }}>
            <CelebrationAnimation
                visible={showCelebration}
                onComplete={() => setShowCelebration(false)}
            />
            <ScrollView style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>Hidratação 💧</Text>
                    <TouchableOpacity
                        style={styles.goalContainer}
                        onPress={() => {
                            lightImpact();
                            setNewGoal(goal.toString());
                            setEditGoalVisible(true);
                        }}
                    >
                        <Text style={styles.subtitle}>
                            Meta Diária: <Text style={styles.goalHighlight}>{goal}ml</Text> (Editar ✏️)
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Liquid Glass Cup */}
                <View style={styles.bodySection}>
                    <GlassWaterCup fillPercent={percentage} tiltX={tiltX} waveOffset={waveOffset} />

                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{todayData.amount}ml</Text>
                            <Text style={styles.statLabel}>consumido</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{remaining}ml</Text>
                            <Text style={styles.statLabel}>restante</Text>
                        </View>
                    </View>

                    {percentage >= 100 && (
                        <View style={styles.completedBadgeGlass}>
                            <LinearGradient
                                colors={['rgba(34, 197, 94, 0.2)', 'rgba(34, 197, 94, 0.05)']}
                                style={StyleSheet.absoluteFill}
                            />
                            <Text style={styles.completedText}>🎉 Meta alcançada! Continue assim!</Text>
                        </View>
                    )}
                </View>

                {/* Quick Add Buttons (Blue Theme) */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Beber Água</Text>
                    <View style={styles.quickAddContainer}>
                        {QUICK_ADD_OPTIONS.map((option) => (
                            <TouchableOpacity
                                key={option.amount}
                                style={styles.quickAddGlassButton}
                                onPress={() => handleAddWater(option.amount)}
                            >
                                <Text style={styles.quickAddTextLarge}>+{option.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    {/* Full width custom button */}
                    <TouchableOpacity
                        style={[styles.quickAddGlassButton, { marginTop: 10, flexDirection: 'row', width: '100%', paddingVertical: 12 }]}
                        onPress={() => setModalVisible(true)}
                    >
                        <Text style={{ fontSize: 16, marginRight: 6 }}>✏️</Text>
                        <Text style={{ color: colors.text, fontWeight: 'bold', fontSize: 14 }}>Adicionar valor personalizado</Text>
                    </TouchableOpacity>
                </View>

                {/* Reminders Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Lembrete de Água</Text>
                        <TouchableOpacity
                            style={[styles.toggleButton, reminderSettings.enabled && styles.toggleButtonActive]}
                            onPress={toggleReminder}
                        >
                            <View style={[styles.toggleKnob, reminderSettings.enabled && styles.toggleKnobActive]} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.glassContainer}>
                        <View style={styles.reminderStatusRow}>
                            <View>
                                <Text style={styles.reminderStatusTitle}>
                                    {reminderSettings.enabled ? '🔔 Ativado' : '🔕 Desativado'}
                                </Text>
                                <Text style={styles.reminderStatusText}>
                                    {reminderSettings.enabled
                                        ? `A cada ${reminderSettings.intervalValue} ${reminderSettings.intervalUnit === 'h' ? 'hora(s)' : 'min'}`
                                        : 'Toque no switch para ativar'
                                    }
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={styles.editReminderButton}
                                onPress={() => {
                                    setTempSettings({
                                        intervalValue: reminderSettings.intervalValue.toString(),
                                        intervalUnit: reminderSettings.intervalUnit
                                    });
                                    setReminderModalVisible(true);
                                }}
                            >
                                <Text style={styles.editReminderText}>Editar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* Glass History Log */}
                {displayEntries.length > 0 && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Histórico de Hoje</Text>
                        </View>

                        {/* Entry List */}
                        <View style={[styles.glassContainerNoPadding, { marginTop: spacing.md }]}>
                            {displayEntries.slice(0, 5).map((entry, displayIndex) => (
                                <TouchableOpacity
                                    key={displayIndex}
                                    style={styles.entryItemGlass}
                                    onPress={() => { lightImpact(); setEntryToRemove(entry.originalIndex); setConfirmRemoveVisible(true); }}
                                    activeOpacity={0.6}
                                >
                                    <Text style={styles.entryTime}>
                                        {new Date(entry.time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                    </Text>
                                    <View style={styles.entryRight}>
                                        <Text style={styles.entryAmountBlue}>+{entry.amount}ml</Text>
                                        <View style={styles.removeIconBadgeOutside}>
                                            <Text style={styles.removeIconText}>✕</Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                )}

                <View style={styles.bottomSpacer} />

                {/* EDIT GOAL MODAL */}
                <Modal visible={editGoalVisible} animationType="fade" transparent={true} onRequestClose={() => setEditGoalVisible(false)}>
                    <BlurView intensity={100} tint="dark" style={styles.modalOverlayGlass}>
                        <View style={styles.glassModalContent}>
                            <Text style={styles.modalTitle}>Editar Meta Diária</Text>

                            {/* Suggested Goal */}
                            {profile?.weight && (
                                <View style={styles.suggestionBox}>
                                    <Text style={styles.suggestionLabel}>💡 Sugestão baseada no seu perfil</Text>
                                    <Text style={styles.suggestionValue}>
                                        {calculateWaterGoal(profile.weight, profile.gender)}ml
                                    </Text>
                                </View>
                            )}

                            <View style={styles.inputRow}>
                                <TextInput
                                    style={styles.customInput}
                                    value={newGoal}
                                    onChangeText={setNewGoal}
                                    keyboardType="numeric"
                                    autoFocus
                                />
                                <Text style={styles.inputUnit}>ml</Text>
                            </View>

                            {/* Suggestion Button - Full Width */}
                            {profile?.weight && (
                                <TouchableOpacity
                                    style={styles.useSuggestedButtonFull}
                                    onPress={() => {
                                        lightImpact();
                                        setNewGoal(calculateWaterGoal(profile.weight, profile.gender).toString());
                                    }}
                                >
                                    <Text style={styles.useSuggestedText}>Usar sugestão</Text>
                                </TouchableOpacity>
                            )}

                            {/* Action Buttons */}
                            <View style={styles.modalButtons}>
                                <TouchableOpacity style={styles.cancelButton} onPress={() => setEditGoalVisible(false)}>
                                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.confirmButton} onPress={handleUpdateGoal}>
                                    <Text style={styles.confirmButtonText}>Salvar</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </BlurView>
                </Modal>

                {/* Custom Amount Modal - Slider */}
                <Modal visible={modalVisible} animationType="slide" transparent={true} onRequestClose={() => setModalVisible(false)}>
                    <BlurView intensity={100} tint="dark" style={styles.modalOverlayGlass}>
                        <View style={[styles.glassModalContent, { maxWidth: 400, paddingVertical: 40 }]}>
                            <Text style={styles.modalTitle}>Adicionar Água</Text>

                            <View style={{ flexDirection: 'row', alignItems: 'center', height: 320, gap: 30, marginBottom: 20 }}>
                                {/* Slider */}
                                <View style={{ alignItems: 'center' }}>
                                    <Text style={{ color: colors.textSecondary, marginBottom: 10, fontWeight: 'bold' }}>MAX</Text>
                                    <VerticalSlider
                                        value={customAmount || 0}
                                        max={goal}
                                        onChange={(val) => setCustomAmount(val)}
                                        height={280}
                                    />
                                    <Text style={{ color: colors.textSecondary, marginTop: 10, fontWeight: 'bold' }}>0</Text>
                                </View>

                                {/* Value Display + Buttons */}
                                <View style={{ alignItems: 'center', justifyContent: 'center', gap: 20 }}>
                                    <View style={{ alignItems: 'center' }}>
                                        <Text style={{ ...typography.h1, color: colors.text, fontSize: 48, textShadowColor: 'rgba(0, 198, 251, 0.3)', textShadowRadius: 10 }}>
                                            {customAmount}<Text style={{ fontSize: 24, color: colors.textSecondary }}>ml</Text>
                                        </Text>
                                        <Text style={{ color: colors.textSecondary, marginTop: 5 }}>
                                            {Math.round((customAmount / goal) * 100)}% da meta
                                        </Text>
                                    </View>

                                    <TouchableOpacity
                                        style={[styles.confirmButton, { width: 140, paddingVertical: 15, opacity: customAmount > 0 ? 1 : 0.5 }]}
                                        onPress={() => {
                                            if (customAmount > 0) {
                                                mediumImpact();
                                                handleAddWater(customAmount);
                                                setModalVisible(false);
                                                setCustomAmount(0);
                                            }
                                        }}
                                        disabled={customAmount <= 0}
                                    >
                                        <Text style={[styles.confirmButtonText, { fontSize: 18 }]}>Adicionar</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity onPress={() => setModalVisible(false)} style={{ padding: 10 }}>
                                        <Text style={styles.cancelButtonText}>Cancelar</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </BlurView>
                </Modal>

                {/* Confirm Remove Modal - Glass Style */}
                <Modal visible={confirmRemoveVisible} animationType="fade" transparent={true} onRequestClose={() => setConfirmRemoveVisible(false)}>
                    <BlurView intensity={100} tint="dark" style={styles.modalOverlayGlass}>
                        <View style={styles.glassModalContent}>
                            <Text style={styles.confirmTitle}>Remover registro?</Text>
                            <View style={styles.deleteIconBig}>
                                <Text style={{ fontSize: 32 }}>🗑️</Text>
                            </View>
                            <View style={styles.modalButtons}>
                                <TouchableOpacity style={styles.cancelButton} onPress={() => setConfirmRemoveVisible(false)}>
                                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.deleteButton} onPress={confirmRemoveEntry}>
                                    <Text style={styles.deleteButtonText}>Remover</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </BlurView>
                </Modal>
                {/* Reminder Config Modal */}
                <Modal visible={reminderModalVisible} animationType="slide" transparent={true} onRequestClose={() => setReminderModalVisible(false)}>
                    <BlurView intensity={100} tint="dark" style={styles.modalOverlayGlass}>
                        <View style={styles.glassModalContent}>
                            <Text style={styles.modalTitle}>Configurar Lembrete</Text>

                            <Text style={styles.sectionSubtitle}>Intervalos Sugeridos</Text>
                            <View style={styles.presetGrid}>
                                {REMINDER_PRESETS.map((preset, index) => {
                                    const isActive = tempSettings.intervalValue === preset.value.toString() && tempSettings.intervalUnit === preset.unit;
                                    return (
                                        <TouchableOpacity
                                            key={index}
                                            style={[styles.presetButton, isActive && styles.presetButtonActive]}
                                            onPress={() => handlePresetSelect(preset)}
                                        >
                                            <Text style={[styles.presetButtonText, isActive && styles.presetButtonTextActive]}>
                                                {preset.label}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            <Text style={styles.sectionSubtitle}>Personalizado</Text>
                            <View style={styles.customIntervalRow}>
                                <TextInput
                                    style={[
                                        styles.intervalInput,
                                        (parseInt(tempSettings.intervalValue || 0) * (tempSettings.intervalUnit === 'h' ? 60 : 1) > 1440) &&
                                        { borderColor: colors.error, color: colors.error }
                                    ]}
                                    value={tempSettings.intervalValue}
                                    onChangeText={(text) => setTempSettings({ ...tempSettings, intervalValue: text.replace(/[^0-9]/g, '') })}
                                    placeholder="0"
                                    placeholderTextColor={colors.textMuted}
                                    keyboardType="numeric"
                                    maxLength={4}
                                />
                                <View style={styles.unitToggleContainer}>
                                    <TouchableOpacity
                                        style={[styles.unitButton, tempSettings.intervalUnit === 'min' && styles.unitButtonActive]}
                                        onPress={() => { selectionFeedback(); setTempSettings({ ...tempSettings, intervalUnit: 'min' }); }}
                                    >
                                        <Text style={[styles.unitButtonText, tempSettings.intervalUnit === 'min' && styles.unitButtonTextActive]}>min</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.unitButton, tempSettings.intervalUnit === 'h' && styles.unitButtonActive]}
                                        onPress={() => { selectionFeedback(); setTempSettings({ ...tempSettings, intervalUnit: 'h' }); }}
                                    >
                                        <Text style={[styles.unitButtonText, tempSettings.intervalUnit === 'h' && styles.unitButtonTextActive]}>h</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {(parseInt(tempSettings.intervalValue || 0) * (tempSettings.intervalUnit === 'h' ? 60 : 1) > 1440) && (
                                <Text style={styles.errorText}>O intervalo máximo é de 24 horas</Text>
                            )}

                            <View style={styles.modalButtons}>
                                <TouchableOpacity style={styles.cancelButton} onPress={() => setReminderModalVisible(false)}>
                                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.confirmButton} onPress={saveReminderSettings}>
                                    <Text style={styles.confirmButtonText}>Salvar</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </BlurView>
                </Modal>

            </ScrollView>
        </View>
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
        alignItems: 'center',
    },
    title: {
        ...typography.h2,
        marginBottom: spacing.xs,
    },
    goalContainer: {
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.md,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    subtitle: {
        ...typography.bodySmall,
        color: colors.textSecondary,
    },
    goalHighlight: {
        color: GLASS_COLORS.waterPrimary,
        fontWeight: 'bold',
    },
    bodySection: {
        alignItems: 'center',
        paddingVertical: spacing.md,
    },
    cupContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        marginVertical: spacing.md,
        backgroundColor: 'transparent',
    },
    percentOverlay: {
        position: 'absolute',
        top: '40%',
        alignItems: 'center',
    },
    percentText: {
        fontSize: 48,
        fontWeight: 'bold',
        color: colors.text,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: spacing.lg,
        paddingHorizontal: spacing.xl,
        width: '100%',
        justifyContent: 'center',
    },
    statItem: {
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
    },
    statValue: {
        ...typography.h3,
        color: colors.water,
    },
    statLabel: {
        ...typography.caption,
    },
    statDivider: {
        width: 1,
        height: 30,
        backgroundColor: colors.cardLight,
    },
    completedBadgeGlass: {
        marginTop: spacing.lg,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.full,
        borderWidth: 1,
        borderColor: colors.success,
        overflow: 'hidden',
    },
    completedText: {
        color: colors.success,
        fontWeight: 'bold',
        fontSize: 16,
    },
    section: {
        padding: spacing.lg,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    sectionTitle: {
        ...typography.h3,
        marginBottom: 0,
    },
    viewHistoryButton: {
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.md,
        backgroundColor: 'rgba(14, 165, 233, 0.15)',
        borderRadius: borderRadius.full,
        borderWidth: 1,
        borderColor: 'rgba(14, 165, 233, 0.3)',
    },
    viewHistoryText: {
        fontSize: 12,
        color: '#38bdf8',
        fontWeight: '600',
    },
    quickAddContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: spacing.sm,
        gap: spacing.sm,
    },
    quickAddGlassButton: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    quickAddTextLarge: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.text,
    },
    toggleButton: {
        width: 50,
        height: 28,
        borderRadius: 14,
        backgroundColor: colors.card,
        padding: 2,
    },
    toggleButtonActive: {
        backgroundColor: colors.success,
    },
    toggleKnob: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: colors.text,
        alignSelf: 'flex-start',
    },
    toggleKnobActive: {
        alignSelf: 'flex-end',
    },
    reminderStatusRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    reminderStatusTitle: {
        ...typography.body,
        fontWeight: 'bold',
        marginBottom: spacing.xs,
    },
    reminderStatusText: {
        ...typography.bodySmall,
        color: colors.textSecondary,
    },
    editReminderButton: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: borderRadius.md,
    },
    editReminderText: {
        ...typography.caption,
        fontWeight: '600',
    },
    presetGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
        marginBottom: spacing.lg,
    },
    presetButton: {
        flex: 1,
        minWidth: '45%',
        padding: spacing.md,
        backgroundColor: colors.card,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    presetButtonActive: {
        borderColor: colors.primary,
        backgroundColor: 'rgba(0, 198, 251, 0.1)',
    },
    presetButtonText: {
        color: colors.textSecondary,
    },
    presetButtonTextActive: {
        color: colors.primary,
        fontWeight: 'bold',
    },
    customIntervalRow: {
        flexDirection: 'row',
        gap: spacing.md,
        marginBottom: spacing.sm,
        alignItems: 'center',
        justifyContent: 'center',
    },
    intervalInput: {
        width: 120,
        backgroundColor: colors.card,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        fontSize: 24,
        color: colors.text,
        textAlign: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        ...Platform.select({
            web: {
                outlineStyle: 'none',
            },
        }),
    },
    sectionSubtitle: {
        ...typography.body,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: spacing.sm,
        marginTop: spacing.md,
        textAlign: 'center',
    },
    errorText: {
        color: colors.error,
        fontSize: 12,
        fontWeight: 'bold',
        textAlign: 'center',
        marginTop: spacing.xs,
        marginBottom: spacing.lg,
    },
    unitToggleContainer: {
        flexDirection: 'row',
        backgroundColor: colors.card,
        borderRadius: borderRadius.md,
        padding: 4,
    },
    unitButton: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.sm,
    },
    unitButtonActive: {
        backgroundColor: colors.primary,
    },
    unitButtonText: {
        color: colors.textSecondary,
        fontWeight: '600',
    },
    unitButtonTextActive: {
        color: colors.text,
    },
    glassContainer: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: borderRadius.lg,
        padding: spacing.sm,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    glassContainerNoPadding: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
        overflow: 'hidden',
    },
    entryItemGlass: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.03)',
    },
    entryTime: {
        ...typography.bodySmall,
        color: colors.textSecondary,
    },
    entryRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    entryAmountBlue: {
        ...typography.body,
        color: GLASS_COLORS.waterPrimary,
        fontWeight: 'bold',
        marginRight: spacing.md,
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
    modalOverlayGlass: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.75)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.lg,
    },
    glassModalContent: {
        backgroundColor: '#111827', // Darker solid background for readability
        borderRadius: borderRadius.xl,
        padding: spacing.xl,
        width: '100%',
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
    modalTitle: {
        ...typography.h2,
        textAlign: 'center',
        marginBottom: spacing.lg,
    },
    confirmTitle: {
        ...typography.h3,
        textAlign: 'center',
        marginBottom: spacing.md,
    },
    deleteIconBig: {
        marginBottom: spacing.lg,
        padding: spacing.md,
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderRadius: borderRadius.full,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'center',
        marginBottom: spacing.xl,
    },
    customInput: {
        color: colors.text,
        fontSize: 32,
        fontWeight: 'bold',
        textAlign: 'center',
        minWidth: 100,
        paddingBottom: spacing.xs,
        ...Platform.select({
            web: {
                outlineStyle: 'none',
            },
        }),
    },
    inputUnit: {
        color: colors.text,
        fontSize: 24,
        fontWeight: '600',
        marginLeft: spacing.xs,
    },
    suggestionBox: {
        backgroundColor: 'rgba(0, 198, 251, 0.1)',
        borderRadius: borderRadius.md,
        padding: spacing.md,
        marginBottom: spacing.lg,
        borderWidth: 1,
        borderColor: 'rgba(0, 198, 251, 0.3)',
        alignItems: 'center',
    },
    suggestionLabel: {
        ...typography.caption,
        color: colors.water,
        marginBottom: spacing.xs,
    },
    suggestionValue: {
        ...typography.h2,
        color: colors.water,
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
    // Styles for GlassCard and Motivational text
    glassCard: {
        borderRadius: borderRadius.xl,
        borderWidth: 1,
        overflow: 'hidden',
        marginBottom: spacing.md,
    },
    quickAddCard: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xs, // Reduced to fit 4 buttons
        justifyContent: 'center',
    },
    quickAddTextLarge: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text,
    },
    motivationalText: {
        color: colors.text,
        fontSize: 11,
        marginTop: 4,
        fontWeight: '600',
        textAlign: 'center',
        opacity: 0.9,
        maxWidth: 160,
        alignSelf: 'center',
    },
    useSuggestedButton: {
        flex: 1,
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
        backgroundColor: 'rgba(0, 198, 251, 0.15)',
        borderWidth: 1,
        borderColor: 'rgba(0, 198, 251, 0.4)',
    },
    useSuggestedButtonFull: {
        width: '100%',
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
        backgroundColor: 'rgba(0, 198, 251, 0.15)',
        borderWidth: 1,
        borderColor: 'rgba(0, 198, 251, 0.4)',
        marginBottom: spacing.md,
    },
    useSuggestedText: {
        color: colors.water,
        fontWeight: '600',
    },
    confirmButton: {
        flex: 1,
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
        backgroundColor: colors.water,
    },
    confirmButtonText: {
        color: colors.text,
        fontWeight: 'bold',
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
    bottomSpacer: {
        height: 96,
    },
    emptyReminders: {
        ...typography.bodySmall,
        textAlign: 'center',
        padding: spacing.lg,
        color: colors.textSecondary,
        fontStyle: 'italic',
    },
    reminderItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    reminderTime: {
        ...typography.body,
        color: colors.text,
    },
    removeButton: {
        color: colors.error,
        fontSize: 16,
        fontWeight: 'bold',
    },
});
