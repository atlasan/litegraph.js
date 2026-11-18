import { LiteGraph } from "./litegraph.js";

export class ContextMenu {

    /**
    * @constructor
    * @param {Array<Object>} values (allows object { title: "Nice text", callback: function ... })
    * @param {Object} options [optional] Some options:\
    * - title: title to show on top of the menu
    * - callback: function to call when an option is clicked, it receives the item information
    * - ignore_item_callbacks: ignores the callback inside the item, it just calls the options.callback
    * - event: you can pass a MouseEvent, this way the ContextMenu appears in that position
    * - isCustomEvent: added to allow not default events
    *
    *   Rendering notes: This is only relevant to rendered graphs, and is rendered using HTML+CSS+JS.
    */
    constructor(values, options = {}) {
        this.options = options;
        options.scroll_speed ??= 0.1;
        options.filter_enabled ??= true;
        this.menu_elements = [];

        this.#linkToParent();
        this.#validateEventClass();
        this.#createRoot();
        this.#bindEvents();
        this.setTitle(this.options.title);
        this.addItems(values);
        this.#insertMenu();
        this.#calculateBestPosition();
        if(LiteGraph.context_menu_filter_enabled && options.filter_enabled){
            this.createFilter(values, options);
        }
    }

    #createRoot() {
        const root = this.root = document.createElement("div");
        if (this.options.className) {
            root.className = this.options.className;
        }
        root.classList.add("litegraph","litecontextmenu","litemenubar-panel");
        root.style.minWidth = "80px";
        root.style.minHeight = "10px";
        return root;
    }

    #bindEvents() {
        const root = this.root;

        LiteGraph.log_info("**contextmenu**", "binding events on root", root, this);

        root.style.pointerEvents = "none";
        setTimeout(() => {
            root.style.pointerEvents = "auto";
        }, 100); // delay so the mouse up event is not caught by this element

        // this prevents the default context browser menu to open in case this menu was created when pressing right button
        root.addEventListener("pointerup", (e) => {
            // LiteGraph.log?.("pointerevents: ContextMenu up root prevent");
            e.preventDefault();
            return true;
        });
        root.addEventListener("contextmenu", (e) => {
            if (e.button != 2) {
                // right button
                return false;
            }
            e.preventDefault();
            return false;
        });
        root.addEventListener("pointerdown", (e) => {
            // LiteGraph.log?.("pointerevents: ContextMenu down");
            if (e.button == 2) {
                this.close();
                e.preventDefault();
                return true;
            }
        });
        root.addEventListener("wheel", (e) => {
            var pos = parseInt(root.style.top);
            root.style.top =
                (pos + e.deltaY * this.options.scroll_speed).toFixed() + "px";
            e.preventDefault();
            return true;
        });
        root.addEventListener("pointerenter", (_event) => {
            // LiteGraph.log?.("pointerevents: ContextMenu enter");
            if (root.closing_timer) {
                clearTimeout(root.closing_timer);
            }
        });
    }

    #linkToParent() {
        const parentMenu = this.options.parentMenu;
        if (!parentMenu)
            return;
        if (parentMenu.constructor !== this.constructor) {
            LiteGraph.log_error("contextmenu", "linkToParent", "parentMenu must be of class ContextMenu, ignoring it");
            this.options.parentMenu = null;
            return;
        }
        this.parentMenu = parentMenu;
        this.parentMenu.lock = true;
        this.parentMenu.current_submenu = this;
    }

    #validateEventClass() {
        if(!this.options.event)
            return;

        if(this.options.isCustomEvent){
            LiteGraph.log_verbose("contextmenu", "linkToParent", "Custom event for ContextMenu.", this.options.event);
            return;
        }

        // why should we ignore other events ?
        // use strings because comparing classes between windows doesnt work
        const eventClass = this.options.event.constructor.name;
        if ( eventClass !== "MouseEvent" &&
            eventClass !== "CustomEvent" &&
            eventClass !== "PointerEvent"
        ) {
            LiteGraph.log_warn(`Event passed to ContextMenu is not of type MouseEvent or CustomEvent. Was originally ignoring it. (${eventClass})`);
            // this.options.event = null;
        }
    }

    createFilter(values, options){
        if(!values || !values.length || values.length == 1) return;

        const filter = document.createElement("input");
        filter.classList.add("context-menu-filter");
        filter.placeholder = "Filter list";
        this.root.prepend(filter);

        const items = Array.from(this.root.querySelectorAll(".litemenu-entry"));
        let displayedItems = [...items];
        let itemCount = displayedItems.length;

        console.info(options);

        // We must request an animation frame for the current node of the active canvas to update.
        requestAnimationFrame(() => {
            const currentNode = options.extra; //LGraphCanvas.active_canvas.current_node;
            const clickedComboValue = currentNode?.widgets
                ?.filter(w => w.type === "combo" && w.options.values.length === values.length)
                .find(w => w.options.values.every((v, i) => v === values[i]))
                ?.value;

            let selectedIndex = clickedComboValue ? values.findIndex(v => v === clickedComboValue) : 0;
            if (selectedIndex < 0) {
                selectedIndex = 0;
            } 
            let selectedItem = displayedItems[selectedIndex];
            updateSelected();

            // Apply highlighting to the selected item
            function updateSelected() {
                selectedItem?.style.setProperty("background-color", "");
                selectedItem?.style.setProperty("color", "");
                selectedItem = displayedItems[selectedIndex];
                selectedItem?.style.setProperty("background-color", "#ccc", "important");
                selectedItem?.style.setProperty("color", "#000", "important");
            }

            const positionList = () => {
                const rect = this.root.getBoundingClientRect();

                // If the top is off-screen then shift the element with scaling applied
                if (rect.top < 0) {
                    const scale = 1 - this.root.getBoundingClientRect().height / this.root.clientHeight;
                    const shift = (this.root.clientHeight * scale) / 2;
                    this.root.style.top = -shift + "px";
                }
            }

            // Arrow up/down to select items
            filter.addEventListener("keydown", (event) => {
                switch (event.key) {
                    case "ArrowUp":
                        event.preventDefault();
                        if (selectedIndex === 0) {
                            selectedIndex = itemCount - 1;
                        } else {
                            selectedIndex--;
                        }
                        updateSelected();
                        break;
                    case "ArrowRight":
                        /* event.preventDefault();
                        selectedIndex = itemCount - 1;
                        updateSelected(); */
                        selectedItem?.do_click(event); //click();
                        break;
                    case "ArrowDown":
                        event.preventDefault();
                        if (selectedIndex === itemCount - 1) {
                            selectedIndex = 0;
                        } else {
                            selectedIndex++;
                        }
                        updateSelected();
                        break;
                    case "ArrowLeft": {
                        const parentMenu = this.parentMenu;
                        this.close(event, true);
                        if(parentMenu){
                            const parentFilter = Array.from(parentMenu.root.querySelectorAll(".context-menu-filter"));
                            if(parentFilter && parentFilter.length){
                                parentFilter[0].style.display = "block";
                                parentFilter[0].focus();
                            }
                        }
                        /* event.preventDefault();
                        selectedIndex = 0;
                        updateSelected(); */
                        break;
                    }
                    case "Enter":
                        selectedItem?.do_click(event); //click();
                        break;
                    case "Escape":
                        this.close();
                        break;
                }
            });

            filter.addEventListener("input", () => {
                // Hide all items that don't match our filter
                const term = filter.value.toLocaleLowerCase();
                // When filtering, recompute which items are visible for arrow up/down and maintain selection.
                displayedItems = items.filter(item => {
                    const isVisible = !term || item.textContent.toLocaleLowerCase().includes(term);
                    item.style.display = isVisible ? "block" : "none";
                    return isVisible;
                });

                selectedIndex = 0;
                if (displayedItems.includes(selectedItem)) {
                    selectedIndex = displayedItems.findIndex(d => d === selectedItem);
                }
                itemCount = displayedItems.length;

                updateSelected();

                // If we have an event then we can try and position the list under the source
                if (options.event) {
                    let top = options.event.clientY - 10;

                    const bodyRect = document.body.getBoundingClientRect();
                    const rootRect = this.root.getBoundingClientRect();
                    if (bodyRect.height && top > bodyRect.height - rootRect.height - 10) {
                        top = Math.max(0, bodyRect.height - rootRect.height - 10);
                    }

                    this.root.style.top = top + "px";
                    positionList();
                }
            });

            requestAnimationFrame(() => {
                // Focus the filter box when opening
                filter.focus();

                positionList();
            });
        })
    }
    
    /**
     * Creates a title element if it doesn't have one.
     * Sets the title of the menu.
     * @param {string} title - The title to be set.
     */
    setTitle(title) {
        if (!title)
            return;
        this.titleElement ??= document.createElement("div");
        const element = this.titleElement;
        element.className = "litemenu-title";
        element.innerHTML = title;
        if(!this.root.parentElement)
            this.root.appendChild(element);
    }

    /**
     * Adds a set of values to the menu.
     * @param {Array<string|object>} values - An array of values to be added.
     */
    addItems(values) {

        for (let i = 0; i < values.length; i++) {
            let name = values[i];

            if (typeof name !== 'string') {
                name = name && name.content !== undefined ? String(name.content) : String(name);
            }

            let value = values[i];
            
            // this.menu_elements.push(this.addItem(name, value, this.options));
            this.addItem(name, value, this.options);
        }
    }

    #insertMenu() {
        const doc = this.options.event?.target.ownerDocument ?? document;
        const parent = doc.fullscreenElement ?? doc.body;
        const root = this.root;
        const that = this;
        parent.appendChild(this.root);
    }

    #calculateBestPosition() {
        const options = this.options;
        const root = this.root;

        let left = options.left || 0;
        let top = options.top || 0;
        this.top_original = top;

        if (options.event) {
            left = options.event.clientX - 10;
            top = options.event.clientY - 10;

            if (options.title) {
                top -= 20;
            }
            this.top_original = top;

            if (options.parentMenu) {
                const rect = options.parentMenu.root.getBoundingClientRect();
                left = rect.left + rect.width;
            }

            const body_rect = document.body.getBoundingClientRect();
            const root_rect = root.getBoundingClientRect();
            if(body_rect.height === 0)
                LiteGraph.log_error("document.body height is 0. That is dangerous, set html,body { height: 100%; }");

            if (body_rect.width && left > body_rect.width - root_rect.width - 10) {
                left = body_rect.width - root_rect.width - 10;
            }
            if (body_rect.height && top > body_rect.height - root_rect.height - 10) {
                top = body_rect.height - root_rect.height - 10;
            }
        }else{
            LiteGraph.log_debug("contextmenu", "calculateBestPosition", "has no event");
        }

        root.style.left = `${left}px`;
        root.style.top = `${top}px`;

        if (options.scale) {
            // quarter steps keep text on the pixel grid (blurry fonts otherwise, Comfy 0b161c1)
            root.style.transform = `scale(${Math.round(options.scale * 4) * 0.25})`;
        }
    }

    /**
     * Adds an item to the menu.
     * @param {string} name - The name of the item.
     * @param {object | null} value - The value associated with the item.
     * @param {object} [options={}] - Additional options for the item.
     * @returns {HTMLElement} - The created HTML element representing the added item.
     */
    addItem(name, value, options = {}) {

        // value.callbacks_on_element_created ??= false; 

        LiteGraph.log_verbose("contextmenu", "addItem", ...arguments);

        const element = document.createElement("div");
        element.className = "litemenu-entry submenu";

        let disabled = false;
        var thisItem = element;

        if (value === null) {
            element.classList.add("separator");
        } else {
            element.innerHTML = value?.title ?? name;
            element.value = value;

            if (value) {
                if (value.disabled) {
                    disabled = true;
                    element.classList.add("disabled");
                }
                if (value.submenu || value.has_submenu) {
                    element.classList.add("has_submenu");
                }
            }

            if (typeof value == "function") {
                element.dataset["value"] = name;
                element.onclick_callback = value;
            } else {
                element.dataset["value"] = value;
            }

            if (value.className) {
                element.className += " " + value.className;
            }
            // execute element additional construction function
            if(typeof(value.callbacks_on_element_created)!=="undefined"){
                if(typeof(value.callbacks_on_element_created)=="function"){
                    value.callbacks_on_element_created = [value.callbacks_on_element_created];
                }
                var thisMenu = this;
                value.callbacks_on_element_created.forEach((fun)=>{
                    if(typeof(fun)=="function"){
                        LiteGraph.log_debug("contextmenu", "addItem", "callbacks_on_element_created", element, fun);
                        fun(element, thisMenu);
                    }
                })
            }
        }

        this.root.appendChild(element);

        if (!disabled) {
            element.addEventListener("click", handleMenuItemClick);
            element.do_click = function(event, ignore_parent_menu){
                // LiteGraph.log_verbose("contextmenu", "addItem", "do_click", "handleMenuItemClick", "this", this, "thisItem", thisItem, "event", event, "ignore_parent_menu", ignore_parent_menu);
                if(!event){
                    LiteGraph.log_warn("contextmenu", "addItem", "do_click", "has no event", ...arguments);
                }else if(!event.clientX){
                    LiteGraph.log_warn("contextmenu", "addItem", "do_click", "event has no clientX info", event);
                }else{
                    LiteGraph.log_verbose("contextmenu", "addItem", "do_click", "has clientX", event);
                }
                handleMenuItemClick.call(thisItem, event, ignore_parent_menu);
            };
        }
        if (!disabled && options.autoopen) {
            element.addEventListener("pointerenter",(event) => {
                const value = this.value;
                if (!value || !value.has_submenu) {
                    return;
                }
                // if it is a submenu, autoopen like the item was clicked
                handleMenuItemClick.call(this, event);
            });
        }

        var that = this;

        function handleMenuItemClick(event) {
            const value = this.value;
            let closeParent = true;

            LiteGraph.log_debug("contextmenu", "handleMenuItemClick", "process", value,event,options,closeParent,this.current_submenu,this);

            // Close any current submenu
            that.current_submenu?.close(event);

            // Hide filter
            const thisFilter = Array.from(that.root.querySelectorAll(".context-menu-filter"));
            if(thisFilter && thisFilter.length){
                thisFilter[0].style.display = "none";
            }

            // Execute global callback
            if (options.callback) {
                LiteGraph.log_debug("contextmenu", "handleMenuItemClick", "global callback",this,value,options,event,that,options.node);
                
                const globalCallbackResult = options.callback.call(this, value, options, event, that, options.node);
                if (globalCallbackResult === true) {
                    LiteGraph.log_debug("contextmenu", "handleMenuItemClick", "global callback processed, dont close parent?", globalCallbackResult);
                    closeParent = false;
                }else{
                    LiteGraph.log_debug("contextmenu", "handleMenuItemClick", "global callback processed, will close parent", globalCallbackResult);
                }
            }

            // Handle special cases
            if (value) {
                if (value.callback && !options.ignore_item_callbacks && value.disabled !== true) {

                    LiteGraph.log_debug("contextmenu", "handleMenuItemClick", "using value callback and !ignore_item_callbacks",this,value,options,event,that,options.node);
                    const itemCallbackResult = value.callback.call(this, value, options, event, that, options.extra);
                    if (itemCallbackResult === true) {
                        closeParent = false;
                    }
                }
                if (value.submenu) {
                    LiteGraph.log_debug("contextmenu", "handleMenuItemClick", "SUBMENU",this,value,value.submenu.options,event,that,options);

                    if (!value.submenu.options) {
                        // throw new Error("contextmenu", "handleMenuItemClick", "submenu needs options");
                        LiteGraph.log_warn("contextmenu", "handleMenuItemClick", "SUBMENU", "submenu needs options");
                        return;
                    }
                    // Recursively create submenu
                    new that.constructor(value.submenu.options, {
                        callback: value.submenu.callback,
                        event: event,
                        parentMenu: that,
                        ignore_item_callbacks: value.submenu.ignore_item_callbacks,
                        title: value.submenu.title,
                        extra: value.submenu.extra,
                        autoopen: options.autoopen,
                    });
                    closeParent = false;
                }
            }

            // Close parent menu if necessary and not locked
            if (closeParent && !that.lock) {
                that.close();
            }
        }
        
        // push to menu_elements here
        this.menu_elements.push(element);

        return element;
    }

    /**
     * Closes this menu.
     * @param {Event} [e] - The event that triggered the close action.
     * @param {boolean} [ignore_parent_menu=false] - Whether to ignore the parent menu when closing.
     */
    close(e, ignore_parent_menu) {
        if (this.parentMenu && !ignore_parent_menu) {
            this.parentMenu.lock = false;
            this.parentMenu.current_submenu = null;
            if (e === undefined) {
                this.parentMenu.close();
            } else if (
                e &&
                !ContextMenu.isCursorOverElement(e, this.parentMenu.root)
            ) {
                ContextMenu.trigger(this.parentMenu.root, "pointerleave", e);
            }
        }
        this.current_submenu?.close(e, true);

        if (this.root.closing_timer) {
            clearTimeout(this.root.closing_timer);
        }

        if (this.root.parentNode) {
            this.root.parentNode.removeChild(this.root);
        }
    }

    /**
     * Closes all open ContextMenus in the specified window.
     * @param {Window} [ref_window=window] - The window object to search for open menus.
     */
    static closeAll = (ref_window = window) => {
        const elements = ref_window?.document?.querySelectorAll(".litecontextmenu");
        if (!elements || !elements.length)
            return;

        elements.forEach((element) => {
            if (element.close) {
                element.close();
            } else {
                element.parentNode?.removeChild(element);
            }
        });
    };

    /**
     * Triggers an event on the specified element with the given event name and parameters.
     * @param {HTMLElement} element - The element on which to trigger the event.
     * @param {string} event_name - The name of the event to trigger.
     * @param {Object} params - Additional parameters to include in the event.
     * @param {HTMLElement} origin - The origin of the event <currently not supported as CustomEvent can't have a target!>
     * @returns {CustomEvent} - The created CustomEvent instance.
     * @BUG: Probable bug related to params, origin not being configured/populated correctly
     */
    static trigger(element, event_name, params, origin) {
        const evt = new CustomEvent(event_name, {
            bubbles: true,
            cancelable: true,
            detail: params,
        });
        Object.defineProperty(evt, 'target', { value: origin });
        if (element.dispatchEvent) {
            element.dispatchEvent(evt);
        } else if (element.__events) {
            element.__events.dispatchEvent(evt);
        }
        return evt;
    }

    // returns the top most menu
    getTopMenu() {
        return this.options.parentMenu?.getTopMenu() ?? this;
    }

    getFirstEvent() {
        return this.options.parentMenu?.getFirstEvent() ?? this.options.event;
    }

    static isCursorOverElement(event, element) {
        return LiteGraph.isInsideRectangle(event.clientX, event.clientY, element.left, element.top, element.width, element.height);
    }
}
