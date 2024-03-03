import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

export class GoDefinitionProvider implements vscode.DefinitionProvider {
  public provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): Thenable<vscode.Location> {
    console.log(position);

    const wordRange: vscode.Range | undefined =
      document.getWordRangeAtPosition(position);
    console.log(wordRange);

    return new Promise((resolve, reject) => {
      console.log(document);

      if (!wordRange) {
        return reject(null);
      }

      if (vscode.window.activeTextEditor) {
        const location = new vscode.Location(document.uri, wordRange);
        console.log(location);
        return resolve(location);
      }
    });
  }
}
