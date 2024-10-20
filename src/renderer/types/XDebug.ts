export interface XDebugYml {
    client_host: string;
    client_port: string;
    wsl_config: string;
    workdir: string;
    project_path: string;
    separator: string;
}

export interface Breakpoint {
    url: string;
    line: number;
    enabled: boolean;
}
