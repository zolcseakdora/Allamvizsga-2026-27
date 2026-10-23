import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type MenuButtonProps = {
  icon: string;
  label: string;
  onPress: () => void;
  badge?: number;
};

export function MenuButton({ icon, label, onPress, badge = 0 }: MenuButtonProps) {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} accessibilityRole="button">
      {badge > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
        </View>
      )}
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { width: '48%', backgroundColor: '#1E1E1E', borderWidth: 1, borderColor: '#333', borderRadius: 10, padding: 20, alignItems: 'center', marginBottom: 15 },
  badge: { position: 'absolute', top: 8, right: 8, minWidth: 22, height: 22, borderRadius: 11, backgroundColor: '#EC2127', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  badgeText: { color: '#FFF', fontSize: 11, fontWeight: 'bold' },
  icon: { fontSize: 28, marginBottom: 8 },
  label: { color: '#FFF', fontWeight: 'bold' },
});