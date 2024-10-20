import chokidar from "chokidar";
import fs from "fs";
import xml2js from "xml2js";
import { BrowserWindow } from "electron";
import { Breakpoint } from "@/types/XDebug";
import XDebugServer from "./xdebug-server";

const xdebugServer = XDebugServer.getInstance();

let breakpoints: Breakpoint[] = [];

function readBreakpoints(mainWindow: BrowserWindow, projectPath: string, workspacePath: string): void {
    fs.readFile(workspacePath, (err, data) => {
        if (err) {
            console.error("err:", err);
            return;
        }

        xml2js.parseString(data, (err, result) => {
            if (err) {
                console.error("err:", err);
                return;
            }

            const components = result.project.component;
            const debuggerManager = components.find((component: any) => component.$.name === "XDebuggerManager");

            if (debuggerManager && debuggerManager["breakpoint-manager"]) {
                const breakpointManager = debuggerManager["breakpoint-manager"][0];
                const breakpointsList = breakpointManager.breakpoints[0]["line-breakpoint"];

                breakpoints = breakpointsList
                    .filter((breakpoint: any) => breakpoint.url[0].includes("$PROJECT_DIR$"))
                    .map((breakpoint: any) => ({
                        url: breakpoint.url[0].replace("$PROJECT_DIR$/", projectPath), // review separator
                        line: breakpoint.line ? breakpoint.line[0] : null,
                        enabled: breakpoint.$.enabled === "true"
                    }));

                xdebugServer.updateBreakpoints();
            }
        });
    });
}

export const watcherPath = (mainWindow, projectPath) => {
    const workspacePath = `${projectPath}.idea/workspace.xml`;

    readBreakpoints(mainWindow, projectPath, workspacePath);

    chokidar.watch(workspacePath).on("change", (path) => {
        readBreakpoints(mainWindow, projectPath, workspacePath);
    });
};

export const getBreakpoints = () => breakpoints;
