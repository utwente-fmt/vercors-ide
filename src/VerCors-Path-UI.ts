import * as vscode from 'vscode';
import * as fs from 'fs';
import path from 'path';

export class VerCorsWebViewProvider implements vscode.WebviewViewProvider {
    private _view?: vscode.WebviewView;

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
        this._view = webviewView;

        webviewView.webview.options = {
            // Enable scripts in the webview
            enableScripts: true
        };

        webviewView.webview.html = await this.getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'ready':
                        this.sendPathsToWebview(webviewView.webview);
                        break;
                    case 'add-path':
                        // Open folder dialog
                        this.selectNewVercorsPath()
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

    private async sendPathsToWebview(webview : vscode.Webview) {
        this.getVercorsPaths()
            .then(paths => {
                webview.postMessage({
                    command: 'add-paths',
                    paths: paths
                });
            });
    }

    private async deleteVercorsPath(path : string) : Promise<void> {
        const vercorsPaths = await this.getPathsMap();
        vercorsPaths.delete(path);
        await this.storePathsMap(vercorsPaths);
    }

    private async selectVercorsPath(path : string) : Promise<void> {
        const vercorsPaths = await this.getPathsMap();
        if (!vercorsPaths.has(path)) {
            return;
        }
        const newMap = new Map<string, boolean>();
        for (let key of vercorsPaths.keys()) {
            newMap.set(key, false);
        }
        newMap.set(path, true);
        await this.storePathsMap(newMap);
    }

    private async selectNewVercorsPath() : Promise<[string, boolean] | undefined> {
        return vscode.window.showOpenDialog({
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false
        })
        .then(async folderUri => {
            if (!folderUri || !folderUri[0]) {
                return;
            }

            let binPath = folderUri![0].fsPath;
            let vercorsPath = binPath + path.sep + "vercors";
            if (!fs.existsSync(vercorsPath) || !fs.lstatSync(vercorsPath).isFile()) {
                vscode.window.showErrorMessage("Could not find VerCors at the given path");
                return;
            }

            const vercorsPaths = await this.getPathsMap();
            if (vercorsPaths.has(binPath)) {
                vscode.window.showWarningMessage("VerCors version already added");
                return;
            }
            vercorsPaths.set(binPath, false);
            await this.storePathsMap(vercorsPaths);

            return [binPath, false];
        });
    }

    private async getVercorsPaths() : Promise<[string, boolean][]> {
        return Array.of(...(await this.getPathsMap()).entries());
    }

    private async getHtmlForWebview(webview: vscode.Webview) : Promise<string> {
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

    private async getPathsMap() : Promise<Map<string, boolean>> {
        let vercorsPathsObject = await vscode.workspace.getConfiguration().get('vercorsplugin.vercorsPath') as Object;
        if (!vercorsPathsObject) { // if null
            return new Map<string, boolean>();
        } else {
            return new Map<string, boolean>(Object.entries(vercorsPathsObject));
        }
    }

    private async storePathsMap(vercorsPaths : Map<string, boolean>) : Promise<void> {
        let vercorsPathsObject = Object.fromEntries(vercorsPaths.entries());
        await vscode.workspace.getConfiguration().update('vercorsplugin.vercorsPath', vercorsPathsObject, true);
    }
    
}