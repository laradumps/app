const lc = (value: unknown): string => String(value ?? '').toLowerCase();
const firstOf = (value: unknown): unknown => (Array.isArray(value) ? value[0] : value);

export const matchesMailSearch = (item: any, term: string): boolean =>
    lc(item?.subject ?? item?.mail?.subject).includes(term) ||
    lc(item?.from ?? item?.mail?.from).includes(term) ||
    lc(item?.to ?? item?.mail?.to).includes(term);

export const matchesLogSearch = (item: any, term: string): boolean =>
    lc(item?.message).includes(term) || lc(item?.level).includes(term) || lc(firstOf(item?.context)).includes(term);

export const matchesJobSearch = (item: any, term: string): boolean =>
    lc(item?.display_name).includes(term) || lc(item?.job_id).includes(term) || lc(firstOf(item?.job)).includes(term);

export const matchesQuerySearch = (item: any, term: string): boolean =>
    lc(item?.with_label?.label).includes(term) || lc(item?.queries?.query?.sql).includes(term);

export const matchesProfilerSearch = (item: any, term: string): boolean => lc(item?.label).includes(term);

export const matchesBrainSearch = (item: any, term: string): boolean =>
    lc(item?.className).includes(term) || lc(item?.run_workflow_id).includes(term);

export const matchesDumpSearch = (item: any, term: string): boolean => {
    if (lc(item?.with_label?.label).includes(term)) {
        return true;
    }

    const content = item?.[item?.type];

    if (typeof content === 'string') {
        return content.toLowerCase().includes(term);
    }

    if (content && typeof content === 'object') {
        return lc(content.value ?? content.dump ?? content.label).includes(term);
    }

    return false;
};

export const matchesScreenSearch = (screenName: string, item: any, term: string): boolean => {
    if (!term) {
        return true;
    }

    switch (screenName) {
        case 'logs':
        case 'tail_logs':
            return matchesLogSearch(item, term);
        case 'jobs':
            return matchesJobSearch(item, term);
        case 'mail':
            return matchesMailSearch(item, term);
        case 'queries':
            return matchesQuerySearch(item, term);
        case 'profiler':
            return matchesProfilerSearch(item, term);
        case 'brain':
            return matchesBrainSearch(item, term);
        default:
            return matchesDumpSearch(item, term);
    }
};
