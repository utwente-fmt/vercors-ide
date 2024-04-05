import { ProgressReceiver } from "./progress-receiver";
import * as vscode from "vscode";
import { ThemeColor } from "vscode";

export class StatusBar implements ProgressReceiver {
    private static instance: StatusBar;

    public constructor(
        private statusBarItem: vscode.StatusBarItem,
        private startButton: vscode.StatusBarItem,
        private stopButton: vscode.StatusBarItem
    ) {
        StatusBar.instance = this;
        this.setupButtons();
    }

    static getInstance(): StatusBar {
        return StatusBar.instance;
    }

    private setupButtons() {
        this.startButton.text = `$(debug-start) VerCors`;
        this.startButton.tooltip = "Start VerCors";
        this.startButton.color = new ThemeColor('debugIcon.startForeground');
        this.startButton.show();

        this.stopButton.text = '$(debug-stop) VerCors';
        this.stopButton.tooltip = "Stop VerCors";
        this.stopButton.color = new ThemeColor('debugIcon.stopForeground');
    }

    async update(percentage: number, step: string, stepName: string) {
        if (percentage === 100) {
            this.statusBarItem.hide();
            this.stopButton.hide();
            this.startButton.show();
            return;
        }
        this.statusBarItem.name = "VerCors";
        let chars = this.getPercentageChars(percentage / 100, 20);
        this.statusBarItem.text = `${chars} (${percentage}%): ${stepName}`;
        this.statusBarItem.show();
        this.startButton.hide();
        this.stopButton.show();
    }

    private getPercentageChars(ratio: number, size: number) : string {
        let completed: number = Math.round(ratio * size);
        let notCompleted: number = size - completed;

        return '█'.repeat(completed) + '░'.repeat(notCompleted);
    }

}