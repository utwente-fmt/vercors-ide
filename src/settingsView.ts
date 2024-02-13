import * as vscode from 'vscode';
import * as path from 'path';

export class VerCorsPathProvider implements vscode.TreeDataProvider<vscode.TreeItem> {

    private _onDidChangeTreeData: vscode.EventEmitter<void | vscode.TreeItem | null | undefined> = new vscode.EventEmitter<void | vscode.TreeItem | null | undefined>();
    readonly onDidChangeTreeData: vscode.Event<void | vscode.TreeItem | null | undefined> = this._onDidChangeTreeData.event;

    getTreeItem(element: vscode.TreeItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }

    getChildren(element?: vscode.TreeItem | undefined): vscode.ProviderResult<vscode.TreeItem[]> {
        // No children in this simple example
        if (element) {
            return Promise.resolve([]);
        } else {
            // Fetch the current path from the configuration
            const vercorsPath = vscode.workspace.getConfiguration().get('vercorsplugin.vercorsPath') as string;
            const label = `Set VerCors Binary Location`;

            // Create a TreeItem with the current path as its label
            const setPathCommand = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.None);
            setPathCommand.command = {
                command: 'extension.setVercorsPath',
                title: "Set VerCors Path",
                arguments: []
            };

            setPathCommand.tooltip = vercorsPath ? `Current VerCors Path: ${vercorsPath}` : "Set the path to the VerCors binary";

            // Set the icon path using the Uri.file method
            setPathCommand.iconPath = {
                light: vscode.Uri.file(path.join(__filename, '..', '..', 'resources', 'folder-black.svg')),
                dark: vscode.Uri.file(path.join(__filename, '..', '..', 'resources', 'folder-light.svg'))
            };
            return Promise.resolve([setPathCommand]);
        }
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }
}