import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useEventSeason } from '@/src/context/EventSeasonContext';
import type { EventSeason } from '@/src/constants/event-schedule';

const EVENT_TYPES: EventSeason[] = ['februtalis', 'diaknapok'];

export function EventSelector() {
  const { t } = useTranslation();
  const { eventType, setEventType } = useEventSeason();

  return (
    <View style={styles.container}>
      {EVENT_TYPES.map((event) => (
        <Pressable
          key={event}
          accessibilityRole="button"
          accessibilityState={{ selected: eventType === event }}
          accessibilityLabel={t(`eventNames.${event}`)}
          onPress={() => setEventType(event)}
          style={[styles.segment, eventType === event && styles.selectedSegment]}
        >
          <Text
            numberOfLines={1}
            style={[styles.segmentText, eventType === event && styles.selectedText]}
          >
            {t(`eventNames.${event}`)}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 3,
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    backgroundColor: '#1E1E1E',
    flexShrink: 0,
  },
  segment: {
    minWidth: 72,
    minHeight: 32,
    paddingHorizontal: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 5,
  },
  selectedSegment: { backgroundColor: '#321719' },
  segmentText: { color: '#DDD', fontSize: 11, fontWeight: '700' },
  selectedText: { color: '#EC2127' },
});
