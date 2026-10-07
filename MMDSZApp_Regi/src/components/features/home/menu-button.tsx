import { StyleSheet, Text, TouchableOpacity } from 'react-native';

type MenuButtonProps = {
  icon: string;
  label: string;
  onPress: () => void;
};

export function MenuButton({ icon, label, onPress }: MenuButtonProps) {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} accessibilityRole="button">
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { width: '48%', backgroundColor: '#1E1E1E', borderWidth: 1, borderColor: '#333', borderRadius: 10, padding: 20, alignItems: 'center', marginBottom: 15 },
  icon: { fontSize: 28, marginBottom: 8 },
  label: { color: '#FFF', fontWeight: 'bold' },
});