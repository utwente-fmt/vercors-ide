import * as vscode from 'vscode';
import * as sinon from 'sinon'
import {VercorsOptions,OptionFields} from "../VerCors-CLI-UI"
import {VerCorsPaths,VercorsPath} from '../VerCors-Path-UI';
import {Assert} from './Assert';
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
        let o = VercorsOptions.getAllOptions("Design project/arrayTest.java")
        Assert.equals(VercorsOptions.getAllOptions("Design project/arrayTest.java"), expectedOptions,VercorsOptions.isEqual)

        VercorsOptions.updateOptions("Design project/arrays.java",["--quite"], ["--more"]);
        expectedOptions = {pinned: [ "--more"],flags : ["--quite"]} as OptionFields
        Assert.equals(VercorsOptions.getAllOptions("Design project/arrays.java"), expectedOptions,VercorsOptions.isEqual)

        VercorsOptions.updateOptions("Design project/arrays.java",[], []);
        expectedOptions = {pinned: [],flags : []} as OptionFields
        Assert.equals(VercorsOptions.getAllOptions("Design project/arrays.java"), expectedOptions,VercorsOptions.isEqual)
	});

    test('Erronous and default value handling', async () => {
        fakeConfiguration["vercorsplugin.optionsMap"] = {}
		VercorsOptions.updateOptions("Design project/arrayTest.java",["--quite", "--backend-file-base"], ["--more"])
        let expectedOptions = {pinned: [ "--more"],flags : ["--quite","--backend-file-base"]} as OptionFields
        Assert.equals(VercorsOptions.getAllOptions("Design project/arrayTest.java"), expectedOptions,VercorsOptions.isEqual)


        fakeConfiguration["vercorsplugin.optionsMap"] = "hey"
        Assert.equals(VercorsOptions.getAllOptions("Design project/arrayTest.java"), {pinned: [], flags: []},VercorsOptions.isEqual)
		VercorsOptions.updateOptions("Design project/arrayTest.java",["--quite", "--backend-file-base"], ["--more"])
        expectedOptions = {pinned: [ "--more"],flags : ["--quite","--backend-file-base"]} as OptionFields
        Assert.equals(VercorsOptions.getAllOptions("Design project/arrayTest.java"), expectedOptions,VercorsOptions.isEqual)

        fakeConfiguration["vercorsplugin.optionsMap"] = null
        Assert.equals(VercorsOptions.getAllOptions("Design project/arrayTest.java"), {pinned: [], flags: []},VercorsOptions.isEqual)
		VercorsOptions.updateOptions("Design project/arrayTest.java",["--quite", "--backend-file-base"], ["--more"])
        expectedOptions = {pinned: [ "--more"],flags : ["--quite","--backend-file-base"]} as OptionFields
        Assert.equals(VercorsOptions.getAllOptions("Design project/arrayTest.java"), expectedOptions,VercorsOptions.isEqual)

        fakeConfiguration["vercorsplugin.optionsMap"] = {"Design project/arrayTest.java": {pinned: "string",flags: "string"}}
        Assert.equals(VercorsOptions.getAllOptions("Design project/arrayTest.java"), {pinned: [], flags: []},VercorsOptions.isEqual)
		VercorsOptions.updateOptions("Design project/arrayTest.java",["--quite", "--backend-file-base"], ["--more"])
        expectedOptions = {pinned: [ "--more"],flags : ["--quite","--backend-file-base"]} as OptionFields
        Assert.equals(VercorsOptions.getAllOptions("Design project/arrayTest.java"), expectedOptions,VercorsOptions.isEqual)

        fakeConfiguration["vercorsplugin.optionsMap"] = {"Design project/arrayTest.java": {a: ["string"]}}
        Assert.equals(VercorsOptions.getAllOptions("Design project/arrayTest.java"), {pinned: [], flags: []},VercorsOptions.isEqual)
        VercorsOptions.updateOptions("Design project/arrayTest.java",["--quite", "--backend-file-base"], ["--more"])		
        expectedOptions = {pinned: [ "--more"],flags : ["--quite","--backend-file-base"]} as OptionFields
        Assert.equals(VercorsOptions.getAllOptions("Design project/arrayTest.java"), expectedOptions,VercorsOptions.isEqual)

        fakeConfiguration["vercorsplugin.optionsMap"] = {"Design project/arrayTest.java": {pinned: "string",flags: "string", a: ["string"]}}
        Assert.equals(VercorsOptions.getAllOptions("Design project/arrayTest.java"), {pinned: [], flags: []},VercorsOptions.isEqual)	
        VercorsOptions.updateOptions("Design project/arrayTest.java",["--quite", "--backend-file-base"], ["--more"])
        expectedOptions = {pinned: [ "--more"],flags : ["--quite","--backend-file-base"]} as OptionFields
        Assert.equals(VercorsOptions.getAllOptions("Design project/arrayTest.java"), expectedOptions,VercorsOptions.isEqual)


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
        Assert.equals(await VerCorsPaths.getPathList(), [], VerCorsPaths.comparePathLists )
		VerCorsPaths.storePathList(paths)
        Assert.equals(await VerCorsPaths.getPathList(), paths, VerCorsPaths.comparePathLists )        

        fakeConfiguration["vercorsplugin.vercorsPath"] = null
        Assert.equals(await VerCorsPaths.getPathList(), [], VerCorsPaths.comparePathLists )
		VerCorsPaths.storePathList(paths)
        Assert.equals(await VerCorsPaths.getPathList(), paths, VerCorsPaths.comparePathLists )        

        fakeConfiguration["vercorsplugin.vercorsPath"] = "hey"
        Assert.equals(await VerCorsPaths.getPathList(), [], VerCorsPaths.comparePathLists )
		VerCorsPaths.storePathList(paths)
        Assert.equals(await VerCorsPaths.getPathList(), paths, VerCorsPaths.comparePathLists )        

        fakeConfiguration["vercorsplugin.vercorsPath"] = [{ path: "string", version: "string" }]
        Assert.equals(await VerCorsPaths.getPathList(), [], VerCorsPaths.comparePathLists )        
        VerCorsPaths.storePathList(paths)
        Assert.equals(await VerCorsPaths.getPathList(), paths, VerCorsPaths.comparePathLists )        

        fakeConfiguration["vercorsplugin.vercorsPath"] = [{ a: "string", version: "string", selected: "string" }]
		Assert.equals(await VerCorsPaths.getPathList(), [], VerCorsPaths.comparePathLists )        
        VerCorsPaths.storePathList(paths)
        Assert.equals(await VerCorsPaths.getPathList(), paths, VerCorsPaths.comparePathLists )        

        fakeConfiguration["vercorsplugin.vercorsPath"] = [{ path: "string", version: "string", selected: "string", a: "string" }]
		Assert.equals(await VerCorsPaths.getPathList(), [], VerCorsPaths.comparePathLists )        
        VerCorsPaths.storePathList(paths)
        Assert.equals(await VerCorsPaths.getPathList(), paths, VerCorsPaths.comparePathLists )  
        
        fakeConfiguration["vercorsplugin.vercorsPath"] = [{ path: "string", version: "string" }].concat(paths)
        Assert.equals(await VerCorsPaths.getPathList(), paths, VerCorsPaths.comparePathLists )        
	});  
});


function errorMessage(real,expected){
    return "real: " + real + "\n" + "expected" + expected;

}

