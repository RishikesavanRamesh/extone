import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { parseXml } from '@rgrove/parse-xml';

export class ROS2PackageDependenciesProvider implements vscode.TreeDataProvider<Package> {
    constructor(private workspaceRoot: string) { }

    getTreeItem(element: Package): vscode.TreeItem {
        return element;
    }

    getChildren(element?: Package): Thenable<Package[]> {
        if (!this.workspaceRoot) {
            vscode.window.showInformationMessage('No workspace found');
            return Promise.resolve([]);
        }

        // If element is provided, it means we're showing dependencies for a specific package.
        if (element) {
            return Promise.resolve(this.getDepsInPackageXML(element.packageXMLPath)); // Use the package's package.xml path for dependencies
        } else {
            // Fetch all packages in the workspace.
            return Promise.resolve(this.getAllPackagesInWorkspace());
        }
    }

    /**
     * Given the path to package.xml, read all its dependencies and devDependencies.
     */
    private getDepsInPackageXML(packageXMLLocation: string): Package[] {
        if (this.pathExists(packageXMLLocation)) {
            const toDep = (packageName: string, version: string, description: string, dependencies: string[], location: string): Package => {
                return new Package(packageName, version, description, dependencies, vscode.TreeItemCollapsibleState.None, packageXMLLocation);
            };

            // Parse the package.xml file
            const packageXML = parseXml(fs.readFileSync(packageXMLLocation, 'utf-8')).children[1]; // Assuming the second child is the root of the XML

            // Extract dependencies
            const execDepends = this.getElementsTextByName(packageXML, "exec_depend");
            const buildDepends = this.getElementsTextByName(packageXML, "build_depend");
            const buildtoolDepends = this.getElementsTextByName(packageXML, "buildtool_depend");

            // Map dependencies into Package items
            const execDependsPackage = execDepends.map(dep => toDep(dep, '0.0.0', 'An executable dependency', [], packageXMLLocation));
            const buildDependsPackage = buildDepends.map(dep => toDep(dep, '0.0.0', 'A build dependency', [], packageXMLLocation));
            const buildtoolDependsPackage = buildtoolDepends.map(dep => toDep(dep, '0.0.0', 'A build tool dependency', [], packageXMLLocation));

            return execDependsPackage.concat(buildDependsPackage, buildtoolDependsPackage);
        } else {
            return [];
        }
    }

    /**
     * Returns a list of all packages found in the workspace (including nested directories).
     */
    private getAllPackagesInWorkspace(): Package[] {
        const packages: Package[] = [];
        const srcPath = path.join(this.workspaceRoot, 'src');
        
        // Start recursive search in 'src'
        if (this.pathExists(srcPath)) {
            this.findPackagesInDirectory(srcPath, packages);
        }

        return packages;
    }

    /**
     * Recursively search for package.xml files in all subdirectories of a given directory.
     * 
     * @param dirPath The current directory to search.
     * @param packages The array where found packages will be added.
     */
    private findPackagesInDirectory(dirPath: string, packages: Package[]): void {
        const items = fs.readdirSync(dirPath, { withFileTypes: true });

        items.forEach(item => {
            const fullPath = path.join(dirPath, item.name);

            if (item.isDirectory()) {
                // If it's a directory, recurse into it.
                this.findPackagesInDirectory(fullPath, packages);
            } else if (item.isFile() && item.name === 'package.xml') {
                // If it's a package.xml file, parse it and add it to the list.
                const packageXML = parseXml(fs.readFileSync(fullPath, 'utf-8')).children[1];
                const name = this.getElementTextByName(packageXML, 'name') || path.basename(fullPath);
                const version = this.getElementTextByName(packageXML, 'version') || 'unknown';
                const description = this.getElementTextByName(packageXML, 'description') || 'No description';
                const dependencies: string[] = [];  // You can add additional logic to extract dependencies here.

                // Store the location of the package.xml file in the Package object
                packages.push(new Package(name, version, description, dependencies, vscode.TreeItemCollapsibleState.Collapsed, fullPath));
            }
        });
    }

    private pathExists(p: string): boolean {
        try {
            fs.accessSync(p);
        } catch (err) {
            return false;
        }
        return true;
    }

    private getElementTextByName(element: any, name: string): string | null {
        const foundElement = element.children.find((child: any) => child.name === name);
        return foundElement ? foundElement.children[0].text : null;
    }

    private getElementsTextByName(element: any, name: string): string[] {
        return element.children
            .filter((child: any) => child.name === name)
            .map((child: any) => child.children[0].text);
    }

    private _onDidChangeTreeData: vscode.EventEmitter<Package | undefined | null | void> = new vscode.EventEmitter<Package | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<Package | undefined | null | void> = this._onDidChangeTreeData.event;
  
    refresh(): void {
      this._onDidChangeTreeData.fire();
    }
  
}

class Package extends vscode.TreeItem {
    constructor(
        public readonly packageName: string,
        private version: string,
        public description: string,
        public dependencies: string[],
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly packageXMLPath: string // Store the package.xml location in the package object
    ) {
        super(packageName, collapsibleState);
        this.tooltip = `${this.packageName}-${this.version}`;
    }

    iconPath = {
        light: path.join(__filename, '..', '..', 'resources', 'light', 'dependency.svg'),
        dark: path.join(__filename, '..', '..', 'resources', 'dark', 'dependency.svg')
    };
}
