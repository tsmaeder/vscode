/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import * as crypto from 'crypto';
import * as vscode from 'vscode';
import { TestFS } from './memfs';

function rndName() {
	return crypto.randomBytes(8).toString('hex');
}

export const testFs = new TestFS('fake-fs', true);
vscode.workspace.registerFileSystemProvider(testFs.scheme, testFs, { isCaseSensitive: testFs.isCaseSensitive });

export async function createRandomFile(contents = '', dir: vscode.Uri | undefined = undefined, ext = ''): Promise<vscode.Uri> {
	let fakeFile: vscode.Uri;
	if (dir) {
		assert.strictEqual(dir.scheme, testFs.scheme);
		fakeFile = dir.with({ path: dir.path + '/' + rndName() + ext });
	} else {
		fakeFile = vscode.Uri.parse(`${testFs.scheme}:/${rndName() + ext}`);
	}
	testFs.writeFile(fakeFile, Buffer.from(contents), { create: true, overwrite: true });
	return fakeFile;
}

export async function deleteFile(file: vscode.Uri): Promise<boolean> {
	try {
		testFs.delete(file);
		return true;
	} catch {
		return false;
	}
}

export function closeAllEditors(): Thenable<any> {
	return vscode.commands.executeCommand('workbench.action.closeAllEditors');
}

export async function withRandomFileEditor(initialContents: string, fileExtension: string = 'txt', run: (editor: vscode.TextEditor, doc: vscode.TextDocument) => Thenable<void>): Promise<boolean> {
	const file = await createRandomFile(initialContents, undefined, fileExtension);
	const doc = await vscode.workspace.openTextDocument(file);
	const editor = await vscode.window.showTextDocument(doc);
	await run(editor, doc);
	if (doc.isDirty) {
		const saved = await doc.save();
		assert.ok(saved);
		assert.ok(!doc.isDirty);
	}
	return deleteFile(file);
}
