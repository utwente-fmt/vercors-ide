import * as vscode from 'vscode'

export interface webviewConnector extends vscode.WebviewViewProvider{

    receiveMessage(message: any): Promise<void>;


}