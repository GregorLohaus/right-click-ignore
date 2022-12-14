// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { spawn } from 'child_process';
import { lstatSync, PathLike, readdirSync, writeFile } from 'fs';
import * as vscode from 'vscode';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "right-click-ignore" is now active!');
	
	let findNearGitRoot = async (path:string): Promise<undefined|PathLike> => {
		let parts:string[] = path.split("/");
		parts = parts.filter((v)=>{return ![null,undefined,""].includes(v);});
		for (let index = parts.length; index > 0; index--) {
			let pathParts = [""].concat(parts.slice(0,index));
			let path = pathParts.join("/");
			let mathingWorkSpaceFolder = vscode.workspace.workspaceFolders?.filter((v)=>{return path.includes(v.uri.fsPath);})
			let numberOfPathsInWorkspace = mathingWorkSpaceFolder? mathingWorkSpaceFolder.length : 0;
			console.log(numberOfPathsInWorkspace);
			if (numberOfPathsInWorkspace < 1 || !lstatSync(path).isDirectory()) {
				continue;
			}
			let containsGitFolder = readdirSync(path,{"withFileTypes":true}).filter((v)=>{
				return v.name === ".git";
			});
			if (containsGitFolder.length > 0) {
				return path;
			} 
		}
	};

	let untrack = async (path:string,recursive:boolean = false) => {
		spawn(`git rm ${recursive?"-rm":""} --cached ${path}`);
	};

	let ignore = vscode.commands.registerCommand('right-click-ignore.ignore', (...args) => {
		let filepath:string = args[0]['fsPath'] as string;
		console.log(filepath);
		findNearGitRoot(filepath).then((result)=>{
			if(result){
				console.log(result);
				let isDirectory = lstatSync(filepath).isDirectory();
				let append = isDirectory? "/":"";
				let gitPath = filepath.replace(result+"/","")+append+"\n";
				untrack(gitPath,isDirectory);
				writeFile(result+"/.gitignore",gitPath,{
					"flag": "a"
				},()=>{
					console.log("should have written");
				});
			}
		});
	});

	context.subscriptions.push(ignore);
}

// This method is called when your extension is deactivated
export function deactivate() {}
