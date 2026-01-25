import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

/**
 * Haptic feedback service for the app
 * Provides vibration feedback on user interactions
 */

// Check if haptics are available (not on web)
const isHapticsAvailable = Platform.OS !== 'web';

/**
 * Light impact feedback - for subtle interactions like toggles
 */
export const lightImpact = () => {
    if (isHapticsAvailable) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
};

/**
 * Medium impact feedback - for button presses
 */
export const mediumImpact = () => {
    if (isHapticsAvailable) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
};

/**
 * Heavy impact feedback - for important actions like adding/removing
 */
export const heavyImpact = () => {
    if (isHapticsAvailable) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
};

/**
 * Success feedback - for completed actions
 */
export const successFeedback = () => {
    if (isHapticsAvailable) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
};

/**
 * Warning feedback - for alerts or warnings
 */
export const warningFeedback = () => {
    if (isHapticsAvailable) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
};

/**
 * Error feedback - for errors or destructive actions
 */
export const errorFeedback = () => {
    if (isHapticsAvailable) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
};

/**
 * Selection feedback - for selection changes
 */
export const selectionFeedback = () => {
    if (isHapticsAvailable) {
        Haptics.selectionAsync();
    }
};
