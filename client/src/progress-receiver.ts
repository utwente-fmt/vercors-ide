export default interface ProgressReceiver {

    updateProgress(percentage: number, step: string, stepName: string): Promise<void>;

}

export function combine(...receivers: ProgressReceiver[]): ProgressReceiver {
    return new MultiReceiver(receivers);
}

class MultiReceiver implements ProgressReceiver {

    constructor(private receivers: ProgressReceiver[]) {
    }

    async updateProgress(percentage: number, step: string, stepName: string): Promise<void> {
        await Promise.all<void>(
            this.receivers.map(receiver => receiver.updateProgress(percentage, step, stepName))
        );
    }

}