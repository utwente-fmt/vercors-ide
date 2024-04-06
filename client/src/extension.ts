/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as path from "path";
import { workspace, ExtensionContext } from "vscode";
import * as vscode from "vscode";
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from "vscode-languageclient/node";

import {
  VerCorsWebViewProvider as VerCorsCLIWebViewProvider,
  VercorsOptions,
} from "./VerCors-CLI-UI";
import {
  VerCorsWebViewProvider as VerCorsPathWebViewProvider,
  VerCorsPaths,
} from "./VerCors-Path-UI";
import { OutputState } from "./output-parser";
import * as fs from "fs";

let outputChannel: vscode.OutputChannel;
let diagnosticCollection =
  vscode.languages.createDiagnosticCollection("VerCors");
const vercorsOptionsMap = new Map(); // TODO: save this in the workspace configuration under vercorsplugin.optionsMap for persistence
let vercorsProcessPid = -1;

let client: LanguageClient;

async function startClient(context) {
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
    },
  };

  // Options to control the language client
  const clientOptions: LanguageClientOptions = {
    // Register the server for plain text documents
    documentSelector: [
      { scheme: "file", language: "pvl" },
      { scheme: "file", language: "plaintext" },
    ],
    synchronize: {
      // Notify the server about file changes to '.clientrc files contained in the workspace
      fileEvents: workspace.createFileSystemWatcher("**/.clientrc"),
    },
  };

  // Create the language client and start the client.
  client = new LanguageClient(
    "languageServerExample",
    "Language Server Example",
    serverOptions,
    clientOptions
  );

  // Start the client. This will also launch the server
  client.start();
}

/**
 * Method called when the extension is activated
 * @param {vscode.ExtensionContext} context
 */
async function activate(context: vscode.ExtensionContext) {
  startClient(context);
  // Check if the VerCors path is set
  const vercorsPaths = await VerCorsPaths.getPathList();
  if (!vercorsPaths.length) {
    vscode.window.showWarningMessage(
      "No VerCors binary paths are provided. Please provide one to run the tool."
    );
  }

  // Register the 'extension.runVercors' command
  let disposableStartCommand = vscode.commands.registerCommand(
    "extension.runVercors",
    () => {
      executeVercorsCommand();
    }
  );

  // Register the 'extension.stopVercors' command
  let disposableStopCommand = vscode.commands.registerCommand(
    "extension.stopVercors",
    () => {
      stopVercorsCommand();
    }
  );

  // Add the disposable to the context so it can be disposed of later
  context.subscriptions.push(disposableStartCommand);
  context.subscriptions.push(disposableStopCommand);

  const optionsProvider = new VerCorsCLIWebViewProvider(context);
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

  const vercorsPathProvider = new VerCorsPathWebViewProvider(context);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      "vercorsPathView",
      vercorsPathProvider
    )
  );

  // vscode.commands.registerCommand('extension.refreshEntry', () =>
  //     vercorsPathProvider.refresh()
  // );

  context.subscriptions.push(documentLinkProviderDisposable);
}

/**
 * Method called when the extension is deactivated
 */
function deactivate() {}

module.exports = {
  activate,
  deactivate,
};

async function executeVercorsCommand() {
  // Get the currently active text editor
  const editor = vscode.window.activeTextEditor;

  if (!editor) {
    vscode.window.showErrorMessage("No active text editor.");
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
  const binPath = vercorsPaths.find((p) => p.selected);
  if (!binPath) {
    vscode.window.showErrorMessage("No VerCors version has been selected");
    return;
  }

  // remove possible double backslash
  const vercorsPath = path.normalize(binPath.path + path.sep) + "vercors";

  if (!fs.existsSync(vercorsPath) || !fs.lstatSync(vercorsPath).isFile()) {
    vscode.window.showErrorMessage(
      "Could not find VerCors but expected at the given path: " + vercorsPath
    );
    return;
  }

  let command = '"' + vercorsPath + '"'; // account for spaces

  const fileOptions = VercorsOptions.getSelectedOptions(filePath);
  let inputFile = '"' + filePath + '"';
  let args = fileOptions ? [inputFile].concat(fileOptions) : [inputFile];

  // Check if we have options, don't check file extension if --lang is used
  if (!fileOptions || (fileOptions && !fileOptions.includes("--lang"))) {
    const ext = path.extname(filePath).toLowerCase();
    if (ext !== ".pvl" && ext !== ".java" && ext !== ".c") {
      console.log(filePath);
      vscode.window.showErrorMessage(
        "The active file is not a .pvl, .java or .c file."
      );
      return; // Exit early if the file is not a .pvl .java or .c
    }
  }

  // Always execute in progress & verbose mode for extension features to work.
  args.push("--progress");
  args.push("--verbose");

  // console.log(command);
  // console.log(args);
  // Create the output channel if it doesn't exist
  if (!outputChannel) {
    outputChannel = vscode.window.createOutputChannel(
      "vercors-output",
      "vercors-output"
    );
  }

  // Clear previous content in the output channel
  outputChannel.clear();
  // Execute the command and send output to the output channel
  console.log(command, args);
  const childProcess = require("child_process");
  const vercorsProcess = childProcess.spawn(command, args, { shell: true });
  vercorsProcessPid = vercorsProcess.pid;

  const outputState = new OutputState(outputChannel, uri, diagnosticCollection);

  vercorsProcess.stdout.on("data", (data: Buffer | string) => {
    let lines: string[] = data.toString().split(/(\r\n|\n|\r)/gm);
    for (let line of lines) {
      outputState.accept(line);
    }
  });

  vercorsProcess.on("exit", function () {
    outputState.finish();
    vercorsProcessPid = -1;
  });

  // Show the output channel
  outputChannel.show(true); // Change the ViewColumn as needed
}

function stopVercorsCommand() {
  if (vercorsProcessPid === -1) {
    //check if vercors is running
    vscode.window.showInformationMessage("Vercors is not running");
    return;
  }

  var kill = require("tree-kill");
  kill(vercorsProcessPid, "SIGINT", function (err: string) {
    if (err === null) {
      vscode.window.showInformationMessage(
        "Vercors has been succesfully stopped"
      );
    } else {
      vscode.window.showInformationMessage(
        "An error occured while trying to stop Vercors: " + err
      );
    }
  });
}

const documentLinkProviderDisposable =
  vscode.languages.registerDocumentLinkProvider(
    { language: "vercors-output" }, // Use the language ID
    {
      provideDocumentLinks: (doc) => {
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
            const range = new vscode.Range(
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
