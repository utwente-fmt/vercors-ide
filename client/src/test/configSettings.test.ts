import * as vscode from 'vscode';
import * as sinon from 'sinon'
import {VercorsOptions,OptionFields} from "../VerCors-CLI-UI"
import {VerCorsPaths,VercorsPath} from '../VerCors-Path-UI';
import {Assert} from './Assert';
import {comparing} from '../comparing';
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

	test('Simple adding and removing (End To End)', async () => {
        
        
		VercorsOptions.updateOptions("Design project/arrayTest.java",["--quite", "--backend-file-base"], ["--more"])
        let expectedOptions = {pinned: [ "--more"], flags : ["--quite","--backend-file-base"]} as OptionFields
        Assert.equals(VercorsOptions.getAllFileOptions("Design project/arrayTest.java"), expectedOptions,VercorsOptions.isEqualOptionFields)

        VercorsOptions.updateOptions("Design project/arrays.java",["--quite"], ["--more"]);
        expectedOptions = {pinned: [ "--more"],flags : ["--quite"]} as OptionFields
        Assert.equals(VercorsOptions.getAllFileOptions("Design project/arrays.java"), expectedOptions,VercorsOptions.isEqualOptionFields)

        VercorsOptions.updateOptions("Design project/arrays.java",[], []);
        expectedOptions = {pinned: [],flags : []} as OptionFields
        Assert.equals(VercorsOptions.getAllFileOptions("Design project/arrays.java"), expectedOptions,VercorsOptions.isEqualOptionFields)

        Assert.equals(VercorsOptions.getSelectedOptions("Design project/arr.java"), [],comparing.compareLists)

        Assert.equals(VercorsOptions.getAllFileOptions("Design project/arr.java"), { pinned: [], flags: [] },VercorsOptions.isEqualOptionFields)
	});

    test('Erronous and default value handling', async () => {
        fakeConfiguration["vercorsplugin.optionsMap"] = {}
		VercorsOptions.updateOptions("Design project/arrayTest.java",["--quite", "--backend-file-base"], ["--more"])
        let expectedOptions = {pinned: [ "--more"],flags : ["--quite","--backend-file-base"]} as OptionFields
        Assert.equals(VercorsOptions.getAllFileOptions("Design project/arrayTest.java"), expectedOptions,VercorsOptions.isEqualOptionFields)


        fakeConfiguration["vercorsplugin.optionsMap"] = "hey"
        Assert.equals(VercorsOptions.getAllFileOptions("Design project/arrayTest.java"), {pinned: [], flags: []},VercorsOptions.isEqualOptionFields)
		VercorsOptions.updateOptions("Design project/arrayTest.java",["--quite", "--backend-file-base"], ["--more"])
        expectedOptions = {pinned: [ "--more"],flags : ["--quite","--backend-file-base"]} as OptionFields
        Assert.equals(VercorsOptions.getAllFileOptions("Design project/arrayTest.java"), expectedOptions,VercorsOptions.isEqualOptionFields)

        fakeConfiguration["vercorsplugin.optionsMap"] = null
        Assert.equals(VercorsOptions.getAllFileOptions("Design project/arrayTest.java"), {pinned: [], flags: []},VercorsOptions.isEqualOptionFields)
		VercorsOptions.updateOptions("Design project/arrayTest.java",["--quite", "--backend-file-base"], ["--more"])
        expectedOptions = {pinned: [ "--more"],flags : ["--quite","--backend-file-base"]} as OptionFields
        Assert.equals(VercorsOptions.getAllFileOptions("Design project/arrayTest.java"), expectedOptions,VercorsOptions.isEqualOptionFields)

        fakeConfiguration["vercorsplugin.optionsMap"] = {"Design project/arrayTest.java": {pinned: "string",flags: "string"}}
        Assert.equals(VercorsOptions.getAllFileOptions("Design project/arrayTest.java"), {pinned: [], flags: []},VercorsOptions.isEqualOptionFields)
		VercorsOptions.updateOptions("Design project/arrayTest.java",["--quite", "--backend-file-base"], ["--more"])
        expectedOptions = {pinned: [ "--more"],flags : ["--quite","--backend-file-base"]} as OptionFields
        Assert.equals(VercorsOptions.getAllFileOptions("Design project/arrayTest.java"), expectedOptions,VercorsOptions.isEqualOptionFields)

        fakeConfiguration["vercorsplugin.optionsMap"] = {"Design project/arrayTest.java": {a: ["string"]}}
        Assert.equals(VercorsOptions.getAllFileOptions("Design project/arrayTest.java"), {pinned: [], flags: []},VercorsOptions.isEqualOptionFields)
        VercorsOptions.updateOptions("Design project/arrayTest.java",["--quite", "--backend-file-base"], ["--more"])		
        expectedOptions = {pinned: [ "--more"],flags : ["--quite","--backend-file-base"]} as OptionFields
        Assert.equals(VercorsOptions.getAllFileOptions("Design project/arrayTest.java"), expectedOptions,VercorsOptions.isEqualOptionFields)

        fakeConfiguration["vercorsplugin.optionsMap"] = {"Design project/arrayTest.java": {pinned: "string",flags: "string", a: ["string"]}}
        Assert.equals(VercorsOptions.getAllFileOptions("Design project/arrayTest.java"), {pinned: [], flags: []},VercorsOptions.isEqualOptionFields)	
        VercorsOptions.updateOptions("Design project/arrayTest.java",["--quite", "--backend-file-base"], ["--more"])
        expectedOptions = {pinned: [ "--more"],flags : ["--quite","--backend-file-base"]} as OptionFields
        Assert.equals(VercorsOptions.getAllFileOptions("Design project/arrayTest.java"), expectedOptions,VercorsOptions.isEqualOptionFields)


	});
});

suite('PathSetting tests', async () => {

    test('Erronous and default value handling', async () => {
        const paths = [{
            "path": "c:\\Users\\jaron\\OneDrive - University of Twente\\Documenten\\Design Project\\vercors-2.0.0-windows\\vercors-2.0.0\\bin",
            "version": "Vercors 2.0.0",
            "selected": true
        }] as VercorsPath[]

        fakeConfiguration["vercorsplugin.vercorsPath"] = []
        Assert.equals(await VerCorsPaths.getPathList(), [], (x,y) => comparing.compareLists(x,y,VerCorsPaths.isEqualPath) )
		VerCorsPaths.storePathList(paths)
        Assert.equals(await VerCorsPaths.getPathList(), paths, (x,y) => comparing.compareLists(x,y,VerCorsPaths.isEqualPath) )        

        fakeConfiguration["vercorsplugin.vercorsPath"] = null
        Assert.equals(await VerCorsPaths.getPathList(), [], (x,y) => comparing.compareLists(x,y,VerCorsPaths.isEqualPath) )
		VerCorsPaths.storePathList(paths)
        Assert.equals(await VerCorsPaths.getPathList(), paths, (x,y) => comparing.compareLists(x,y,VerCorsPaths.isEqualPath) )        

        fakeConfiguration["vercorsplugin.vercorsPath"] = "hey"
        Assert.equals(await VerCorsPaths.getPathList(), [], (x,y) => comparing.compareLists(x,y,VerCorsPaths.isEqualPath) )
		VerCorsPaths.storePathList(paths)
        Assert.equals(await VerCorsPaths.getPathList(), paths, (x,y) => comparing.compareLists(x,y,VerCorsPaths.isEqualPath) )        

        fakeConfiguration["vercorsplugin.vercorsPath"] = [{ path: "string", version: "string" }]
        Assert.equals(await VerCorsPaths.getPathList(), [], (x,y) => comparing.compareLists(x,y,VerCorsPaths.isEqualPath) )        
        VerCorsPaths.storePathList(paths)
        Assert.equals(await VerCorsPaths.getPathList(), paths, (x,y) => comparing.compareLists(x,y,VerCorsPaths.isEqualPath) )        

        fakeConfiguration["vercorsplugin.vercorsPath"] = [{ a: "string", version: "string", selected: "string" }]
		Assert.equals(await VerCorsPaths.getPathList(), [], (x,y) => comparing.compareLists(x,y,VerCorsPaths.isEqualPath) )        
        VerCorsPaths.storePathList(paths)
        Assert.equals(await VerCorsPaths.getPathList(), paths, (x,y) => comparing.compareLists(x,y,VerCorsPaths.isEqualPath) )        

        fakeConfiguration["vercorsplugin.vercorsPath"] = [{ path: "string", version: "string", selected: "string", a: "string" }]
		Assert.equals(await VerCorsPaths.getPathList(), [], (x,y) => comparing.compareLists(x,y,VerCorsPaths.isEqualPath) )        
        VerCorsPaths.storePathList(paths)
        Assert.equals(await VerCorsPaths.getPathList(), paths, (x,y) => comparing.compareLists(x,y,VerCorsPaths.isEqualPath) )  
        
        fakeConfiguration["vercorsplugin.vercorsPath"] = [{ path: "string", version: "string" }].concat(paths)
        Assert.equals(await VerCorsPaths.getPathList(), paths, (x,y) => comparing.compareLists(x,y,VerCorsPaths.isEqualPath) )        
	});  
});


function errorMessage(real,expected){
    return "real: " + real + "\n" + "expected" + expected;

}

