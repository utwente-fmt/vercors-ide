import * as vscode from 'vscode';
import ProgressReceiver from "./progress-receiver";
import VerCorsPathsProvider, { VerCorsPath } from "./vercors-paths-provider";
import { webviewConnector } from './webview-connector';


export default class VerCorsVersionWebviewProvider implements webviewConnector, ProgressReceiver {
    private webview: vscode.Webview | undefined;
    private webviewView: vscode.WebviewView | undefined;
    private static instance: VerCorsVersionWebviewProvider;

    private readonly _extensionUri: vscode.Uri;
    private _HTMLContent: string | undefined;

    constructor(context: vscode.ExtensionContext) {
        this._extensionUri = context.extensionUri;
        VerCorsVersionWebviewProvider.instance = this;
    }

    public static getInstance(): VerCorsVersionWebviewProvider {
        return VerCorsVersionWebviewProvider.instance;
    }

    public async resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ): Promise<void> {
        this.webviewView = webviewView;
        this.webview = webviewView.webview;

        this.webview.options = {
            // Enable scripts in the webview
            enableScripts: true
        };

        if (!this._HTMLContent) {
            this._HTMLContent = await this.getHtmlForWebview();
        }
        this.webview.html = this._HTMLContent;

        this.webview.onDidReceiveMessage(
            message => this.receiveMessage(message),
            undefined
        );
    }

    private hasWebview(): boolean {
        return !(!this.webviewView || !this.webview || !this.webviewView.webview) && this.webviewView.visible;
    }

    public async receiveMessage(message: any): Promise<void> {
        switch (message.command) {
            case 'ready':
                return this.ready();
            case 'add-path':
                return this.addPath();
            case 'select':
                return this.selectPath(message.path);
            case 'remove':
                return this.removePath(message.path);
        }
    }

    private async ready(): Promise<void> {
        return this.sendPathsToWebview();
    }

    public async addPath(): Promise<void> {
        // Open folder dialog
        return VerCorsPathsProvider.getInstance()
            .selectVersionFromDialog(
                (): void => {
                    if (this.hasWebview()) {
                        this.webview.postMessage({ command: 'loading' });
                    }
                },
                (): void => {
                    if (this.hasWebview()) {
                        this.webview.postMessage({ command: 'cancel-loading' });
                    }
                }
            )
            .then((path: VerCorsPath | undefined): void => {
                if (path) {
                    if (!this.hasWebview()) {
                        vscode.window.showInformationMessage("VerCors version added");
                    } else {
                        this.sendPathsToWebview();
                    }
                }
            });
    }

    private async selectPath(path: string): Promise<void> {
        return VerCorsPathsProvider.getInstance().selectPath(path)
            .then((): void => {
                this.sendPathsToWebview();
            });
    }

    private async removePath(path: string): Promise<void> {
        return VerCorsPathsProvider.getInstance().deletePath(path)
            .then((): void => {
                this.sendPathsToWebview();
            });
    }

    public async updateProgress(percentage: number, step: string, stepName: string, _details: string): Promise<void> {
        if (!this.hasWebview()) {
            return;
        }

        this.webview.postMessage({
            command: 'progress',
            percentage: percentage,
            step: step,
            stepName: stepName
        });
    }

    private async sendPathsToWebview(): Promise<void> {
        if (!this.hasWebview()) {
            return;
        }
        return VerCorsPathsProvider.getInstance().getPathList()
            .then((paths: VerCorsPath[]):void => {
                this.webview.postMessage({
                    command: 'add-paths',
                    paths: paths
                });
            });
    }

    private async getHtmlForWebview(): Promise<string> {
        // Use a path relative to the extension's installation directory
        const htmlPath: vscode.Uri = vscode.Uri.joinPath(this._extensionUri, '/resources/html/vercorsPath.html');

        // Read the file's content
        const htmlContent: Uint8Array = await vscode.workspace.fs.readFile(htmlPath);

        // Decode the byte array to a string
        const htmlString: string = Buffer.from(htmlContent).toString('utf8');

        this._HTMLContent = htmlString;

        // Return the HTML content for the webview
        return htmlString;
    }


}