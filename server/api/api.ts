export * from './bookings.service';
import { BookingsService } from './bookings.service';
export * from './eventTypes.service';
import { EventTypesService } from './eventTypes.service';
export * from './slots.service';
import { SlotsService } from './slots.service';
export const APIS = [BookingsService, EventTypesService, SlotsService];
