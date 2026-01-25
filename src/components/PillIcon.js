import React from 'react';
import Svg, { Path, Defs, LinearGradient, Stop, Ellipse } from 'react-native-svg';

export const PillIcon = ({ size = 24, color = '#fff', focused = false }) => {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <Defs>
                <LinearGradient id="pillGradient" x1="0" y1="0" x2="1" y2="1">
                    <Stop offset="0" stopColor={focused ? '#6366f1' : color} stopOpacity="1" />
                    <Stop offset="1" stopColor={focused ? '#4f46e5' : color} stopOpacity="0.8" />
                </LinearGradient>
            </Defs>

            {/* Pill Capsule */}
            <Path
                d="M8 4.5C5.5 4.5 3.5 6.5 3.5 9V15C3.5 17.5 5.5 19.5 8 19.5H16C18.5 19.5 20.5 17.5 20.5 15V9C20.5 6.5 18.5 4.5 16 4.5H8Z"
                fill="url(#pillGradient)"
                stroke={color}
                strokeWidth={focused ? "2" : "1.5"}
                strokeLinecap="round"
            />

            {/* Divider Line */}
            <Path
                d="M12 4.5V19.5"
                stroke={focused ? "#1e1b4b" : "rgba(0,0,0,0.3)"}
                strokeWidth={focused ? "1.5" : "1"}
            />

            {/* Dots on left side */}
            {focused && (
                <>
                    <Ellipse cx="7.5" cy="10" rx="1" ry="1" fill="rgba(255,255,255,0.4)" />
                    <Ellipse cx="7.5" cy="14" rx="1" ry="1" fill="rgba(255,255,255,0.4)" />
                </>
            )}
        </Svg>
    );
};
