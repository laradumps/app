import IdeHandle from "@/types/IdeHandle";

export interface QueriesPayload {
    connectionName: string;
    database: string;
    time: string;
    sql: string;
}

export interface QueryPayload {
    sql: string;
}

export interface ModelPayload {
    attributes: string[];
    relations: string[];
    className: string;
}

export interface DumpPayload {
    dump?: string | null;
    original_content: string;
}

export interface TimeTrackPayload {
    tracker_id: string;
    end_time: string;
    time: string;
    elapsed_time?: string;
}

export interface LabelPayload {
    label: string;
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
    value: string;
}

export interface ScreenPayload {
    screen_name: string;
    raise_in: number;
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

export interface Payload {
    id: string;
    type: string;
    request_id: never;
    ide_handle: IdeHandle;
    date_time: string;
    sf_dump_id: string;
    dump?: DumpPayload;
    model?: ModelPayload;
    queries?: QueriesPayload;
    query?: QueryPayload;
    time_track?: TimeTrackPayload;
    html?: string;
    mail: MailPayload;
    label?: LabelPayload;
    table_v2?: TableV2Payload;
    color?: ColorPayload;
    json?: JSONPayload;
    contains?: ContainsPayload;
    validate?: ValidatePayload;
    str_contains?: StrContainsPayload;
    validate_json?: boolean;
    is_json?: boolean;
    table?: TablePayload;
    mailable?: MailablePayload;
    log_application?: LogApplicationPayload;
    screen?: ScreenPayload;
    meta: Meta;
}
