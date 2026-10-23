import { StyleSheet, Text, TouchableOpacity, type StyleProp, type ViewStyle } from 'react-native';

type FilterChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

export function FilterChip({ label, selected, onPress, style }: FilterChipProps) {
  return (
    <TouchableOpacity
      style={[styles.container, selected && styles.selected, style]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <Text style={[styles.label, selected && styles.selectedLabel]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#1E1E1E', borderWidth: 1, borderColor: '#333', borderRadius: 20, marginRight: 8, height: 36, justifyContent: 'center', alignItems: 'center' },
  selected: { backgroundColor: '#EC2127', borderColor: '#EC2127' },
  label: { fontSize: 13, color: '#aaa', fontWeight: 'bold' },
  selectedLabel: { color: '#FFF' },
});