import * as vscode from 'vscode';

export class VerCorsWebViewProvider implements vscode.WebviewViewProvider {
    private _view?: vscode.WebviewView;

    private readonly _extensionUri: vscode.Uri;

    constructor(private context: vscode.ExtensionContext) {
        this._extensionUri = context.extensionUri;
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
        webviewView.webview.onDidReceiveMessage(data => {
            switch (data.command) {
                case 'updateOption':
                    this.updateOption(data.option, data.value);
                    return;
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
        
        // Return the HTML content for the webview
        return htmlString;
    }

    private updateOption(option: string, value: boolean) {
        // Update your extension's settings or state based on the option selected
        console.log(`Option ${option} set to ${value}`);
    }
}