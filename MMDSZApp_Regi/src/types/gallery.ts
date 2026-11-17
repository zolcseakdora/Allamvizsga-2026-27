import type { EventSeason } from '@/src/constants/event-schedule';

export type GalleryImage = {
  id: string;
  image: string;
  thumb?: string;
  category?: string;
  uploadedBy?: string;
  createdAt?: Date;
  eventType?: EventSeason;
};
