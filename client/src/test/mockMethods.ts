import * as vscode from 'vscode'
import * as sinon from 'sinon'
import * as mock_fs from 'mock-fs'
import * as fs from 'fs'
import { VerCorsWebViewProvider } from '../vercors-options-webview'
import { log } from 'console'
import VerCorsVersionWebviewProvider from '../vercors-version-webview'
import { webviewConnector } from '../webview-connector'
import kill = require('tree-kill');

const projectStartPath = __dirname + "\\..\\..\\..\\.."
const testStartPath = __dirname + "\\..\\..\\src\\test"
const resourcesPath = projectStartPath + '\\resources'
const frontendPath = resourcesPath + '\\html\\'
const vercorsPath = testStartPath + '\\fakeVercors\\bin';




export const mockedPaths = {
        brokenVercorsFolder: testStartPath + '\\brokenVercors',
        workingVercorsFolder: vercorsPath,
        resourcesFolder: resourcesPath
}
export const mockCommandLineOptions = JSON.stringify(
        {"General" : {
            "quiet": {
                "name": "Quiet Mode",
                "description": "Instruct VerCors to only log errors.",
                "skip": false
          }},
          "Advanced" : {
            "more": {
                "name": "More Errors",
                "description": "Always print the maximum amount of information about errors."
          }}
        });

type webviewViewProviderTypes = VerCorsVersionWebviewProvider | VerCorsWebViewProvider

//This context is created to fake the extension context that is used for starting the extension
class MockExtensionContext implements vscode.ExtensionContext{
    subscriptions: { dispose(): any; }[];
    workspaceState: vscode.Memento;
    globalState: vscode.Memento & { setKeysForSync(keys: readonly string[]): void; };
    secrets: vscode.SecretStorage;
    extensionUri: vscode.Uri = vscode.Uri.file(projectStartPath); ;
    extensionPath: string;
    environmentVariableCollection: vscode.GlobalEnvironmentVariableCollection;
    asAbsolutePath(relativePath: string){
        return projectStartPath + relativePath
    }
    storageUri: vscode.Uri;
    storagePath: string;
    globalStorageUri: vscode.Uri;
    globalStoragePath: string;
    logUri: vscode.Uri;
    logPath: string;
    extensionMode: vscode.ExtensionMode;
    extension: vscode.Extension<any>;
}

/**
 * this is a fake webviewView to be used for resolving the webview.
 * It is mostly set so it doesn't really matter what is in here.
 */
export class mockWebviewView implements vscode.WebviewView{

    onDidReceiveMessageListener: (e: any) => any;
    viewType: string;
    webview: vscode.Webview = {

        // Mock properties and methods of the Webview interface
        onDidReceiveMessage: new vscode.EventEmitter<any>().event,
        options: undefined,
        html: '',
        asWebviewUri: function (localResource: vscode.Uri): vscode.Uri {
            throw new Error('Function not implemented.');
        },
        cspSource: '',
        postMessage: function (message: any): Thenable<boolean> {
            throw new Error('Function not implemented.');
        }
    };
    title?: string;
    description?: string;
    badge?: vscode.ViewBadge;
    onDidDispose: vscode.Event<void>;
    visible: boolean = true;
    onDidChangeVisibility: vscode.Event<void>;
    show(preserveFocus?: boolean): void {
        throw new Error('Method not implemented.');
    }
}


export class testMocking{
    
    context: vscode.ExtensionContext;
    fakeConfiguration: {};
    logger: string[];
    webviewViewMock: mockWebviewView
    isErrorMessageShown: boolean;
    isWarningMessageShown: boolean;
    WebviewViewProvider: webviewConnector;


    constructor(WebviewViewProvider: new (arg0: vscode.ExtensionContext) => webviewConnector){
        this.context = new MockExtensionContext();
        this.fakeConfiguration = {};
        this.logger = [];
        this.webviewViewMock = new mockWebviewView();
        this.isErrorMessageShown = false;
        this.isWarningMessageShown = false;
        this.WebviewViewProvider = new WebviewViewProvider(this.context);

    }

    private setPostMessageMock(){
        var self = this; // because this is used in another async function it doesn't work otherwise
        self.webviewViewMock.webview.postMessage = 
            function (message: string): Thenable<boolean> {
                return new Promise((resolve) => { self.logger.push(message); resolve(true);});
            }

    }

    public sendDataToBackend(){
        
    }

    private showErrorMessageMocking(){
        
        sinon.stub(vscode.window,"showErrorMessage").callsFake(() => this.isErrorMessageShown = true)
    }

    private showWarningMessageMocking(){
        
        sinon.stub(vscode.window,"showWarningMessage").callsFake(() => this.isWarningMessageShown = true)
    }
    private workspaceSettingsMocking(){
       
        const vscodeWorkspaceStub = sinon.stub();
        vscodeWorkspaceStub.returns({
                get: (section: string | number, defaultValue: any) => this.fakeConfiguration[section] || defaultValue || {},
                update: (section: string | number, value: any) => this.fakeConfiguration[section] = value 
        });
        sinon.stub(vscode.workspace, 'getConfiguration').callsFake(vscodeWorkspaceStub); // has to be from vscode.workspace instead of vscode, because workspace is no function

    }

    /**
    * When trying to open the file dialog, give a Uri that goes to a vercors bin that is in the vercors project.
    * This way you never access file outside of the test folder.
    */
    public showFileDialogMocking<M extends keyof typeof mockedPaths>(folderPath: M ){
        var self = this; // because this is used in another function it doesn't work otherwise
        vscode.window.showOpenDialog = () => {return null} // to be able to stub it if it is already stubbed
        sinon.stub(vscode.window, 'showOpenDialog').callsFake(() => Promise.resolve(self.createMockUri(mockedPaths[folderPath] + "\\vercors")));
    }


    private createMockUri(path: string): [vscode.Uri] {

    
        const mockFolderUri: vscode.Uri = {
            scheme: 'file',
            authority: '',
            path: path,
            query: '',
            fragment: '',
            fsPath: path, // Calculate the filesystem path based on the path
            with: (change: { scheme?: string; authority?: string; path?: string; query?: string; fragment?: string; }) => {
                // Optionally, implement the `with` method if needed
                return mockFolderUri;
            },
            toJSON: function () {
                throw new Error('Function not implemented.');
            }
        };
    
        return [mockFolderUri];
    }

    //mock the vscode api file call by redirecting it to the fs call, because fs goes now to our own fake filesystem
    private WorkspaceFsMocking(){
        const vscodeWorkspaceFsStub = sinon.stub();
        vscodeWorkspaceFsStub.returns({
                readFile: (uri :vscode.Uri) => fs.readFileSync(uri.fsPath)
        });
        sinon.stub(vscode.workspace,'fs').get(vscodeWorkspaceFsStub)
    }


    private fsMocking(){

        
        mock_fs({
            [mockedPaths.brokenVercorsFolder]:{
                'vercors': 'broken vercors'
            },
            [mockedPaths.workingVercorsFolder]: {
                'vercors': 'vercors'
            },
            [mockedPaths.resourcesFolder]:{
                'html':{
                    'vercorsPath.html': 'vercorsPath.html',
                    'vercorsOptions.html': 'vercorsOption.html'
                },
                'command-line-options.json': mockCommandLineOptions
            },
        });

    }

    private startMockWebviewViewProvider(){
        this.WebviewViewProvider.resolveWebviewView(this.webviewViewMock,undefined,undefined);
    }




    public async mockFrontend() {
        this.workspaceSettingsMocking();
        this.fsMocking();
        this.WorkspaceFsMocking();
        this.startMockWebviewViewProvider();
        this.setPostMessageMock()
        this.showErrorMessageMocking();
        this.showWarningMessageMocking();
        this.showFileDialogMocking("workingVercorsFolder");
    }

    public stopFrontendMocking(): void{
        mock_fs.restore();
        sinon.restore();
    }

    


    
}