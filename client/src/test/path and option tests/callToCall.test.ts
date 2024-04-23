/**
 * Backend testing
*/


import * as sinon from 'sinon'
import {VerCorsWebViewProvider} from '../../vercors-options-webview';
import {Assert} from '../Assert';
import {beforeEach,afterEach} from 'mocha';
import * as mock_fs from 'mock-fs'
import { comparing } from '../../comparing';
import {mockCommandLineOptions, mockWebviewView, mockedPaths, testMocking} from '../mockMethods'
import VerCorsVersionWebviewProvider from '../../vercors-version-webview';







suite('Path handling', async () => {

    let testMock: testMocking;
    beforeEach(async () => {
        testMock = new testMocking(VerCorsVersionWebviewProvider)
        await testMock.mockFrontend()
    })
    afterEach(() => {
        testMock.stopFrontendMocking();
    })

	test('broken vercors file chosen', async () => {
        testMock.showFileDialogMocking("brokenVercorsFolder");
        await testMock.WebviewViewProvider.receiveMessage({ command: "add-path" })
        Assert.failOnJsonEventAbsence([["command","loading"]],testMock.logger)
        Assert.failOnJsonEventAbsence([["command","cancel-loading"]], testMock.logger )

    });

    test('correct vercors file chosen', async () => {
        testMock.showFileDialogMocking("workingVercorsFolder");
        const path = JSON.stringify([{ path: `${mockedPaths.workingVercorsFolder + "\\vercors"}`, selected: true, version: 'Vercors 2.0.0'}])
        await testMock.WebviewViewProvider.receiveMessage({ command: "add-path" })
        Assert.failOnJsonEventAbsence([["command","loading"]],testMock.logger)
        Assert.failOnJsonEventAbsence([["command","add-paths"],["paths",path]],testMock.logger)    
    });

    test('same vercors file chosen twice', async () => {
        testMock.showFileDialogMocking("workingVercorsFolder");
        await testMock.WebviewViewProvider.receiveMessage({ command: "add-path" })
        testMock.logger = []
        await testMock.WebviewViewProvider.receiveMessage({ command: "add-path" })
        Assert.equals([],testMock.logger,comparing.compareLists) // a duplicate path should send no message to the frontend  
        Assert.isTrue(testMock.isWarningMessageShown) 
    });

    test('non-vercors file chosen', async () => {
        testMock.showFileDialogMocking("resourcesFolder");
        await testMock.WebviewViewProvider.receiveMessage({ command: "add-path" })
        Assert.equals(testMock.logger,[], comparing.compareLists) // a non-vercors path should send no message to the frontend  
        Assert.isTrue(testMock.isErrorMessageShown) 
    });

    test('remove correct Path', async () => {
        testMock.showFileDialogMocking("workingVercorsFolder");
        const path = JSON.stringify([{ path: `${mockedPaths.workingVercorsFolder + "\\vercors"}`, selected: true, version: 'Vercors 2.0.0'}])
        await testMock.WebviewViewProvider.receiveMessage({ command: "add-path" })
        await testMock.WebviewViewProvider.receiveMessage({ command: "remove", path: mockedPaths.workingVercorsFolder + "\\vercors" })
        testMock.logger = []
        await testMock.WebviewViewProvider.receiveMessage({ command: "ready" })
        Assert.failOnJsonEventAbsence([["command", "add-paths"],["paths","[]"]],testMock.logger) 
        Assert.isTrue(!testMock.isErrorMessageShown) 
    });

    test('remove wrong Path', async () => {
        testMock.showFileDialogMocking("workingVercorsFolder");
        const path = JSON.stringify([{ path: `${mockedPaths.workingVercorsFolder + "\\vercors"}`, selected: true, version: 'Vercors 2.0.0'}])
        await testMock.WebviewViewProvider.receiveMessage({ command: "add-path" })
        await testMock.WebviewViewProvider.receiveMessage({ command: "remove", path: mockedPaths.brokenVercorsFolder + "\\vercors"})
        testMock.logger = []
        await testMock.WebviewViewProvider.receiveMessage({ command: "ready" })
        Assert.failOnJsonEventAbsence([["command", "add-paths"],["paths",path]],testMock.logger) 
        Assert.isTrue(!testMock.isErrorMessageShown) 
    });


    test('select correct Path', async () => {
        testMock.showFileDialogMocking("workingVercorsFolder");
        const selectedPath = JSON.stringify([{ path: `${mockedPaths.workingVercorsFolder + "\\vercors"}`, selected: true, version: 'Vercors 2.0.0'}])
        await testMock.WebviewViewProvider.receiveMessage({ command: "add-path" })
        testMock.logger = []
        testMock.fakeConfiguration["vercorsplugin.vercorsPath"][0].selected = false;
        await testMock.WebviewViewProvider.receiveMessage({ command: "select", path: mockedPaths.workingVercorsFolder + "\\vercors" })
        await testMock.WebviewViewProvider.receiveMessage({ command: "ready" })
        Assert.failOnJsonEventAbsence([["command","add-paths"],["paths",selectedPath]],testMock.logger)
        Assert.isTrue(!testMock.isErrorMessageShown) 
    });

    test('select wrong Path', async () => {
        testMock.showFileDialogMocking("workingVercorsFolder");
        const unselectedPath = JSON.stringify([{ path: `${mockedPaths.workingVercorsFolder + "\\vercors"}`, selected: false, version: 'Vercors 2.0.0'}])
        await testMock.WebviewViewProvider.receiveMessage({ command: "add-path" })
        testMock.fakeConfiguration["vercorsplugin.vercorsPath"][0].selected = false;
        testMock.logger = []
        await testMock.WebviewViewProvider.receiveMessage({ command: "select", path: mockedPaths.brokenVercorsFolder + "\\vercors"})
        Assert.failOnJsonEventAbsence([["command","add-paths"],["paths",unselectedPath]],testMock.logger)
        Assert.isTrue(!testMock.isErrorMessageShown) 
    });

});




suite('Option tests', async () => {
    let testMock: testMocking;
    beforeEach(async () => {
        testMock = new testMocking(VerCorsWebViewProvider)
        testMock.mockFrontend()
    })
    afterEach(() => {
        testMock.stopFrontendMocking();
    })

    //not one only for updateOptions, because it doesn't return anything to the frontend.
    test('view loaded message', async () => {
        await testMock.WebviewViewProvider.receiveMessage({ command: "updateOptions", options: ['--backend-debug'], pinnedOptions: ['--more'],backendOption: "carbon"} )
        await testMock.WebviewViewProvider.receiveMessage({ command: "viewLoaded" })
        Assert.failOnJsonEventAbsence([["command", "loadAllOptions"],["data", mockCommandLineOptions]],testMock.logger)
        Assert.failOnJsonEventAbsence([["command","loadOptions"], ["options",'["--backend-debug"]'],["pinnedOptions", '["--more"]'],["backendOption","false"]],testMock.logger)


    });
});