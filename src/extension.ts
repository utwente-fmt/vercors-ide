// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

/**
 * Method called when the extension is activated
 * @param {vscode.ExtensionContext} context
 */
function activate(context: vscode.ExtensionContext) {
	console.log("we're gaming");
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

	if (editor) {
	  // Get the URI (Uniform Resource Identifier) of the current file
	  const uri = editor.document.uri;
	  const filePath = uri.fsPath;
	  const command = `D:\\VerCors\\vercors-2.0.0-windows\\vercors-2.0.0\\bin\\vercors ${filePath}`;

	  const terminal = vscode.window.createTerminal({ name: 'Vercors Terminal' });
	  terminal.sendText(command);
	  terminal.show();
	  } 
	  else {
		vscode.window.showErrorMessage('No active text editor.');
	  }
  }
