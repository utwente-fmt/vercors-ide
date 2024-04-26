# vercorsplugin README

This is a plugin for the verification tool VerCors. It supports basic functionality such as syntax highlighting for PVL and executing the tool directly from VSCode.

## Features

## Featues
This plugin allows has the following features:
- Select and switch VerCors versions from installed versions
- Execute the vercors command on the currently focused file
- Provides syntax highlighting for `.pvl` files 
- Provides syntax highlighting for verification language (method contracts) in java & C files
- Provides autocomplete and snippets for verification language
- Graphically selecting CLI options, unique to each open file
- Sources of errors are displayed in the file and in the problem
- Display progress of verification and manually stop

## Requirements

The only requirement is having `npm` installed. The plugin is known to work with `npm` version 10.2.4. For installing `npm` one option is `nvm`: <https://github.com/nvm-sh/nvm>.

## Known Issues

## Building and Running instructions

First execute:

### `npm install`

Then
- Press ▷ to run the launch config (F5).

## Installing the plugin 

### `code --install-extension vercorsplugin-0.0.1.vsix`


## To export a .vsix file:

### `npm install @vscode/vsce`
Then use
### `vsce package`


## Testing

To test the plugin, go to VS Code's 'Run and Debug' window and select `Extension Tests` from the dropdown menu

