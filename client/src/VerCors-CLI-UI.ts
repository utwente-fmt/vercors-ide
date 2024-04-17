import * as vscode from 'vscode';
import { comparing } from './comparing';
import { webviewConnector } from './webviewConnector';

export type OptionFields = flagType & pinnedType & backendType;

enum backend { silicon = "--backend silicon", carbon = "--backend carbon"}

type backendType = { backend: string };
type pinnedType = { pinned: string[] };
type flagType = { flags: string[] };
type Options = pinnedType & backendType & Record<string, flagType>;

export class VerCorsOptions {

    public static getSelectedOptions(filePath: string): Array<string> {
        const selected = this.getFlagedOptions(filePath);
        selected.push(this.getBackendOption());
        return selected;
    }

    public static getAllFileOptions(filePath: string): OptionFields {
        return VerCorsOptions.fixOptions(vscode.workspace.getConfiguration().get('vercorsplugin.optionsMap', {}), filePath) as OptionFields;
    }

    public static getFlagedOptions(filePath: string): string[] {
        return VerCorsOptions.fixFlagOptions(vscode.workspace.getConfiguration().get('vercorsplugin.optionsMap'), filePath) as string[];
    }

    public static getPinnedOptions(): string[] {
        return this.fixPinnedOptions(vscode.workspace.getConfiguration().get('vercorsplugin.optionsMap')) as string[];
    }

    public static getBackendOption(): backend {
        return this.fixBackendOptions(vscode.workspace.getConfiguration().get('vercorsplugin.optionsMap')) as backend;

    }

    public static async updateOptions(filePath: string, vercorsOptions: string[], pinnedOptions: string[], backendOption: string): Promise<void> {
        let currentVercorsOptions = (VerCorsOptions.fixOptions(vscode.workspace.getConfiguration().get('vercorsplugin.optionsMap', {})) || {}) as Options;
        currentVercorsOptions[filePath] = { flags: vercorsOptions.map(e => e.trim()) };
        currentVercorsOptions["backend"] = backendOption;
        currentVercorsOptions["pinned"] = pinnedOptions;
        console.log({ file: filePath, ...currentVercorsOptions[filePath] });
        await vscode.workspace.getConfiguration().update('vercorsplugin.optionsMap', currentVercorsOptions, true);
    }

    public static isSilicon() {
        return backend.silicon === this.getBackendOption();
    }

    public static isEqualOptionFields(o1: OptionFields, o2: OptionFields): boolean {
        return comparing.compareLists(o1.pinned, o2.pinned) && comparing.compareLists(o1.flags, o2.flags);
    }

    private static fixPinnedOptions(options: { [x: string]: string[]; }): string[] {
        const isStringList = options && options["pinned"] && Array.isArray(options["pinned"]) && options["pinned"].every(item => typeof item === "string");
        return isStringList ? options["pinned"] : [];
    }

    private static fixFlagOptions(options: Options, filePath?: string) {
        let optionsJSON: any;
        try {
            optionsJSON = JSON.parse(JSON.stringify(options));
        } catch (e) {
            return {};
        }

        if (filePath) {
            if (!optionsJSON) {
                return [];
            }

            let fileOptionsJSON = optionsJSON[filePath];
            const hasRightValue = fileOptionsJSON && Array.isArray(fileOptionsJSON.flags) && comparing.eqSet(new Set(Object.keys(fileOptionsJSON)), new Set(["flags"]));
            return hasRightValue ? fileOptionsJSON.flags : [];

        } else {
            if (!optionsJSON) {
                return {};
            }
            console.log(optionsJSON);
            for (let optionJSON in optionsJSON) {
                if (!(optionsJSON[optionJSON] && Array.isArray(optionsJSON[optionJSON].flags) && comparing.eqSet(new Set(Object.keys(optionsJSON[optionJSON])), new Set(["flags"])))) {
                    try {
                        (!delete optionsJSON[optionJSON]);
                    } catch {
                        return {};
                    }
                }
            }
            return optionsJSON;
        }

    }

    private static fixBackendOptions(options: { [x: string]: string | number; }): backend {
        return options && backend[options["backend"]] ? backend[options["backend"]] : backend.silicon;
    }

    private static fixOptions(options: any, filePath?: any): Options | OptionFields {
        let flagOptions: any;
        if (filePath) {
            flagOptions = { flags: this.fixFlagOptions(options, filePath) };
        } else {
            flagOptions = this.fixFlagOptions(options);
        }
        console.log({
            ...flagOptions,
            pinned: this.fixPinnedOptions(options),
            backend: this.fixBackendOptions(options)
        });
        return { ...flagOptions, pinned: this.fixPinnedOptions(options), backend: this.fixBackendOptions(options) };

    }


}
export class VerCorsWebViewProvider implements webviewConnector {
    private _view?: vscode.WebviewView;

    private readonly _extensionUri: vscode.Uri;

    constructor(context: vscode.ExtensionContext) {
        this._extensionUri = context.extensionUri;
    }

    public async resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            // Enable scripts in the webview
            enableScripts: true
        };

        webviewView.webview.html = await this.getHtmlForWebview(webviewView.webview);

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(async message => this.receiveMessage(message))
    }

    public async receiveMessage(message: any): Promise<void> {
        if (message.command === 'updateOptions') {
            const filePath = vscode.window.activeTextEditor?.document.uri.fsPath;
            await VerCorsOptions.updateOptions(filePath!, message.options, message.pinnedOptions, message.backendOption);
        } else if (message.command === 'viewLoaded') {
            const data = await this.fetchCommandLineOptions();
            this._view!.webview.postMessage({ command: 'loadAllOptions', data: data });
            if (vscode.window.activeTextEditor !== undefined) {
                this.updateView();
            }
        }
    };

    private async getHtmlForWebview(_webview: vscode.Webview) {
        // Use a path relative to the extension's installation directory
        const htmlPath = vscode.Uri.joinPath(this._extensionUri, '/resources/html/vercorsOptions.html');

        // Read the file's content
        const htmlContent = await vscode.workspace.fs.readFile(htmlPath);

        // Decode the byte array to a string
        // Return the HTML content for the webview
        return Buffer.from(htmlContent).toString('utf8');
    }

    private async fetchCommandLineOptions() {
        const optionsPath = vscode.Uri.joinPath(this._extensionUri, '/resources/command-line-options.json');
        const optionsContent = await vscode.workspace.fs.readFile(optionsPath);
        return JSON.parse(Buffer.from(optionsContent).toString('utf8'));
    }

    public updateView() {
        const filePath = vscode.window.activeTextEditor?.document.uri.fsPath;
        const fileOptions = VerCorsOptions.getAllFileOptions(filePath!);
        // console.log(fileOptions.flags)
        // console.log(fileOptions.pinned)
        console.log(fileOptions.flags);
        this._view!.webview.postMessage({
            command: 'loadOptions',
            options: fileOptions.flags,
            pinnedOptions: fileOptions.pinned,
            backendOption: VerCorsOptions.isSilicon()
        });
    }

}