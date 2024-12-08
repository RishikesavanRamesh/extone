// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { ROS2PackageDependenciesProvider } from './ros2PackageDependencies';
import { CustomBuildTaskProvider } from './customTaskProvider';
import { showInputBox, showQuickPick } from './basicInput';
import { multiStepInput } from './multiStepInput';
import { quickOpen } from './quickOpen';

let customTaskProvider: vscode.Disposable | undefined;

export function activate(context: vscode.ExtensionContext) {

	const rootPath =
		vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0
			? vscode.workspace.workspaceFolders[0].uri.fsPath
			: undefined;
	const ros2PackageDependenciesProvider = new ROS2PackageDependenciesProvider('/workspaces/extone/test_ws');
	vscode.window.registerTreeDataProvider(
		'ros2PackageDependencies',
		ros2PackageDependenciesProvider
	);

	vscode.commands.registerCommand('ros2PackageDependencies.refreshEntry', () =>
		ros2PackageDependenciesProvider.refresh()
	  );
	
	customTaskProvider = vscode.tasks.registerTaskProvider(CustomBuildTaskProvider.CustomBuildScriptType, new CustomBuildTaskProvider('/workspaces/extone/test_ws'));


	context.subscriptions.push(vscode.commands.registerCommand('rtwPackageGenerator.quickInput', async () => {
		const options: Record<string, (context: vscode.ExtensionContext) => Promise<void>> = {
			showQuickPick,
			showInputBox,
			multiStepInput,
			quickOpen,
		};
		const quickPick = vscode.window.createQuickPick();
		quickPick.items = Object.keys(options).map(label => ({ label }));
		quickPick.onDidChangeSelection(selection => {
			if (selection[0]) {
				options[selection[0].label](context)
					.catch(console.error);
			}
		});
		quickPick.onDidHide(() => quickPick.dispose());
		quickPick.show();
	}));


}

// This method is called when your extension is deactivated
export function deactivate(): void {
	if (customTaskProvider) {
		customTaskProvider.dispose();
	}
}