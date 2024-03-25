import * as vscode from 'vscode';
import * as fs from 'fs';
const path = require('path'); 

export type VercorsPath = {
    path: string,
    version: string,
    selected: boolean
};

export class VerCorsPaths {

    public static async getPathList(): Promise<VercorsPath[]> {
        const vercorsPaths = await vscode.workspace.getConfiguration().get('vercorsplugin.vercorsPath') as VercorsPath[];
        console.log("paths: " + vercorsPaths)
        //todo: remove every wrong path
        if (!vercorsPaths) { // if null
            return [];
        }
        return vercorsPaths;
    }

    public static async storePathList(vercorsPaths: VercorsPath[]): Promise<void> {
        const stored = vercorsPaths.length ? vercorsPaths : null;
        //todo: remove every wrong path
        await vscode.workspace.getConfiguration().update('vercorsplugin.vercorsPath', stored);
    }


    public static isEqual(p1: VercorsPath, p2: VercorsPath): boolean{
       return p1.path === p2.path && p1.version === p2.version && p1.selected == p2.selected
    }

}

export class VerCorsWebViewProvider implements vscode.WebviewViewProvider {
    private readonly _extensionUri: vscode.Uri;

    private _HTMLContent: string | undefined;

    constructor(private context: vscode.ExtensionContext) {
        this._extensionUri = context.extensionUri;
    }

    public async resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext<unknown>,
        token: vscode.CancellationToken
    ) {
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
                        this.deleteVercorsPath(message.path)
                            .then(() => {
                                this.sendPathsToWebview(webviewView.webview);
                            });
                        break;
                }
            },
            undefined
        );

    }

    private async sendPathsToWebview(webview: vscode.Webview) {
        VerCorsPaths.getPathList()
            .then(paths => {
                webview.postMessage({
                    command: 'add-paths',
                    paths: paths
                });
            });
    }

    private async deleteVercorsPath(path: string): Promise<void> {
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

    private async selectNewVercorsPath(webview: vscode.Webview): Promise<VercorsPath | undefined> {
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
                const pid : number = vercorsProcess.pid;

                vercorsProcess.stdout.on('data', (data: Buffer | string) => {
                    const str = data.toString();
                    this.killPid(pid);
                    if (str.startsWith("Vercors")) {
                        // remove newlines
                        resolve(str.replace(/(\r\n|\n|\r)/gm, ""));
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

    private killPid(pid : number) : void {
        const kill = require('tree-kill');
        kill(pid, 'SIGINT');
    }

}