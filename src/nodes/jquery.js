
import { LiteGraph } from "../litegraph.js";

// Ensure jQuery is loaded using LibraryManager
LiteGraph.LibraryManager.registerLibrary("jquery", "latest", "jQuery", [], ["https://cdnjs.cloudflare.com/ajax/libs/jquery/3.6.4/jquery.min.js"]);

// deferred loading
// LiteGraph.LibraryManager.loadLibrary("jquery", () => {
//     console.log("jQuery Loaded Successfully");
// });

// Base class for jQuery nodes
export class JQueryBaseNode {
    constructor() {
        this.libraries = ["jquery"];
        this.addInput("selector", "string|jQObject"); // Accepts selector string or jQuery object
        this.addOutput("elements", "jQObject"); // Always return elements for chaining
        this.addProperty("selector", "");
    }

    checkJQuery() {
        if (typeof($)!=="function") {
            console.warn("jQuery is not available.");
            return false;
        }
        return true;
    }

    onExecute(){
        if (!this.checkJQuery()) return;
        this.setOutputData(0, this.getElements());
    }

    getElements() {
        let selectorOrObject = this.getInputOrProperty("selector");
        return typeof selectorOrObject === "string" ? $(selectorOrObject) : selectorOrObject;
    }
}

// 📌 Select Elements ($("selector"))
export class JQuerySelect extends JQueryBaseNode {
    static title = "jQuery Select";
    static desc = "Select elements using a jQuery selector";

    constructor() {
        super();
    }
}
LiteGraph.registerNodeType("jquery/select", JQuerySelect);

// 📌 Modify HTML Content (.html())
export class JQueryHtml extends JQueryBaseNode {
    static title = "jQuery HTML";
    static desc = "Get or set HTML content";

    constructor() {
        super();
        this.addInput("html", "string");
        this.addProperty("html", "");
    }

    onExecute() {
        if (!this.checkJQuery()) return;
        let elements = this.getElements();
        this.setOutputData(0, elements);
        let newHtml = this.getInputOrProperty("html");
        if (!elements || elements.length === 0) return;
        if (newHtml !== undefined) elements.html(newHtml);
    }
}
LiteGraph.registerNodeType("jquery/html", JQueryHtml);

// 📌 Handle Click Events (.on("click"))
export class JQueryOnClick extends JQueryBaseNode {
    static title = "jQuery Click";
    static desc = "Trigger an event when elements are clicked";

    constructor() {
        super();
        this.addOutput("clicked", LiteGraph.EVENT);
    }

    onExecute() {
        if (!this.checkJQuery()) return;
        const elements = this.getElements();
        this.setOutputData(0, elements);
        if (!elements || elements.length === 0) return;
        let that = this;
        elements.off("click").on("click", function () {
            that.trigger("clicked");
        });
        this.setOutputData(0, elements);
    }
}
LiteGraph.registerNodeType("jquery/click", JQueryOnClick);

// 📌 AJAX Request ($.ajax())
export class JQueryAjax extends JQueryBaseNode {
    static title = "jQuery AJAX";
    static desc = "Perform an AJAX request";

    constructor() {
        super();
        this.addInput("trigger", LiteGraph.ACTION);
        this.addInput("url", "string");
        this.addInput("method", "string");
        this.addOutput("response", "string");
        this.addOutput("onSuccess", LiteGraph.EVENT);
        this.addOutput("onError", LiteGraph.EVENT);
        this.addProperty("url", "");
        this.addProperty("method", "GET");
    }

    onAction() {
        if (!this.checkJQuery()) return;
        let url = this.getInputOrProperty("url");
        let method = this.getInputOrProperty("method");
        if (!url) return;
        let that = this;
        $.ajax({
            url: url,
            method: method,
            success: function (response) {
                that.setOutputData(0, response);
                that.trigger("onSuccess", response);
            },
            error: function (error) {
                that.trigger("onError", error);
            }
        });
    }
}
LiteGraph.registerNodeType("jquery/ajax", JQueryAjax);

// 📌 Animate Elements (.animate())
export class JQueryAnimate extends JQueryBaseNode {
    static title = "jQuery Animate";
    static desc = "Animate elements using jQuery";

    constructor() {
        super();
        this.addInput("trigger", LiteGraph.ACTION);
        this.addInput("properties", "object");
        this.addInput("duration", "number");
        this.addInput("easing", "string");

        this.addOutput("onStart", LiteGraph.EVENT);
        this.addOutput("onDone", LiteGraph.EVENT);
        this.addOutput("onFail", LiteGraph.EVENT);

        this.addProperty("duration", 400);
        this.addProperty("properties", {});
        this.addProperty("easing", "swing", "enum", { values: ["swing", "linear"/*, "easeInQuad", "easeOutQuad", "easeInOutQuad"*/] });
    }

    onAction() {
        if (!this.checkJQuery()) return;

        let elements = this.getElements();
        let properties = this.getInputOrProperty("properties");
        let duration = this.getInputOrProperty("duration");
        let easing = this.getInputOrProperty("easing");

        if (!elements || elements.length === 0) {
            console.warn("JQueryAnimate: No elements found to animate.");
            this.trigger("onFail");
            return;
        }

        if (!properties || typeof properties !== "object") {
            console.warn("JQueryAnimate: Invalid animation properties.");
            this.trigger("onFail");
            return;
        }

        // Ensure easing is valid, fallback to "swing"
        if (typeof easing !== "string" || !$.easing[easing]) {
            console.warn(`JQueryAnimate: Invalid easing '${easing}', defaulting to 'swing'.`);
            easing = "swing";
        }

        LiteGraph.log_debug("JQueryAnimate", "Starting animation with properties", properties, "Duration:", duration, "Easing:", easing);
        this.trigger("onStart");

        elements.animate(properties, duration, easing, () => {
            LiteGraph.log_debug("JQueryAnimate", "Animation completed successfully.");
            this.trigger("onDone");
        });

        this.setOutputData(3, elements); // Output the modified elements
    }
}
LiteGraph.registerNodeType("jquery/animate", JQueryAnimate);


// 📌 Toggle Class (.toggleClass()) using ACTION
export class JQueryToggleClass extends JQueryBaseNode {
    static title = "jQuery Toggle Class";
    static desc = "Toggle a CSS class on elements";

    constructor() {
        super();
        this.addInput("trigger", LiteGraph.ACTION);
        this.addInput("class", "string");
        this.addProperty("class", "");
    }

    onAction() {
        if (!this.checkJQuery()) return;
        let elements = this.getElements();
        let className = this.getInputOrProperty("class");
        if (!elements || !className) return;
        elements.toggleClass(className);
        this.setOutputData(0, elements);
    }
}
LiteGraph.registerNodeType("jquery/toggle_class", JQueryToggleClass);

// 📌 Hide Elements (.hide())
export class JQueryHide extends JQueryBaseNode {
    static title = "jQuery Hide";
    static desc = "Hide elements using jQuery";

    constructor() {
        super();
        this.addInput("trigger", LiteGraph.ACTION);
    }

    onAction() {
        if (!this.checkJQuery()) return;
        let elements = this.getElements();
        if (!elements) return;
        elements.hide();
    }
}
LiteGraph.registerNodeType("jquery/hide", JQueryHide);

// 📌 Show Elements (.show())
export class JQueryShow extends JQueryBaseNode {
    static title = "jQuery Show";
    static desc = "Show elements using jQuery";

    constructor() {
        super();
        this.addInput("trigger", LiteGraph.ACTION);
    }

    onAction() {
        if (!this.checkJQuery()) return;
        let elements = this.getElements();
        if (!elements) return;
        elements.show();
        this.setOutputData(0, elements);
    }
}
LiteGraph.registerNodeType("jquery/show", JQueryShow);

// 📌 Set CSS Styles (.css())
export class JQueryCss extends JQueryBaseNode {
    static title = "jQuery CSS";
    static desc = "Set CSS styles on elements";

    constructor() {
        super();
        this.addInput("styles", "object");
        this.addProperty("styles", {});
    }

    onExecute() {
        if (!this.checkJQuery()) return;
        const elements = this.getElements();
        this.setOutputData(0, elements);
        let styles = this.getInputOrProperty("styles");
        if (!elements || !styles) return;
        elements.css(styles);
    }
}
LiteGraph.registerNodeType("jquery/css", JQueryCss);

// what these node types need from the runtime (see LiteGraph.declareCapabilities)
LiteGraph.declareCapabilities("jquery/", ["browser", "dom"]);
