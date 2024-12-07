// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { ROS2PackageDependenciesProvider } from './ros2PackageDependencies';

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

}

// This method is called when your extension is deactivated
export function deactivate() { }


