// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

import {VerCorsPathProvider} from './settingsView'
import {VerCorsWebViewProvider} from './VerCors-CLI-UI'

let outputChannel: vscode.OutputChannel;
const vercorsOptionsMap = new Map();

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
		const options = vercorsOptionsMap.get(filePath) || {};

		optionsProvider.updateView(options);
	}
	}));
  
  }
  
  /**
   * Method called when the extension is deactivated
   */
  function deactivate() {}
  
  module.exports = {
	activate,
	deactivate
  };

  function executeVercorsCommand() {
	// Get the currently active text editor
	const editor = vscode.window.activeTextEditor;

	if (!editor) {
		vscode.window.showErrorMessage('No active text editor.');
	}
	// Get the URI (Uniform Resource Identifier) of the current file
	const uri = editor!.document.uri;
	const filePath = uri.fsPath;
	const vercorsPath = vscode.workspace.getConfiguration().get('vercorsplugin.vercorsPath') as string;

    const fileOptions = vercorsOptionsMap.get(filePath) || {};

	const command = `${vercorsPath}\\vercors ${filePath}`;

	

	// Create the output channel if it doesn't exist
    if (!outputChannel) {
		outputChannel = vscode.window.createOutputChannel('Vercors Output');
	  }
  
	  // Clear previous content in the output channel
	outputChannel.clear();

    // Execute the command and send output to the output channel
    const childProcess = require('child_process');
    const process = childProcess.spawn(command, [], { shell: true });

    process.stdout.on('data', (data: Buffer | string) => {
      outputChannel.appendLine(data.toString());
    });

    process.stderr.on('data', (data: Buffer | string) => {
      outputChannel.appendLine(data.toString());
    });

    // Show the output channel
    outputChannel.show(vscode.ViewColumn.Three); // Change the ViewColumn as needed
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