# vercorsplugin README

This is a plugin for the verification tool VerCors. It supports basic functionality such as syntax highlighting for PVL and executing the tool directly from VSCode.

## Features

This plugin allows has the following features:
- Set the path to their local vercors binary
- Execute the vercors command on the currently focused file
- Provides syntax highlighting for `.pvl` files (tmLanguage file generation was done semi-automatically with a module of VerCors, which is currently on the text=mate-generator branch of the VerCors Repo)
- Hyper links to sources of errors in error messages
- Partial support for providing cli options, unique to each open pvl file

## Requirements

The only requirement is having `npm` installed. The plugin is known to work with `npm` version 10.2.4. For installing `npm` one option is `nvm`: <https://github.com/nvm-sh/nvm>.

## Known Issues

### CLI Options functionality is only partially implemented. The "Backend silicon/carbon" option is currently only in the UI. Numerous other options are not included. The configuration is not saved in the workspace and thus does not persist after shutting down VSCode.

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

There are currently no automatic tests for this plugin.

