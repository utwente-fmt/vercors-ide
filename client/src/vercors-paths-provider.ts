import * as vscode from 'vscode';
import * as fs from 'fs';

import path = require('path');
import { comparing } from './comparing';
import kill = require('tree-kill');
export type VerCorsPath = {
    path: string,
    version: string,
    selected: boolean
};

export default class VerCorsPathsProvider {

    private static instance: VerCorsPathsProvider;

    public static getInstance(): VerCorsPathsProvider {
        if (!this.instance) {
            this.instance = new VerCorsPathsProvider();
        }
        return this.instance;
    }

    public async getPathList(): Promise<VerCorsPath[]> {
        return this.fixPaths(await vscode.workspace.getConfiguration().get('vercorsplugin.vercorsPath')) as VerCorsPath[];
    }

    public async storePathList(vercorsPaths: VerCorsPath[]): Promise<void> {
        const stored = vercorsPaths.length ? vercorsPaths : [];
        //todo: remove every wrong path
        await vscode.workspace.getConfiguration().update('vercorsplugin.vercorsPath', this.fixPaths(stored), true);
    }

    public async selectPath(path: string): Promise<void> {
        const vercorsPaths = await this.getPathList();
        vercorsPaths.forEach(vercorsPath => {
            vercorsPath.selected = vercorsPath.path === path;
        });
        return this.storePathList(vercorsPaths);
    }

    public async deletePath(path: string): Promise<void> {
        let vercorsPaths = await this.getPathList();
        vercorsPaths = vercorsPaths.filter(vercorsPath => vercorsPath.path !== path);
        return this.storePathList(vercorsPaths);
    }

    public async selectVersionFromDialog(beforeDetection?: () => void, onError?: () => void): Promise<VerCorsPath | undefined> {
        return vscode.window.showOpenDialog({
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false
        })
            .then(async folderUri => {
                if (!folderUri || !folderUri[0]) {
                    return;
                }

                const binPath = folderUri![0].fsPath;
                const vercorsPath = binPath + path.sep + "vercors";
                if (!fs.existsSync(vercorsPath) || !fs.lstatSync(vercorsPath).isFile()) {
                    vscode.window.showErrorMessage("Could not find VerCors at the given path");
                    return;
                }

                const vercorsPaths = await this.getPathList();
                if (vercorsPaths.find(vercorsPath => vercorsPath.path === binPath)) {
                    vscode.window.showWarningMessage("VerCors version already added");
                    return;
                }

                if (beforeDetection) {
                    beforeDetection();
                }

                const version = await this.detectVersion(vercorsPath);
                if (!version) {
                    if (onError) {
                        onError();
                    }
                    return;
                }

                const pathObject: VerCorsPath = {
                    path: binPath,
                    version: version,
                    selected: vercorsPaths.length === 0
                };
                vercorsPaths.push(pathObject);
                await this.storePathList(vercorsPaths);

                return pathObject;
            });
    }

    private async detectVersion(executablePath: string): Promise<string | undefined> {
        return new Promise<string>((resolve, reject) => {
            try {
                const childProcess = require('child_process');
                let command = '"' + executablePath + '"';
                const process = childProcess.spawn(command, ["--version"], { shell: true });
                const pid: number = process.pid;

                process.stdout.on('data', (data: Buffer | string) => {
                    const str = data.toString();
                    killPid(pid);
                    if (str.startsWith("Vercors")) {
                        // remove newlines
                        resolve(str.trim());
                    } else {
                        reject('Could not get VerCors version: ' + str);
                    }
                });

                process.stderr.on('data', (data: Buffer | string) => {
                    const str = data.toString();
                    killPid(pid);
                    reject(str);
                });
            } catch (_e) {
                reject(_e);
            }
        })
            .catch(reason => {
                vscode.window.showErrorMessage(reason.toString());
                return undefined;
            });
    }

    private fixPaths(paths?: any): VerCorsPath[] {
        const pathList = [];
        let pathJSON: any;

        if (paths) {
            for (let i = 0; i < paths.length; i++) {
                try {
                    pathJSON = JSON.parse(JSON.stringify(paths[i]));
                } catch {
                }
                if (typeof pathJSON.selected === "boolean" && comparing.eqSet(new Set(Object.keys(pathJSON)), new Set(["path", "version", "selected"]), isEqualPath)) {
                    pathList.push(pathJSON);
                }
            }
        }

        return pathList;
    }

}

function killPid(pid: number): void {

    kill(pid, 'SIGINT');
}

export function isEqualPath(p1: VerCorsPath, p2: VerCorsPath): boolean {
    return p1.path === p2.path && p1.version === p2.version && p1.selected === p2.selected;
}