import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from "fs";
import { VerCorsPaths } from "./VerCors-Path-UI";
import { VerCorsOptions } from "./VerCors-CLI-UI";
import { OutputParser } from './output-parser';

export class VerCorsRunManager {

    private outputChannel: vscode.OutputChannel | null = null;
    private processPid: number = -1;

    constructor(private diagnosticCollection: vscode.DiagnosticCollection) {
    }

    public async runVerCors(): Promise<any> {
        // Get the currently active text editor
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return vscode.window.showErrorMessage("No active text editor.");
        }

        // Get the URI (Uniform Resource Identifier) of the current file
        const uri = editor!.document.uri;
        const filePath = uri.fsPath;

        const paths = await VerCorsPaths.getPathList();
        if (!paths.length) {
            return vscode.window.showErrorMessage("No VerCors paths have been specified yet");
        }

        // get selected VerCors version
        const binPath = paths.find((p) => p.selected);
        if (!binPath) {
            return vscode.window.showErrorMessage("No VerCors version has been selected");
        }

        // remove possible double backslash
        const verCorsPath = path.normalize(binPath.path + path.sep) + "vercors";

        if (!fs.existsSync(verCorsPath) || !fs.lstatSync(verCorsPath).isFile()) {
            return vscode.window.showErrorMessage(
                "Could not find VerCors but expected at the given path: " + verCorsPath
            );
        }

        let command = '"' + verCorsPath + '"'; // account for spaces

        const fileOptions = VerCorsOptions.getSelectedOptions(filePath);
        let inputFile = '"' + filePath + '"';
        let args = fileOptions ? [inputFile].concat(fileOptions) : [inputFile];

        // Check if we have options, don't check file extension if --lang is used
        if (!fileOptions || (fileOptions && !fileOptions.includes("--lang"))) {
            const ext = path.extname(filePath).toLowerCase();
            if (ext !== ".pvl" && ext !== ".java" && ext !== ".c") {
                console.log(filePath);
                return vscode.window.showErrorMessage(
                    "The active file is not a .pvl, .java or .c file."
                ); // Exit early if the file is not a .pvl .java or .c
            }
        }

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

        const outputState = new OutputParser(this.outputChannel, uri, this.diagnosticCollection);
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
            return vscode.window.showInformationMessage("Vercors is not running");
        }

        const kill = require("tree-kill");
        kill(this.processPid, "SIGINT", async function (err: string) {
            if (err === null) {
                await vscode.window.showInformationMessage(
                    "Vercors has been succesfully stopped"
                );
            } else {
                await vscode.window.showInformationMessage(
                    "An error occured while trying to stop Vercors: " + err
                );
            }
        });
    }

}