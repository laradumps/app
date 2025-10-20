import { IdeHandle } from "@/types/IdeHandle";
import { useCurrentProject } from "@/store/current-project";
import { useSettingsStore } from "@/store/settings";

export const generateLink = (ideHandler: IdeHandle): string | undefined => {
    const settingsStore = useSettingsStore();
    const currentProjectStore = useCurrentProject();

    const ide_handler = settingsStore.settings.ide_handler ? settingsStore.settings.ide_handler : "phpstorm://open?file={filepath}&line={line}";

    const { project_path, real_path, workdir, wsl_config, base_path, line } = ideHandler;

    if (!real_path) {
        return undefined;
    }

    const relativePath = real_path.replace(workdir, "").replace(project_path, "");
    let linkPath = project_path + relativePath;

    if (base_path) {
        linkPath = linkPath.replace(base_path, currentProjectStore.value);
    }

    let link = ide_handler.replace("{filepath}", linkPath).replace("{line}", line);

    if (ide_handler.includes("wsl_config") && wsl_config) {
        link = link.replace("{wsl_config}", wsl_config);
    }

    return link;
};
