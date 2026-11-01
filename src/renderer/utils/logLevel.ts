type LevelColor = 'success' | 'warning' | 'info' | 'error' | 'neutral';

const colorClasses: Record<LevelColor, { badge: string; dot: string }> = {
    success: { badge: 'text-success bg-success/10', dot: 'bg-success' },
    warning: { badge: 'text-warning bg-warning/10', dot: 'bg-warning' },
    info: { badge: 'text-info bg-info/10', dot: 'bg-info' },
    error: { badge: 'text-error bg-error/10', dot: 'bg-error' },
    neutral: { badge: 'text-base-content/80 bg-base-content/10', dot: 'bg-base-content/40' }
};

const levelColorMap: Record<string, LevelColor> = {
    error: 'error',
    critical: 'error',
    alert: 'error',
    emergency: 'error',
    warning: 'warning',
    notice: 'success',
    info: 'info',
    debug: 'neutral'
};

export const levelClasses = (level: string) => colorClasses[levelColorMap[level] ?? 'neutral'];
