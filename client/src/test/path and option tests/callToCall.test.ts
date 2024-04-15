import * as vscode from 'vscode';
import * as sinon from 'sinon'

import VerCorsWebViewProvider from '../../vercors-version-webview';
import {Assert} from '../Assert';
import {beforeEach,afterEach} from 'mocha';
import * as mock_fs from 'mock-fs'
import * as fs from 'fs'


const projectStartPath = __dirname + "\\..\\..\\..\\.."
const testStartPath = __dirname + "\\..\\..\\..\\src\\test"
const frontendPath = projectStartPath + '\\resources\\html\\'
const vercorsPath = testStartPath + '\\fakeVercors\\bin';

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
class mockWebviewView implements vscode.WebviewView{

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


class testMocking{

    
    context = new MockExtensionContext();
    
    public updatePostMessageMock(logger: string[], mockWebviewView:mockWebviewView){
        mockWebviewView.webview.postMessage = 
            function (message: string): Thenable<boolean> {
                return new Promise((resolve) => { logger.push(message); resolve(true);});
            }

    }
    public workspaceSettingsMocking(fakeConfiguration: { [x: string]: any; }){
        const vscodeWorkspaceStub = sinon.stub();
        vscodeWorkspaceStub.returns({
                get: (section, defaultValue) => fakeConfiguration[section] || defaultValue || {},
                update: (section, value) => fakeConfiguration[section] = value 
        });
        sinon.stub(vscode.workspace, 'getConfiguration').callsFake(vscodeWorkspaceStub); // has to be from vscode.workspace instead of vscode, because workspace is no function

    }

    /**
    * Goes to a vercors file with the wrong contents
    */
    public showFileDialogBrokenMocking(){
        sinon.stub(vscode.window, 'showOpenDialog').callsFake(() => Promise.resolve(this.createMockUri(testStartPath + '\\brokenVercors')));
    }

    /**
    * When trying to open the file dialog, give a Uri that goes to a vercors bin that is in the vercors project.
    * This way you never access file outside of the test folder.
    */
    public showFileDialogTrueMocking(){
        sinon.stub(vscode.window, 'showOpenDialog').callsFake(() => Promise.resolve(this.createMockUri(testStartPath + '\\fakeVercors\\bin')));
    }

    public createMockUri(path: string): [vscode.Uri] {

    
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
    public WorkspaceFsMocking(){
        const vscodeWorkspaceFsStub = sinon.stub();
        vscodeWorkspaceFsStub.returns({
                readFile: (uri :vscode.Uri) => fs.readFileSync(uri.fsPath)
        });
        sinon.stub(vscode.workspace,'fs').get(vscodeWorkspaceFsStub)
    }


    public fsMocking(){
        

        mock_fs({
            [testStartPath + "\\brokenVercors"]:{
                'vercors': 'broken vercors'
            },
            [vercorsPath]: {
                'vercors': 'vercors'
            },
            [frontendPath]:{
                'vercorsPath.html': 'vercorsPath.html',
                'vercorsOptions.html': 'vercorsOption.html'
            }
        });

    }

  

    


    
}




suite('Path handling', async () => {
    const fakeConfiguration = {}
    let WebviewViewProvider: VerCorsWebViewProvider;
    let testMock: testMocking;
    let webviewViewMock: mockWebviewView;
    let returnDictionary = {};
    let logger: string[];



    beforeEach(async () => {

        logger = []
        testMock = new testMocking();
        webviewViewMock = new mockWebviewView();
        testMock.workspaceSettingsMocking(fakeConfiguration);
        testMock.fsMocking();
        testMock.WorkspaceFsMocking();
        WebviewViewProvider = new VerCorsWebViewProvider(new MockExtensionContext())
        WebviewViewProvider.resolveWebviewView(webviewViewMock,undefined,undefined);
        testMock.updatePostMessageMock(logger,webviewViewMock)
        
   
    })
    afterEach(() => {
        mock_fs.restore();
        sinon.restore();

    })

	test('broken vercors file chosen', async () => {
        testMock.showFileDialogBrokenMocking();
        await WebviewViewProvider.receiveMessage({ command: "add-path" })
        Assert.failOnJsonEventAbsence([["command","cancel-loading"]], logger )

    });

    test('correct vercors file chosen', async () => {
        testMock.showFileDialogTrueMocking();
        const path = `{ path: ${vercorsPath}, selected:true, version: 'Vercors 2.0.0'}`
        await WebviewViewProvider.receiveMessage({ command: "add-path" })
        Assert.failOnJsonEventAbsence([["command","add-paths"],["paths",path]],logger)    
    });


});