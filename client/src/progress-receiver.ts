export default interface ProgressReceiver {

    updateProgress(percentage: number, step: string, stepName: string, details: string): Promise<void>;

}

export function combine(...receivers: ProgressReceiver[]): ProgressReceiver {
    return new MultiReceiver(receivers);
}

class MultiReceiver implements ProgressReceiver {

    constructor(private receivers: ProgressReceiver[]) {
    }

    async updateProgress(percentage: number, step: string, stepName: string, details: string): Promise<void> {
        await Promise.all<void>(
            this.receivers.map((receiver: ProgressReceiver): Promise<void> => receiver.updateProgress(percentage, step, stepName, details))
        );
    }

}