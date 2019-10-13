import Jasmine = require('jasmine');
let path = require('path');
import { parse as parseStackTrace } from 'stack-trace';

export interface Location {
	file: string
	line: number
}

export function patchJasmine(jasmine: Jasmine, overrideFunctionFiles: string[]): Map<string, Location> {


	const locations = new Map<string, Location>();
	const env: any = jasmine.env;

	// monkey patch the suite and spec functions to detect the locations from which they were called
	for (const functionName of ['describe', 'fdescribe', 'xdescribe', 'it', 'fit', 'xit']) {

		const origImpl = env[functionName];
		env[functionName] = function () {

			const result = origImpl.apply(this, arguments);

			const location = findCallLocation(functionName, overrideFunctionFiles);
			if (location) {
				locations.set(result.id, location);
			}

			return result;
		}
	}

	return locations;
}

function getFilenameWithoutExtension(fileName: any) : string {
    return path.parse(fileName).name;
}

function findCallLocation(functionName: string, overrideFunctionFiles: string[]): Location | undefined {

	const stackTrace = parseStackTrace(new Error());
	for (var i = 0; i < stackTrace.length - 1; i++) {
		if (stackTrace[i].getFunctionName() === functionName) {
			let callSite = stackTrace[i + 1];
			if (overrideFunctionFiles.find( (x) => x === getFilenameWithoutExtension(callSite.getFileName()))) {
				callSite = stackTrace[i + 2];
			}

			return {
				file: callSite.getFileName(),
				line: callSite.getLineNumber() - 1
			};
		}
	}

	return undefined;
}
