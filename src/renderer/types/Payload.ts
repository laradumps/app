import { IdeHandle } from "@/types/IdeHandle";

export interface QueryPayload {
    sql: string;
    bindings: string[];
    time: number;
    connection: any;
    connectionName: any;
}

export interface QueriesPayload {
    driver: string;
    database: string;
    query: QueryPayload;
    origin: string;
    uri: string;
    method: string;
}

export interface ModelPayload {
    attributes: string[];
    relations: string[];
    className: string;
}

export interface DumpPayload {
    dump?: string | null;
    original_content: string;
    variable_type: string;
}

export interface TimeTrackPayload {
    tracker_id: string;
    end_time: string;
    time: string;
    elapsed_time?: string;
    label?: string;
}

export interface TableV2Payload {
    values: string[];
    headerStyle: string[];
    label: string;
}

export interface ColorPayload {
    color: string;
}

export interface JSONPayload {
    string: string;
    original_content: string;
}

export interface ContainsPayload {
    string: string;
    original_content: string;
}

export interface ValidatePayload {
    type: string;
    content: string;
    is_case_sensitive: boolean;
    is_whole_word: boolean;
}

export interface TablePayload {
    values: string[];
    fields: string[];
    header: string[];
}

export interface MailablePayload {
    html: string;
}

export interface LogApplicationPayload {
    message: string;
    level: string;
    context: string | string[];
    exception: any;
    value: string;
}

export interface ScreenPayload {
    screen_name: string;
    raise_in: number;
    pinned: boolean;
    visible: boolean;
    new_window: boolean;
}

export interface LabelPayload {
    label: string;
}

export interface CodeSnippet {
    file: string;
    line: number;
    snippet: Record<string, string>;
}
export interface Meta {
    auto_invoke_app: string;
    laradumps_version: string;
}

export interface StrContainsPayload {
    success: boolean;
    regex_mode: string;
    search_string: string;
}

export interface MailPayload {
    html: string;
    channel: string;
    details: any;
    headers: any;
    attachments: any;
    messageId: string;
}

export interface JobPayload {
    job_id: string;
    status: string;
    job: any;
    display_name: string;
    exception: string[];
}

export interface ContextPayload {
    context: [];
}

export interface LivewirePayload {
    name: string;
    size: string;
    request: string;
    errors: Array<any>;
    properties: Array<any>;
    profile: Array<any>;
    queries: Array<any>;
    events: Array<any>;
}

export interface Payload {
    id: string;
    type: string;
    request_id: never;
    ide_handle: IdeHandle;
    xdebug: any; // todo
    date_time: Date;
    application_path: string;
    sf_dump_id: string;
    dump?: DumpPayload;
    model?: ModelPayload;
    queries?: QueriesPayload;
    query?: QueryPayload;
    time_track?: TimeTrackPayload;
    html?: string;
    mail: MailPayload;
    table_v2?: TableV2Payload;
    color?: string;
    json?: JSONPayload;
    contains?: ContainsPayload;
    validate?: ValidatePayload;
    str_contains?: StrContainsPayload;
    validate_json?: boolean;
    is_json?: boolean;
    table?: TablePayload;
    mailable?: MailablePayload;
    log_application?: LogApplicationPayload;
    to_screen: ScreenPayload;
    with_label: LabelPayload;
    code_snippet: CodeSnippet[];
    jobs: JobPayload;
    show_badge_count: boolean;
    extra: Record<string, any>;
    context?: ContextPayload;
    livewire?: LivewirePayload;
}
