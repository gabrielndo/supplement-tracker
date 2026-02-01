import React, { useEffect, useState } from 'react';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { View, ActivityIndicator } from 'react-native';
import { lightImpact } from './src/services/haptics';
import * as Notifications from 'expo-notifications';
import { configureNotifications, requestPermissions, handleNotificationAction, WATER_CATEGORY } from './src/services/notifications';
import { getAuthUser, isAuthenticated } from './src/services/authStorage';
import { getProfile } from './src/services/storage';

import HomeScreen from './src/screens/HomeScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import SupplementsScreen from './src/screens/SupplementsScreen';
import WaterScreen from './src/screens/WaterScreen';
import WaterHistoryScreen from './src/screens/WaterHistoryScreen';
import StatsScreen from './src/screens/StatsScreen';
import AchievementsScreen from './src/screens/AchievementsScreen';
import WelcomeScreen from './src/screens/WelcomeScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import { colors } from './src/styles/theme';

const Tab = createBottomTabNavigator();
const WaterStack = createNativeStackNavigator();
const StatsStack = createNativeStackNavigator();
const ProfileStack = createNativeStackNavigator();

// Water Stack Navigator
function WaterStackNavigator() {
  return (
    <WaterStack.Navigator screenOptions={{ headerShown: false }}>
      <WaterStack.Screen name="WaterMain" component={WaterScreen} />
      <WaterStack.Screen name="WaterHistory" component={WaterHistoryScreen} />
    </WaterStack.Navigator>
  );
}

// Stats Stack Navigator
function StatsStackNavigator() {
  return (
    <StatsStack.Navigator screenOptions={{ headerShown: false }}>
      <StatsStack.Screen name="StatsMain" component={StatsScreen} />
      <StatsStack.Screen name="Achievements" component={AchievementsScreen} />
    </StatsStack.Navigator>
  );
}

// Profile Stack Navigator
function ProfileStackNavigator() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="ProfileMain" component={ProfileScreen} />
    </ProfileStack.Navigator>
  );
}

// Main App Component wrapper for navigation refs
function AppContent() {
  const navigation = useNavigation();

  useEffect(() => {
    const initNotifications = async () => {
      await configureNotifications();
      await requestPermissions();
    };

    initNotifications();

    // Listen for user interaction with notifications
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const { actionIdentifier, notification } = response;
      const data = notification.request.content.data;
      const category = notification.request.content.categoryIdentifier;

      // Handle Actions (Background/Foreground)
      handleNotificationAction(response);

      // Handle Navigation
      if (actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
        if (category === WATER_CATEGORY || data?.type === 'water') {
          navigation.navigate('Água', { screen: 'WaterMain' });
        } else if (data?.type === 'supplement') {
          navigation.navigate('Suplementos');
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;
            switch (route.name) {
              case 'Home':
                iconName = focused ? 'home' : 'home-outline';
                break;
              case 'Perfil':
                iconName = focused ? 'person' : 'person-outline';
                break;
              case 'Suplementos':
                iconName = focused ? 'medical' : 'medical-outline';
                break;
              case 'Água':
                iconName = focused ? 'water' : 'water-outline';
                break;
              case 'Estatísticas':
                iconName = focused ? 'stats-chart' : 'stats-chart-outline';
                break;
              default:
                iconName = 'ellipse';
            }
            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#6366f1',
          tabBarInactiveTintColor: '#9ca3af',
          tabBarShowLabel: false,
          tabBarBackground: () => (
            <BlurView
              intensity={100}
              tint="dark"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                borderRadius: 25,
                overflow: 'hidden',
                backgroundColor: 'rgba(31, 41, 55, 0.75)',
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.15)',
              }}
            />
          ),
          tabBarStyle: {
            position: 'absolute',
            bottom: 15,
            left: 15,
            right: 15,
            elevation: 10,
            backgroundColor: 'transparent',
            borderRadius: 25,
            height: 65,
            borderTopWidth: 0,
            shadowColor: '#000',
            shadowOffset: {
              width: 0,
              height: 10,
            },
            shadowOpacity: 0.4,
            shadowRadius: 25,
            paddingBottom: 5,
            paddingTop: 12,
          },
          tabBarItemStyle: {
            justifyContent: 'center',
            alignItems: 'center',
          },
          headerShown: false,
        })}
        listeners={({ navigation }) => ({
          tabPress: () => {
            lightImpact();
          },
        })}
      >
        <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Início' }} />
        <Tab.Screen name="Perfil" component={ProfileStackNavigator} />
        <Tab.Screen name="Suplementos" component={SupplementsScreen} />
        <Tab.Screen name="Água" component={WaterStackNavigator} />
        <Tab.Screen name="Estatísticas" component={StatsStackNavigator} />
      </Tab.Navigator>
    </>
  );
}

export default function App() {
  const [authState, setAuthState] = useState({
    loading: true,
    isAuth: false,
    hasProfile: false,
    userName: '',
  });

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const isAuth = await isAuthenticated();
      if (isAuth) {
        const user = await getAuthUser();
        const profile = await getProfile();
        setAuthState({
          loading: false,
          isAuth: true,
          hasProfile: !!profile,
          userName: user?.name || 'Usuário',
        });
      } else {
        setAuthState({
          loading: false,
          isAuth: false,
          hasProfile: false,
          userName: '',
        });
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setAuthState({
        loading: false,
        isAuth: false,
        hasProfile: false,
        userName: '',
      });
    }
  };

  const handleWelcomeComplete = () => {
    checkAuthStatus();
  };

  const handleOnboardingComplete = () => {
    setAuthState(prev => ({
      ...prev,
      hasProfile: true,
    }));
  };

  if (authState.loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Not authenticated -> Show Welcome/Login screen
  if (!authState.isAuth) {
    return <WelcomeScreen onComplete={handleWelcomeComplete} />;
  }

  // Authenticated but no profile -> Show Onboarding
  if (!authState.hasProfile) {
    return <OnboardingScreen userName={authState.userName} onComplete={handleOnboardingComplete} />;
  }

  // Authenticated and has profile -> Show main app
  return (
    <NavigationContainer>
      <AppContent />
    </NavigationContainer>
  );
}
