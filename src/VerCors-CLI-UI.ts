import path from 'path';
import * as vscode from 'vscode';


type Options = Record<string, string[]>

export class VercorsOptions {

    public static getOptions(filePath: string): Array<string> {
        const vercorsOptions = vscode.workspace.getConfiguration().get('vercorsplugin.optionsMap',{}) as Options;
        const fileOptions = vercorsOptions[filePath];
        if (!fileOptions) { // if null
            return [];
        }
        return fileOptions;
    }

    public static async updateOptions(filePath: string, vercorsOptions: string[]): Promise<void> {
        let currentVercorsOptions = vscode.workspace.getConfiguration().get('vercorsplugin.optionsMap',{}) as Options;
        currentVercorsOptions[filePath] = vercorsOptions; 
        console.log(vercorsOptions);
        await vscode.workspace.getConfiguration().update('vercorsplugin.optionsMap', currentVercorsOptions, true);
    }

    public static async addOptions(filePath: string, vercorsOptions: string[]): Promise<void> {
        let currentVercorsOptions = vscode.workspace.getConfiguration().get('vercorsplugin.optionsMap',{}) as Options;
        let fileOptions = this.getOptions(filePath);
        console.log(fileOptions)
        fileOptions.push(...vercorsOptions);
        currentVercorsOptions[filePath] = fileOptions;
        await vscode.workspace.getConfiguration().update('vercorsplugin.optionsMap', currentVercorsOptions, true);
    }
    public static async removeOptions(filePath: string, vercorsOptions: string[]): Promise<void> {
        let currentVercorsOptions = vscode.workspace.getConfiguration().get('vercorsplugin.optionsMap',{}) as Options;
        let fileOptions = this.getOptions(filePath).filter((el,ind) => vercorsOptions.includes(el) === false);
        currentVercorsOptions[filePath] = fileOptions;
        await vscode.workspace.getConfiguration().update('vercorsplugin.optionsMap', currentVercorsOptions, true);
    }


}

export class VerCorsWebViewProvider implements vscode.WebviewViewProvider {
    private _view?: vscode.WebviewView;

    private readonly _extensionUri: vscode.Uri;

    private _HTMLContent: string | undefined;

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
        webviewView.webview.onDidReceiveMessage(async message => {
            if (message.command === 'updateOptions') {
                const filePath = vscode.window.activeTextEditor?.document.uri.fsPath;

                console.log("we have changed the options for this file" + filePath);
                VercorsOptions.updateOptions(filePath!, message.options);

            } else if (message.command === 'viewLoaded') {
                const data = await this.fetchCommandLineOptions();
                this._view!.webview.postMessage({ command: 'loadAllOptions', data: data });
            }
        });
    }

    private async getHtmlForWebview(webview: vscode.Webview) {
        // Use a path relative to the extension's installation directory
        const htmlPath = vscode.Uri.joinPath(this._extensionUri, '/resources/html/vercorsOptions.html');

        // Read the file's content
        const htmlContent = await vscode.workspace.fs.readFile(htmlPath);

        // Decode the byte array to a string
        const htmlString = Buffer.from(htmlContent).toString('utf8');

        this._HTMLContent = htmlString;

        // Return the HTML content for the webview
        return htmlString;
    }

    private async fetchCommandLineOptions() {
        const optionsPath = vscode.Uri.joinPath(this._extensionUri, '/resources/command-line-options.json');
        const optionsContent = await vscode.workspace.fs.readFile(optionsPath);
        return JSON.parse(Buffer.from(optionsContent).toString('utf8'));
    }

    private updateOption(option: string, value: boolean) {
        // Update your extension's settings or state based on the option selected
        console.log(`Option ${option} set to ${value}`);
    }

    public updateView(options: any) {
        const filePath = vscode.window.activeTextEditor?.document.uri.fsPath;
        const fileOptions = VercorsOptions.getOptions(filePath!);
        console.log(fileOptions)
        if (fileOptions) {
            // set the fields based on the saved options
            this._view!.webview.postMessage({ command: 'loadOptions', options: fileOptions });
        } else {
            // load the default options page, since this file has no options associated with it
            this._view!.webview.postMessage({ command: 'loadOptions', options: [] });
        }
    }
}