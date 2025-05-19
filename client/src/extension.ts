 /* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
 import * as path from 'path';
 import * as vscode from 'vscode';
 import { ExtensionContext, StatusBarAlignment, workspace } from 'vscode';
 import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind } from 'vscode-languageclient/node';
 import { ProgressType } from 'vscode-languageclient';
 
 
 import { VerCorsWebViewProvider as VerCorsCLIWebViewProvider } from './vercors-options-webview';
 import VerCorsVersionWebviewProvider from './vercors-version-webview';
 import StatusBar from "./status-bar";
 import VerCorsRunManager from "./vercors-run-manager";
 import VerCorsPathsProvider, { VerCorsPath } from "./vercors-paths-provider";
 
 let languageClient: LanguageClient;
 /**
  * Method called when the extension is activated
  * @param {vscode.ExtensionContext} context
  */
 export async function activate(context: vscode.ExtensionContext): Promise<void> {
     await startClient(context);
     // Check if the VerCors path is set
     const vercorsPaths: VerCorsPath[] = await VerCorsPathsProvider.getInstance().getPathList();
     if (!vercorsPaths.length) {
         vscode.window.showWarningMessage(
             "No VerCors binary paths are provided. Please provide one to run the tool."
         );
     }
 
     const vercorsStatusBarStartButton: vscode.StatusBarItem = vscode.window.createStatusBarItem(StatusBarAlignment.Left, 100);
     vercorsStatusBarStartButton.command = 'clientVerify';
     const vercorsStatusBarStopButton: vscode.StatusBarItem = vscode.window.createStatusBarItem(StatusBarAlignment.Left, 99);
     vercorsStatusBarStopButton.command = 'stopVerification';
     const vercorsStatusBarProgress: vscode.StatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 98);
     new StatusBar(vercorsStatusBarProgress, vercorsStatusBarStartButton, vercorsStatusBarStopButton);
 
     const diagnosticCollection: vscode.DiagnosticCollection = vscode.languages.createDiagnosticCollection('VerCors');
     let manager: VerCorsRunManager = new VerCorsRunManager(diagnosticCollection);
 
      // Register a single command that sends a workspace/executeCommand request.
   const disposable = vscode.commands.registerCommand('clientVerify', async () => {
     // Retrieve the active text editor's document URI.
     const editor = vscode.window.activeTextEditor;
     if (!editor) {
       vscode.window.showErrorMessage("No active editor found.");
       return;
     }
     const uri = editor.document.uri.toString();
 
     try {
       // Send the executeCommand request with the URI as the argument.
       await languageClient.sendRequest('workspace/executeCommand', {
         command: 'vercors.lspVerify',
         arguments: [uri],
         workDoneToken: "vercors-progress-token"
       } as any);
       //vscode.window.showInformationMessage("Verification command sent.");
     } catch (error) {
       vscode.window.showErrorMessage("Failed to send command: " + error);
     }
   });
 
   const cancelDisposable = vscode.commands.registerCommand('stopVerification', () => {
     languageClient.sendNotification('window/workDoneProgress/cancel', {
       token: "vercors-progress-token"
     });
     vscode.window.showInformationMessage("Cancellation requested.");
   });
   
   
 
   context.subscriptions.push(disposable);
 
   context.subscriptions.push(cancelDisposable);
 
   
 
     // Register the 'extension.runVercors' command
     const disposableStartCommand: vscode.Disposable = vscode.commands.registerCommand(
         "extension.runVercors", () => manager.runVerCors()
     );
     // Register the 'extension.stopVercors' command
     const disposableStopCommand: vscode.Disposable = vscode.commands.registerCommand(
         "extension.stopVercors", () => manager.stopVerCors()
     );
 
     // Add the disposable to the context, so it can be disposed of later
     context.subscriptions.push(disposableStartCommand);
     context.subscriptions.push(disposableStopCommand);
 
     const optionsProvider: VerCorsCLIWebViewProvider = new VerCorsCLIWebViewProvider(context);
     context.subscriptions.push(
         vscode.window.registerWebviewViewProvider(
             "vercorsOptionsView",
             optionsProvider
         )
     );
     context.subscriptions.push(
         vscode.window.onDidChangeActiveTextEditor(() => {
             console.log("changed active window");
             optionsProvider.updateView();
         })
     );
 
     const verCorsVersionWebviewProvider: VerCorsVersionWebviewProvider = new VerCorsVersionWebviewProvider(context);
     context.subscriptions.push(
         vscode.window.registerWebviewViewProvider(
             "vercorsPathView",
             verCorsVersionWebviewProvider
         )
     );
     // Register the 'extension.selectVercorsVersion' command
     const disposableVersionCommand: vscode.Disposable = vscode.commands.registerCommand(
         "extension.selectVercorsVersion", () => verCorsVersionWebviewProvider.addPath()
     );
     context.subscriptions.push(disposableVersionCommand);
 
     context.subscriptions.push(documentLinkProviderDisposable);
 }
 
 async function startClient(context: vscode.ExtensionContext) {
     // Running lsp server)
     const serverOptions: ServerOptions = {
         run: {
           command: "java",
           args: ["-Xms1G","-Xss512m","-cp","/home/ysuof/IdeaProjects/vercors/out/vercors/main/assembly.dest/out.jar:/home/ysuof/IdeaProjects/vercors/res/universal/res:/home/ysuof/IdeaProjects/vercors/res/universal/deps",
             "vct.main.Main",
             "--lsp"
           ]
         },
         debug: {
           command: "/home/ysuof/IdeaProjects/vercors/out/vercors/main/runScript.dest/vercors",
           args: ["--lsp", "--debug"]
         }
       };      
 
     // Options to control the language client
     const clientOptions: LanguageClientOptions = {
         documentSelector: [
             { scheme: "file", language: "pvl" },
             { scheme: "file", language: "java" },
             { scheme: "file", language: "plaintext" },
         ],
         synchronize: {
             // Notify the server about file changes to '.clientrc files contained in the workspace
             fileEvents: workspace.createFileSystemWatcher("**/.clientrc"),
         },
     };
 
     // Create the language client and start it
     languageClient = new LanguageClient(
         "scalaLanguageServer",
         "Scala Language Server",
         serverOptions, 
         clientOptions
     ); 
 
     // Start the client. This will also launch the server
     await languageClient.start();
 
     languageClient.onProgress(
         new ProgressType<any>(),
         "vercors-progress-token",
         async (progress: any) => {
           const statusBar = StatusBar.getInstance();
       
           if (progress.kind === 'begin') {
             statusBar.updateProgress(0, '', progress.title ?? 'Verifying', '');
           } else if (progress.kind === 'report') {
             const percentage = progress.percentage ?? 0;
             const message = progress.message ?? '';
             statusBar.updateProgress(percentage, '', message, '');
           } else if (progress.kind === 'end') {
             statusBar.updateProgress(100, '', progress.message ?? 'Finished', '');
           }          
         }
       );
       
 }
 
 /**
  * Method called when the extension is deactivated
  */
 export function deactivate(): Thenable<void> | undefined {
     if (!languageClient) {
       return undefined;
     }
     return languageClient.stop();
   }
 
 module.exports = {
     activate,
     deactivate,
 };
 
 const documentLinkProviderDisposable: vscode.Disposable = vscode.languages.registerDocumentLinkProvider(
  { language: "vercors-output" }, // Use the language ID
  {
      provideDocumentLinks: (doc) => {
          const links: vscode.ProviderResult<vscode.DocumentLink[]> = [];
          const regex: RegExp = /^.*( )(.*):(\d+):(\d+):/gm; // Adjust regex as needed
          let match: string[];
          let lines: string[] = doc.getText().split("\n");
          lines.forEach((line, line_index) => {
              match = regex.exec(line);
              if (match) {
                  const filePath: string = match[2];
                  const lineNum: number = parseInt(match[3], 10);
                  const char: number = parseInt(match[4], 10);

                  // Create a range for the document link
                  const range: vscode.Range = new vscode.Range(
                      line_index,
                      4,
                      line_index,
                      line.length
                  );
                  // Create a URI to the file
                  const uri = vscode.Uri.file(filePath).with({
                      fragment: `L${lineNum},${char}`,
                  });
                  // Add a new DocumentLink to the array
                  links.push(new vscode.DocumentLink(range, uri));
                  console.log(new vscode.DocumentLink(range, uri));
              }
          });
          return links;
      },
  }
);
