import * as vscode from 'vscode';
import * as sinon from 'sinon'
import {OptionFields} from "../../VerCors-CLI-UI"
import { VerCorsOptions } from '../../VerCors-CLI-UI';
import {VerCorsPath} from '../../vercors-paths-provider'
import VerCorsPathsProvider from '../../vercors-paths-provider';
import VerCorsWebViewProvider from '../../vercors-version-webview';
import {Assert} from '../Assert';
import {beforeEach,afterEach} from 'mocha';
import * as mock_fs from 'mock-fs'
import * as fs from 'fs'
import * as vercorsExtension from "../../extension"
import { activate } from '../language server tests/helper';
import { posix } from 'path';
import { spawn } from 'child_process';
import {waitFor} from 'wait-for-event';
import {EventEmitter} from 'events';

const projectStartPath = __dirname + "/../../../.."
const testStartPath = __dirname + "/../../../src/test"

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
    
    public updatePostMessageMock(emitter: EventEmitter, mockWebviewView:mockWebviewView, jsonToken?: string){
        mockWebviewView.webview.postMessage = 
            function (message: any): Thenable<boolean> {
                return new Promise((resolve) => resolve(emitter.emit(jsonToken? message[jsonToken]: message)));
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
    * When trying to open the file dialog, give a Uri that goes to a vercors bin that is in the vercors project.
    * This way you never access file outside of the test folder.
    */
    public showFileDialogMocking(){
        sinon.stub(vscode.window, 'showOpenDialog').callsFake(() => Promise.resolve(this.createMockUri(testStartPath + '/fakeVercors/vercors')));
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
        const frontendPath = projectStartPath + '/resources/html/'
        const vercorsPath = testStartPath + '/fakeVercors/vercors';
        mock_fs({
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
    let eventEmitter;



    beforeEach(async () => {


        testMock = new testMocking();
        eventEmitter = new EventEmitter()
        webviewViewMock = new mockWebviewView();
        testMock.workspaceSettingsMocking(fakeConfiguration);
        testMock.showFileDialogMocking();
        testMock.fsMocking();
        testMock.WorkspaceFsMocking();
        WebviewViewProvider = new VerCorsWebViewProvider(new MockExtensionContext())
        WebviewViewProvider.resolveWebviewView(webviewViewMock,undefined,undefined);
        
   
    })
    afterEach(() => {
        mock_fs.restore();
        sinon.restore();

    })

	test('', async () => {
        testMock.updatePostMessageMock(eventEmitter,webviewViewMock,"command")
        WebviewViewProvider.receiveMessage({ command: "add-path" })
        await waitFor("cancel-loading", eventEmitter);
        console.log(returnDictionary)
        //send a message
    });
});