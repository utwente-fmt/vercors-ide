/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import * as path from 'path';
import * as Mocha from 'mocha';
import * as glob from 'glob';
import * as  jest from 'jest';

export function run(): Promise<void> {
	// Create the mocha test
	const mocha = new Mocha({
		ui: 'tdd',
		color: true
	});
	mocha.timeout(100000);

	const testsRoot = __dirname;

	return new Promise((resolve, reject) => {
		// @ts-ignore
		glob('**.test.js', { cwd: testsRoot }, (err, files) => {
			if (err) {
				return reject(err);
			}

			// Add files to the test suite
			files.forEach(f => mocha.addFile(path.resolve(testsRoot, f)));

			try {
				// Run the mocha test
				mocha.run(failures => {
					if (failures > 0) {
						const failedTests = this.testResults.failures.map(failure => {
							return {
								title: failure.title,
								fullTitle: failure.fullTitle,
								duration: failure.duration,
								err: failure.err
							};
						});
				
						// Reject with information about failed tests
						reject(new Error(`${failures} tests failed.` + JSON.stringify(failedTests, null, 2)));
					} else {
						resolve();
					}
				});
			} catch (err) {
				console.error(err);
				reject(err);
			}
		});

	});
}