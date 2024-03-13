import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

interface Pattern {
  name: string;
  match: string;
}

interface Configuration {
  patterns: Pattern[];
}

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

    const word = document.getText(wordRange); // get the word at the range

    return new Promise((resolve, reject) => {
      const matchedPattern = config.patterns.find((pattern) => {
        let regex = new RegExp(pattern.match, "i"); // The "i" flag makes the regex case-insensitive
        return regex.test(word);
        // const regex = new RegExp(pattern.match);
        // return regex.test(word);
      });
      console.log(matchedPattern);

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
