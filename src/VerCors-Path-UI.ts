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
                case 'select-path':
                    // Open folder dialog
                    vscode.window.showOpenDialog({
                        canSelectFiles: false,
                        canSelectFolders: true,
                        canSelectMany: false
                    })
                    .then(folderUri => {
                        if (!folderUri || !folderUri[0]) {
                            return;
                        }

                        let binPath = folderUri![0].fsPath;
                        let vercorsPath = binPath + path.sep + "vercors";
                        if (!fs.existsSync(vercorsPath) || !fs.lstatSync(vercorsPath).isFile()) {
                            vscode.window.showErrorMessage("Could not find VerCors at the given path");
                        }

                        vscode.window.showInformationMessage(binPath);
                    });
                    break;
              }
            },
            undefined
          );
            
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
    
}