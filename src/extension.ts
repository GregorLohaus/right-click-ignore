// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { spawn, spawnSync, SpawnSyncReturns } from 'child_process';
import { lstatSync, PathLike, readdirSync, readFileSync, writeFile } from 'fs';
import * as vscode from 'vscode';
import path = require('path');

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "right-click-ignore" is now active!');

	let findNearGitRoot = async (path: string): Promise<undefined | string> => {
		let parts: string[] = path.split("/");
		parts = parts.filter((v) => { return ![null, undefined, ""].includes(v); });
		for (let index = parts.length; index > 0; index--) {
			let pathParts = [""].concat(parts.slice(0, index));
			let path = pathParts.join("/");
			let mathingWorkSpaceFolder = vscode.workspace.workspaceFolders?.filter((v) => { return path.includes(v.uri.fsPath); });
			let numberOfPathsInWorkspace = mathingWorkSpaceFolder ? mathingWorkSpaceFolder.length : 0;
			console.log(numberOfPathsInWorkspace);
			if (numberOfPathsInWorkspace < 1 || !lstatSync(path).isDirectory()) {
				continue;
			}
			let containsGitFolder = readdirSync(path, { "withFileTypes": true }).filter((v) => {
				return v.name === ".git";
			});
			if (containsGitFolder.length > 0) {
				return path;
			}
		}
	};

	let untrack = async (filepath: string, recursive: boolean = false, cwd: string) => {
		process.chdir(cwd);
		let pRm:SpawnSyncReturns<Buffer>;
		let pCommit:SpawnSyncReturns<Buffer>;
		if (recursive) {
			pRm = spawnSync("git",["rm","-r","--cached",`./${filepath.trim()}`]);

		} else {
			pRm = spawnSync("git",["rm","--cached",`./${filepath.trim()}`]);
		}
		pCommit = spawnSync("git",["commit","-a","-m",`ignored and untracked ${filepath.trim()}`]);
		let messages: (string|undefined)[] = [];
		messages.push(pRm.error?.message);
		messages.push(pCommit.error?.message);
		return messages;
	};

	let ignore = vscode.commands.registerCommand('right-click-ignore.ignore', (...args) => {
		let filepath: string = args[0]['fsPath'] as string;
		console.log(filepath);
		findNearGitRoot(filepath).then((result) => {
			if (result) {
				console.log(result);
				let isDirectory = lstatSync(filepath).isDirectory();
				let append = isDirectory ? "/" : "";
				let gitPath = filepath.replace(result + "/", "") + append + "\n";
				let gitIgnorePath = result + "/.gitignore";
				if (lstatSync(gitIgnorePath).isFile()){
					let content = readFileSync(gitIgnorePath,{"encoding": "utf-8"});
					if (content.includes(gitPath)) {
						untrack(gitPath, isDirectory, result).then((r)=>{
							r.filter((v)=>{if(v){return v;}}).forEach((e)=>{if(e){vscode.window.showInformationMessage(e);}});
							vscode.window.showInformationMessage("done, gitignore already contained path");
						});
						return;
					}

				}
				writeFile(gitIgnorePath, gitPath, {
					"flag": "a"
				}, () => {
					untrack(gitPath, isDirectory, result).then((r)=>{
						r.filter((v)=>{if(v){return v;}}).forEach((e)=>{if(e){vscode.window.showInformationMessage(e);}});
						vscode.window.showInformationMessage("done");
					});
				});
			}
		});
	});

	context.subscriptions.push(ignore);
}

// This method is called when your extension is deactivated
export function deactivate() { }
