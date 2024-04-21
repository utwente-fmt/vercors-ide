import * as kill from 'tree-kill'

export async function checkForCorrectSetup(vercorsBinPath: string){
    await isFakeVercorsCreatedProperly(vercorsBinPath);
}



async function isFakeVercorsCreatedProperly(vercorsBinPath: string){
    await new Promise<string>((resolve, reject): void => {
        try {
            const childProcess = require('child_process');
            let command: string = '"' + vercorsBinPath + "\\vercors" + '"';
            const process = childProcess.spawn(command, ["--version"], { shell: true });
            const pid: number = process.pid;

            process.stdout.on('data', (data: Buffer | string): void => {
                const str: string = data.toString();
                kill(pid, 'SIGINT');
                if (str.startsWith("Vercors")) {
                    // remove newlines
                    resolve(str.trim());
                } else {
                    reject('Vercors does not exist at: ' + vercorsBinPath + "\\vercors");
                }
            });

            process.stderr.on('data', (data: Buffer | string): void => {
                const str: string = data.toString();
                kill(pid, 'SIGINT');
                reject('Vercors (for testing) is not properly installed at ' + vercorsBinPath + "\\vercors. \n This errormessage is given: " + str);
            });
        } catch (_e) {
            reject('Vercors (for testing) is not properly installed at ' + vercorsBinPath + "\\vercors. \n This errormessage is given: " + _e);
        }
    })
        .catch(reason => {
            throw new Error(reason.toString());
        });

}