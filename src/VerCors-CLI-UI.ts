import * as vscode from 'vscode';

export class VerCorsWebViewProvider implements vscode.WebviewViewProvider {
    private _view?: vscode.WebviewView;

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        token: vscode.CancellationToken
    ) {
        this._view = webviewView;
        
        webviewView.webview.options = {
            // Enable scripts in the webview
            enableScripts: true
        };

        webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(data => {
            switch (data.command) {
                case 'updateOption':
                    this.updateOption(data.option, data.value);
                    return;
            }
        });
    }

    private getHtmlForWebview(webview: vscode.Webview) {
        // Your HTML content goes here
        // You'll create a form with checkboxes for each CLI option
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>VerCors Options</title>
            <!-- You can add style here or link to an external stylesheet -->
        </head>
        <body>
            <h1>VerCors Options</h1>
            <form id="options-form">
                <div>
                    <input type="checkbox" id="quiet" name="quiet">
                    <label for="quiet">Quiet Mode (--quiet)</label>
                </div>
                <div>
                    <input type="checkbox" id="verbose" name="verbose">
                    <label for="verbose">Verbose Mode (--verbose)</label>
                </div>
                <!-- Add more checkboxes for other options -->
                <button type="button" id="submit">Apply</button>
            </form>
        
            <script>
                const vscode = acquireVsCodeApi();
        
                document.getElementById('submit').addEventListener('click', () => {
                    const quiet = document.getElementById('quiet').checked;
                    const verbose = document.getElementById('verbose').checked;
                    // Gather other options similarly
        
                    vscode.postMessage({
                        command: 'updateOptions',
                        options: { quiet, verbose /*, ... other options */ }
                    });
                });
            </script>
        </body>
        </html>
        `;
    }

    private updateOption(option: string, value: boolean) {
        // Update your extension's settings or state based on the option selected
        console.log(`Option ${option} set to ${value}`);
    }
}