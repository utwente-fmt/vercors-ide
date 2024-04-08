import * as vscode from 'vscode';
import * as fs from 'fs';

import path = require('path');
import { ProgressReceiver } from "./progress-receiver";
import { comparing } from './comparing';

export type VerCorsPath = {
    path: string,
    version: string,
    selected: boolean
};

export class VerCorsPaths {

    public static async getPathList(): Promise<VerCorsPath[]> {
        return this.fixPaths(await vscode.workspace.getConfiguration().get('vercorsplugin.vercorsPath')) as VerCorsPath[];
    }

    public static async storePathList(vercorsPaths: VerCorsPath[]): Promise<void> {
        const stored = vercorsPaths.length ? vercorsPaths : [];
        //todo: remove every wrong path
        await vscode.workspace.getConfiguration().update('vercorsplugin.vercorsPath', this.fixPaths(stored), true);
    }

    public static isEqualPath(p1: VerCorsPath, p2: VerCorsPath): boolean {
        return p1.path === p2.path && p1.version === p2.version && p1.selected === p2.selected;
    }

    private static fixPaths(paths?: any): VerCorsPath[] {
        const pathList = [];
        let pathJSON: any;

        if (paths) {
            for (let i = 0; i < paths.length; i++) {
                try {
                    pathJSON = JSON.parse(JSON.stringify(paths[i]));
                } catch {
                }
                if (typeof pathJSON.selected === "boolean" && comparing.eqSet(new Set(Object.keys(pathJSON)), new Set(["path", "version", "selected"]), this.isEqualPath)) {
                    pathList.push(pathJSON);
                }
            }
        }

        return pathList;
    }

}

export class VerCorsWebViewProvider implements vscode.WebviewViewProvider, ProgressReceiver {
    private static _webview: vscode.Webview | undefined;
    private static instance: VerCorsWebViewProvider;

    private readonly _extensionUri: vscode.Uri;
    private _HTMLContent: string | undefined;

    constructor(context: vscode.ExtensionContext) {
        this._extensionUri = context.extensionUri;
        VerCorsWebViewProvider.instance = this;
    }

    static getInstance(): VerCorsWebViewProvider {
        return VerCorsWebViewProvider.instance;
    }

    public async resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        VerCorsWebViewProvider._webview = webviewView.webview;

        webviewView.webview.options = {
            // Enable scripts in the webview
            enableScripts: true
        };

        if (!this._HTMLContent) {
            this._HTMLContent = await this.getHtmlForWebview();
        }
        webviewView.webview.html = this._HTMLContent;

        webviewView.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'ready':
                        this.sendPathsToWebview(webviewView.webview);
                        break;
                    case 'add-path':
                        // Open folder dialog
                        this.selectNewVercorsPath(webviewView.webview)
                            .then(path => {
                                if (path) {
                                    this.sendPathsToWebview(webviewView.webview);
                                }
                            });
                        break;
                    case 'select':
                        this.selectVercorsPath(message.path)
                            .then(() => {
                                this.sendPathsToWebview(webviewView.webview);
                            });
                        break;
                    case 'remove':
                        this.deleteVerCorsPath(message.path)
                            .then(() => {
                                this.sendPathsToWebview(webviewView.webview);
                            });
                        break;
                }
            },
            undefined
        );

    }

    public async update(percentage: number, step: string, stepName: string): Promise<void> {
        if (!VerCorsWebViewProvider._webview) {
            return;
        }

        VerCorsWebViewProvider._webview.postMessage({
            command: 'progress',
            percentage: percentage,
            step: step,
            stepName: stepName
        });
    }

    private async sendPathsToWebview(webview: vscode.Webview): Promise<void> {
        VerCorsPaths.getPathList()
            .then(paths => {
                webview.postMessage({
                    command: 'add-paths',
                    paths: paths
                });
            });
    }

    private async deleteVerCorsPath(path: string): Promise<void> {
        let vercorsPaths = await VerCorsPaths.getPathList();
        vercorsPaths = vercorsPaths.filter(vercorsPath => vercorsPath.path !== path);
        await VerCorsPaths.storePathList(vercorsPaths);
    }

    private async selectVercorsPath(path: string): Promise<void> {
        const vercorsPaths = await VerCorsPaths.getPathList();
        vercorsPaths.forEach(vercorsPath => {
            vercorsPath.selected = vercorsPath.path === path;
        });
        await VerCorsPaths.storePathList(vercorsPaths);
    }

    private async selectNewVercorsPath(webview: vscode.Webview): Promise<VerCorsPath | undefined> {
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

                const vercorsPaths = await VerCorsPaths.getPathList();
                if (vercorsPaths.find(vercorsPath => vercorsPath.path === binPath)) {
                    vscode.window.showWarningMessage("VerCors version already added");
                    return;
                }

                webview.postMessage({ command: 'loading' });

                const version = await this.getVercorsVersion(vercorsPath);
                if (!version) {
                    webview.postMessage({ command: 'cancel-loading' });
                    return;
                }

                const pathObject = {
                    path: binPath,
                    version: version,
                    selected: vercorsPaths.length === 0
                };
                vercorsPaths.push(pathObject);
                await VerCorsPaths.storePathList(vercorsPaths);

                return pathObject;
            });
    }

    private async getHtmlForWebview(): Promise<string> {
        // Use a path relative to the extension's installation directory
        const htmlPath = vscode.Uri.joinPath(this._extensionUri, '/resources/html/vercorsPath.html');

        // Read the file's content
        const htmlContent = await vscode.workspace.fs.readFile(htmlPath);

        // Decode the byte array to a string
        const htmlString = Buffer.from(htmlContent).toString('utf8');

        this._HTMLContent = htmlString;

        // Return the HTML content for the webview
        return htmlString;
    }

    private async getVercorsVersion(vercorsExecutablePath: string): Promise<string | undefined> {
        return new Promise<string>((resolve, reject) => {
            try {
                const childProcess = require('child_process');
                let command = '"' + vercorsExecutablePath + '"';
                const vercorsProcess = childProcess.spawn(command, ["--version"], { shell: true });
                const pid: number = vercorsProcess.pid;

                vercorsProcess.stdout.on('data', (data: Buffer | string) => {
                    const str = data.toString();
                    this.killPid(pid);
                    if (str.startsWith("Vercors")) {
                        // remove newlines
                        resolve(str.trim());
                    } else {
                        reject('Could not get VerCors version: ' + str);
                    }
                });

                vercorsProcess.stderr.on('data', (data: Buffer | string) => {
                    const str = data.toString();
                    this.killPid(pid);
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

    private killPid(pid: number): void {
        const kill = require('tree-kill');
        kill(pid, 'SIGINT');
    }

}