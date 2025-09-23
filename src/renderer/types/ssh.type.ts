export interface ConnectionConfig {
    id: number;
    name: string;
    host: string;
    port: number;
    username: string;
    auth_type: string;
    password: string | undefined;
    passphrase: string | undefined;
    private_key: string | undefined;
    new_window: boolean;
    connected: boolean;
}
