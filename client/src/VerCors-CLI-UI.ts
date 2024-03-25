import * as vscode from 'vscode';

export type OptionFields = {
    pinned: string[],
    flags: string[]
}


type Options = Record<string, OptionFields>
export class VercorsOptions {

    public static getFlagOptions(filePath: string): Array<string> {
        const vercorsOptions = vscode.workspace.getConfiguration().get('vercorsplugin.optionsMap',{}) as Options;
        //todo: should give empty optionfields if it is not rigth
        return vercorsOptions[filePath] ? vercorsOptions[filePath].flags : [];
    }

    public static getAllOptions(filePath: string): OptionFields {
        const vercorsOptions = vscode.workspace.getConfiguration().get('vercorsplugin.optionsMap',{}) as Options;
        if (!this.isOptions(vercorsOptions)){ //todo: should give empty optionfields if it is not rigth
            vercorsOptions = {} as Options
        }
        return vercorsOptions[filePath] ? vercorsOptions[filePath] : { pinned: [], flags: [] };
    }
    public static async updateOptions(filePath: string, vercorsOptions: string[], pinnedOptions: string[]): Promise<void> {
        let currentVercorsOptions = vscode.workspace.getConfiguration().get('vercorsplugin.optionsMap',{}) as Options;
        if (!this.isOptions(currentVercorsOptions)){
            currentVercorsOptions = {} as Options
        }
        currentVercorsOptions[filePath] = {pinned:pinnedOptions.map(e => e.trim()) ,flags:vercorsOptions.map(e => e.trim())}
        console.log({file: filePath, ...currentVercorsOptions[filePath]});
        await vscode.workspace.getConfiguration().update('vercorsplugin.optionsMap', currentVercorsOptions);
    }

    public static isEqual(o1: OptionFields, o2: OptionFields): boolean{
      return this.compareLists(o1.pinned,o2.pinned) && this.compareLists(o1.flags, o2.flags)
    }

    private static isOptions(option): boolean{
        //todo: should only change shit that is wrong and delete those
        try{
            let optionsJSON = JSON.parse(option);
            for(var optionJSON in optionsJSON){
                if(!(Array.isArray(optionsJSON[optionJSON].pinned) && Array.isArray(optionsJSON[optionJSON].flags) && new Set(Object.keys(optionsJSON[optionJSON])) === new Set(["pinned","flags"]))){
                    return false;
                }
            }
            return true;

        }
        catch(e){
            return false;
        }

    }

    public static compareLists(l1, l2){
        if(l1.length !== l2.length){
            return false;
        }
        const s1 = new Set(l1);
        const s2 = new Set(l2);

        if(s1.size !== s2.size){
            return false;
        }

        return [...s1].every(element => s2.has(element)) && [...s2].every(element => s2.has(element));

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
                VercorsOptions.updateOptions(filePath!, message.options,message.pinnedOptions);
            } else if (message.command === 'viewLoaded') {
                const data = await this.fetchCommandLineOptions();
                this._view!.webview.postMessage({ command: 'loadAllOptions', data: data });
                if(vscode.window.activeTextEditor !== undefined){
                    this.updateView();
                }
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

    public updateView() {
        const filePath = vscode.window.activeTextEditor?.document.uri.fsPath;
        const fileOptions = VercorsOptions.getAllOptions(filePath!);
        // console.log(fileOptions.flags)
        // console.log(fileOptions.pinned)
        this._view!.webview.postMessage({ command: 'loadOptions', options: fileOptions.flags, pinnedOptions: fileOptions.pinned});
    }
}