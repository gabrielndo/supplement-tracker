import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    Share,
    Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { colors, spacing, borderRadius, typography } from '../styles/theme';
import { getWaterHistory, getConsumptionHistory, getSupplements, getProfile, getStreak } from '../services/storage';
import { calculateWaterGoal } from '../services/aiSuggestions';
import { lightImpact, successFeedback, errorFeedback } from '../services/haptics';

// Glass Card Component
const GlassCard = ({ children, style, onPress }) => {
    if (onPress) {
        return (
            <TouchableOpacity style={[styles.glassCard, style]} onPress={onPress} activeOpacity={0.8}>
                <LinearGradient
                    colors={['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.04)', 'rgba(255, 255, 255, 0.01)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={StyleSheet.absoluteFill}
                />
                {children}
            </TouchableOpacity>
        );
    }

    return (
        <View style={[styles.glassCard, style]}>
            <LinearGradient
                colors={['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.04)', 'rgba(255, 255, 255, 0.01)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFill}
            />
            {children}
        </View>
    );
};

const EXPORT_OPTIONS = [
    {
        id: 'water',
        title: 'Histórico de Água',
        icon: '💧',
        description: 'Exportar dados de hidratação',
        days: 30,
    },
    {
        id: 'supplements',
        title: 'Consumo de Suplementos',
        icon: '💊',
        description: 'Exportar registro de suplementos',
        days: 30,
    },
    {
        id: 'full',
        title: 'Relatório Completo',
        icon: '📊',
        description: 'Todos os dados em um único arquivo',
        days: 30,
    },
];

const PERIOD_OPTIONS = [
    { id: 7, label: '7 dias' },
    { id: 14, label: '14 dias' },
    { id: 30, label: '30 dias' },
    { id: 90, label: '90 dias' },
];

export default function ExportScreen({ navigation }) {
    const [profile, setProfile] = useState(null);
    const [supplements, setSupplements] = useState([]);
    const [selectedPeriod, setSelectedPeriod] = useState(30);
    const [exporting, setExporting] = useState(false);

    const loadData = async () => {
        const profileData = await getProfile();
        const suppsData = await getSupplements();
        setProfile(profileData);
        setSupplements(suppsData);
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const generateWaterCSV = async (days) => {
        const history = await getWaterHistory(days);
        const goal = profile?.customWaterGoal || calculateWaterGoal(profile?.weight, profile?.gender) || 2000;

        let csv = 'Data,Consumo (ml),Meta (ml),Percentual (%)\n';
        history.forEach(day => {
            const percentage = Math.round((day.amount / goal) * 100);
            csv += `${day.date},${day.amount},${goal},${percentage}\n`;
        });

        return csv;
    };

    const generateSupplementsCSV = async (days) => {
        const history = await getConsumptionHistory(days);

        let csv = 'Data,Suplementos Tomados,Total de Suplementos,Adesão (%)\n';
        history.forEach(day => {
            csv += `${day.date},${day.taken},${day.total},${day.percentage}\n`;
        });

        return csv;
    };

    const generateFullReport = async (days) => {
        const waterHistory = await getWaterHistory(days);
        const suppHistory = await getConsumptionHistory(days);
        const streak = await getStreak();
        const goal = profile?.customWaterGoal || calculateWaterGoal(profile?.weight, profile?.gender) || 2000;

        // Header
        let report = '=== RELATÓRIO SUPPLEMENT TRACKER ===\n\n';
        report += `Data de Geração: ${new Date().toLocaleDateString('pt-BR')}\n`;
        report += `Período: ${days} dias\n`;
        report += `Streak Atual: ${streak} dias\n\n`;

        // Profile
        if (profile) {
            report += '--- PERFIL ---\n';
            report += `Nome: ${profile.name || 'Não informado'}\n`;
            report += `Peso: ${profile.weight || 'Não informado'}kg\n`;
            report += `Meta de Água: ${goal}ml\n\n`;
        }

        // Supplements
        report += '--- SUPLEMENTOS CADASTRADOS ---\n';
        if (supplements.length > 0) {
            supplements.forEach((supp, index) => {
                report += `${index + 1}. ${supp.name} - ${supp.dosage}\n`;
            });
        } else {
            report += 'Nenhum suplemento cadastrado\n';
        }
        report += '\n';

        // Water Stats
        const totalWater = waterHistory.reduce((sum, d) => sum + d.amount, 0);
        const avgWater = Math.round(totalWater / waterHistory.length);
        const daysOnWaterGoal = waterHistory.filter(d => d.amount >= goal).length;

        report += '--- ESTATÍSTICAS DE ÁGUA ---\n';
        report += `Consumo Total: ${(totalWater / 1000).toFixed(1)}L\n`;
        report += `Média Diária: ${avgWater}ml\n`;
        report += `Dias na Meta: ${daysOnWaterGoal}/${days}\n\n`;

        // Supplement Stats
        const avgAdherence = suppHistory.length > 0
            ? Math.round(suppHistory.reduce((sum, d) => sum + d.percentage, 0) / suppHistory.length)
            : 0;
        const perfectDays = suppHistory.filter(d => d.percentage === 100).length;

        report += '--- ESTATÍSTICAS DE SUPLEMENTOS ---\n';
        report += `Adesão Média: ${avgAdherence}%\n`;
        report += `Dias Perfeitos: ${perfectDays}/${days}\n\n`;

        // Daily breakdown
        report += '--- HISTÓRICO DIÁRIO ---\n';
        report += 'Data,Água (ml),% Meta,Suplementos,% Adesão\n';

        for (let i = 0; i < waterHistory.length; i++) {
            const water = waterHistory[i];
            const supp = suppHistory[i] || { taken: 0, total: 0, percentage: 0 };
            const waterPct = Math.round((water.amount / goal) * 100);
            report += `${water.date},${water.amount},${waterPct}%,${supp.taken}/${supp.total},${supp.percentage}%\n`;
        }

        return report;
    };

    const exportData = async (type) => {
        setExporting(true);
        lightImpact();

        try {
            let content = '';
            let filename = '';

            switch (type) {
                case 'water':
                    content = await generateWaterCSV(selectedPeriod);
                    filename = `agua_${selectedPeriod}dias_${new Date().toISOString().split('T')[0]}.csv`;
                    break;
                case 'supplements':
                    content = await generateSupplementsCSV(selectedPeriod);
                    filename = `suplementos_${selectedPeriod}dias_${new Date().toISOString().split('T')[0]}.csv`;
                    break;
                case 'full':
                    content = await generateFullReport(selectedPeriod);
                    filename = `relatorio_completo_${selectedPeriod}dias_${new Date().toISOString().split('T')[0]}.txt`;
                    break;
            }

            // Save to file
            const fileUri = FileSystem.documentDirectory + filename;
            await FileSystem.writeAsStringAsync(fileUri, content, {
                encoding: FileSystem.EncodingType.UTF8,
            });

            // Check if sharing is available
            const canShare = await Sharing.isAvailableAsync();

            if (canShare) {
                await Sharing.shareAsync(fileUri, {
                    mimeType: type === 'full' ? 'text/plain' : 'text/csv',
                    dialogTitle: 'Exportar dados',
                });
                successFeedback();
            } else {
                // Fallback to system share
                await Share.share({
                    message: content,
                    title: filename,
                });
                successFeedback();
            }

        } catch (error) {
            console.error('Export error:', error);
            errorFeedback();
            Alert.alert('Erro', 'Não foi possível exportar os dados. Tente novamente.');
        } finally {
            setExporting(false);
        }
    };

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => {
                        lightImpact();
                        navigation.goBack();
                    }}
                >
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.title}>Exportar Dados 📤</Text>
            </View>

            {/* Info Card */}
            <View style={styles.section}>
                <GlassCard>
                    <View style={styles.infoContent}>
                        <Text style={styles.infoEmoji}>ℹ️</Text>
                        <Text style={styles.infoText}>
                            Exporte seus dados em formato CSV para visualizar em planilhas ou
                            fazer backup das suas informações.
                        </Text>
                    </View>
                </GlassCard>
            </View>

            {/* Period Selector */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Período</Text>
                <View style={styles.periodSelector}>
                    {PERIOD_OPTIONS.map(period => (
                        <TouchableOpacity
                            key={period.id}
                            style={[
                                styles.periodButton,
                                selectedPeriod === period.id && styles.periodButtonActive
                            ]}
                            onPress={() => {
                                lightImpact();
                                setSelectedPeriod(period.id);
                            }}
                        >
                            <Text style={[
                                styles.periodButtonText,
                                selectedPeriod === period.id && styles.periodButtonTextActive
                            ]}>
                                {period.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Export Options */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Opções de Exportação</Text>
                {EXPORT_OPTIONS.map(option => (
                    <GlassCard
                        key={option.id}
                        style={styles.exportCard}
                        onPress={() => exportData(option.id)}
                    >
                        <View style={styles.exportRow}>
                            <Text style={styles.exportIcon}>{option.icon}</Text>
                            <View style={styles.exportInfo}>
                                <Text style={styles.exportTitle}>{option.title}</Text>
                                <Text style={styles.exportDescription}>{option.description}</Text>
                            </View>
                            <View style={styles.exportButton}>
                                <LinearGradient
                                    colors={['rgba(99, 102, 241, 0.3)', 'rgba(99, 102, 241, 0.1)']}
                                    style={StyleSheet.absoluteFill}
                                />
                                <Ionicons
                                    name={exporting ? "hourglass" : "download-outline"}
                                    size={20}
                                    color={colors.primary}
                                />
                            </View>
                        </View>
                    </GlassCard>
                ))}
            </View>

            {/* Data Preview */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>O que será exportado</Text>
                <GlassCard>
                    <View style={styles.previewItem}>
                        <Text style={styles.previewDot}>•</Text>
                        <Text style={styles.previewText}>Histórico de consumo de água por dia</Text>
                    </View>
                    <View style={styles.previewItem}>
                        <Text style={styles.previewDot}>•</Text>
                        <Text style={styles.previewText}>Registro de suplementos tomados</Text>
                    </View>
                    <View style={styles.previewItem}>
                        <Text style={styles.previewDot}>•</Text>
                        <Text style={styles.previewText}>Estatísticas de adesão e progresso</Text>
                    </View>
                    <View style={styles.previewItem}>
                        <Text style={styles.previewDot}>•</Text>
                        <Text style={styles.previewText}>Informações do seu perfil</Text>
                    </View>
                </GlassCard>
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
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.lg,
        paddingTop: spacing.xl,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
    },
    title: {
        ...typography.h2,
        flex: 1,
    },
    section: {
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.lg,
    },
    sectionTitle: {
        ...typography.h3,
        marginBottom: spacing.md,
    },
    glassCard: {
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        overflow: 'hidden',
        padding: spacing.md,
    },
    infoContent: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    infoEmoji: {
        fontSize: 20,
        marginRight: spacing.md,
    },
    infoText: {
        flex: 1,
        ...typography.bodySmall,
        color: colors.textSecondary,
        lineHeight: 20,
    },
    periodSelector: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    periodButton: {
        flex: 1,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.full,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
    },
    periodButtonActive: {
        backgroundColor: 'rgba(99, 102, 241, 0.2)',
        borderColor: 'rgba(99, 102, 241, 0.4)',
    },
    periodButtonText: {
        fontSize: 12,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    periodButtonTextActive: {
        color: colors.primary,
    },
    exportCard: {
        marginBottom: spacing.sm,
    },
    exportRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    exportIcon: {
        fontSize: 28,
        marginRight: spacing.md,
    },
    exportInfo: {
        flex: 1,
    },
    exportTitle: {
        ...typography.body,
        fontWeight: '600',
        marginBottom: 2,
    },
    exportDescription: {
        ...typography.caption,
        color: colors.textSecondary,
    },
    exportButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    previewItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: spacing.xs,
    },
    previewDot: {
        color: colors.primary,
        fontSize: 16,
        marginRight: spacing.sm,
    },
    previewText: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        flex: 1,
    },
    bottomSpacer: {
        height: 100,
    },
});
