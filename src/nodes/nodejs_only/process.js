class NodeProcessInfo {
    constructor() {
        this.runtime = "node";
        this.libraries = ["os"];
        this.addOutput("info", "object");
        this.output = null;
    }

    onPostConstruct() {
        this.os = LiteGraph.LibraryManager.getLib("os");
        this.output = this.getSystemInfo();
    }

    getSystemInfo() {
        return {
            platform: this.os.platform(),
            arch: this.os.arch(),
            cpuCores: this.os.cpus().length,
            freeMemory: this.os.freemem(),
            totalMemory: this.os.totalmem(),
            uptime: this.os.uptime(),
        };
    }

    onExecute() {
        this.output = this.getSystemInfo();
        this.setOutputData(0, this.output);
    }
}

LiteGraph.registerNodeType("server/process/NodeProcessInfo", NodeProcessInfo);
