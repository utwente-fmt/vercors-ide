import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from "fs";
import { VerCorsOptions } from "./VerCors-CLI-UI";
import OutputParser from './output-parser';
import VerCorsPathsProvider, { VerCorsPath } from "./vercors-paths-provider";

export default class VerCorsRunManager {

    private outputChannel: vscode.OutputChannel | undefined;
    private processPid: number = -1;

    constructor(private diagnosticCollection: vscode.DiagnosticCollection) {
    }

    public async runVerCors(): Promise<any> {
        // Get the currently active text editor
        const editor: vscode.TextEditor = vscode.window.activeTextEditor;
        if (!editor) {
            return vscode.window.showErrorMessage("No active text editor.");
        }

        // Get the URI (Uniform Resource Identifier) of the current file
        const uri: vscode.Uri = editor!.document.uri;
        const filePath: string = uri.fsPath;

        const paths: VerCorsPath[] = await VerCorsPathsProvider.getInstance().getPathList();
        if (!paths.length) {
            return vscode.window.showErrorMessage("No VerCors paths have been specified yet");
        }

        // get selected VerCors version
        let vercorsPath: VerCorsPath = paths.find((p) => p.selected);
        if (!vercorsPath) {
            return vscode.window.showErrorMessage("No VerCors version has been selected");
        }

        // remove possible double backslash
        const binPath: string = path.normalize(vercorsPath.path);

        if (!fs.existsSync(binPath) || !fs.lstatSync(binPath).isFile()) {
            return vscode.window.showErrorMessage(
                "Could not find VerCors but expected at the given path: " + binPath
            );
        }

        let command: string = '"' + binPath + '"'; // account for spaces

        const fileOptions: string[] = VerCorsOptions.getSelectedOptions(filePath);
        let inputFile: string = '"' + filePath + '"';

        // extract custom options if there are any
        const customFlagsRegex = /--custom-flags \[([^\]]*)\]/;
        for (let i = 0; i < fileOptions.length; i++) {
            const matches = fileOptions[i].match(customFlagsRegex);
            if (matches) {
                fileOptions[i] = matches[1]; // content between square brackets
            }
        }

        // Check if we have options, don't check file extension if --lang is used
        if (!fileOptions || (fileOptions && fileOptions.filter(option => option.includes("--lang")).length === 0)) {
            const ext: string = path.extname(filePath).toLowerCase();
            if (ext !== ".pvl" && ext !== ".java" && ext !== ".c") {
                console.log(filePath);
                return vscode.window.showErrorMessage(
                    "The active file is not a .pvl, .java or .c file."
                ); // Exit early if the file is not a .pvl .java or .c
            }
        }

        let args: string[] = fileOptions ? [inputFile].concat(fileOptions) : [inputFile];
        // Always execute in progress & verbose mode for extension features to work.
        args.push("--progress");
        args.push("--verbose");

        // Create the output channel if it doesn't exist
        if (!this.outputChannel) {
            this.outputChannel = vscode.window.createOutputChannel(
                "vercors-output",
                "vercors-output"
            );
        }

        // Clear previous content in the output channel
        this.outputChannel.clear();
        // Execute the command and send output to the output channel
        console.log(command, args);
        const childProcess = require('child_process');
        const vercorsProcess = childProcess.spawn(command, args, { shell: true });
        this.processPid = vercorsProcess.pid;

        const outputState: OutputParser = new OutputParser(this.outputChannel, uri, this.diagnosticCollection);
        outputState.start();

        vercorsProcess.stdout.on('data', (data: Buffer | string) => {
            let lines: string[] = data.toString().split(/(\r\n|\n|\r)/gm);
            for (let line of lines) {
                outputState.accept(line);
            }
        });

        let self: VerCorsRunManager = this; // cannot use 'this' in nested function
        vercorsProcess.on('exit', function () {
            outputState.finish();
            self.processPid = -1;
        });

        // Show the output channel
        this.outputChannel.show(true); // Change the ViewColumn as needed
    }

    public async stopVerCors(): Promise<any> {
        if (this.processPid === -1) {
            //check if vercors is running
            return vscode.window.showWarningMessage("VerCors is not running");
        }

        const kill = require("tree-kill");
        kill(this.processPid, "SIGINT", async function (err: string): Promise<void> {
            if (err === null) {
                await vscode.window.showInformationMessage(
                    "VerCors has been successfully stopped"
                );
            } else {
                await vscode.window.showErrorMessage(
                    "An error occurred while trying to stop VerCors: " + err
                );
            }
        });
    }

}