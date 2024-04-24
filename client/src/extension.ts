/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import * as path from 'path';
import * as vscode from 'vscode';
import { ExtensionContext, StatusBarAlignment, workspace } from 'vscode';
import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind } from 'vscode-languageclient/node';

import { VerCorsWebViewProvider as VerCorsCLIWebViewProvider } from './vercors-options-webview';
import VerCorsVersionWebviewProvider from './vercors-version-webview';
import StatusBar from "./status-bar";
import VerCorsRunManager from "./vercors-run-manager";
import VerCorsPathsProvider, { VerCorsPath } from "./vercors-paths-provider";

/**
 * Method called when the extension is activated
 * @param {vscode.ExtensionContext} context
 */
async function activate(context: vscode.ExtensionContext): Promise<void> {
    startClient(context);
    // Check if the VerCors path is set
    const vercorsPaths: VerCorsPath[] = await VerCorsPathsProvider.getInstance().getPathList();
    if (!vercorsPaths.length) {
        vscode.window.showWarningMessage(
            "No VerCors binary paths are provided. Please provide one to run the tool."
        );
    }

    const vercorsStatusBarStartButton: vscode.StatusBarItem = vscode.window.createStatusBarItem(StatusBarAlignment.Left, 100);
    vercorsStatusBarStartButton.command = 'extension.runVercors';
    const vercorsStatusBarStopButton: vscode.StatusBarItem = vscode.window.createStatusBarItem(StatusBarAlignment.Left, 99);
    vercorsStatusBarStopButton.command = 'extension.stopVercors';
    const vercorsStatusBarProgress: vscode.StatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 98);
    new StatusBar(vercorsStatusBarProgress, vercorsStatusBarStartButton, vercorsStatusBarStopButton);

    const diagnosticCollection: vscode.DiagnosticCollection = vscode.languages.createDiagnosticCollection('VerCors');
    let manager: VerCorsRunManager = new VerCorsRunManager(diagnosticCollection);

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
    // The server is implemented in node
    const serverModule = context.asAbsolutePath(
        path.join("server", "out", "server.js")
    );

    // If the extension is launched in debug mode then the debug server options are used
    // Otherwise the run options are used
    const serverOptions: ServerOptions = {
        run: { module: serverModule, transport: TransportKind.ipc },
        debug: {
            module: serverModule,
            transport: TransportKind.ipc,
            options:{
                execArgv: ['--nolazy', '--inspect=6009']
            }
        },
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

    // Create the language client and start the client.
    const client = new LanguageClient(
        "languageServerExample",
        "Language Server Example",
        serverOptions,
        clientOptions
    );

    // Start the client. This will also launch the server
    return client.start();
}

/**
 * Method called when the extension is deactivated
 */
export function deactivate() {
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
