// Design system and theme constants
export const colors = {
    // Primary palette
    primary: '#6366f1',
    primaryLight: '#818cf8',
    primaryDark: '#4f46e5',

    // Secondary
    secondary: '#10b981',
    secondaryLight: '#34d399',

    // Accent
    accent: '#f59e0b',
    accentLight: '#fbbf24',

    // Background - Darker black/gray tones
    background: '#08090a',
    backgroundLight: '#121316',
    card: '#1a1b1f',
    cardLight: '#2a2b30',

    // Text
    text: '#f8fafc',
    textSecondary: '#94a3b8',
    textMuted: '#64748b',

    // Status
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',

    // Water specific
    water: '#0ea5e9',
    waterLight: '#38bdf8',

    // Liquid Glass colors
    glassBackground: 'rgba(255, 255, 255, 0.05)',
    glassBorder: 'rgba(255, 255, 255, 0.1)',
    glassHighlight: 'rgba(255, 255, 255, 0.15)',
    glassShadow: 'rgba(0, 0, 0, 0.3)',
};

export const spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
};

export const borderRadius = {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
    full: 9999,
};

export const typography = {
    h1: {
        fontSize: 32,
        fontWeight: 'bold',
        color: colors.text,
    },
    h2: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.text,
    },
    h3: {
        fontSize: 20,
        fontWeight: '600',
        color: colors.text,
    },
    body: {
        fontSize: 16,
        color: colors.text,
    },
    bodySmall: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    caption: {
        fontSize: 12,
        color: colors.textMuted,
    },
};

export const shadows = {
    sm: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    md: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
    },
    glass: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 8,
    },
};

// Liquid Glass effect styles
export const glassEffect = {
    container: {
        backgroundColor: colors.glassBackground,
        borderWidth: 1,
        borderColor: colors.glassBorder,
        overflow: 'hidden',
    },
    highlight: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '50%',
        backgroundColor: colors.glassHighlight,
        opacity: 0.5,
    },
};

// Animation timing configurations
export const animations = {
    spring: {
        damping: 15,
        stiffness: 150,
        mass: 0.5,
    },
    timing: {
        fast: 150,
        normal: 250,
        slow: 400,
    },
    easing: {
        smooth: 'ease-in-out',
        bounce: 'ease-out',
    },
};
