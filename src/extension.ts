// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';

import { VerCorsWebViewProvider as VerCorsCLIWebViewProvider } from './VerCors-CLI-UI';
import { VerCorsWebViewProvider as VerCorsPathWebViewProvider, VerCorsPaths } from './VerCors-Path-UI';
import * as fs from "fs";


let outputChannel: vscode.OutputChannel;
const vercorsOptionsMap = new Map(); // TODO: save this in the workspace configuration under vercorsplugin.optionsMap for persistence 
let vercorsProcessPid = -1;
/**
 * Method called when the extension is activated
 * @param {vscode.ExtensionContext} context
 */
async function activate(context: vscode.ExtensionContext) {
    // Check if the VerCors path is set
    const vercorsPaths = await VerCorsPaths.getPathList();
    if (!vercorsPaths.length) {
        vscode.window.showWarningMessage('No VerCors binary paths are provided. Please provide one to run the tool.');
    }

    // Register the 'extension.runVercors' command
    let disposableStartCommand = vscode.commands.registerCommand('extension.runVercors', () => {
        executeVercorsCommand();
    });

    // Register the 'extension.stopVercors' command
    let disposableStopCommand = vscode.commands.registerCommand('extension.stopVercors', () => {
        stopVercorsCommand();
    });

    // Add the disposable to the context so it can be disposed of later
    context.subscriptions.push(disposableStartCommand);
    context.subscriptions.push(disposableStopCommand);

    const optionsProvider = new VerCorsCLIWebViewProvider(context, vercorsOptionsMap);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('vercorsOptionsView', optionsProvider)
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
    }));

    const vercorsPathProvider = new VerCorsPathWebViewProvider(context);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('vercorsPathView', vercorsPathProvider)
    );

    // vscode.commands.registerCommand('extension.refreshEntry', () =>
    //     vercorsPathProvider.refresh()
    // );

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

async function executeVercorsCommand() {
    // Get the currently active text editor
    const editor = vscode.window.activeTextEditor;

    if (!editor) {
        vscode.window.showErrorMessage('No active text editor.');
        return;
    }
    // Get the URI (Uniform Resource Identifier) of the current file
    const uri = editor!.document.uri;
    const filePath = uri.fsPath;

    const vercorsPaths = await VerCorsPaths.getPathList();
    if (!vercorsPaths.length) {
        vscode.window.showErrorMessage("No VerCors paths have been specified yet");
        return;
    }

    // get selected vercors version
    const binPath = vercorsPaths.find(p => p.selected);
    if (!binPath) {
        vscode.window.showErrorMessage("No VerCors version has been selected");
        return;
    }

    // remove possible double backslash
    const vercorsPath = path.normalize(binPath.path + path.sep) + "vercors";

    if (!fs.existsSync(vercorsPath) || !fs.lstatSync(vercorsPath).isFile()) {
        vscode.window.showErrorMessage("Could not find VerCors but expected at the given path: " + vercorsPath);
        return;
    }

    let command = '"' + vercorsPath + '"'; // account for spaces

    const fileOptions = vercorsOptionsMap.get(filePath);
    let inputFile = '"' + filePath + '"';
    let args = fileOptions ? ([inputFile].concat(fileOptions)) : [inputFile];

    // Check if we have options, don't check file extension if --lang is used
    if (!fileOptions || (fileOptions && !(fileOptions.includes("--lang")))) {
        if (path.extname(filePath).toLowerCase() !== '.pvl') {
            console.log(filePath);
            vscode.window.showErrorMessage('The active file is not a .pvl file.');
            return; // Exit early if the file is not a .pvl
        }
    }

    // Always execute in progress & verbose mode for extension features to work.
    args.push("--progress");
    args.push("--verbose");

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
    const vercorsProcess = childProcess.spawn(command, args, { shell: true });
    vercorsProcessPid = vercorsProcess.pid;
    vercorsProcess.stdout.on('data', (data: Buffer | string) => {
        outputChannel.appendLine(data.toString());
    });

    vercorsProcess.on('exit', function () {
        vercorsProcessPid = -1;
    });

      
    // Show the output channel
    outputChannel.show(true); // Change the ViewColumn as needed
}

function stopVercorsCommand(){

    //TODO: LOOK at vercors again, should be able to exit it cleanly

    if (vercorsProcessPid === -1){ //check if vercors is running
        vscode.window.showInformationMessage('Vercors is not running');
        return;
    }
    
    var kill = require('tree-kill');
    kill(vercorsProcessPid, 'SIGINT', function(err: string) {
        if(err === null){
            vscode.window.showInformationMessage('Vercors has been succesfully stopped');
        }
        else{
            vscode.window.showInformationMessage('An error occured while trying to stop Vercors: ' + err);
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
