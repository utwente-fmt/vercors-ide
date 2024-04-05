import { ProgressReceiver } from "./progress-receiver";
import * as vscode from "vscode";

export class StatusBar implements ProgressReceiver {
    private static instance: StatusBar;

    public constructor(private statusBarItem: vscode.StatusBarItem) {
        StatusBar.instance = this;
    }

    static getInstance(): StatusBar {
        return StatusBar.instance;
    }

    async update(percentage: number, step: string, stepName: string) {
        if (percentage === 100) {
            this.statusBarItem.hide();
            return;
        }
        this.statusBarItem.name = "VerCors";
        let chars = this.getPercentageChars(percentage / 100, 20);
        this.statusBarItem.text = `VerCors: ${chars} (${percentage}%): ${stepName}`;
        this.statusBarItem.show();
    }

    private getPercentageChars(ratio: number, size: number) : string {
        let completed: number = Math.round(ratio * size);
        let notCompleted: number = size - completed;

        return '█'.repeat(completed) + '░'.repeat(notCompleted);
    }

}