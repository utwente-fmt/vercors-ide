// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';

import { VerCorsPathProvider } from './settingsView';
import { VerCorsWebViewProvider } from './VerCors-CLI-UI';


let outputChannel: vscode.OutputChannel;
const vercorsOptionsMap = new Map(); // TODO: save this in the workspace configuration under vercorsplugin.optionsMap for persistence 

/**
 * Method called when the extension is activated
 * @param {vscode.ExtensionContext} context
 */
function activate(context: vscode.ExtensionContext) {
    // Check if the VerCors path is set
    const vercorsPath = vscode.workspace.getConfiguration().get('vercorsplugin.vercorsPath') as string;
    if (!vercorsPath) {
        vscode.window.showWarningMessage('VerCors binary path is not set. Please set it to run the tool.');
    }
    // Register the 'extension.runVercors' command
    let disposable = vscode.commands.registerCommand('extension.runVercors', () => {
        executeVercorsCommand();
    });

    // Add the disposable to the context so it can be disposed of later
    context.subscriptions.push(disposable);

    let disposableSetPath = vscode.commands.registerCommand('extension.setVercorsPath', () => {
        setVercorsPath();
    });

    context.subscriptions.push(disposableSetPath);

    const optionsProvider = new VerCorsWebViewProvider(context, vercorsOptionsMap);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('vercorsOptionsView', optionsProvider)
    );

    const vercorsPathProvider = new VerCorsPathProvider();
    vscode.window.registerTreeDataProvider('vcpView', vercorsPathProvider);

    vscode.commands.registerCommand('extension.refreshEntry', () =>
        vercorsPathProvider.refresh()
    );
    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(editor => {
            if (editor) {
                const filePath = editor.document.uri.fsPath;
                if (path.extname(filePath) === '.pvl') {
                    console.log("changed active window");
                    const options = vercorsOptionsMap.get(filePath) || {};
                    optionsProvider.updateView(options);
                }
            }
        })
    );
    context.subscriptions.push(documentLinkProviderDisposable);

}

/**
 * Method called when the extension is deactivated
 */
function deactivate() {
}

module.exports = {
    activate,
    deactivate
};

function executeVercorsCommand() {
    // Get the currently active text editor
    const editor = vscode.window.activeTextEditor;

    if (!editor) {
        vscode.window.showErrorMessage('No active text editor.');
        return;
    }
    // Get the URI (Uniform Resource Identifier) of the current file
    const uri = editor!.document.uri;
    const filePath = uri.fsPath;

    if (path.extname(filePath).toLowerCase() !== '.pvl') {
        console.log(filePath);
        vscode.window.showErrorMessage('The active file is not a .pvl file.');
        return; // Exit early if the file is not a .pvl
    }

    const vercorsPath = path.normalize(
        vscode.workspace.getConfiguration().get('vercorsplugin.vercorsPath') as string + path.sep
    ) + "vercors";

    let command = '"' + vercorsPath + '"';

    const fileOptions = vercorsOptionsMap.get(filePath);
    let inputFile = '"' + filePath + '"';
    let args = fileOptions ? ([inputFile].concat(fileOptions)) : [inputFile];

    console.log(command);
    console.log(args);
    // Create the output channel if it doesn't exist
    if (!outputChannel) {
        outputChannel = vscode.window.createOutputChannel("vercors-output", "vercors-output");
    }

    // Clear previous content in the output channel
    outputChannel.clear();
    // Execute the command and send output to the output channel
    const childProcess = require('child_process');
    const process = childProcess.spawn(command, args, { shell: true });

    process.stdout.on('data', (data: Buffer | string) => {
        outputChannel.appendLine(data.toString());
    });
    // Show the output channel
    outputChannel.show(vscode.ViewColumn.Three, true); // Change the ViewColumn as needed
}


function setVercorsPath() {
    vscode.window.showInputBox({
        prompt: "Enter the path to the VerCors bin directory",
        placeHolder: "C:\\path\\to\\vercors\\bin",
        validateInput: (text) => {
            // Optional: Add validation logic here if needed
            return text.trim().length === 0 ? "Path cannot be empty" : null;
        }
    }).then((path) => {
        if (path !== undefined) {
            vscode.workspace.getConfiguration().update('vercorsplugin.vercorsPath', path, true);
        }
    });
}

const documentLinkProviderDisposable = vscode.languages.registerDocumentLinkProvider(
    { language: "vercors-output" }, // Use the language ID
    {
        provideDocumentLinks: (doc, token) => {
            const links: vscode.ProviderResult<vscode.DocumentLink[]> = [];
            const regex = /^.*( )(.*):(\d+):(\d+):/gm; // Adjust regex as needed
            let match;
            let lines = doc.getText().split("\n");
            lines.forEach((line, line_index) => {
                match = regex.exec(line);
                if (match) {
                    const filePath = match[2];
                    const lineNum = parseInt(match[3], 10);
                    const char = parseInt(match[4], 10);

                    // Create a range for the document link
                    const range = new vscode.Range(line_index, 4, line_index, line.length);
                    // Create a URI to the file
                    const uri = vscode.Uri.file(filePath).with({ fragment: `L${lineNum},${char}` });
                    // Add a new DocumentLink to the array
                    links.push(new vscode.DocumentLink(range, uri));
                    console.log(new vscode.DocumentLink(range, uri));
                }
            });
            return links;
        }
    }
);
