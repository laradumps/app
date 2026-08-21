export const SPECIAL_ENVIRONMENTS = ['dump', 'enabled_in_testing', 'original_dump', 'auto_invoke_app'] as const;

// Screens rendered by a dedicated view component (everything else is a generic dump list).
export const KNOWN_SCREENS = [
    'cache',
    'gate',
    'jobs',
    'mail',
    'logs',
    'tail_logs',
    'queries',
    'brain',
    'profiler'
] as const;

export const isSpecialEnvironment = (value: string): boolean =>
    (SPECIAL_ENVIRONMENTS as readonly string[]).includes(value);

const formatLabel = (value: string): string => value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export const SPECIAL_ENVIRONMENTS_LIST = SPECIAL_ENVIRONMENTS.map((value) => ({
    value,
    label: formatLabel(value)
}));
