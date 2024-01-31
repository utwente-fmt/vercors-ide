import path from 'path';
import * as vscode from 'vscode';

export class VerCorsWebViewProvider implements vscode.WebviewViewProvider {
    private _view?: vscode.WebviewView;

    private _vercorsOptionsMap;

    private readonly _extensionUri: vscode.Uri;

    private _HTMLContent: string | undefined;

    constructor(private context: vscode.ExtensionContext, private optionsMap: Map<String, String>) {
        this._extensionUri = context.extensionUri;
        this._vercorsOptionsMap = optionsMap;
    }

    public async resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        token: vscode.CancellationToken
    ) {
        this._view = webviewView;
        
        webviewView.webview.options = {
            // Enable scripts in the webview
            enableScripts: true
        };

        webviewView.webview.html = await this.getHtmlForWebview(webviewView.webview);

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(message => {
            if (message.command === 'updateOptions') {
                const filePath = vscode.window.activeTextEditor?.document.uri.fsPath;
                if (path.extname(filePath!).toLowerCase() !== '.pvl') {
                    vscode.window.showErrorMessage('The active file is not a .pvl file. Please focus the editor on the PVL file.');
                    return; // Exit early if the file is not a .pvl
                }
                console.log("we have changed the options for this file" + filePath);
                this._vercorsOptionsMap.set(filePath!, message.options);
            }
        });
    }

    private async getHtmlForWebview(webview: vscode.Webview) {
        // Use a path relative to the extension's installation directory
        const htmlPath = vscode.Uri.joinPath(this._extensionUri, '/src/html/vercorsOptions.html');
        
        // Read the file's content
        const htmlContent = await vscode.workspace.fs.readFile(htmlPath);
        
        // Decode the byte array to a string
        const htmlString = Buffer.from(htmlContent).toString('utf8');

        this._HTMLContent = htmlString;
        
        // Return the HTML content for the webview
        return htmlString;
    }

    private updateOption(option: string, value: boolean) {
        // Update your extension's settings or state based on the option selected
        console.log(`Option ${option} set to ${value}`);
    }

    public updateView(options: any) {
        const filePath = vscode.window.activeTextEditor?.document.uri.fsPath;
        const fileOptions = this._vercorsOptionsMap.get(filePath!)
        if (fileOptions) {
            // set the fields based on the saved options
            this._view!.webview.postMessage({ command: 'loadOptions', options: fileOptions});
        } else {
            // load the default options page, since this file has no options associated with it
            this._view!.webview.postMessage({ command: 'uncheckAllCheckboxes' });
        }
    }
}