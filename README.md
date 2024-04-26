This is a plugin for the verification tool VerCors. It supports basic functionality such as syntax highlighting for PVL and executing the tool directly from VSCode.

## Features
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

## Running/building the plugin

Running the plugin can be done from within VS Code or by installing the vsix file.

### Running from VS Code

1. Execute `npm install`
2. Press ▷ to run the launch config (F5).

### Building and installing the plugin

1. Execute `npm install`
2. Run `npm run build`
3. Run `code --install-extension vercorsplugin-0.0.1.vsix`

## Testing

To run all tests, go to VS Code's 'Run and Debug' window and select `Extension Tests` from the dropdown menu

