const API_BASE = 'http://0.0.0.0:9191/api/mcp';

export async function fetchData(endpoint: string, data?: any) {
    try {
        const options: RequestInit = {
            method: data ? 'POST' : 'GET'
        };

        if (data) {
            options.headers = {
                'Content-Type': 'application/json'
            };
            options.body = JSON.stringify(data);
        }

        const response = await fetch(`${API_BASE}/${endpoint}`, options);

        if (!response.ok) {
            return { error: `Failed to fetch ${endpoint}: ${response.statusText}` };
        }

        return await response.json();
    } catch (error) {
        return { error: error instanceof Error ? error.message : String(error) };
    }
}

export const API_URL = API_BASE;
