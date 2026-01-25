import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius, typography } from '../styles/theme';

const { width: screenWidth } = Dimensions.get('window');

/**
 * HourlyWaterChart - Displays water consumption per hour as a bar chart
 * @param {Array} entries - Array of water entries with { amount, time }
 * @param {number} goal - Daily water goal in ml
 */
const HourlyWaterChart = ({ entries = [], goal = 2000 }) => {
    // Group entries by hour
    const hourlyData = Array(24).fill(0);
    let totalAmount = 0;

    entries.forEach(entry => {
        const hour = new Date(entry.time).getHours();
        hourlyData[hour] += entry.amount;
        totalAmount += entry.amount;
    });

    // Find max value for scaling
    const maxHourly = Math.max(...hourlyData, 100); // Min 100 for empty state

    // Get current hour for highlighting
    const currentHour = new Date().getHours();

    // Calculate best consumption hour
    const bestHour = hourlyData.indexOf(Math.max(...hourlyData));
    const hasBestHour = hourlyData[bestHour] > 0;

    // Simplified hours to display (every 3 hours for cleaner look)
    const displayHours = [0, 3, 6, 9, 12, 15, 18, 21];

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>📊 Consumo por Hora</Text>
                {hasBestHour && (
                    <Text style={styles.insight}>
                        Pico às {bestHour}h ({hourlyData[bestHour]}ml)
                    </Text>
                )}
            </View>

            {/* Chart */}
            <View style={styles.chartContainer}>
                <View style={styles.barsContainer}>
                    {hourlyData.map((amount, hour) => {
                        const height = amount > 0 ? Math.max((amount / maxHourly) * 100, 8) : 0;
                        const isCurrentHour = hour === currentHour;
                        const isBestHour = hour === bestHour && amount > 0;

                        return (
                            <View key={hour} style={styles.barWrapper}>
                                <View style={styles.barColumn}>
                                    {/* Amount label for bars with value */}
                                    {amount > 0 && (
                                        <Text style={styles.barValue}>{amount}</Text>
                                    )}

                                    {/* Bar */}
                                    <View style={[styles.barBackground, { height: 100 }]}>
                                        {amount > 0 ? (
                                            <LinearGradient
                                                colors={isBestHour
                                                    ? ['#22c55e', '#16a34a']
                                                    : isCurrentHour
                                                        ? ['#f59e0b', '#d97706']
                                                        : ['#38bdf8', '#0ea5e9']}
                                                style={[
                                                    styles.bar,
                                                    { height: `${height}%` },
                                                    isCurrentHour && styles.currentBar
                                                ]}
                                            />
                                        ) : (
                                            <View style={styles.emptyBar} />
                                        )}
                                    </View>
                                </View>

                                {/* Hour label - only for display hours */}
                                {displayHours.includes(hour) && (
                                    <Text style={[
                                        styles.hourLabel,
                                        isCurrentHour && styles.currentHourLabel
                                    ]}>
                                        {hour}h
                                    </Text>
                                )}
                            </View>
                        );
                    })}
                </View>
            </View>

            {/* Legend */}
            <View style={styles.legend}>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#f59e0b' }]} />
                    <Text style={styles.legendText}>Agora</Text>
                </View>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#22c55e' }]} />
                    <Text style={styles.legendText}>Maior consumo</Text>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    title: {
        ...typography.body,
        fontWeight: '600',
        color: colors.text,
    },
    insight: {
        fontSize: 11,
        color: '#22c55e',
        fontWeight: '500',
    },
    chartContainer: {
        height: 140,
    },
    barsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        height: 120,
        paddingBottom: 20,
    },
    barWrapper: {
        flex: 1,
        alignItems: 'center',
    },
    barColumn: {
        alignItems: 'center',
        height: 100,
        justifyContent: 'flex-end',
    },
    barBackground: {
        width: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 4,
        justifyContent: 'flex-end',
        overflow: 'hidden',
    },
    bar: {
        width: '100%',
        borderRadius: 4,
        minHeight: 4,
    },
    currentBar: {
        shadowColor: '#f59e0b',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 4,
    },
    emptyBar: {
        width: '100%',
        height: 2,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 1,
    },
    barValue: {
        fontSize: 8,
        color: colors.textSecondary,
        marginBottom: 2,
    },
    hourLabel: {
        fontSize: 9,
        color: colors.textSecondary,
        marginTop: 4,
        position: 'absolute',
        bottom: -18,
    },
    currentHourLabel: {
        color: '#f59e0b',
        fontWeight: 'bold',
    },
    legend: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: spacing.lg,
        marginTop: spacing.sm,
        paddingTop: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.05)',
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    legendDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    legendText: {
        fontSize: 10,
        color: colors.textSecondary,
    },
});

export default HourlyWaterChart;
