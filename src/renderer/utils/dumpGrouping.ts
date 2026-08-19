import type { Payload } from '@/types/Payload';
import dayjs from 'dayjs';

export function groupByTime(payloads: Payload[]): Record<string, Payload[]> {
    return payloads.reduce(
        (groups, payload) => {
            const groupKey = dayjs(payload.date_time).format('YYYY-MM-DD HH:mm:ss');
            if (!groups[groupKey]) {
                groups[groupKey] = [];
            }
            groups[groupKey].push(payload);
            return groups;
        },
        {} as Record<string, Payload[]>
    );
}
