import * as vscode from "vscode";

import VerCorsVersionWebviewProvider from "./vercors-version-webview";
import StatusBar from "./status-bar";
import ProgressReceiver, { combine } from "./progress-receiver";

enum state {
    RUNNING,
    ERROR,
    FINISHED
}

interface errorCode {
    file: string;
    message: string;
    line: number;
    col: number;
}

export default class OutputParser {

    private state: state = state.RUNNING;
    private currentPercentage: number = 0;
    private progressReceiver: ProgressReceiver;

    //each errors consist of error parts, each parts shows a part of the error in a specific place in the code
    //each error part has 3 stages, stage 1 is the file the error is in, 2 is the code snippet of the location and 3 is the error message
    private errorState: number = 0;
    private errors: errorCode[][] = [];
    private newError: errorCode[] = [];

    /**
     * @param outputChannel the outputchannel where the the output of vercors is printed
     * @param uri the URI of the file that is being checked by vercors
     * @param diagnosticCollection collection of errors about the vercors verification
     */
    public constructor(
        private outputChannel: vscode.OutputChannel,
        private uri: vscode.Uri,
        private diagnosticCollection: vscode.DiagnosticCollection) {

        this.progressReceiver = combine(
            VerCorsVersionWebviewProvider.getInstance(),
            StatusBar.getInstance()
        );
    }

    public start() {
        this.progressReceiver.updateProgress(0, '', 'Starting VerCors...', '');
        this.currentPercentage = 0;
    }

    /**
     * should be called when vercors is finished to finalize the verification
     * this constructs all found errors and pushes them to the problems tab
     */
    public finish() {
        this.progressReceiver.updateProgress(100, '', 'Finished', '');

        //setting up the diagnostic collection
        let diagnostics: vscode.Diagnostic[] = [];
        this.diagnosticCollection.set(this.uri, []);

        //for each error gather the error parts and assemble it to one error
        for (let err of this.errors) {
            let errorMessage: string = "";
            let file: string = err[0].file;
            let relInf: vscode.DiagnosticRelatedInformation[] = [];


            for (let errpart of err) {
                if (errorMessage !== "") {
                    errorMessage += " at line " + errpart.line + ", " + errpart.message.replace(/\s?\.\.\.\s?/, "").toLowerCase();
                    let relatedInformation: vscode.DiagnosticRelatedInformation = new vscode.DiagnosticRelatedInformation(
                        new vscode.Location(this.uri, new vscode.Range(errpart.line - 1, errpart.col - 1, errpart.line - 1, errpart.col - 1)),
                        " at line " + errpart.line + ", " + errpart.message.replace(/\s?\.\.\.\s?/, "")
                    );
                    relInf.push(relatedInformation);
                } else {
                    errorMessage += " " + errpart.message.replace(/\s?\.\.\.\s?/, "");

                }
            }

            //create a diagnostic and put it into the collection
            let diagnostic: vscode.Diagnostic = new vscode.Diagnostic(new vscode.Range(err[0].line - 1, err[0].col - 1, err[0].line - 1, err[0].col - 1), errorMessage, vscode.DiagnosticSeverity.Error);
            diagnostic.relatedInformation = relInf;
            diagnostics.push(diagnostic);
            this.outputChannel.appendLine(file + ":" + errorMessage);
        }

        //push the errors and complete the loading
        this.diagnosticCollection.set(this.uri, diagnostics);
        this.state = state.FINISHED;
        this.currentPercentage = 100;
    }

    public accept(lineRaw: string): void {
        let line: string = lineRaw.trim();
        switch (Boolean(line)) {

            case line.startsWith("[DEBUG]"):
                this.handleDebug(line);
                break;

            case line.startsWith("[INFO]"):
                this.handleInfo(line);
                break;

            case /^\[\d+[.,]\d+%]/.test(line):
                this.handlePercentage(line);
                break;

            case /(?: > )?={38}/.test(line):
                // this '=' line means the beginning or the end of an error
                this.errorState = 0;
                if (this.state === state.ERROR) {
                    this.handleError();
                } else {
                    this.state = state.ERROR;
                }
                this.outputChannel.appendLine(line);
                break;

            case /(?: > )?-{38}/.test(line):
                //this '-' line means a new errorState begins, hence the incrementation of the errorState
                this.errorState = (this.errorState + 1) % 3;
                this.outputChannel.appendLine(line);
                break;

            default:
                this.handleDefault(line);
                break;
        }
    }

    private handlePercentage(line: string) {
        const matchResult =
            /^\[(?<percentage1>\d+)[.,](?<percentage2>\d+)%] \((?<step>\d+\/\d+)\) (?<step_name>[\w\s]+)(?<details>.*)$/g
                .exec(line);
        if (matchResult) {
            const percentage1: string = matchResult.groups!['percentage1'];
            const percentage2: string  = matchResult.groups!['percentage2'];
            const newPercentage: number = Number(percentage1 + '.' + percentage2);
            if (newPercentage <= this.currentPercentage) {
                return;
            }
            this.currentPercentage = newPercentage;
            const step: string  = matchResult.groups!['step'];
            const stepName: string  = matchResult.groups!['step_name'].trim();
            const details: string  = matchResult.groups!['details'].trim();
            this.outputChannel.appendLine(line);
            this.progressReceiver.updateProgress(this.currentPercentage, step, stepName, details);
        }
    }

    private handleDefault(line: string) {
        if (this.state === state.ERROR) {
            switch (this.errorState) {

                //parsing the file uri and line/collumn location
                case 0:
                    const matchResult0 = /^At\s(?<file>.+):(?<line>\d+):(?<col>\d+):$/.exec(line.trim());
                    if (matchResult0) {
                        const err = {
                            file: matchResult0.groups!['file']
                            , message: "Placeholder"
                            , line: Number(matchResult0.groups!['line'])
                            , col: Number(matchResult0.groups!['col'])
                        };
                        this.newError.push(err);
                    }
                    break;

                //TODO: parsing the code block (perhaps handy to extract the exact location instead of one line:collumn location)
                case 1:
                    break;

                //parsing the error message
                case 2:
                    const matchResult2 = /(?:^\[\d+\/\d+]\s)?(?<message>.+)$/.exec(line);
                    if (matchResult2) {
                        this.newError[this.newError.length - 1].message = matchResult2.groups!['message'];
                    }
                    break;

            }

        } else {
            // handle default
        }
        this.outputChannel.appendLine(line);
    }

    private handleDebug(line: string) {
        //should the debug lines be printed
    }


    private handleInfo(line: string) {
        this.outputChannel.appendLine(line);
    }

    private handleError() {
        this.errors.push(JSON.parse(JSON.stringify(this.newError)));
        this.state = state.RUNNING;
        this.newError = [];
    }

}