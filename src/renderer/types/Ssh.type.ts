export interface ConnectionConfig {
    id: number;
    name: string;
    host: string;
    port: number;
    username: string;
    auth_type: string;
    password: string | undefined;
    private_key: string | undefined;
}

export interface ConnectionReply {
    connected: boolean;
    config: ConnectionConfig;
}
