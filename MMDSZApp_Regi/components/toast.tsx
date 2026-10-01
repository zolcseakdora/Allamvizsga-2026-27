import React, { useEffect } from 'react';
import { StyleSheet, Text, View, Animated } from 'react-native';

type ToastProps = {
  message: string;
  type?: 'success' | 'error' | 'info';
  visible: boolean;
  onHide: () => void;
};

export function Toast({ message, type = 'success', visible, onHide }: ToastProps) {
  const translateY = new Animated.Value(-100);

  useEffect(() => {
    if (visible) {
      // Becsúszás a képernyő tetejéről
      Animated.timing(translateY, {
        toValue: 50,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // 5 másodperc múlva eltűnés
      const timer = setTimeout(() => {
        hideToast();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const hideToast = () => {
    Animated.timing(translateY, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
    }).start(() => {
      onHide();
    });
  };

  if (!visible) return null;

  const backgroundColor = type === 'success' ? '#27AE60' : type === 'error' ? '#EC2127' : '#333';

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY }], backgroundColor }]}>
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    zIndex: 9999,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  text: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
    textAlign: 'center',
  },
});