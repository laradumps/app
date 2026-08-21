import type { Payload } from '@/types/Payload';
import dayjs from 'dayjs';

export function groupByTime(payloads: Payload[]): Record<string, Payload[]> {
    return payloads.reduce(
        (groups, payload) => {
            if (!(payload as any)._formatted_date_time) {
                (payload as any)._formatted_date_time = dayjs(payload.date_time).format('YYYY-MM-DD HH:mm:ss');
            }
            const groupKey = (payload as any)._formatted_date_time;
            if (!groups[groupKey]) {
                groups[groupKey] = [];
            }
            groups[groupKey].push(payload);
            return groups;
        },
        {} as Record<string, Payload[]>
    );
}
