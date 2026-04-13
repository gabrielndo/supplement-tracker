import * as Notifications from 'expo-notifications';
import { Platform, Alert, Linking } from 'react-native';
import { colors } from '../styles/theme';
import { addWaterEntry, logConsumption, getSupplements, getConsumptionLog } from './storage';
import { getLocalDateStr } from '../utils/dateHelper';

export const WATER_CATEGORY = 'WATER_REMINDER';
export const SUPPLEMENT_CATEGORY = 'SUPPLEMENT_REMINDER';

export const WATER_ACTION_DRINK = 'ACTION_DRINK_WATER';
export const SUPPLEMENT_ACTION_TAKE = 'ACTION_TAKE_SUPPLEMENT';

/**
 * Configure global notification handler and categories
 */
export const configureNotifications = async () => {
    Notifications.setNotificationHandler({
        handleNotification: async (notification) => {
            const data = notification.request.content.data;

            // If it's a supplement notification, check if already taken today
            if (data?.type === 'supplement' && data?.supplementId) {
                try {
                    const today = getLocalDateStr();
                    const log = await getConsumptionLog(today);
                    if (log.includes(data.supplementId)) {
                        // Already taken today — silence the notification
                        return {
                            shouldShowAlert: false,
                            shouldPlaySound: false,
                            shouldSetBadge: false,
                        };
                    }
                } catch (e) {
                    // On error, show the notification anyway
                }
            }

            return {
                shouldShowAlert: true,
                shouldPlaySound: false,
                shouldSetBadge: true,
            };
        },
    });

    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: colors.primary,
            sound: false,
        });
    }

    // Set categories (Action Buttons)
    await Notifications.setNotificationCategoriesAsync({
        [WATER_CATEGORY]: [
            {
                identifier: WATER_ACTION_DRINK,
                buttonTitle: 'Beber 200ml 💧',
                options: { isDestructive: false, isAuthenticationRequired: false },
            },
        ],
        [SUPPLEMENT_CATEGORY]: [
            {
                identifier: SUPPLEMENT_ACTION_TAKE,
                buttonTitle: 'Tomar 💊',
                options: { isDestructive: false, isAuthenticationRequired: false },
            },
        ],
    });
};

/**
 * Request notification permissions
 * @returns {Promise<boolean>} Granted status
 */
export const requestPermissions = async () => {
    try {
        const { status: existingStatus, canAskAgain } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            if (canAskAgain) {
                // Return a promise that resolves when the user dismisses the alert
                await new Promise(resolve => {
                    Alert.alert(
                        'Notificações Importantes 🔔',
                        'Para te lembrar de beber água e tomar seus suplementos na hora exata, precisamos que ative as notificações.\n\nElas são o coração do app!',
                        [{ text: 'Entendi', onPress: resolve }]
                    );
                });

                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            } else {
                // The user has permanently denied permissions (or it's restricted)
                Alert.alert(
                    'Notificações Desativadas',
                    'O app precisa enviar lembretes para funcionar corretamente. Por favor, abra as configurações do seu celular e ative as notificações para o MeusSuple.',
                    [
                        { text: 'Agora Não', style: 'cancel' },
                        { text: 'Abrir Configurações', onPress: () => Linking.openSettings() }
                    ]
                );
            }
        }

        return finalStatus === 'granted';
    } catch (error) {
        console.error('Error requesting notification permissions:', error);
        return false;
    }
};

/**
 * Cancel all notifications
 */
export const cancelAllNotifications = async () => {
    await Notifications.cancelAllScheduledNotificationsAsync();
};

/**
 * Cancel notifications by ID
 */
export const cancelNotification = async (id) => {
    await Notifications.cancelScheduledNotificationAsync(id);
};

/**
 * Schedule recurring water reminder
 * @param {number} intervalMinutes 
 */
export const scheduleWaterReminder = async (intervalMinutes) => {
    // Cancel existing water reminders first to avoid duplicates
    // Since we don't track IDs easily for all generic reminders, we rely on the implementation 
    // where we cancel all before setting new ones OR we just set a new one.
    // For specific recurring, Expo handles it. But to be safe, we might want to cancel all "generic" water reminders
    // if we had a way to tag them. For now, we'll assume the user toggles off/on or we manage IDs.
    // Simpler: Just schedule new one.

    const trigger = {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: intervalMinutes * 60,
        repeats: true,
    };

    await Notifications.scheduleNotificationAsync({
        content: {
            title: "Hora de se hidratar! 💧",
            body: "Mantenha o foco na sua meta diária de água.",
            categoryIdentifier: WATER_CATEGORY,
            data: { type: 'water' },
            sound: false,
            priority: Notifications.AndroidNotificationPriority.MAX,
            vibrationPattern: [0, 250, 250, 250],
        },
        trigger,
    });
};

/**
 * Stop water reminders
 * We'll need to find them or cancel all. 
 * Since we don't store the ID in the simplified plan, we can fetch all and cancel those with water category/data.
 */
export const cancelWaterReminders = async () => {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const item of scheduled) {
        if (item.content.data?.type === 'water') {
            await Notifications.cancelScheduledNotificationAsync(item.identifier);
        }
    }
};

/**
 * Schedule daily supplement reminder
 * @param {string} id - Supplement ID
 * @param {string} name - Supplement Name
 * @param {string} time - Time string "HH:MM"
 */
export const scheduleSupplementReminder = async (id, name, time) => {
    const [hours, minutes] = time.split(':').map(Number);

    // Create trigger for daily at specific time
    // Android requires explicit 'daily' type or matching object structure, but avoiding 'calendar' type
    const trigger = {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: hours,
        minute: minutes,
    };

    try {
        const notificationId = await Notifications.scheduleNotificationAsync({
            content: {
                title: `Hora do Suplemento 💊`,
                body: `Está na hora de tomar: ${name}`,
                categoryIdentifier: SUPPLEMENT_CATEGORY,
                data: { type: 'supplement', supplementId: id },
                sound: false,
                priority: Notifications.AndroidNotificationPriority.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lockScreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
            },
            trigger,
        });

        return notificationId;
    } catch (error) {
        console.warn('Erro ao agendar lembrete de suplemento:', error);
        return null;
    }
};

/**
 * Cancel specific supplement reminder
 */
export const cancelSupplementReminder = async (supplementId) => {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const item of scheduled) {
        if (item.content.data?.type === 'supplement' && item.content.data?.supplementId === supplementId) {
            await Notifications.cancelScheduledNotificationAsync(item.identifier);
        }
    }
};


/**
 * Handle notification actions (Background/Foreground)
 */
export const handleNotificationAction = async (response) => {
    const actionId = response.actionIdentifier;
    const data = response.notification.request.content.data;
    const today = getLocalDateStr();

    if (actionId === WATER_ACTION_DRINK) {
        await addWaterEntry(today, 200); // Add 200ml default
    } else if (actionId === SUPPLEMENT_ACTION_TAKE) {
        if (data?.supplementId) {
            await logConsumption(data.supplementId, today);
        }
    }
};

/**
 * Simple local notification (legacy support)
 */
export const scheduleNotification = async (title, body, seconds = 1) => {
    try {
        await Notifications.scheduleNotificationAsync({
            content: {
                title,
                body,
                sound: false,
                color: colors.primary,
            },
            trigger: {
                seconds: seconds,
            },
        });
    } catch (error) {
        console.warn('Error scheduling local notification:', error);
    }
};

export const sendAchievementNotification = async (achievementTitle) => {
    await scheduleNotification(
        "Conquista Desbloqueada! 🏆",
        `Parabéns! Você desbloqueou: ${achievementTitle}`
    );
};

/**
 * Schedule daily streak reminder (checks at 9 PM if supplements are pending)
 */
export const scheduleStreakReminder = async () => {
    // Cancel existing streak reminders first
    await cancelStreakReminder();

    const trigger = {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 21, // 9 PM
        minute: 0,
    };

    try {
        await Notifications.scheduleNotificationAsync({
            content: {
                title: "Lembrete Diário 🔥",
                body: "Não esqueça de registrar seus suplementos de hoje para manter sua sequência!",
                categoryIdentifier: SUPPLEMENT_CATEGORY,
                data: { type: 'streak_reminder' },
                sound: false,
                priority: Notifications.AndroidNotificationPriority.HIGH,
            },
            trigger,
        });
    } catch (error) {
        console.warn('Error scheduling streak reminder:', error);
    }
};

/**
 * Cancel streak reminder notifications
 */
export const cancelStreakReminder = async () => {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const item of scheduled) {
        if (item.content.data?.type === 'streak_reminder') {
            await Notifications.cancelScheduledNotificationAsync(item.identifier);
        }
    }
};
