import { browser, expect } from '@wdio/globals'
import * as vscode from 'vscode';
import * as sinon from 'sinon'






describe('Path setting', () => {
    it('should open a filesystem window when clicking a the path set button', async () => {
        //Interacting with the filesystem is hard and undesirable, because it is different for every operating system
        

        browser.url('vscode://vercorsplugin/vercorsPath.html')
        sinon.stub(vscode.workspace, 'showOpenDialog').callsFake(() => Promise.resolve(vscode.Uri.parse('file:///path/to/folder')));
        const button = $('[data-testid="path-button"]');
        button.waitForExist();
        button.click();
        browser.pause(5000);
        console.log("PATH LOGS: " + browser.getLogs())
        


    })
})