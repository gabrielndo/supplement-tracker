import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { colors } from '../styles/theme';
import { addWaterEntry, logConsumption, getSupplements } from './storage';

export const WATER_CATEGORY = 'WATER_REMINDER';
export const SUPPLEMENT_CATEGORY = 'SUPPLEMENT_REMINDER';

export const WATER_ACTION_DRINK = 'ACTION_DRINK_WATER';
export const SUPPLEMENT_ACTION_TAKE = 'ACTION_TAKE_SUPPLEMENT';

/**
 * Configure global notification handler and categories
 */
export const configureNotifications = async () => {
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: false,
            shouldSetBadge: true,
        }),
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
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
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
        console.log(`Agendando suplemento: ${name} para as ${time} (H:${hours} M:${minutes})`);
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

        console.log(`Suplemento agendado com sucesso! ID da notificação: ${notificationId}`);
        return notificationId;
    } catch (error) {
        console.error('ERRO ao agendar lembrete de suplemento:', error);
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
    const today = new Date().toISOString().split('T')[0];

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
/**
 * Debug: List all scheduled notifications
 */
export const listScheduledNotifications = async () => {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    console.log('--- NOTIFICAÇÕES AGENDADAS ---');
    console.log(`Total: ${scheduled.length}`);
    scheduled.forEach((n, i) => {
        const type = n.trigger.type || (n.trigger.hour !== undefined ? 'calendar' : 'unknown');
        console.log(`[${i + 1}] ID: ${n.identifier} | Título: ${n.content.title} | Gatilho (${type}):`, JSON.stringify(n.trigger));
    });
    console.log('------------------------------');
    return scheduled;
};

/**
 * Debug: Test immediate notification
 */
export const testImmediateNotification = async () => {
    console.log('Enviando notificação de teste em 5 segundos...');
    return await scheduleNotification(
        "Teste MeusSuple ✅",
        "Esta é uma notificação de teste para verificar se o sistema está funcionando.",
        5
    );
};

/**
 * Debug: Test supplement notification in 60 seconds
 */
export const testSupplementNotification = async () => {
    const now = new Date();
    const testDate = new Date(now.getTime() + 65 * 1000); // 65 seconds
    const h = testDate.getHours();
    const m = testDate.getMinutes();
    const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    
    console.log(`--- TESTE SUPLEMENTO ---`);
    console.log(`Hora atual: ${now.toLocaleTimeString()}`);
    console.log(`Agendando para: ${timeStr}`);
    
    return await scheduleSupplementReminder('debug-test', 'Teste de 1 Minuto', timeStr);
};

/**
 * Debug: Test supplement notification via INTERVAL (60 seconds)
 * This helps verify if the issue is strictly the DAILY calendar trigger.
 */
export const testSupplementInterval = async () => {
    console.log('--- TESTE SUPLEMENTO (INTERVALO 60s) ---');
    const trigger = {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 60,
        repeats: false,
    };
    
    try {
        const id = await Notifications.scheduleNotificationAsync({
            content: {
                title: `Teste Suplemento 💊`,
                body: `Teste de 1 minuto via intervalo`,
                categoryIdentifier: SUPPLEMENT_CATEGORY,
                data: { type: 'supplement', supplementId: 'debug-interval' },
                sound: false,
                priority: Notifications.AndroidNotificationPriority.MAX,
                vibrationPattern: [0, 250, 250, 250],
            },
            trigger,
        });
        console.log(`Teste agendado com sucesso! ID: ${id}`);
        return id;
    } catch (e) {
        console.error('Falha no agendamento de teste:', e);
    }
};
