type LevelColor = 'success' | 'warning' | 'info' | 'error' | 'neutral';

const colorClasses: Record<LevelColor, { text: string; dot: string }> = {
    success: { text: 'text-success', dot: 'bg-success' },
    warning: { text: 'text-warning', dot: 'bg-warning' },
    info: { text: 'text-info', dot: 'bg-info' },
    error: { text: 'text-error', dot: 'bg-error' },
    neutral: { text: 'text-base-content/80', dot: 'bg-base-content/40' }
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
