import * as vscode from "vscode";

enum state {
    RUNNING,
    ERROR,
    FINISHED
}

interface errorCode{
    file: string;
    message: string;
    line: number;
    col: number;
}

export class OutputState {

    private state: state = state.RUNNING;
    private currentPercentage: number = 0;

    //The structure of an error has 3 stages. the file/line, the code snipet, the errormessage
    private errorState : number = 0;
    private errors : errorCode[][] = [];
    private newError: errorCode[] = [];

    public constructor(private outputChannel: vscode.OutputChannel) {

    }

    public finish() {
        for (let err of this.errors){
            let errorMessage = "";
            let file = err[0].file;
            for (let errpart of err){
                errorMessage += " at line " + errpart.line + "," + errpart.message.replace(/\s?\.\.\.\s?/,"").toLowerCase();
            }
            this.outputChannel.appendLine(file + ":" + errorMessage);
        }

        this.state = state.FINISHED;
        this.currentPercentage = 100;
    }

    public accept(line: string) {
        switch (Boolean(line.trim())) {
            case line.startsWith("[DEBUG]"):
                this.handleDebug(line);
                break;
            case line.startsWith("[INFO]"):
                this.handleInfo(line);
                break;
            case /^\[\d+,\d+%]/.test(line):
                this.handlePercentage(line);
                break;
            case line === '======================================':
                this.outputChannel.appendLine(line);
                this.errorState = 0;
                // If the current state is already error, the '=' line closes the current error message
                // and the complete error will be handled and saved
                if (this.state === state.ERROR){
                    this.handleError();
                } else {
                    this.state = state.ERROR;
                }
            case line === '--------------------------------------':
                this.errorState = (this.errorState + 1) % 3;
                
                break;
            default:
                this.handleDefault(line);
                break;
        }
    }

    private handlePercentage(line: string) {
        const matchResult =
            /^\[(?<percentage1>\d+),(?<percentage2>\d+)%] \((?<step>\d+\/\d+)\) (?<step_name>[^›]+).*$/.exec(line);
        if (matchResult) {
            const percentage1 = matchResult.groups!['percentage1'];
            const percentage2 = matchResult.groups!['percentage2'];
            const newPercentage: number = Number(percentage1 + '.' + percentage2);
            if (newPercentage <= this.currentPercentage) {
                return;
            }
            this.currentPercentage = newPercentage;
            const step = matchResult.groups!['step'];
            const stepName = matchResult.groups!['step_name'];
            this.outputChannel.appendLine(this.currentPercentage + ", " + step + ", " + stepName);
        }
    }

    private handleDefault(line: string) {
        if (this.state === state.ERROR) {
            
            //parse filepath, line and col
            if (/:\d+:\d+:$/.test(line.trim())){
                const matchResult = /^At\s(?<file>.+):(?<line>\d+):(?<col>\d+):$/.exec(line.trim());
                if (matchResult){
                    const err = {file: matchResult.groups!['file'] 
                                ,message: "Placeholder"
                                ,line: Number(matchResult.groups!['line'])
                                ,col: Number(matchResult.groups!['col'])};
                    this.newError.push(err);
                }
            //parse the error message
            } else if(/^\[\d+\/\d+]/.test(line.trim())){
                const matchResult = /^\[\d+\/\d+](?<message>.+)$/.exec(line);
                if (matchResult){
                    this.newError[this.newError.length-1].message = matchResult.groups!['message'];
                }
            }else{
                
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

    private handleError(){
        this.errors.push(JSON.parse(JSON.stringify(this.newError)));
        console.log(this.errors);
        this.state = state.RUNNING;
        this.newError = [];
    }

}