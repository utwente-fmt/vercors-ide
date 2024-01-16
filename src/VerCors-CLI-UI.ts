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

        // // Handle messages from the webview
        // webviewView.webview.onDidReceiveMessage(data => {
        //     switch (data.command) {
        //         case 'updateOption':
        //             this.updateOption(data.option, data.value);
        //             return;
        //     }
        // });
    }

    private getHtmlForWebview(webview: vscode.Webview) {
        // Your HTML content goes here
        // You'll create a form with checkboxes for each CLI option
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>Cat Colors</title>
        </head>
        <body>
            <button class="add-color-button">Add Color</button>
        </body>
        </html>`;
    }

    private updateOption(option: string, value: boolean) {
        // Update your extension's settings or state based on the option selected
        console.log(`Option ${option} set to ${value}`);
    }
}