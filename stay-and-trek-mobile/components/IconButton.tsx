import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet, Platform } from 'react-native';
import { MaterialIcons, FontAwesome5, Ionicons } from '@expo/vector-icons';

type IconButtonProps = {
  name: string;
  label?: string;
  size?: number;
  color?: string;
  bgColor?: string;
  iconSet?: 'material' | 'fontawesome' | 'ionicon';
  onPress?: () => void;
  style?: any;
};

export default function IconButton({
  name,
  label,
  size = 22,
  color = '#fff',
  bgColor = '#2E7D32',
  iconSet = 'material',
  onPress,
  style,
}: IconButtonProps) {
  const Icon = iconSet === 'fontawesome' ? FontAwesome5 : iconSet === 'ionicon' ? Ionicons : MaterialIcons;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={label || name}
      style={[styles.container, style]}
    >
      <View style={[styles.circle, { backgroundColor: bgColor }]}>
        <Icon name={name as any} size={size} color={color} />
      </View>
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 10,
  },
  circle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
      },
      android: { elevation: 4 },
        // web: use boxShadow instead of shadow* props to avoid RN Web deprecation warnings
        web: {
          boxShadow: '0px 3px 6px rgba(0,0,0,0.12)'
        }
    }),
  },
  label: {
    marginTop: 8,
    fontSize: 12,
    color: '#333',
    fontWeight: '600',
    textAlign: 'center',
  },
});
