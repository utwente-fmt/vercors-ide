// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

let outputChannel: vscode.OutputChannel;

/**
 * Method called when the extension is activated
 * @param {vscode.ExtensionContext} context
 */
function activate(context: vscode.ExtensionContext) {
	// Register the 'extension.runVercors' command
	let disposable = vscode.commands.registerCommand('extension.runVercors', () => {
	  executeVercorsCommand();
	});
  
	// Add the disposable to the context so it can be disposed of later
	context.subscriptions.push(disposable);
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
	const command = `C:\\Users\\naumt\\Downloads\\vercors-2.0.0-windows\\vercors-2.0.0\\bin\\vercors ${filePath}`;

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
