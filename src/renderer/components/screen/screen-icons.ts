import {
    HomeIcon,
    CircleStackIcon,
    DocumentTextIcon,
    DocumentMagnifyingGlassIcon,
    BriefcaseIcon,
    EnvelopeIcon,
    CpuChipIcon,
    BoltIcon,
    ChartBarIcon,
    BugAntIcon,
    WindowIcon
} from '@heroicons/vue/24/outline';

export const SCREEN_ICONS: Record<string, any> = {
    home: HomeIcon,
    queries: CircleStackIcon,
    logs: DocumentTextIcon,
    tail_logs: DocumentMagnifyingGlassIcon,
    jobs: BriefcaseIcon,
    mail: EnvelopeIcon,
    brain: CpuChipIcon,
    livewire: BoltIcon,
    profiler: ChartBarIcon,
    xdebug_inspector: BugAntIcon
};

export const screenIcon = (screenName: string) => SCREEN_ICONS[screenName] ?? WindowIcon;
