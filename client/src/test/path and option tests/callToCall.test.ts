/**
 * Backend testing
*/


import * as sinon from 'sinon'
import VerCorsWebViewProvider from '../../vercors-version-webview';
import {Assert} from '../Assert';
import {beforeEach,afterEach} from 'mocha';
import * as mock_fs from 'mock-fs'
import { comparing } from '../../comparing';
import {mockWebviewView, mockedPaths, testMocking} from '../mockMethods'
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
        const path = `{ path: ${mockedPaths.workingVercorsFolder}, selected: true, version: 'Vercors 2.0.0'}`
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
        testMock.showFileDialogMocking("frontendFolder");
        await testMock.WebviewViewProvider.receiveMessage({ command: "add-path" })
        Assert.equals([],testMock.logger,comparing.compareLists) // a non-vercors path should send no message to the frontend  
        Assert.isTrue(testMock.isErrorMessageShown) 
    });



});

// suite('Path handling', async () => {
//     let testMock: testMocking;
//     beforeEach(async () => {
//         testMock = new testMocking()
//         testMock.mockFrontend()
//     })
//     afterEach(() => {
//         testMock.stopFrontendMocking();
//     })

//     test('broken vercors file chosen', async () => {
//         testMock.showFileDialogMocking("brokenVercorsFolder");
//         await testMock.WebviewViewProvider.receiveMessage({ command: "add-path" })
//         Assert.failOnJsonEventAbsence([["command","loading"]],testMock.logger)
//         Assert.failOnJsonEventAbsence([["command","cancel-loading"]], testMock.logger )

//     });




// });