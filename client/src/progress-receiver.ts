export interface ProgressReceiver {

    accept(percentage: number, step: string, stepName: string) : Promise<void>;

}

export function combine(...receivers: ProgressReceiver[]): ProgressReceiver {
    return new MultiReceiver(receivers);
}

class MultiReceiver implements ProgressReceiver {

    constructor(private receivers : ProgressReceiver[]) {
    }

    async accept(percentage: number, step: string, stepName: string): Promise<void> {
        await Promise.all<void>(
            this.receivers.map(receiver => receiver.accept(percentage, step, stepName))
        );
    }

}