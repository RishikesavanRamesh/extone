/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as path from 'path';
import * as vscode from 'vscode';

interface CustomBuildTaskDefinition extends vscode.TaskDefinition {

	verb: string;
}

export class CustomBuildTaskProvider implements vscode.TaskProvider {
	static CustomBuildScriptType = 'colcon';
	private tasks: vscode.Task[] | undefined;

	// We use a CustomExecution task when state needs to be shared across runs of the task or when 
	// the task requires use of some VS Code API to run.
	// If you don't need to share state between runs and if you don't need to execute VS Code API in your task, 
	// then a simple ShellExecution or ProcessExecution should be enough.
	// Since our build has this shared state, the CustomExecution is used below.
	private sharedState: string | undefined;

	constructor(private workspaceRoot: string) { }

	public async provideTasks(): Promise<vscode.Task[]> {
		return this.getTasks();
	}

	public resolveTask(_task: vscode.Task): vscode.Task | undefined {
		const verb: string = _task.definition.verb;
		if (verb) {
			const definition: CustomBuildTaskDefinition = <any>_task.definition;
			return this.getTask(definition.verb, definition);
		}
		return undefined;
	}

	private getTasks(): vscode.Task[] {
		if (this.tasks !== undefined) {
			return this.tasks;
		}

		this.tasks = [this.getTask("build"), this.getTask("test"), this.getTask("build --symlink-install")];

		return this.tasks;
	}

	private getTask(verb: string, definition?: CustomBuildTaskDefinition): vscode.Task {
		if (definition === undefined) {
			definition = {
				type: CustomBuildTaskProvider.CustomBuildScriptType,
				verb
			};
		}
		return new vscode.Task(definition, vscode.TaskScope.Workspace, `${definition.type} ${verb}`,
			CustomBuildTaskProvider.CustomBuildScriptType, new vscode.CustomExecution(async (): Promise<vscode.Pseudoterminal> => {
				// When the task is executed, this callback will run. Here, we setup for running the task.
				return new CustomBuildTaskTerminal(this.workspaceRoot, verb);
			}));
		// return new vscode.Task(definition, vscode.TaskScope.Workspace, `${definition.type} ${verb}`,
		// CustomBuildTaskProvider.CustomBuildScriptType, new vscode.ShellExecution("ls -la /workspaces/extone"));
	}
}

class CustomBuildTaskTerminal implements vscode.Pseudoterminal {
	private writeEmitter = new vscode.EventEmitter<string>();
	onDidWrite: vscode.Event<string> = this.writeEmitter.event;
	private closeEmitter = new vscode.EventEmitter<number>();
	onDidClose?: vscode.Event<number> = this.closeEmitter.event;

	private fileWatcher: vscode.FileSystemWatcher | undefined;

	constructor(private workspaceRoot: string, private verb: string) {
	}

	open(initialDimensions: vscode.TerminalDimensions | undefined): void {
		this.doVerb();
	}

	close(): void {
		// The terminal has been closed. Shutdown the build.
		if (this.fileWatcher) {
			this.fileWatcher.dispose();
		}
	}

	private async doVerb(): Promise<void> {
		this.writeEmitter.fire('Starting build...\r\n');
		return new Promise<void>((resolve) => {
			// new vscode.ShellExecution("ls -la /workspaces/extone") /// wanna do this shell execution here in the pseudo terminal so i can also print someother things along......

			// Since we don't actually build anything in this example set a timeout instead.
			const exec = require('child_process').exec;

			// Run the shell command to list files with ls -la
			exec("ls -la /workspaces/extone", (error: any, stdout: string, stderr: string) => {
				if (error) {
					this.writeEmitter.fire(`Error: ${error.message}\r\n`);
					resolve();
					return;
				}
				if (stderr) {
					this.writeEmitter.fire(`stderr: ${stderr}\r\n`);
					resolve();
					return;
				}

				// Split the stdout by lines and emit each line separately
				const lines = stdout.split('\n');
				lines.forEach(line => {
					this.writeEmitter.fire(`${line}\r\n`);
				});

				// Emit build complete after output
				this.writeEmitter.fire('Build complete.\r\n\r\n');
				this.closeEmitter.fire(0);
				resolve();
			});
		});
	}
}
