import * as vscode from 'vscode';
import * as assert from 'assert';
import * as fs from 'fs';


suite('Settings should still work when inputted values are wrong', () => {
    fs.writeFile('C:\Users\jaron\OneDrive - University of Twente\Documenten\Design Project\vercors-2.0.0-windows\vercors-2.0.0\examples\concepts\arrays\.vscode\settings.json', 'I am cool!',  function(err) {
        if (err) {
            return console.error(err);
        }
    });

	test('Optionmap Tests', async () => {
		
	});
});

