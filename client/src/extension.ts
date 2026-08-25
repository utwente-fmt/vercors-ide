/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import * as path from "path";
import * as vscode from "vscode";
import { StatusBarAlignment, workspace } from "vscode";
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
} from "vscode-languageclient/node";
import { ProgressType } from "vscode-languageclient";
import * as fs from "fs";

import {
  VerCorsWebViewProvider as VerCorsCLIWebViewProvider,
  VerCorsOptions,
} from "./vercors-options-webview";
import VerCorsVersionWebviewProvider from "./vercors-version-webview";
import StatusBar from "./status-bar";

let languageClient: LanguageClient;
const verifiedRangesMap: Map<string, vscode.Range[]> = new Map();

//  const verifiedDecorationType = vscode.window.createTextEditorDecorationType({
//     isWholeLine: false,
//     overviewRulerColor: 'green',
//     overviewRulerLane: vscode.OverviewRulerLane.Left,
//     light: {
//         backgroundColor: 'rgba(0,255,0,0.1)'
//     },
//     dark: {
//         backgroundColor: 'rgba(0,128,0,0.3)'
//     },
//     borderWidth: '1px',
//     borderStyle: 'solid',
//     borderColor: 'green',
//     before: {
//         contentText: '✓',
//         margin: '0 0.5em 0 0',
//         color: 'green'
//     }
// });

const verifiedDecorationType = vscode.window.createTextEditorDecorationType({
  backgroundColor: "rgba(0, 255, 0, 0.2)",
  isWholeLine: false,
});

/**
 * Method called when the extension is activated
 * @param {vscode.ExtensionContext} context
 */
export async function activate(
  context: vscode.ExtensionContext,
): Promise<void> {
  await startClient(context);

  const vercorsStatusBarStartButton: vscode.StatusBarItem =
    vscode.window.createStatusBarItem(StatusBarAlignment.Left, 100);
  vercorsStatusBarStartButton.command = "vercors.verify";
  const vercorsStatusBarStopButton: vscode.StatusBarItem =
    vscode.window.createStatusBarItem(StatusBarAlignment.Left, 99);
  vercorsStatusBarStopButton.command = "vercors.stop";
  const vercorsStatusBarProgress: vscode.StatusBarItem =
    vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 98);
  new StatusBar(
    vercorsStatusBarProgress,
    vercorsStatusBarStartButton,
    vercorsStatusBarStopButton,
  );

  // Register a single command that sends a workspace/executeCommand request.
  const disposable = vscode.commands.registerCommand(
    "vercors.verify",
    async () => {
      // Retrieve the active text editor's document URI.
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage("No active editor found.");
        return;
      }
      const uri = editor.document.uri.toString();

      const filePath = editor.document.uri.fsPath;
      const options = VerCorsOptions.getAllFileOptions(filePath);

      try {
        // Send the executeCommand request with the URI as the argument.
        await languageClient.sendRequest("workspace/executeCommand", {
          command: "vercors.lspVerify",
          arguments: [uri, options],
          workDoneToken: "vercors-progress-token",
        } as any);
        //vscode.window.showInformationMessage("Verification command sent.");
      } catch (error) {
        vscode.window.showErrorMessage("Failed to send command: " + error);
      }
    },
  );

  const cancelDisposable = vscode.commands.registerCommand(
    "vercors.stop",
    () => {
      languageClient.sendNotification("window/workDoneProgress/cancel", {
        token: "vercors-progress-token",
      });
      vscode.window.showInformationMessage("Cancellation requested.");
    },
  );

  context.subscriptions.push(disposable);

  context.subscriptions.push(cancelDisposable);

  const optionsProvider: VerCorsCLIWebViewProvider =
    new VerCorsCLIWebViewProvider(context);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      "vercorsOptionsView",
      optionsProvider,
    ),
  );
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(() => {
      console.log("changed active window");
      optionsProvider.updateView();
    }),
  );

  const verCorsVersionWebviewProvider: VerCorsVersionWebviewProvider =
    new VerCorsVersionWebviewProvider(context);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      "vercorsPathView",
      verCorsVersionWebviewProvider,
    ),
  );
  // Register the 'extension.selectVercorsVersion' command
  const disposableVersionCommand: vscode.Disposable =
    vscode.commands.registerCommand("extension.selectVercorsVersion", () =>
      verCorsVersionWebviewProvider.addPath(),
    );
  context.subscriptions.push(disposableVersionCommand);

  context.subscriptions.push(documentLinkProviderDisposable);

  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument((doc) => {
      const uri = doc.uri.toString();
      vscode.window.visibleTextEditors
        .filter((ed) => ed.document.uri.toString() === uri)
        .forEach((ed) => ed.setDecorations(verifiedDecorationType, []));
    }),
  );
}

async function startClient(context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration("vercors");
  const vercorsRoot = config.get<string>("serverPath");

  if (!vercorsRoot) {
    vscode.window.showWarningMessage(
      "VerCors server path is not set or invalid. Use 'Add VerCors Version' to set it.",
    );
    return;
  }

  const jarPath = path.join(vercorsRoot, "vercors.jar");
  const resPath = path.join(vercorsRoot, "res");
  const depsPath = path.join(vercorsRoot, "deps");

  if (
    !fs.existsSync(jarPath) ||
    !fs.existsSync(resPath) ||
    !fs.existsSync(depsPath)
  ) {
    vscode.window.showWarningMessage(
      "VerCors folder is incomplete. Must contain vercors.jar, res/, and deps/.",
    );
    return;
  }

  const classpath = [jarPath, resPath, depsPath].join(path.delimiter);

  // TODO: We need a way to set the path to a specific Java version

  const serverOptions: ServerOptions = {
    run: {
      command: "java",
      args: ["--enable-native-access=ALL-UNNAMED", "-Xms1G", "-Xss512m", "-cp", classpath, "vct.main.Main", "--lsp"],
    },
    debug: {
      command: "java",
      args: ["--enable-native-access=ALL-UNNAMED", "-Xms1G", "-Xss512m", "-cp", classpath, "vct.main.Main", "--lsp"],
    },
  };

  // Options to control the language client
  const clientOptions: LanguageClientOptions = {
    documentSelector: [
      { scheme: "file", language: "pvl" },
      { scheme: "file", language: "java" },
      { scheme: "file", language: "plaintext" },
      { scheme: "file", language: "c" },
      { scheme: "file", language: "cpp" },
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
    clientOptions,
  );

  // Start the client. This will also launch the server
  await languageClient.start();

  languageClient.onNotification("vercors/verifiedRange", (params: any) => {
    const uri = params.uri;
    const ranges = params.ranges.map(
      (r: any) =>
        new vscode.Range(
          new vscode.Position(r.start.line, r.start.character),
          new vscode.Position(r.end.line, r.end.character),
        ),
    );

    const editor = vscode.window.visibleTextEditors.find(
      (e) => e.document.uri.toString() === uri,
    );
    if (!editor) {
      console.warn(`No visible editor for ${uri}`);
      return;
    }

    // **Clear any old** and **apply only the new** decorations:
    editor.setDecorations(verifiedDecorationType, ranges);
  });

  languageClient.onProgress(
    new ProgressType<any>(),
    "vercors-progress-token",
    async (progress: any) => {
      const statusBar = StatusBar.getInstance();

      if (progress.kind === "begin") {
        vscode.window.visibleTextEditors.forEach((ed) =>
          ed.setDecorations(verifiedDecorationType, []),
        );
        //verifiedRangesMap.clear();
        statusBar.updateProgress(0, "", progress.title ?? "Verifying", "");
      } else if (progress.kind === "report") {
        const percentage = progress.percentage ?? 0;
        const message = progress.message ?? "";
        statusBar.updateProgress(percentage, "", message, "");
      } else if (progress.kind === "end") {
        statusBar.updateProgress(100, "", progress.message ?? "Finished", "");
      }
    },
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

const documentLinkProviderDisposable: vscode.Disposable =
  vscode.languages.registerDocumentLinkProvider(
    { language: "vercors-output" }, // Use the language ID
    {
      provideDocumentLinks: (doc) => {
        const links: vscode.ProviderResult<vscode.DocumentLink[]> = [];
        const regex: RegExp = /^.*( )(.*):(\d+):(\d+):/gm; // Adjust regex as needed
        let match: string[] | null;
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
              line.length,
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
    },
  );
