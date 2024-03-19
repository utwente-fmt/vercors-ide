import * as vscode from "vscode";

enum state {
    RUNNING,
    ERROR,
    FINISHED
}

export class OutputState {

    private state: state = state.RUNNING;
    private currentPercentage: number = 0;

    public constructor(private outputChannel: vscode.OutputChannel) {

    }

    public finish() {
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
                this.state = state.ERROR;
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
            // handle error lines
        } else {
            // handle default
        }
    }

    private handleDebug(line: string) {}


    private handleInfo(line: string) {
        this.outputChannel.appendLine(line);
    }


}