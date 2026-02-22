import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Modal,
    TextInput,
    Animated,
    Pressable,
    Platform,
    Alert,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius, typography, shadows } from '../styles/theme';
import { getProfile, getSupplements, saveSupplements } from '../services/storage';
import { SUPPLEMENT_CATALOG, calculateSuggestedDosage } from '../services/aiSuggestions';
import { mediumImpact, successFeedback, lightImpact, errorFeedback, selectionFeedback } from '../services/haptics';
import { scheduleSupplementReminder, cancelSupplementReminder } from '../services/notifications';

// Animated Glass Card Component
const GlassCard = ({ children, style, onPress, onLongPress, variant = 'default' }) => {
    const scaleAnim = React.useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 0.98,
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
            case 'active':
                return ['rgba(99, 102, 241, 0.15)', 'rgba(79, 70, 229, 0.08)', 'rgba(99, 102, 241, 0.03)'];
            default:
                return ['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.04)', 'rgba(255, 255, 255, 0.01)'];
        }
    };

    const getBorderColor = () => {
        return variant === 'active' ? 'rgba(99, 102, 241, 0.4)' : 'rgba(255, 255, 255, 0.1)';
    };

    return (
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <Pressable
                onPress={onPress}
                onLongPress={onLongPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
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
};

const EMOJI_OPTIONS = ['💊', '🧪', '🍃', '🌿', '🧬', '💉', '🫀', '🦷', '🦴', '🏋️', '🥗', '🫐', '🍋', '🧄', '🫚', '🥑', '🌾', '🫘', '🧅', '🍄', '⚗️', '🔬', '🧲', '⚡', '🌡️', '💧', '🌊', '🔥', '❄️', '✨'];

export default function SupplementsScreen() {
    const [profile, setProfile] = useState(null);
    const [supplements, setSupplements] = useState([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [confirmRemoveVisible, setConfirmRemoveVisible] = useState(false);
    const [supplementToRemove, setSupplementToRemove] = useState(null);
    const [selectedSupplement, setSelectedSupplement] = useState(null);
    const [customDosage, setCustomDosage] = useState('');
    const [reminderTime, setReminderTime] = useState('08:00');
    const [customReminderTime, setCustomReminderTime] = useState('');
    const [showCustomTimeInput, setShowCustomTimeInput] = useState(false);

    // Custom supplement state
    const [customModalVisible, setCustomModalVisible] = useState(false);
    const [customName, setCustomName] = useState('');
    const [customIcon, setCustomIcon] = useState('💊');
    const [customUnit, setCustomUnit] = useState('mg');
    const [customDosageAmount, setCustomDosageAmount] = useState('');
    const [customSupplementId, setCustomSupplementId] = useState(null);
    const [customReminderTimeNew, setCustomReminderTimeNew] = useState('08:00');

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const loadData = async () => {
        const profileData = await getProfile();
        const supplementsData = await getSupplements();
        setProfile(profileData);
        setSupplements(supplementsData);
    };

    const openAddModal = (catalogItem) => {
        lightImpact();
        const suggested = calculateSuggestedDosage(catalogItem, profile);
        setSelectedSupplement({
            ...catalogItem,
            suggestedDosage: suggested,
        });
        setCustomDosage(suggested.toString());

        // Check if already has this supplement and use its reminder time
        const existing = supplements.find(s => s.id === catalogItem.id);
        setReminderTime(existing?.reminderTime || '08:00');
        setShowCustomTimeInput(false);
        setCustomReminderTime('');
        setModalVisible(true);
    };

    const openCustomModal = (existing = null) => {
        lightImpact();
        if (existing) {
            // Edit mode
            setCustomSupplementId(existing.id);
            setCustomName(existing.name);
            setCustomIcon(existing.icon);
            setCustomDosageAmount(existing.dosage.toString());
            setCustomUnit(existing.unit);
            setCustomReminderTimeNew(existing.reminderTime || '08:00');
        } else {
            // Create mode
            setCustomSupplementId(null);
            setCustomName('');
            setCustomIcon('💊');
            setCustomDosageAmount('');
            setCustomUnit('mg');
            setCustomReminderTimeNew('08:00');
        }
        setCustomModalVisible(true);
    };

    const handleAddCustomSupplement = async () => {
        if (!customName.trim()) {
            lightImpact();
            Alert.alert('Campo obrigatório', 'Digite o nome do suplemento.');
            return;
        }
        const dosageNum = parseFloat(customDosageAmount);
        if (isNaN(dosageNum) || dosageNum <= 0) {
            lightImpact();
            Alert.alert('Dosagem inválida', 'Digite uma dosagem válida.');
            return;
        }

        const id = customSupplementId || `custom-${Date.now()}`;
        const newSupplement = {
            id,
            name: customName.trim(),
            icon: customIcon,
            dosage: dosageNum,
            unit: customUnit.trim() || 'mg',
            reminderTime: customReminderTimeNew,
            addedAt: new Date().toISOString(),
            isCustom: true,
        };

        const exists = supplements.find(s => s.id === id);
        let updated;
        if (exists) {
            updated = supplements.map(s => s.id === id ? newSupplement : s);
            await cancelSupplementReminder(id);
        } else {
            updated = [...supplements, newSupplement];
        }
        await scheduleSupplementReminder(id, newSupplement.name, customReminderTimeNew);
        await saveSupplements(updated);
        setSupplements(updated);
        setCustomModalVisible(false);
        successFeedback();
    };

    const formatTimeInput = (text) => {
        const digits = text.replace(/\D/g, '');
        let formatted = '';
        if (digits.length > 0) {
            formatted = digits.slice(0, 2);
            if (digits.length > 2) {
                formatted += ':' + digits.slice(2, 4);
            }
        }
        return formatted;
    };

    const handleCustomTimeChange = (text) => {
        setCustomReminderTime(formatTimeInput(text));
    };

    const applyCustomTime = () => {
        if (customReminderTime.length === 5) {
            const [hours, minutes] = customReminderTime.split(':').map(Number);
            if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
                selectionFeedback();
                setReminderTime(customReminderTime);
                setShowCustomTimeInput(false);
                return;
            }
        }
        lightImpact();
    };

    const handleAddSupplement = async () => {
        try {
            if (!selectedSupplement) return;

            const dosage = parseFloat(customDosage);
            if (isNaN(dosage) || dosage <= 0) {
                lightImpact();
                return;
            }

            successFeedback();

            const newSupplement = {
                id: selectedSupplement.id,
                name: selectedSupplement.name,
                icon: selectedSupplement.icon,
                dosage,
                unit: selectedSupplement.unit,
                reminderTime,
                addedAt: new Date().toISOString(),
            };

            // Check if already exists
            const exists = supplements.find(s => s.id === newSupplement.id);
            let updatedSupplements;

            if (exists) {
                updatedSupplements = supplements.map(s =>
                    s.id === newSupplement.id ? newSupplement : s
                );
                // Reschedule existing
                await cancelSupplementReminder(newSupplement.id);
                await scheduleSupplementReminder(newSupplement.id, newSupplement.name, reminderTime);
            } else {
                updatedSupplements = [...supplements, newSupplement];
                // Schedule new
                await scheduleSupplementReminder(newSupplement.id, newSupplement.name, reminderTime);
            }

            await saveSupplements(updatedSupplements);
            setSupplements(updatedSupplements);
            setModalVisible(false);
            setSelectedSupplement(null);
        } catch (error) {
            console.error('Error adding supplement:', error);
            Alert.alert('Erro', 'Não foi possível salvar o suplemento. Tente novamente.');
        }
    };

    const openRemoveConfirmation = (supplement) => {
        lightImpact();
        setSupplementToRemove(supplement);
        setConfirmRemoveVisible(true);
    };

    const confirmRemoveSupplement = async () => {
        errorFeedback();
        if (supplementToRemove) {
            const updated = supplements.filter(s => s.id !== supplementToRemove.id);
            await saveSupplements(updated);
            setSupplements(updated);

            // Cancel reminder
            await cancelSupplementReminder(supplementToRemove.id);
        }
        setConfirmRemoveVisible(false);
        setSupplementToRemove(null);
    };

    const cancelRemoveSupplement = () => {
        lightImpact();
        setConfirmRemoveVisible(false);
        setSupplementToRemove(null);
    };

    const activeIds = supplements.map(s => s.id);

    const PRESET_TIMES = ['06:00', '08:00', '12:00', '18:00', '22:00'];

    return (
        <View style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* My Supplements */}
                {supplements.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Meus Suplementos</Text>
                        {supplements.map((supplement) => (
                            <GlassCard
                                key={supplement.id}
                                variant="active"
                                onPress={() => {
                                    if (supplement.isCustom) {
                                        openCustomModal(supplement);
                                        return;
                                    }
                                    const catalogItem = SUPPLEMENT_CATALOG.find(c => c.id === supplement.id);
                                    if (catalogItem) openAddModal(catalogItem);
                                }}
                                onLongPress={() => openRemoveConfirmation(supplement)}
                            >
                                <View style={styles.supplementRow}>
                                    <Text style={styles.supplementIcon}>{supplement.icon}</Text>
                                    <View style={styles.supplementInfo}>
                                        <Text style={styles.supplementName}>{supplement.name}</Text>
                                        <Text style={styles.supplementDetails}>
                                            {supplement.dosage} {supplement.unit} • ⏰ {supplement.reminderTime}
                                        </Text>
                                    </View>
                                    <View style={styles.actionsContainer}>
                                        <View style={styles.editIndicator}>
                                            <Text style={styles.editIndicatorText}>✏️</Text>
                                        </View>
                                        <TouchableOpacity
                                            style={styles.removeButtonBadgeList}
                                            onPress={() => openRemoveConfirmation(supplement)}
                                        >
                                            <Text style={styles.removeIconTextList}>✕</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </GlassCard>
                        ))}
                        <Text style={styles.hint}>
                            Toque para editar • Segure para remover
                        </Text>
                    </View>
                )}

                {/* Catalog */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Catálogo de Suplementos</Text>
                    <Text style={styles.sectionSubtitle}>
                        Toque para adicionar à sua rotina
                    </Text>

                    {SUPPLEMENT_CATALOG.map((item) => {
                        const isActive = activeIds.includes(item.id);
                        return (
                            <GlassCard
                                key={item.id}
                                variant={isActive ? 'active' : 'default'}
                                onPress={() => openAddModal(item)}
                            >
                                <View style={styles.catalogRow}>
                                    <Text style={styles.catalogIcon}>{item.icon}</Text>
                                    <View style={styles.catalogInfo}>
                                        <Text style={styles.catalogName}>{item.name}</Text>
                                        <Text style={styles.catalogCategory}>{item.category}</Text>
                                        <Text style={styles.catalogDescription} numberOfLines={2}>
                                            {item.description}
                                        </Text>
                                    </View>
                                    {isActive && (
                                        <View style={styles.activeBadge}>
                                            <Text style={styles.activeBadgeText}>✓</Text>
                                        </View>
                                    )}
                                </View>
                            </GlassCard>
                        );
                    })}

                    {/* Create Custom Button */}
                    <TouchableOpacity
                        style={styles.createCustomButton}
                        onPress={() => openCustomModal()}
                    >
                        <LinearGradient
                            colors={['rgba(99,102,241,0.2)', 'rgba(79,70,229,0.1)']}
                            style={StyleSheet.absoluteFill}
                        />
                        <Text style={styles.createCustomText}>＋ Criar Suplemento Personalizado</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.bottomSpacer} />
            </ScrollView>

            {/* Add/Edit Modal */}
            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        {selectedSupplement && (
                            <>
                                <View style={styles.modalHeader}>
                                    <Text style={styles.modalIcon}>{selectedSupplement.icon}</Text>
                                    <Text style={styles.modalTitle}>{selectedSupplement.name}</Text>
                                </View>

                                <Text style={styles.modalDescription}>
                                    {selectedSupplement.description}
                                </Text>

                                <View style={styles.aiSuggestion}>
                                    <LinearGradient
                                        colors={['rgba(99, 102, 241, 0.15)', 'rgba(99, 102, 241, 0.05)']}
                                        style={StyleSheet.absoluteFill}
                                    />
                                    <Text style={styles.aiLabel}>🤖 Sugestão IA</Text>
                                    <Text style={styles.aiValue}>
                                        {selectedSupplement.suggestedDosage} {selectedSupplement.unit}
                                    </Text>
                                    {profile && (
                                        <Text style={styles.aiHint}>
                                            Baseado no seu peso de {profile.weight}kg
                                            {profile.gender === 'female' ? ' (feminino)' : ''}
                                        </Text>
                                    )}
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>Dosagem ({selectedSupplement.unit})</Text>
                                    <View style={styles.dosageRow}>
                                        <TextInput
                                            style={styles.dosageInput}
                                            value={customDosage}
                                            onChangeText={setCustomDosage}
                                            keyboardType="decimal-pad"
                                            placeholder="0"
                                            placeholderTextColor={colors.textMuted}
                                        />
                                        <TouchableOpacity
                                            style={styles.useSuggestedButton}
                                            onPress={() => {
                                                lightImpact();
                                                setCustomDosage(selectedSupplement.suggestedDosage.toString());
                                            }}
                                        >
                                            <Text style={styles.useSuggestedText}>Usar sugestão</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>Horário do lembrete</Text>
                                    <View style={styles.timeButtons}>
                                        {PRESET_TIMES.map((time) => (
                                            <TouchableOpacity
                                                key={time}
                                                style={[styles.timeButton, reminderTime === time && styles.timeButtonActive]}
                                                onPress={() => {
                                                    selectionFeedback();
                                                    setReminderTime(time);
                                                    setShowCustomTimeInput(false);
                                                }}
                                            >
                                                <Text style={[styles.timeButtonText, reminderTime === time && styles.timeButtonTextActive]}>
                                                    {time}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                        <TouchableOpacity
                                            style={[styles.timeButton, styles.customTimeButton, (showCustomTimeInput || (reminderTime && !PRESET_TIMES.includes(reminderTime))) && styles.timeButtonActive]}
                                            onPress={() => {
                                                lightImpact();
                                                setCustomReminderTime(reminderTime);
                                                setShowCustomTimeInput(true);
                                            }}
                                        >
                                            <Text style={[styles.timeButtonText, (showCustomTimeInput || (reminderTime && !PRESET_TIMES.includes(reminderTime))) && styles.timeButtonTextActive]}>
                                                {(reminderTime && !PRESET_TIMES.includes(reminderTime)) ? `${reminderTime} ✏️` : '✏️'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>

                                    {showCustomTimeInput && (
                                        <View style={styles.customTimePickerContainer}>
                                            <DateTimePicker
                                                value={new Date(2000, 0, 1, parseInt(customReminderTime.split(':')[0] || '8'), parseInt(customReminderTime.split(':')[1] || '0'))}
                                                mode="time"
                                                is24Hour={true}
                                                display="spinner"
                                                onChange={(event, selectedDate) => {
                                                    if (selectedDate) {
                                                        const hours = selectedDate.getHours().toString().padStart(2, '0');
                                                        const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
                                                        const timeString = `${hours}:${minutes}`;
                                                        selectionFeedback();
                                                        setReminderTime(timeString);
                                                        setCustomReminderTime(timeString);
                                                        setShowCustomTimeInput(false);
                                                    }
                                                }}
                                                textColor={colors.text}
                                                accentColor="#ffffff"
                                                themeVariant="dark"
                                                style={{ backgroundColor: 'transparent', height: 120 }}
                                            />
                                        </View>
                                    )}
                                </View>

                                <View style={styles.timingHint}>
                                    <LinearGradient
                                        colors={['rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.02)']}
                                        style={StyleSheet.absoluteFill}
                                    />
                                    <Text style={styles.timingHintText}>
                                        💡 {selectedSupplement.timing}
                                    </Text>
                                </View>

                                <View style={styles.modalButtons}>
                                    <TouchableOpacity
                                        style={styles.cancelButton}
                                        onPress={() => {
                                            lightImpact();
                                            setModalVisible(false);
                                        }}
                                    >
                                        <Text style={styles.cancelButtonText}>Cancelar</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.confirmButton}
                                        onPress={handleAddSupplement}
                                    >
                                        <LinearGradient
                                            colors={['rgba(99, 102, 241, 1)', 'rgba(79, 70, 229, 1)']}
                                            style={[StyleSheet.absoluteFill, { borderRadius: borderRadius.md }]}
                                        />
                                        <Text style={styles.confirmButtonText}>
                                            {activeIds.includes(selectedSupplement.id) ? 'Atualizar' : 'Adicionar'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}
                    </View>
                </View>
            </Modal>

            {/* Custom Supplement Modal */}
            <Modal
                visible={customModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setCustomModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                        <Text style={styles.customModalTitle}>
                            {customSupplementId ? '✏️ Editar Suplemento' : '✨ Criar Suplemento'}
                        </Text>

                        {/* Name */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Nome</Text>
                            <TextInput
                                style={styles.customTextInput}
                                value={customName}
                                onChangeText={setCustomName}
                                placeholder="Ex: Glutamina, Magnésio..."
                                placeholderTextColor={colors.textMuted}
                                maxLength={40}
                            />
                        </View>

                        {/* Emoji Picker */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Ícone</Text>
                            <View style={styles.emojiGrid}>
                                {EMOJI_OPTIONS.map((emoji) => (
                                    <TouchableOpacity
                                        key={emoji}
                                        style={[styles.emojiOption, customIcon === emoji && styles.emojiOptionActive]}
                                        onPress={() => { selectionFeedback(); setCustomIcon(emoji); }}
                                    >
                                        <Text style={styles.emojiText}>{emoji}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Dosage + Unit */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Dosagem</Text>
                            <View style={styles.dosageRow}>
                                <TextInput
                                    style={[styles.dosageInput, { flex: 1.5 }]}
                                    value={customDosageAmount}
                                    onChangeText={setCustomDosageAmount}
                                    keyboardType="decimal-pad"
                                    placeholder="0"
                                    placeholderTextColor={colors.textMuted}
                                />
                                <TextInput
                                    style={[styles.dosageInput, { flex: 1, marginLeft: 8 }]}
                                    value={customUnit}
                                    onChangeText={setCustomUnit}
                                    placeholder="mg, g, ml..."
                                    placeholderTextColor={colors.textMuted}
                                    maxLength={10}
                                />
                            </View>
                        </View>

                        {/* Time */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Horário do lembrete</Text>
                            <View style={styles.timeButtons}>
                                {PRESET_TIMES.map((time) => (
                                    <TouchableOpacity
                                        key={time}
                                        style={[styles.timeButton, customReminderTimeNew === time && styles.timeButtonActive]}
                                        onPress={() => { selectionFeedback(); setCustomReminderTimeNew(time); }}
                                    >
                                        <Text style={[styles.timeButtonText, customReminderTimeNew === time && styles.timeButtonTextActive]}>
                                            {time}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={() => { lightImpact(); setCustomModalVisible(false); }}
                            >
                                <Text style={styles.cancelButtonText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.confirmButton}
                                onPress={handleAddCustomSupplement}
                            >
                                <LinearGradient
                                    colors={['rgba(99,102,241,1)', 'rgba(79,70,229,1)']}
                                    style={[StyleSheet.absoluteFill, { borderRadius: borderRadius.md }]}
                                />
                                <Text style={styles.confirmButtonText}>
                                    {customSupplementId ? 'Atualizar' : 'Adicionar'}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <View style={{ height: 20 }} />
                    </ScrollView>
                </View>
            </Modal>

            {/* Confirm Remove Modal */}
            <Modal
                visible={confirmRemoveVisible}
                animationType="fade"
                transparent={true}
                onRequestClose={cancelRemoveSupplement}
            >
                <View style={styles.confirmOverlay}>
                    <View style={styles.confirmModalContent}>
                        <Text style={styles.confirmTitle}>🗑️ Remover Suplemento</Text>
                        <Text style={styles.confirmMessage}>
                            Tem certeza que deseja remover {supplementToRemove?.name}?
                        </Text>
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={cancelRemoveSupplement}
                            >
                                <Text style={styles.cancelButtonText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.deleteButton}
                                onPress={confirmRemoveSupplement}
                            >
                                <Text style={styles.deleteButtonText}>Remover</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    section: {
        padding: spacing.lg,
    },
    sectionTitle: {
        ...typography.h3,
        marginBottom: spacing.xs,
    },
    sectionSubtitle: {
        ...typography.bodySmall,
        marginBottom: spacing.md,
    },
    glassCard: {
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        overflow: 'hidden',
        marginBottom: spacing.sm,
        padding: spacing.md,
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
    supplementDetails: {
        ...typography.bodySmall,
    },
    editIndicator: {
        padding: spacing.sm,
    },
    editIndicatorText: {
        fontSize: 18,
    },
    actionsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    removeButtonBadgeList: {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.3)',
    },
    removeIconTextList: {
        color: '#EF4444',
        fontSize: 14,
        fontWeight: 'bold',
    },
    hint: {
        ...typography.caption,
        textAlign: 'center',
        marginTop: spacing.sm,
    },
    catalogRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    catalogIcon: {
        fontSize: 36,
        marginRight: spacing.md,
    },
    catalogInfo: {
        flex: 1,
    },
    catalogName: {
        ...typography.body,
        fontWeight: '600',
    },
    catalogCategory: {
        ...typography.caption,
        color: colors.primary,
        marginBottom: spacing.xs,
    },
    catalogDescription: {
        ...typography.caption,
    },
    activeBadge: {
        backgroundColor: colors.success,
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    activeBadgeText: {
        color: colors.text,
        fontWeight: 'bold',
        fontSize: 14,
    },
    bottomSpacer: {
        height: 96,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#111827',
        borderTopLeftRadius: borderRadius.xl,
        borderTopRightRadius: borderRadius.xl,
        padding: spacing.lg,
        maxHeight: '90%',
        borderTopWidth: 1,
        borderRightWidth: 1,
        borderLeftWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    modalIcon: {
        fontSize: 36,
        marginRight: spacing.md,
    },
    modalTitle: {
        ...typography.h2,
    },
    modalDescription: {
        ...typography.body,
        color: colors.textSecondary,
        marginBottom: spacing.lg,
    },
    aiSuggestion: {
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        marginBottom: spacing.lg,
        borderWidth: 1,
        borderColor: 'rgba(99, 102, 241, 0.3)',
        overflow: 'hidden',
    },
    aiLabel: {
        ...typography.caption,
        color: colors.primary,
        marginBottom: spacing.xs,
    },
    aiValue: {
        ...typography.h2,
        color: colors.primary,
    },
    aiHint: {
        ...typography.caption,
        marginTop: spacing.xs,
    },
    inputGroup: {
        marginBottom: spacing.lg,
    },
    inputLabel: {
        ...typography.body,
        fontWeight: '600',
        marginBottom: spacing.sm,
    },
    dosageRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dosageInput: {
        flex: 1,
        backgroundColor: colors.card,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        color: colors.text,
        fontSize: 18,
        marginRight: spacing.sm,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        ...Platform.select({
            web: {
                outlineStyle: 'none',
            },
        }),
    },
    customTimeInput: {
        flex: 1,
        backgroundColor: colors.card,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        color: colors.text,
        fontSize: 18,
        marginRight: spacing.sm,
        borderWidth: 1,
        borderColor: colors.primary,
        ...Platform.select({
            web: {
                outlineStyle: 'none',
            },
        }),
    },
    useSuggestedButton: {
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.md,
    },
    useSuggestedText: {
        color: colors.text,
        fontSize: 12,
        fontWeight: '600',
    },
    timeButtons: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    timeButton: {
        backgroundColor: colors.card,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.md,
        marginRight: spacing.sm,
        marginBottom: spacing.sm,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    customTimeButton: {
        paddingHorizontal: spacing.sm,
    },
    timeButtonActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    timeButtonText: {
        color: colors.textSecondary,
        fontSize: 14,
    },
    timeButtonTextActive: {
        color: colors.text,
        fontWeight: '600',
    },
    customTimeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: spacing.sm,
    },

    applyTimeButton: {
        backgroundColor: colors.success,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.md,
    },
    applyTimeText: {
        color: colors.text,
        fontWeight: '600',
    },
    timingHint: {
        borderRadius: borderRadius.md,
        marginBottom: spacing.lg,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    timingHintText: {
        ...typography.bodySmall,
        padding: spacing.md,
    },
    modalButtons: {
        flexDirection: 'row',
        marginTop: spacing.md,
    },
    cancelButton: {
        flex: 1,
        backgroundColor: colors.card,
        padding: spacing.md,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        marginRight: spacing.sm,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    cancelButtonText: {
        color: colors.textSecondary,
        fontWeight: '600',
    },
    confirmButton: {
        flex: 1,
        padding: spacing.md,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        marginLeft: spacing.sm,
        overflow: 'hidden',
    },
    confirmButtonText: {
        color: colors.text,
        fontWeight: 'bold',
    },
    confirmOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.lg,
    },
    confirmModalContent: {
        backgroundColor: '#111827',
        borderRadius: borderRadius.xl,
        padding: spacing.xl,
        width: '100%',
        maxWidth: 350,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10,
    },
    confirmTitle: {
        ...typography.h2,
        textAlign: 'center',
        marginBottom: spacing.sm,
    },
    confirmMessage: {
        ...typography.body,
        textAlign: 'center',
        marginBottom: spacing.lg,
        color: colors.textSecondary,
    },
    deleteButton: {
        flex: 1,
        backgroundColor: colors.error,
        padding: spacing.md,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        marginLeft: spacing.sm,
    },
    deleteButtonText: {
        color: colors.text,
        fontWeight: 'bold',
    },
    customTimePickerContainer: {
        marginTop: spacing.md,
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        borderRadius: borderRadius.md,
        padding: spacing.sm,
        borderWidth: 1,
        borderColor: 'rgba(99, 102, 241, 0.3)',
        alignItems: 'center',
    },
    createCustomButton: {
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: 'rgba(99,102,241,0.4)',
        borderStyle: 'dashed',
        overflow: 'hidden',
        marginTop: spacing.sm,
        padding: spacing.md,
        alignItems: 'center',
    },
    createCustomText: {
        color: colors.primary,
        fontWeight: '600',
        fontSize: 15,
    },
    customModalTitle: {
        ...typography.h2,
        marginBottom: spacing.lg,
    },
    customTextInput: {
        backgroundColor: colors.card,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        color: colors.text,
        fontSize: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        ...Platform.select({ web: { outlineStyle: 'none' } }),
    },
    emojiGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    emojiOption: {
        width: 44,
        height: 44,
        borderRadius: borderRadius.md,
        backgroundColor: colors.card,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    emojiOptionActive: {
        borderColor: colors.primary,
        backgroundColor: 'rgba(99,102,241,0.2)',
    },
    emojiText: {
        fontSize: 22,
    },
});
