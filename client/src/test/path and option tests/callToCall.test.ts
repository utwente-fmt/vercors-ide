import * as vscode from 'vscode';
import * as sinon from 'sinon'
import {VercorsOptions,OptionFields} from "../../VerCors-CLI-UI"
import {VerCorsPaths,VercorsPath, VerCorsWebViewProvider} from '../../VerCors-Path-UI';
import {Assert} from '../Assert';
import {beforeEach,afterEach} from 'mocha';
import * as mock_fs from 'mock-fs'
import * as fs from 'fs'
import * as vercorsExtension from "../../extension"
import { activate } from '../language server tests/helper';
import { posix } from 'path';

const projectStartPath = __dirname + "/../../../.."

//This context is created to fake the extension context that is used for starting the extension
class MockExtensionContext implements vscode.ExtensionContext{
    subscriptions: { dispose(): any; }[];
    workspaceState: vscode.Memento;
    globalState: vscode.Memento & { setKeysForSync(keys: readonly string[]): void; };
    secrets: vscode.SecretStorage;
    extensionUri: vscode.Uri;
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
    viewType: string;
    webview: vscode.Webview;
    title?: string;
    description?: string;
    badge?: vscode.ViewBadge;
    onDidDispose: vscode.Event<void>;
    visible: boolean;
    onDidChangeVisibility: vscode.Event<void>;
    show(preserveFocus?: boolean): void {
        throw new Error('Method not implemented.');
    }
}

class testMocking{

    
    context = new MockExtensionContext();

    public workspaceSettingsMocking(fakeConfiguration: { [x: string]: any; }){
        const vscodeWorkspaceStub = sinon.stub();
        vscodeWorkspaceStub.returns({
                get: (section, defaultValue) => fakeConfiguration[section] || defaultValue,
                update: (section, value) => fakeConfiguration[section] = value 
        });
        sinon.stub(vscode.workspace, 'getConfiguration').callsFake(vscodeWorkspaceStub); // has to be from vscode.workspace instead of vscode, because workspace is no function

    }

    public showFileDialogMocking(){
        sinon.stub(vscode.window, 'showOpenDialog').callsFake(() => Promise.resolve(vscode.Uri.parse('fakeVercors/bin')));
    }

    //mock the vscode api file call by redirecting it to the fs call, because fs goes now to our own fake filesystem
    public WorkspaceFsMocking(){
        const vscodeWorkspaceFsStub = sinon.stub();
        vscodeWorkspaceFsStub.returns({
                readFile: (uri :vscode.Uri) => fs.readFileSync(uri.fsPath)
        });
        sinon.stub(vscode.workspace,'fs').callsFake(vscodeWorkspaceFsStub)
    }


    public fsMocking(){
        const frontendPath = projectStartPath + '/resources/html'
        mock_fs({
            'fakeVercors/bin': {
                'vercors': fs.readFileSync(projectStartPath +  '/client/src/test/fakeVercors/vercors', 'utf-8') // vercors is not compiled so not put in the out folder
            },
            frontend:{
                'vercorsPath.html': fs.readFileSync(frontendPath + "/vercorsPath.html"),
                'vercorsOptions.html': fs.readFileSync(frontendPath + "/vercorsOptions.html")
            }
        });

    }

    /**
     * Mocks the postmessage and puts it in a dictionary, so we can see what is send by the webview
     * @param returnDictionary the dictionary where the message send is put into
     */
    public postMessageMocking(webview: vscode.Webview,returnDictionary: {}){
        sinon.stub(webview, 'postMessage').callsFake((message) => returnDictionary = message)
        
    }

    
}



suite('Path handling', async () => {
    const fakeConfiguration = {}
    let WebviewViewProvider: VerCorsWebViewProvider;
    let testMock: testMocking;
    let webviewViewMock: mockWebviewView;
    let returnDictionary = {};


    beforeEach(async () => {
        testMock = new testMocking();
        webviewViewMock = new mockWebviewView();
        testMock.workspaceSettingsMocking(fakeConfiguration);
        testMock.showFileDialogMocking();
        testMock.fsMocking();
        testMock.WorkspaceFsMocking();
        WebviewViewProvider = new VerCorsWebViewProvider(new MockExtensionContext())
        WebviewViewProvider.resolveWebviewView(webviewViewMock, undefined,undefined)
        //testMock.postMessageMocking(webviewViewMock.webview,returnDictionary)
    })
    afterEach(() => {
        mock_fs.restore();
        sinon.restore();
        vercorsExtension.deactivate()
    })

	test('', async () => {
        console.log(testMock.context)

        //send a message
    });
});