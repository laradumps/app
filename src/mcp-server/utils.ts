const API_BASE = 'http://0.0.0.0:9191/api/mcp';

export async function fetchData(endpoint: string) {
    try {
        const response = await fetch(`${API_BASE}/${endpoint}`);

        if (!response.ok) {
            throw new Error(`Failed to fetch ${endpoint}: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        return { error: error instanceof Error ? error.message : String(error) };
    }
}

export const API_URL = API_BASE;
