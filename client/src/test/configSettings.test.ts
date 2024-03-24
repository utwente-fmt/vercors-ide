import * as vscode from 'vscode';
import * as assert from 'assert';
import * as sinon from 'sinon'
import {VercorsOptions,OptionFields} from "../VerCors-CLI-UI"
import {VerCorsPaths,VercorsPath} from '../VerCors-Path-UI';

const fakeConfiguration = {
};


const vscodeWorkspaceStub = sinon.stub();


vscodeWorkspaceStub.returns({
        get: (section, defaultValue) => fakeConfiguration[section] || defaultValue,
        update: (section, value) => fakeConfiguration[section] = value 
});

sinon.stub(vscode.workspace, 'getConfiguration').callsFake(vscodeWorkspaceStub); // has to be from vscode.workspace instead of vscode, because workspace is no function

//fs.existsSync(vercorsPath) || !fs.lstatSync(vercorsPath).isFile() and getvercorsversion
suite('Optionmap Tests', async () => {

	test('Simple adding and removing', async () => {
		VercorsOptions.updateOptions("Design project/arrayTest.java",["--quite", "--backend-file-base"], ["--more"])
        let expectedOptions = {pinned: [ "--more"], flags : ["--quite","--backend-file-base"]} as OptionFields
        assert(VercorsOptions.isEqual(VercorsOptions.getAllOptions("Design project/arrayTest.java"), expectedOptions))

        VercorsOptions.updateOptions("Design project/arrays.java",["--quite"], ["--more"]);
        expectedOptions = {pinned: [ "--more"],flags : ["--quite"]} as OptionFields
        assert(VercorsOptions.isEqual(VercorsOptions.getAllOptions("Design project/arrays.java"), expectedOptions))

        VercorsOptions.updateOptions("Design project/arrays.java",[], []);
        expectedOptions = {pinned: [],flags : []} as OptionFields
        assert(VercorsOptions.isEqual(VercorsOptions.getAllOptions("Design project/arrays.java"), expectedOptions))
	});

    test('Erronous and default value handling', async () => {
        fakeConfiguration["vercorsplugin.optionsMap"] = {}
		VercorsOptions.updateOptions("Design project/arrayTest.java",["--quite", "--backend-file-base"], ["--more"])
        let expectedOptions = {pinned: [ "--more"],flags : ["--quite","--backend-file-base"]} as OptionFields
        assert(VercorsOptions.isEqual(VercorsOptions.getAllOptions("Design project/arrayTest.java"), expectedOptions))


        fakeConfiguration["vercorsplugin.optionsMap"] = "hey"
		VercorsOptions.updateOptions("Design project/arrayTest.java",["--quite", "--backend-file-base"], ["--more"])
        expectedOptions = {pinned: [ "--more"],flags : ["--quite","--backend-file-base"]} as OptionFields
        assert(VercorsOptions.isEqual(VercorsOptions.getAllOptions("Design project/arrayTest.java"), expectedOptions))

        fakeConfiguration["vercorsplugin.optionsMap"] = null
		VercorsOptions.updateOptions("Design project/arrayTest.java",["--quite", "--backend-file-base"], ["--more"])
        expectedOptions = {pinned: [ "--more"],flags : ["--quite","--backend-file-base"]} as OptionFields
        assert(VercorsOptions.isEqual(VercorsOptions.getAllOptions("Design project/arrayTest.java"), expectedOptions))

        fakeConfiguration["vercorsplugin.optionsMap"] = {pinned: "string",flags: "string"}
		VercorsOptions.updateOptions("Design project/arrayTest.java",["--quite", "--backend-file-base"], ["--more"])
        expectedOptions = {pinned: [ "--more"],flags : ["--quite","--backend-file-base"]} as OptionFields
        assert(VercorsOptions.isEqual(VercorsOptions.getAllOptions("Design project/arrayTest.java"), expectedOptions))

        fakeConfiguration["vercorsplugin.optionsMap"] = {a: ["string"]}
		VercorsOptions.updateOptions("Design project/arrayTest.java",["--quite", "--backend-file-base"], ["--more"])
        expectedOptions = {pinned: [ "--more"],flags : ["--quite","--backend-file-base"]} as OptionFields
        assert(VercorsOptions.isEqual(VercorsOptions.getAllOptions("Design project/arrayTest.java"), expectedOptions))

        fakeConfiguration["vercorsplugin.optionsMap"] = {pinned: "string",flags: "string", a: ["string"]}
		VercorsOptions.updateOptions("Design project/arrayTest.java",["--quite", "--backend-file-base"], ["--more"])
        expectedOptions = {pinned: [ "--more"],flags : ["--quite","--backend-file-base"]} as OptionFields
        assert(VercorsOptions.isEqual(VercorsOptions.getAllOptions("Design project/arrayTest.java"), expectedOptions))
	});
});

suite('PathSetting tests', async () => {

    test('Erronous and default value handling', async () => {
        const paths = [{
            "path": "c:\\Users\\jaron\\OneDrive - University of Twente\\Documenten\\Design Project\\vercors-2.0.0-windows\\vercors-2.0.0\\bin",
            "version": "Vercors 2.0.0",
            "selected": true
        }] as VercorsPath[]

        fakeConfiguration["vercorsplugin.optionsMap"] = {}
		VerCorsPaths.storePathList(paths)
        let expectedPath = {pinned: [ "--more"],flags : ["--quiet","--backend-file-base"]} as OptionFields
        assert(VercorsOptions.compareLists(await VerCorsPaths.getPathList(), paths))

        fakeConfiguration["vercorsplugin.optionsMap"] = null
		VerCorsPaths.storePathList(paths)
        expectedPath = {pinned: [ "--more"],flags : ["--quiet","--backend-file-base"]} as OptionFields
        assert(VercorsOptions.compareLists(await VerCorsPaths.getPathList(), paths))

        fakeConfiguration["vercorsplugin.optionsMap"] = "hey"
		VerCorsPaths.storePathList(paths)
        expectedPath = {pinned: [ "--more"],flags : ["--quiet","--backend-file-base"]} as OptionFields
        assert(VercorsOptions.compareLists(await VerCorsPaths.getPathList(), paths))

        fakeConfiguration["vercorsplugin.optionsMap"] = { path: "string", version: "string" }
		VerCorsPaths.storePathList(paths)
        expectedPath = {pinned: [ "--more"],flags : ["--quiet","--backend-file-base"]} as OptionFields
        assert(VercorsOptions.compareLists(await VerCorsPaths.getPathList(), paths))

        fakeConfiguration["vercorsplugin.optionsMap"] = { a: "string", version: "string", selected: "string" }
		VerCorsPaths.storePathList(paths)
        expectedPath = {pinned: [ "--more"],flags : ["--quiet","--backend-file-base"]} as OptionFields
        assert(VercorsOptions.compareLists(await VerCorsPaths.getPathList(), paths))

        fakeConfiguration["vercorsplugin.optionsMap"] = { path: "string", version: "string", selected: "string", a: "string" }
		VerCorsPaths.storePathList(paths)
        expectedPath = {pinned: [ "--more"],flags : ["--quiet","--backend-file-base"]} as OptionFields
        assert(VercorsOptions.compareLists(await VerCorsPaths.getPathList(), paths))
	});
    

    
});



