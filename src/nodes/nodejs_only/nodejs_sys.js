// built-in pack: node types registered below belong to "litegraph/nodejs-sys" (see LiteGraph.packs)
LiteGraph.setupPlatform();
LiteGraph.packs.open({ id: "litegraph/nodejs-sys", version: LiteGraph.VERSION, title: "Node.js system", builtin: true });

/**
 * NodeJsSysHelper - shared helpers for the Node.js system nodes (libraries: LiteGraph.LibraryManager)
 */
class NodeJsSysHelper {
    static logError(nodeTitle, error) {
        console.warn(`SysUtil Error: ${nodeTitle}: ${error.message || error} (line ${error.line || "?"})`);
    }
}

// ------------------ Register Node.js Libraries ------------------ //
LiteGraph.LibraryManager.registerLibrary({
    key: "os",
    globalObject: "os",
    server: { npm: "os" }
});

LiteGraph.LibraryManager.registerLibrary({
    key: "fs",
    globalObject: "fs",
    server: { npm: "fs" }
});

LiteGraph.LibraryManager.registerLibrary({
    key: "diskusage",
    defaultExport: true,
    version: "1.1.3",
    globalObject: "diskusage",
    server: { npm: "diskusage" }
});

LiteGraph.LibraryManager.registerLibrary({
    key: "node-os-utils",
    defaultExport: true,
    version: "0.3.4",
    globalObject: "nodeOsUtils",
    server: { npm: "node-os-utils" }
});

LiteGraph.LibraryManager.registerLibrary({
    key: "ps-list",
    defaultExport: true,
    version: "latest",
    globalObject: "psList",
    server: { npm: "ps-list" }
});

LiteGraph.LibraryManager.registerLibrary({
    key: "child_process",
    globalObject: "child_process",
    server: { npm: "child_process" }
});

LiteGraph.LibraryManager.registerLibrary({
    key: "chalk",
    defaultExport: true,
    globalObject: "chalk",
    server: { npm: "chalk" }
});

LiteGraph.LibraryManager.registerLibrary({
    key: "node-windows",
    defaultExport: true,
    globalObject: "nodeWindows",
    server: { npm: "node-windows" }
});

LiteGraph.LibraryManager.registerLibrary({
    key: "node-linux-systemd",
    globalObject: "nodeLinuxSystemd",
    server: { npm: "node-linux-systemd" }
});

// Load libraries at runtime
// ["os", "fs", "diskusage", "node-os-utils", "ps-list", "child_process", "chalk"].forEach(lib => LiteGraph.LibraryManager.loadLibrary(lib));

/**
 * SysUtil_InfoNode - Retrieves System Information (OS, CPU, Memory, Network, Disk)
 */
class SysUtil_InfoNode {
    static title = "System Info";
    static desc = "Get OS, CPU, Memory, Uptime, Disk, Network, and system details";

    constructor() {
        this.runtime = "node";
        this.libraries = ["os","diskusage","node-os-utils"];
        this.addInput("refresh", LiteGraph.ACTION);
        this.addOutput("onRefresh", LiteGraph.EVENT);
        this.addOutput("info", "object");
        this.properties = {};
        this.cachedData = {};
        this.libsReady = false;
    }

    onGetOutputs() {
        return [
            ["os", "string"],
            ["cpuModel", "string"],
            ["memoryUsage", "string"],
            ["uptime", "number"],
            ["hostname", "string"],
            ["ipAddress", "string"],
            ["cpuLoad", "number"],
            ["diskUsage", "string"],
            ["networkSpeed", "string"]
        ].filter(([key]) => !this.outputs.some(o => o.name === key));
    }

    onAction(action) {
        if (action === "refresh") {
            this.fetchSystemInfo();
        }
    }

    async fetchSystemInfo() {
        let os = LiteGraph.LibraryManager.getLib("os");
        let diskusage = LiteGraph.LibraryManager.getLib("diskusage");
        let network = LiteGraph.LibraryManager.getLib("node-os-utils");

        if (!os) return NodeJsSysHelper.logError(this.title, "Missing required system libraries.");

        try {
            const totalMem = os.totalmem();
            const freeMem = os.freemem();
            const usedMem = totalMem - freeMem;
            const memUsagePercent = ((usedMem / totalMem) * 100).toFixed(1);

            let data = {
                os: os.platform() + " " + os.release(),
                cpuModel: os.cpus()[0]?.model || "Unknown",
                memoryUsage: `${(usedMem / 1e9).toFixed(2)}GB / ${(totalMem / 1e9).toFixed(2)}GB (${memUsagePercent}%)`,
                uptime: os.uptime(),
                hostname: os.hostname(),
                ipAddress: Object.values(os.networkInterfaces())
                    .flat()
                    .filter(iface => iface.family === "IPv4" && !iface.internal)
                    .map(iface => iface.address)
                    .join(", ")
            };

            data.cpuLoad = await network?.cpu.loadavg();
            data.diskUsage = await diskusage?.check("/").then(info => {
                const totalDisk = info.total;
                const freeDisk = info.available;
                const usedDisk = totalDisk - freeDisk;
                const diskUsagePercent = ((usedDisk / totalDisk) * 100).toFixed(1);
                return `${(usedDisk / 1e9).toFixed(2)}GB / ${(totalDisk / 1e9).toFixed(2)}GB (${diskUsagePercent}%)`;
            });
            data.networkSpeed = await network?.netstat.inOut().then(net => {
                return typeof net === "object" && net.total ? 
                    `In: ${net.total.inputMb} MB/s, Out: ${net.total.outputMb} MB/s` : net;
            });

            this.cachedData = data;
            this.updateOutputs(data);
            this.triggerSlot("onRefresh");
        } catch (error) {
            NodeJsSysHelper.logError(this.title, error);
        }
    }

    updateOutputs(data) {
        Object.entries(data).forEach(([key, value]) => {
            this.setOutputData(key, value);
        });
        this.setOutputData("info", data);
    }
}
LiteGraph.registerNodeType("sys/info", SysUtil_InfoNode);

/**
 * SysUtil_ProcessListNode - Retrieves Running Processes
 */
class SysUtil_ProcessListNode {
    static title = "Process List";
    static desc = "Lists running processes with CPU and Memory usage";

    constructor() {
        this.runtime = "node";
        this.libraries = ["ps-list"];
        this.addInput("refresh", LiteGraph.ACTION);
        this.addInput("filterByName", "string", { param_bind: true });

        this.addOutput("onRefresh", LiteGraph.EVENT);
        this.addOutput("processes", "array");

        this.properties = {
            filterByName: ""
        };
        this.cachedData = [];
        this.libsReady = false;
    }

    onGetOutputs() {
        return [
            ["processes", "array"],
            ["onRefresh", LiteGraph.EVENT]
        ].filter(([key]) => !this.outputs.some(o => o.name === key));
    }

    onAction(action) {
        if (action === "refresh") {
            this.fetchProcessList();
        }
    }

    async fetchProcessList() {
        let psList = LiteGraph.LibraryManager.getLib("ps-list");

        if (!psList || typeof psList !== "function") return NodeJsSysHelper.logError(this.title, "ps-list function unavailable.");

        try {
            let filter = this.getInputOrProperty("filterByName");

            let processes = await psList();
            if (!Array.isArray(processes)) return NodeJsSysHelper.logError(this.title, "Unexpected process list format.");

            let filteredProcesses = processes
                .filter(proc => proc && typeof proc === "object" && "name" in proc)
                .filter(proc => (filter ? proc.name.includes(filter) : true))
                .map(proc => ({
                    pid: proc.pid || "N/A",
                    name: proc.name || "Unknown",
                    cpu: proc.cpu || 0,
                    memory: proc.memory || 0
                }));

            this.cachedData = filteredProcesses;
            this.updateOutputs(filteredProcesses);
            this.triggerSlot("onRefresh");
        } catch (error) {
            NodeJsSysHelper.logError(this.title, error);
        }
    }

    updateOutputs(processes) {
        this.setOutputData("processes", processes);
    }
}
LiteGraph.registerNodeType("sys/processList", SysUtil_ProcessListNode);


class SysUtil_RunCommandNode {
    static title = "Run Command";
    static desc = "Executes a shell command and returns the output.";

    constructor() {
        this.runtime = "node";
        this.libraries = ["child_process"];
        this.addInput("run", LiteGraph.ACTION);
        this.addInput("command", "string", { param_bind: true });
        this.addInput("timeout", "number", { param_bind: true });
        this.addInput("keepRunning", "boolean", { param_bind: true });
        this.addInput("killPrevious", "boolean", { param_bind: true });

        this.addOutput("stdout", "string");
        this.addOutput("stderr", "string");
        this.addOutput("exitCode", "number");
        this.addOutput("processInstance", "object");
        this.addOutput("onData", LiteGraph.EVENT);
        this.addOutput("onClose", LiteGraph.EVENT);
        this.addOutput("onError", LiteGraph.EVENT);

        this.properties = {
            command: "",
            timeout: 12000, // Default timeout: 12 seconds
            keepRunning: false,
            killPrevious: true // Determines if previous process should be terminated
        };

        this.process = null; // Track running process
    }

    onGetOutputs() {
        return [
            ["stdout", "string"],
            ["stderr", "string"],
            ["exitCode", "number"],
            ["processInstance", "object"],
            ["onData", LiteGraph.EVENT],
            ["onClose", LiteGraph.EVENT],
            ["onError", LiteGraph.EVENT]
        ].filter(([key]) => !this.outputs.some(o => o.name === key));
    }

    onAction(action) {
        if (action === "run") {
            this.executeCommand();
        }
    }

    async executeCommand() {
        let child_process = LiteGraph.LibraryManager.getLib("child_process");
        if (!child_process) {
            NodeJsSysHelper.logError(this.title, "Missing child_process module.");
            return;
        }

        let command = this.getInputOrProperty("command");
        let timeout = this.getInputOrProperty("timeout") || this.properties.timeout;
        let keepRunning = this.getInputOrProperty("keepRunning") || this.properties.keepRunning;
        let killPrevious = this.getInputOrProperty("killPrevious") || this.properties.killPrevious;

        if (!command) {
            NodeJsSysHelper.logError(this.title, "No command specified.");
            return;
        }

        try {
            if (this.process && killPrevious) {
                this.process.kill(); // Ensure any previous process is terminated
                this.process = null;
            }

            if (keepRunning) {
                this.runPersistentCommand(command, child_process);
            } else {
                this.runSingleExecution(command, timeout, child_process);
            }
        } catch (error) {
            NodeJsSysHelper.logError(this.title, error);
        }
    }

    runSingleExecution(command, timeout, child_process) {
        child_process.exec(command, { timeout }, (error, stdout, stderr) => {
            const out = stdout?.toString().trim() || "";
            const err = stderr?.toString().trim() || "";
            this.setOutputData("stdout", out);
            this.setOutputData("stderr", err);
            this.setOutputData("exitCode", error ? error.code : 0);
            this.triggerSlot("onData");
            this.triggerSlot("onClose");
            
            if (error) {
                this.setOutputData("stderr", "Error "+this.title+" :: "+(error.message || error) + (err ? " :: stderr: "+err : ""));
                this.triggerSlot("onError");
                NodeJsSysHelper.logError(this.title, error);
            }
        });
    }

    runPersistentCommand(command, child_process) {
        this.process = child_process.spawn(command, { shell: true });

        this.setOutputData("processInstance", this.process);

        this.process.stdout.on("data", (data) => {
            this.setOutputData("stdout", data.toString().trim());
            this.triggerSlot("onData");
        });

        this.process.stderr.on("data", (data) => {
            this.setOutputData("stderr", data.toString().trim());
            this.triggerSlot("onError");
        });

        this.process.on("close", (code) => {
            this.setOutputData("exitCode", code);
            this.triggerSlot("onClose");
            this.process = null;
        });

        this.process.on("error", (error) => {
            this.setOutputData("stderr", "Error "+this.title+" :: "+(error.message || error));
            this.triggerSlot("onError");
            NodeJsSysHelper.logError(this.title, error);
            this.process = null;
        });
    }
}
LiteGraph.registerNodeType("sys/runCommand", SysUtil_RunCommandNode);


// class SysUtil_FileSystemNode {
//     static title = "File System";
//     static desc = "Performs file operations: Read, Write, Delete, Check Exists, List Directory";

//     constructor() {
//         this.addInput("do", LiteGraph.ACTION);
//         this.addInput("filePath", "string", { param_bind: true });
//         this.addInput("content", "string", { param_bind: true });
//         this.addInput("action", "string", { param_bind: true }); // "read", "write", "delete", "exists", "list"

//         this.addOutput("fileContent", "string");
//         this.addOutput("fileList", "array");
//         this.addOutput("exists", "boolean");
//         this.addOutput("onSuccess", LiteGraph.EVENT);
//         this.addOutput("onError", LiteGraph.EVENT);

//         this.properties = {
//             defaultFilePath: "",
//             defaultContent: "",
//             defaultAction: "read" // Default file action
//         };

//         this.fs = null; // Track File System module
//     }

//     onGetOutputs() {
//         return [
//             ["fileContent", "string"],
//             ["fileList", "array"],
//             ["exists", "boolean"],
//             ["onSuccess", LiteGraph.EVENT],
//             ["onError", LiteGraph.EVENT]
//         ].filter(([key]) => !this.outputs.some(o => o.name === key));
//     }

//     onAction(action) {
//         if (action === "do") {
//             this.handleFileOperation();
//         }
//     }

//     async handleFileOperation() {
//         this.fs = LiteGraph.LibraryManager.getLib("fs");
//         if (!this.fs) {
//             NodeJsSysHelper.logError(this.title, "Missing fs module.");
//             return;
//         }

//         let filePath = this.getInputOrProperty("filePath") || this.properties.defaultFilePath;
//         let content = this.getInputOrProperty("content") || this.properties.defaultContent;
//         let action = this.getInputOrProperty("action") || this.properties.defaultAction;

//         if (!filePath) {
//             NodeJsSysHelper.logError(this.title, "No file path specified.");
//             return;
//         }

//         try {
//             switch (action) {
//                 case "read":
//                     this.readFile(filePath);
//                     break;
//                 case "write":
//                     this.writeFile(filePath, content);
//                     break;
//                 case "delete":
//                     this.deleteFile(filePath);
//                     break;
//                 case "exists":
//                     this.checkFileExists(filePath);
//                     break;
//                 case "list":
//                     this.listDirectory(filePath);
//                     break;
//                 default:
//                     NodeJsSysHelper.logError(this.title, `Unknown action: ${action}`);
//             }
//         } catch (error) {
//             NodeJsSysHelper.logError(this.title, error);
//             this.triggerSlot("onError");
//         }
//     }

//     readFile(filePath) {
//         try {
//             let data = this.fs.readFileSync(filePath, "utf8");
//             this.setOutputData("fileContent", data);
//             this.triggerSlot("onSuccess");
//         } catch (error) {
//             NodeJsSysHelper.logError(this.title, `Error reading file: ${filePath}`);
//             this.triggerSlot("onError");
//         }
//     }

//     writeFile(filePath, content) {
//         try {
//             this.fs.writeFileSync(filePath, content, "utf8");
//             this.triggerSlot("onSuccess");
//         } catch (error) {
//             NodeJsSysHelper.logError(this.title, `Error writing to file: ${filePath}`);
//             this.triggerSlot("onError");
//         }
//     }

//     deleteFile(filePath) {
//         try {
//             if (this.fs.existsSync(filePath)) {
//                 this.fs.unlinkSync(filePath);
//                 this.triggerSlot("onSuccess");
//             } else {
//                 NodeJsSysHelper.logError(this.title, `File not found: ${filePath}`);
//                 this.triggerSlot("onError");
//             }
//         } catch (error) {
//             NodeJsSysHelper.logError(this.title, `Error deleting file: ${filePath}`);
//             this.triggerSlot("onError");
//         }
//     }

//     checkFileExists(filePath) {
//         try {
//             let exists = this.fs.existsSync(filePath);
//             this.setOutputData("exists", exists);
//             this.triggerSlot("onSuccess");
//         } catch (error) {
//             NodeJsSysHelper.logError(this.title, `Error checking file: ${filePath}`);
//             this.triggerSlot("onError");
//         }
//     }

//     listDirectory(filePath) {
//         try {
//             if (!this.fs.existsSync(filePath) || !this.fs.lstatSync(filePath).isDirectory()) {
//                 NodeJsSysHelper.logError(this.title, `Directory not found: ${filePath}`);
//                 this.triggerSlot("onError");
//                 return;
//             }
//             let files = this.fs.readdirSync(filePath);
//             this.setOutputData("fileList", files);
//             this.triggerSlot("onSuccess");
//         } catch (error) {
//             NodeJsSysHelper.logError(this.title, `Error listing directory: ${filePath}`);
//             this.triggerSlot("onError");
//         }
//     }
// }
// LiteGraph.registerNodeType("sys/fileSystem", SysUtil_FileSystemNode);

class SysUtil_FileBaseNode {
    constructor(actionTitle, actionDesc) {
        this.runtime = "node";
        this.libraries = ["fs"];
        this.title = actionTitle;
        this.desc = actionDesc;

        this.addInput("do", LiteGraph.ACTION);
        this.addInput("filePath", "string", { param_bind: true });

        this.addOutput("onSuccess", LiteGraph.EVENT);
        this.addOutput("onError", LiteGraph.EVENT);

        this.properties = {
            filePath: ""
        };
    }

    onAction(action) {
        if (action === "do") {
            this.handleFileOperation();
        }
    }

    async handleFileOperation() {
        let fs = LiteGraph.LibraryManager.getLib("fs");
        if (!fs) return;

        let filePath = this.getInputOrProperty("filePath");
        if (!filePath) {
            NodeJsSysHelper.logError(this.title, "No file path specified.");
            this.triggerSlot("onError");
            return;
        }

        this.performOperation(fs, filePath);
    }

    performOperation(fs, filePath) {
        throw new Error("performOperation must be implemented by subclasses");
    }
}

class SysUtil_FileReadNode extends SysUtil_FileBaseNode {
    constructor() {
        super("Read File", "Reads content from a file.");
        this.addOutput("fileContent", "string");
    }

    performOperation(fs, filePath) {
        try {
            let data = fs.readFileSync(filePath, "utf8");
            this.setOutputData("fileContent", data);
            this.triggerSlot("onSuccess");
        } catch (error) {
            NodeJsSysHelper.logError(this.title, `Error reading file: ${filePath}`);
            this.triggerSlot("onError");
        }
    }
}
LiteGraph.registerNodeType("sys/fileRead", SysUtil_FileReadNode);


class SysUtil_FileWriteNode extends SysUtil_FileBaseNode {
    constructor() {
        super("Write File", "Writes content to a file.");
        this.addInput("content", "string", { param_bind: true });
        this.properties.content = "";
    }

    performOperation(fs, filePath) {
        let content = this.getInputOrProperty("content");
        try {
            fs.writeFileSync(filePath, content, "utf8");
            this.triggerSlot("onSuccess");
        } catch (error) {
            NodeJsSysHelper.logError(this.title, `Error writing to file: ${filePath}`);
            this.triggerSlot("onError");
        }
    }
}
LiteGraph.registerNodeType("sys/fileWrite", SysUtil_FileWriteNode);


class SysUtil_FileDeleteNode extends SysUtil_FileBaseNode {
    constructor() {
        super("Delete File", "Deletes a file.");
    }

    performOperation(fs, filePath) {
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                this.triggerSlot("onSuccess");
            } else {
                NodeJsSysHelper.logError(this.title, `File not found: ${filePath}`);
                this.triggerSlot("onError");
            }
        } catch (error) {
            NodeJsSysHelper.logError(this.title, `Error deleting file: ${filePath}`);
            this.triggerSlot("onError");
        }
    }
}
LiteGraph.registerNodeType("sys/fileDelete", SysUtil_FileDeleteNode);


class SysUtil_FileExistsNode extends SysUtil_FileBaseNode {
    constructor() {
        super("File Exists", "Checks if a file exists.");
        this.addOutput("exists", "boolean");
    }

    performOperation(fs, filePath) {
        try {
            let exists = fs.existsSync(filePath);
            this.setOutputData("exists", exists);
            this.triggerSlot("onSuccess");
        } catch (error) {
            NodeJsSysHelper.logError(this.title, `Error checking file: ${filePath}`);
            this.triggerSlot("onError");
        }
    }
}
LiteGraph.registerNodeType("sys/fileExists", SysUtil_FileExistsNode);


class SysUtil_FileListNode extends SysUtil_FileBaseNode {
    constructor() {
        super("List Directory", "Lists files in a directory.");
        this.addOutput("fileList", "array");
    }

    performOperation(fs, filePath) {
        try {
            if (!fs.existsSync(filePath) || !fs.lstatSync(filePath).isDirectory()) {
                NodeJsSysHelper.logError(this.title, `Directory not found: ${filePath}`);
                this.triggerSlot("onError");
                return;
            }
            let files = fs.readdirSync(filePath);
            this.setOutputData("fileList", files);
            this.triggerSlot("onSuccess");
        } catch (error) {
            NodeJsSysHelper.logError(this.title, `Error listing directory: ${filePath}`);
            this.triggerSlot("onError");
        }
    }
}
LiteGraph.registerNodeType("sys/fileList", SysUtil_FileListNode);


// Ensure required Node.js `child_process` library is available
LiteGraph.LibraryManager.registerLibrary({
    key: "child_process",
    globalObject: "child_process",
    server: { npm: "child_process" }
});
LiteGraph.LibraryManager.loadLibrary("child_process");

class SysUtil_ProcessControlNode {
    static title = "Process Control";
    static desc = "Controls system processes: Start, Kill, Restart, Check Status";

    constructor() {
        this.runtime = "node";
        this.libraries = ["child_process"];
        this.addInput("start", LiteGraph.ACTION);
        this.addInput("kill", LiteGraph.ACTION);
        this.addInput("restart", LiteGraph.ACTION);
        this.addInput("processCommand", "string", { param_bind: true });
        this.addInput("args", "array", { param_bind: true });
        this.addInput("envVars", "object", { param_bind: true });

        this.addOutput("processInstance", "object");
        this.addOutput("stdout", "string");
        this.addOutput("stderr", "string");
        this.addOutput("status", "string");
        this.addOutput("exitCode", "number");
        this.addOutput("onStarted", LiteGraph.EVENT);
        this.addOutput("onStopped", LiteGraph.EVENT);
        this.addOutput("onRestarted", LiteGraph.EVENT);
        this.addOutput("onSuccess", LiteGraph.EVENT);
        this.addOutput("onError", LiteGraph.EVENT);
        this.addOutput("onDataUpdate", LiteGraph.EVENT);

        this.properties = {
            processCommand: "",
            args: [],
            envVars: {}
        };

        this.process = null; // Track process instance
        this.updateProcessStatus();
    }

    onGetOutputs() {
        return [
            ["processInstance", "object"],
            ["stdout", "string"],
            ["stderr", "string"],
            ["status", "string"],
            ["exitCode", "number"],
            ["onStarted", LiteGraph.EVENT],
            ["onStopped", LiteGraph.EVENT],
            ["onRestarted", LiteGraph.EVENT],
            ["onSuccess", LiteGraph.EVENT],
            ["onError", LiteGraph.EVENT],
            ["onDataUpdate", LiteGraph.EVENT]
        ].filter(([key]) => !this.outputs.some(o => o.name === key));
    }

    onExecute() {
        // Ensure process status is up-to-date every frame
        this.updateProcessStatus();
    }

    onAction(action) {
        let child_process = LiteGraph.LibraryManager.getLib("child_process");
        if (!child_process) {
            NodeJsSysHelper.logError(this.title, "Missing child_process module.");
            return;
        }

        let processCommand = this.getInputOrProperty("processCommand");
        let args = this.getInputOrProperty("args");
        let envVars = this.getInputOrProperty("envVars");

        if (!processCommand && action === "start") {
            NodeJsSysHelper.logError(this.title, "No process command specified.");
            return;
        }

        try {
            switch (action) {
                case "start":
                    this.startProcess(child_process, processCommand, args, envVars);
                    break;
                case "kill":
                    this.killProcess();
                    break;
                case "restart":
                    this.restartProcess(child_process, processCommand, args, envVars);
                    break;
                default:
                    NodeJsSysHelper.logError(this.title, `Unknown action: ${action}`);
            }
        } catch (error) {
            NodeJsSysHelper.logError(this.title, error);
            this.triggerSlot("onError");
        }
    }

    async startProcess(child_process, command, args, envVars) {
        try {
            this.process = await child_process.spawn(command, args, {
                env: { ...process.env, ...envVars },
                shell: true
            });
            
            this.setOutputData("processInstance", this.process);
            this.updateProcessStatus();
            this.triggerSlot("onStarted");
            this.triggerSlot("onSuccess");

            this.process.stdout.on("data", (data) => {
                this.setOutputData("stdout", data.toString().trim());
                this.triggerSlot("onDataUpdate");
            });

            this.process.stderr.on("data", (data) => {
                this.setOutputData("stderr", data.toString().trim());
                this.triggerSlot("onDataUpdate");
            });

            this.process.on("close", (code) => {
                this.process = null;
                this.updateProcessStatus();
                this.setOutputData("exitCode", code);
                this.setOutputData("status", "stopped");
                this.triggerSlot("onStopped");
                this.triggerSlot("onSuccess");
            });

            this.process.on("error", (error) => {
                NodeJsSysHelper.logError(this.title, error);
                this.process = null;
                this.updateProcessStatus();
                this.setOutputData("status", "error");
                this.triggerSlot("onError");
            });
        } catch (error) {
            NodeJsSysHelper.logError(this.title, error);
            this.triggerSlot("onError");
        }
    }

    async killProcess() {
        try {
            if (this.process) {
                await this.process.kill();
                this.process = null;
                this.updateProcessStatus();
                this.setOutputData("status", "killed");
                this.triggerSlot("onStopped");
                this.triggerSlot("onSuccess");
            } else {
                NodeJsSysHelper.logError(this.title, "No running process to kill.");
                this.triggerSlot("onError");
            }
        } catch (error) {
            NodeJsSysHelper.logError(this.title, `Error killing process.`);
            this.triggerSlot("onError");
        }
    }

    async restartProcess(child_process, command, args, envVars) {
        await this.killProcess();
        await this.startProcess(child_process, command, args, envVars);
        this.triggerSlot("onRestarted");
    }

    updateProcessStatus() {
        if (this.process) {
            this.setOutputData("status", "running");
        } else {
            this.setOutputData("status", "stopped");
        }
    }
}
LiteGraph.registerNodeType("sys/processControl", SysUtil_ProcessControlNode);


class SysUtil_LogNode {
    static title = "Log";
    static desc = "Structured logging with console styling and optional file writing.";

    constructor() {
        this.runtime = "node";
        this.libraries = ["fs", "chalk"];
        this.addInput("log", LiteGraph.ACTION);
        this.addInput("message", "*", { param_bind: true });
        // this.addInput("logToFile", "boolean", { param_bind: true });
        this.addInput("filePath", "string", { param_bind: true });

        this.addOutput("onLogged", LiteGraph.EVENT);
        this.addOutput("formattedLog", "string");

        this.addProperty("message", "log message", "string");
        this.addProperty("level", "info", "enum", { values: ["info", "warn", "error", "debug"] });
        this.addProperty("truncateConsoleOutput", true, "boolean");
        this.addProperty("truncateLength", 500, "number"); // Cutoff for console display
        this.addProperty("logToFile", false, "boolean");
        this.addProperty("filePath", "logs/system.log", "string");

        this.fs = null;
        this.chalk = null;

        this.updateNodeStyle();
    }

    updateNodeStyle() {
        const levelColors = {
            info: "#3498db", // Blue
            warn: "#f1c40f", // Yellow
            error: "#e74c3c", // Red
            debug: "#9b59b6" // Purple
        };
        this.color = levelColors[this.properties.level] || "#bdc3c7"; // Default gray
        this.title = `Log (${this.properties.level.toUpperCase()})`;
    }

    onPropertyChanged(name, value) {
        if (name === "level") {
            this.updateNodeStyle();
        }
        return true;
    }

    onGetOutputs() {
        return [
            ["onLogged", LiteGraph.EVENT],
            ["formattedLog", "string"]
        ].filter(([key]) => !this.outputs.some(o => o.name === key));
    }

    onAction(action) {
        if (action === "log") {
            this.writeLog();
        }
    }

    async writeLog() {
        this.fs = LiteGraph.LibraryManager.getLib("fs");
        this.chalk = LiteGraph.LibraryManager.getLib("chalk");

        if (!this.chalk && typeof console !== "undefined") {
            console.warn("SysUtil_LogNode: Chalk library is missing, proceeding without styling.");
        }

        let message = this.getInputOrProperty("message"); // Message can be any data type
        let level = this.properties.level.toLowerCase();
        let logToFile = this.getInputOrProperty("logToFile");
        let filePath = this.getInputOrProperty("filePath");

        if (message === undefined) {
            NodeJsSysHelper.logError(this.title, "No message provided for logging.");
            return;
        }

        const timestamp = new Date().toISOString();
        const logLevels = {
            info: this.chalk ? this.chalk.blue("[INFO]") : "[INFO]",
            warn: this.chalk ? this.chalk.yellow("[WARN]") : "[WARN]",
            error: this.chalk ? this.chalk.red("[ERROR]") : "[ERROR]",
            debug: this.chalk ? this.chalk.magenta("[DEBUG]") : "[DEBUG]"
        };

        let logLevelTag = logLevels[level] || logLevels.info;
        let formattedLog = `${timestamp} ${logLevelTag} ${this.formatMessage(message)}`;

        // Print to console (with truncation for long data)
        if (typeof console !== "undefined") {
            if (this.properties.truncateConsoleOutput && formattedLog.length > this.properties.truncateLength) {
                console.log(formattedLog.substring(0, this.properties.truncateLength) + " ... (truncated)");
            } else {
                console.log(formattedLog);
            }
        }

        this.setOutputData("formattedLog", formattedLog);
        this.triggerSlot("onLogged");

        // Save full log to file
        if (logToFile && this.fs) {
            try {
                this.fs.appendFileSync(filePath, formattedLog + "\n", "utf8");
            } catch (error) {
                NodeJsSysHelper.logError(this.title, `Error writing log to file: ${filePath}`);
            }
        }
    }

    formatMessage(message) {
        if (typeof message === "object") {
            try {
                return JSON.stringify(message, null, 2);
            } catch {
                return "[Invalid JSON]";
            }
        }
        return String(message);
    }
}
LiteGraph.registerNodeType("sys/log", SysUtil_LogNode);


class SysUtil_ServiceManagerNode {
    static title = "Service Manager";
    static desc = "Manages system services (start, stop, restart) across Windows and Linux";

    constructor() {
        this.runtime = "node";
        this.platform = typeof process !== "undefined" && !process.browser ? process.platform : null;
        if (this.platform === "win32") {
            this.libraries = ["node-windows"];
        } else if (this.platform === "linux") {
            this.libraries = ["node-linux-systemd"];
        }
        this.addInput("start", LiteGraph.ACTION);
        this.addInput("stop", LiteGraph.ACTION);
        this.addInput("restart", LiteGraph.ACTION);
        this.addInput("serviceName", "string", { param_bind: true });

        this.addOutput("serviceStatus", "string");
        this.addOutput("responseLog", "string");
        this.addOutput("onStarted", LiteGraph.EVENT);
        this.addOutput("onStopped", LiteGraph.EVENT);
        this.addOutput("onRestarted", LiteGraph.EVENT);
        this.addOutput("onError", LiteGraph.EVENT);

        this.properties = { serviceName: "" };
        this.currentStatus = "unknown";

        // Prevent execution in browsers
        if (typeof process === "undefined" || process.browser) {
            console.warn(`${this.title}: Running in browser. Service management is disabled.`);
            return;
        }

        this.windowsService = null;
        this.linuxService = null;
    }

    onPostConstruct() {
        if (!["win32", "linux"].includes(this.platform)) {
            throw new Error(`Service adapters do not support platform ${this.platform}`);
        }
        this.initializeLibrary();
    }

    initializeLibrary() {
        if (typeof process === "undefined") return;
        if (this.platform === "win32") {
            this.windowsService = LiteGraph.LibraryManager.getLib("node-windows");
        } else if (this.platform === "linux") {
            this.linuxService = LiteGraph.LibraryManager.getLib("node-linux-systemd");
        }
    }

    onExecute() {
        if (typeof process === "undefined") return;
        let serviceName = this.getInputOrProperty("serviceName");
        if (serviceName) {
            this.updateServiceStatus(serviceName);
        }
    }

    onAction(action) {
        if (typeof process === "undefined") {
            console.warn(`${this.title}: Running in browser. Actions are disabled.`);
            return;
        }

        let serviceName = this.getInputOrProperty("serviceName");
        if (!serviceName) {
            NodeJsSysHelper.logError(this.title, "No service name provided.");
            return;
        }

        try {
            switch (action) {
                case "start":
                    this.controlService(serviceName, "start");
                    break;
                case "stop":
                    this.controlService(serviceName, "stop");
                    break;
                case "restart":
                    this.controlService(serviceName, "restart");
                    break;
                default:
                    NodeJsSysHelper.logError(this.title, `Unknown action: ${action}`);
            }
        } catch (error) {
            NodeJsSysHelper.logError(this.title, error);
            this.triggerSlot("onError");
        }
    }

    controlService(serviceName, action) {
        if (this.platform === "win32") {
            this.controlWindowsService(serviceName, action);
        } else {
            this.controlLinuxService(serviceName, action);
        }
    }

    controlWindowsService(serviceName, action) {
        if (!this.windowsService) {
            NodeJsSysHelper.logError(this.title, "Windows service management library not available.");
            return;
        }

        const Service = this.windowsService.Service;
        const svc = new Service({ name: serviceName });

        svc[action]();
        this.currentStatus = action === "start" ? "running" : "stopped";
        this.setOutputData("serviceStatus", this.currentStatus);
        this.setOutputData("responseLog", `Windows service ${serviceName} ${action} executed.`);
        this.triggerEvent(action);
    }

    controlLinuxService(serviceName, action) {
        if (!this.linuxService) {
            NodeJsSysHelper.logError(this.title, "Linux service management library not available.");
            return;
        }

        this.linuxService[action](serviceName)
            .then(() => {
                this.currentStatus = action === "start" ? "running" : "stopped";
                this.setOutputData("serviceStatus", this.currentStatus);
                this.setOutputData("responseLog", `Linux service ${serviceName} ${action} executed.`);
                this.triggerEvent(action);
            })
            .catch((error) => {
                NodeJsSysHelper.logError(this.title, `Error controlling service ${serviceName}: ${error}`);
                this.triggerSlot("onError");
            });
    }
}
LiteGraph.registerNodeType("sys/serviceManager", SysUtil_ServiceManagerNode);


class SysUtil_ServiceListNode {
    static title = "Service List";
    static desc = "Lists system services on Windows and Linux";

    constructor() {
        this.runtime = "node";
        this.platform = typeof process !== "undefined" && !process.browser ? process.platform : null;
        if (this.platform === "win32") {
            this.libraries = ["node-windows"];
        } else if (this.platform === "linux") {
            this.libraries = ["node-linux-systemd"];
        }
        this.addInput("refresh", LiteGraph.ACTION);
        this.addInput("filter", "string", { param_bind: true });

        this.addOutput("services", "array");
        this.addOutput("onListed", LiteGraph.EVENT);
        this.addOutput("onError", LiteGraph.EVENT);

        this.properties = { filter: "" };

        if (typeof process === "undefined" || process.browser) {
            console.warn(`${this.title}: Running in browser. Service listing is disabled.`);
            return;
        }

        this.windowsService = null;
        this.linuxService = null;
    }

    onPostConstruct() {
        if (!["win32", "linux"].includes(this.platform)) {
            throw new Error(`Service adapters do not support platform ${this.platform}`);
        }
        this.initializeLibrary();
    }

    initializeLibrary() {
        if (typeof process === "undefined") return;
        if (this.platform === "win32") {
            this.windowsService = LiteGraph.LibraryManager.getLib("node-windows");
        } else if (this.platform === "linux") {
            this.linuxService = LiteGraph.LibraryManager.getLib("node-linux-systemd");
        }
    }

    onAction(action) {
        if (typeof process === "undefined") {
            console.warn(`${this.title}: Running in browser. Actions are disabled.`);
            return;
        }

        if (action === "refresh") {
            this.listServices();
        }
    }

    async listServices() {
        if (typeof process === "undefined") return;

        try {
            let services = [];
            if (this.platform === "win32") {
                services = await this.listWindowsServices();
            } else {
                services = await this.listLinuxServices();
            }

            let filter = this.getInputOrProperty("filter");
            if (filter) {
                services = services.filter(svc => svc.name.toLowerCase().includes(filter.toLowerCase()));
            }

            this.setOutputData("services", services);
            this.triggerSlot("onListed");
        } catch (error) {
            NodeJsSysHelper.logError(this.title, error);
            this.triggerSlot("onError");
        }
    }

    async listWindowsServices() {
        return new Promise((resolve, reject) => {
            let nodeWindows = LiteGraph.LibraryManager.getLib("node-windows");
    
            if (nodeWindows && nodeWindows.list) {
                try {
                    nodeWindows.list((error, services) => {
                        if (error) {
                            NodeJsSysHelper.logError(this.title, `node-windows service list error: ${error.message}`);
                            return this.fallbackListWindowsServices().then(resolve).catch(reject);
                        }
    
                        if (!Array.isArray(services)) {
                            NodeJsSysHelper.logError(this.title, "Unexpected format from node-windows.");
                            return reject("Invalid service list format.");
                        }
    
                        let formattedServices = services
                            .filter(service => service && typeof service === "object")
                            .map(service => ({
                                name: service.name || "Unknown",
                                displayName: service.displayName || service.name || "Unknown",
                                status: service.status || "unknown",
                                description: service.description || "No description"
                            }));
    
                        resolve(formattedServices);
                    });
                } catch (error) {
                    NodeJsSysHelper.logError(this.title, `node-windows service list error: ${error.message}`);
                    this.fallbackListWindowsServices().then(resolve).catch(reject);
                }
            } else {
                console.warn(`${this.title}: node-windows not available. Using fallback method.`);
                this.fallbackListWindowsServices().then(resolve).catch(reject);
            }
        });
    }
    
    
    fallbackListWindowsServices() {
        return new Promise((resolve, reject) => {
            let child_process = LiteGraph.LibraryManager.getLib("child_process");
            if (!child_process) {
                // reject("Missing child_process module.");
                return;
            }
    
            child_process.exec("sc query type= service", (error, stdout, stderr) => {
                if (error) {
                    reject(stderr || error.message);
                    return;
                }
    
                let services = [];
                let serviceBlocks = stdout.split("\n\n"); // Split each service block
    
                serviceBlocks.forEach((block) => {
                    let nameMatch = block.match(/SERVICE_NAME:\s+(.+)/);
                    let displayNameMatch = block.match(/DISPLAY_NAME:\s+(.+)/);
                    let stateMatch = block.match(/STATE\s+:\s+\d+\s+(.+)/);
    
                    if (nameMatch && stateMatch) {
                        services.push({
                            name: nameMatch[1].trim(),
                            displayName: displayNameMatch ? displayNameMatch[1].trim() : nameMatch[1].trim(),
                            status: stateMatch[1].trim().split(" ")[0] // Extract RUNNING, STOPPED, etc.
                        });
                    }
                });
    
                resolve(services);
            });
        });
    }

    listLinuxServices() {
        return new Promise((resolve, reject) => {
            let child_process = LiteGraph.LibraryManager.getLib("child_process");
            if (!child_process) {
                // reject("Missing child_process module.");
                return;
            }

            let command = this.commandExists("systemctl") ? "systemctl list-units --type=service --no-pager" :
                this.commandExists("service") ? "service --status-all" : null;

            if (!command) {
                reject("No valid command found for listing services.");
                return;
            }

            child_process.exec(command, (error, stdout, stderr) => {
                if (error) {
                    reject(stderr || error.message);
                    return;
                }

                let services = [];
                const lines = stdout.split("\n").filter(line => line.trim() !== "");

                lines.forEach(line => {
                    let parts = line.trim().split(/\s+/);
                    if (command.includes("systemctl")) {
                        let status = parts[2] === "running" ? "running" : "stopped";
                        services.push({ name: parts[0], status });
                    } else if (command.includes("service")) {
                        let name = parts.slice(1).join(" ");
                        let status = parts[0] === "+" ? "running" : "stopped";
                        services.push({ name, status });
                    }
                });

                resolve(services);
            });
        });
    }

    commandExists(cmd) {
        try {
            require("child_process").execSync(`command -v ${cmd}`, { stdio: "ignore" });
            return true;
        } catch {
            return false;
        }
    }
}
LiteGraph.registerNodeType("sys/serviceList", SysUtil_ServiceListNode);

// what these node types need from the runtime (see LiteGraph.declareCapabilities)
LiteGraph.declareCapabilities("sys/", ["node", "sys"]);

LiteGraph.packs.close("litegraph/nodejs-sys");
