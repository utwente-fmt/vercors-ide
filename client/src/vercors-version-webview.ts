import * as vscode from "vscode";
import ProgressReceiver from "./progress-receiver";
import VerCorsPathsProvider, { VerCorsPath } from "./vercors-paths-provider";
import { webviewConnector } from "./webview-connector";
import * as fs from "fs";
import * as path from "path";

export default class VerCorsVersionWebviewProvider
  implements webviewConnector, ProgressReceiver
{
  private webview: vscode.Webview | undefined;
  private webviewView: vscode.WebviewView | undefined;
  private static instance: VerCorsVersionWebviewProvider;

  private readonly _extensionUri: vscode.Uri;
  private _HTMLContent: string | undefined;

  constructor(context: vscode.ExtensionContext) {
    this._extensionUri = context.extensionUri;
    VerCorsVersionWebviewProvider.instance = this;
  }

  public static getInstance(): VerCorsVersionWebviewProvider {
    return VerCorsVersionWebviewProvider.instance;
  }

  public async resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ): Promise<void> {
    this.webviewView = webviewView;
    this.webview = webviewView.webview;

    this.webview.options = {
      // Enable scripts in the webview
      enableScripts: true,
    };

    if (!this._HTMLContent) {
      this._HTMLContent = await this.getHtmlForWebview();
    }
    this.webview.html = this._HTMLContent;

    this.webview.onDidReceiveMessage(
      (message) => this.receiveMessage(message),
      undefined,
    );
  }

  private hasWebview(): boolean {
    return (
      !(!this.webviewView || !this.webview || !this.webviewView.webview) &&
      this.webviewView.visible
    );
  }

  public async receiveMessage(message: any): Promise<void> {
    switch (message.command) {
      case "ready":
        return this.ready();
      case "add-path":
        return this.addPath();
      case "select":
        return this.selectPath(message.path);
      case "remove":
        return this.removePath(message.path);
    }
  }

  private async ready(): Promise<void> {
    return this.sendPathsToWebview();
  }

  public async addPath(): Promise<void> {
    // 1) Pick a folder
    const selection = await vscode.window.showOpenDialog({
      canSelectFolders: true,
      canSelectFiles: false,
      canSelectMany: false,
      openLabel: "Select VerCors Server Folder",
    });
    if (!selection?.[0]) {
      return;
    }
    const folder = selection[0].fsPath;

    // 2) Your existing jar/res/deps checks
    const jar = path.join(folder, "vercors.jar");
    const res = path.join(folder, "res");
    const deps = path.join(folder, "deps");
    if (!fs.existsSync(jar) || !fs.existsSync(res) || !fs.existsSync(deps)) {
      vscode.window.showErrorMessage(
        "Selected folder is not a valid VerCors server (missing vercors.jar or res/deps).",
      );
      return;
    }

    // 3) Keep your LSP-startup setting
    await vscode.workspace
      .getConfiguration("vercors")
      .update("serverPath", folder, vscode.ConfigurationTarget.Global);

    // 4) Also push into vercorsplugin.vercorsPath so the webview list isn’t empty
    const prov = VerCorsPathsProvider.getInstance();
    const existing = await prov.getPathList();

    // un-select all, then add the new one as selected
    existing.forEach((e) => (e.selected = false));
    existing.push({
      path: folder,
      version: path.basename(folder), // ← or call your detectVersion here
      selected: true,
    });
    await prov.storePathList(existing);

    // 5) Rerender the webview (or show a notice if it’s not visible)
    if (this.hasWebview()) {
      this.sendPathsToWebview();
    } else {
      vscode.window.showInformationMessage(
        `VerCors server path set to: ${folder}`,
      );
    }
  }

  // public async addPath(): Promise<void> {
  //     // Open folder dialog
  //     return VerCorsPathsProvider.getInstance()
  //         .selectVersionFromDialog(
  //             (): void => {
  //                 if (this.hasWebview()) {
  //                     this.webview.postMessage({ command: 'loading' });
  //                 }
  //             },
  //             (): void => {
  //                 if (this.hasWebview()) {
  //                     this.webview.postMessage({ command: 'cancel-loading' });
  //                 }
  //             }
  //         )
  //         .then((path: VerCorsPath | undefined): void => {
  //             if (path) {
  //                 if (!this.hasWebview()) {
  //                     vscode.window.showInformationMessage("VerCors version added");
  //                 } else {
  //                     this.sendPathsToWebview();
  //                 }
  //             }
  //         });
  // }

  private async selectPath(path: string): Promise<void> {
    return VerCorsPathsProvider.getInstance()
      .selectPath(path)
      .then((): void => {
        this.sendPathsToWebview();
      });
  }

  private async removePath(path: string): Promise<void> {
    return VerCorsPathsProvider.getInstance()
      .deletePath(path)
      .then((): void => {
        this.sendPathsToWebview();
      });
  }

  public async updateProgress(
    percentage: number,
    step: string,
    stepName: string,
    _details: string,
  ): Promise<void> {
    if (!this.hasWebview()) {
      return;
    }

    this.webview.postMessage({
      command: "progress",
      percentage: percentage,
      step: step,
      stepName: stepName,
    });
  }

  // private async sendPathsToWebview(): Promise<void> {
  //     if (!this.hasWebview()) {
  //         return;
  //     }
  //     return VerCorsPathsProvider.getInstance().getPathList()
  //         .then((paths: VerCorsPath[]):void => {
  //             this.webview.postMessage({
  //                 command: 'add-paths',
  //                 paths: paths
  //             });
  //         });
  // }
  private async sendPathsToWebview(): Promise<void> {
    if (!this.hasWebview()) {
      return;
    }

    const allPaths = await VerCorsPathsProvider.getInstance().getPathList();
    let toShow = allPaths.find((p) => p.selected);
    if (!toShow && allPaths.length) {
      toShow = allPaths[allPaths.length - 1];
    }
    this.webview.postMessage({
      command: "add-paths",
      paths: toShow ? [toShow] : [],
    });
  }

  private async getHtmlForWebview(): Promise<string> {
    // Use a path relative to the extension's installation directory
    const htmlPath: vscode.Uri = vscode.Uri.joinPath(
      this._extensionUri,
      "/resources/html/vercorsPath.html",
    );

    // Read the file's content
    const htmlContent: Uint8Array =
      await vscode.workspace.fs.readFile(htmlPath);

    // Decode the byte array to a string
    const htmlString: string = Buffer.from(htmlContent).toString("utf8");

    this._HTMLContent = htmlString;

    // Return the HTML content for the webview
    return htmlString;
  }
}
