"use strict";
/*
 *  Copyright (c) 2017, The Regents of the University of California,
 *  through Lawrence Berkeley National Laboratory (subject to receipt
 *  of any required approvals from the U.S. Dept. of Energy).
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.windowed = exports.WindowedCollection = void 0;
const Immutable = require("immutable");
const _ = require("lodash");
const base_1 = require("./base");
const event_1 = require("./event");
const groupedcollection_1 = require("./groupedcollection");
const index_1 = require("./index");
const sortedcollection_1 = require("./sortedcollection");
const time_1 = require("./time");
const util_1 = require("./util");
const types_1 = require("./types");
/**
 * A map of `SortedCollection`s indexed by a string key representing a window.
 */
class WindowedCollection extends base_1.Base {
    constructor(arg1, arg2, arg3) {
        super();
        if (Immutable.Map.isMap(arg1)) {
            this.collections = arg1;
        }
        else {
            this.options = arg1;
            if (Immutable.Map.isMap(arg2)) {
                const collections = arg2;
                // Rekey all the events in the collections with a new key that
                // combines their existing group with the windows they fall in.
                // An event could fall into 0, 1 or many windows, depending on the
                // window's period and duration, as supplied in the `WindowOptions`.
                let remapped = Immutable.List();
                collections.forEach((c, k) => {
                    c.forEach((e) => {
                        const groups = this.options.window
                            .getIndexSet((0, time_1.time)(e.timestamp()))
                            .toList();
                        groups.forEach((g) => {
                            remapped = remapped.push([`${k}::${g.asString()}`, e]);
                        });
                    });
                });
                this.collections = remapped
                    .groupBy((e) => e[0])
                    .map((eventList) => eventList.map((kv) => kv[1]))
                    .map((eventList) => new sortedcollection_1.SortedCollection(eventList.toList()))
                    .toMap();
            }
            else {
                let collection;
                if (_.isString(arg2) || _.isArray(arg2)) {
                    this.group = util_1.default.fieldAsArray(arg2);
                    collection = arg3;
                }
                else {
                    collection = arg2;
                }
                if (collection) {
                    throw new Error("Unimplemented");
                }
                else {
                    this.collections = Immutable.Map();
                }
            }
        }
    }
    /**
     * Fetch the `SortedCollection` of `Event`s contained in the windowed grouping
     */
    get(key) {
        return this.collections.get(key);
    }
    /**
     * Example:
     * ```
     * const rolledUp = collection
     *   .groupBy("team")
     *   .window(period("30m"))
     *   .aggregate({
     *       team: ["team", keep()],
     *       total: [ "score", sum() ],
     *   });
     * ```
     */
    aggregate(aggregationSpec) {
        let eventMap = Immutable.Map();
        this.collections.forEach((collection, group) => {
            const d = {};
            const [groupKey, windowKey] = group.split("::");
            _.forEach(aggregationSpec, (src, dest) => {
                const [srcField, reducer] = src;
                d[dest] = collection.aggregate(reducer, srcField);
            });
            const eventKey = (0, index_1.index)(windowKey);
            const indexedEvent = new event_1.Event(eventKey, Immutable.fromJS(d));
            if (!eventMap.has(groupKey)) {
                eventMap = eventMap.set(groupKey, Immutable.List());
            }
            eventMap = eventMap.set(groupKey, eventMap.get(groupKey).push(indexedEvent));
        });
        const mapping = eventMap.map((eventList) => new sortedcollection_1.SortedCollection(eventList));
        return new groupedcollection_1.GroupedCollection(mapping);
    }
    /**
     * Collects all `Event`s from the groupings and returns them placed
     * into a single `SortedCollection`.
     */
    flatten() {
        let events = Immutable.List();
        this.collections.flatten().forEach((collection) => {
            events = events.concat(collection.eventList());
        });
        return new sortedcollection_1.SortedCollection(events);
    }
    /**
     * Removes any grouping present, returning an Immutable.Map
     * mapping just the window to the `SortedCollection`.
     */
    ungroup() {
        const result = Immutable.Map();
        this.collections.forEach((collection, key) => {
            const newKey = key.split("::")[1];
            result[newKey] = collection;
        });
        return result;
    }
    addEvent(event) {
        let toBeEmitted = Immutable.List();
        const discardWindows = true;
        const emitOnDiscard = this.options.trigger === types_1.Trigger.onDiscardedWindow;
        const emitEveryEvent = this.options.trigger === types_1.Trigger.perEvent;
        const keys = this.getEventGroups(event);
        // Add event to an existing collection(s) or a new collection(s)
        keys.forEach((key) => {
            // Add event to collection referenced by this key
            let targetCollection;
            let createdCollection = false;
            if (this.collections.has(key)) {
                targetCollection = this.collections.get(key);
            }
            else {
                targetCollection = new sortedcollection_1.SortedCollection(Immutable.List());
                createdCollection = true;
            }
            this.collections = this.collections.set(key, targetCollection.addEvent(event));
            // Push onto the emit list
            if (emitEveryEvent) {
                toBeEmitted = toBeEmitted.push([key, this.collections.get(key)]);
            }
        });
        // Discard past collections
        let keep = Immutable.Map();
        let discard = Immutable.Map();
        this.collections.forEach((collection, collectionKey) => {
            const [__, windowKey] = collectionKey.split("::").length > 1
                ? collectionKey.split("::")
                : [null, collectionKey];
            if (+event.timestamp() < +util_1.default.timeRangeFromIndexString(windowKey).end()) {
                keep = keep.set(collectionKey, collection);
            }
            else {
                discard = discard.set(collectionKey, collection);
            }
        });
        if (emitOnDiscard) {
            discard.forEach((collection, collectionKey) => {
                toBeEmitted = toBeEmitted.push([collectionKey, collection]);
            });
        }
        this.collections = keep;
        return toBeEmitted;
    }
    getEventGroups(event) {
        // Window the data
        const windowKeyList = this.options.window.getIndexSet((0, time_1.time)(event.timestamp())).toList();
        let fn;
        // Group the data
        if (this.group) {
            if (_.isFunction(this.group)) {
                fn = this.group;
            }
            else {
                const fieldSpec = this.group;
                const fs = util_1.default.fieldAsArray(fieldSpec);
                fn = (e) => e.get(fs);
            }
        }
        const groupKey = fn ? fn(event) : null;
        return windowKeyList.map((windowKey) => groupKey ? `${groupKey}::${windowKey}` : `${windowKey}`);
    }
}
exports.WindowedCollection = WindowedCollection;
function windowFactory(arg1, arg2) {
    return new WindowedCollection(arg1, arg2);
}
exports.windowed = windowFactory;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2luZG93ZWRjb2xsZWN0aW9uLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL3dpbmRvd2VkY29sbGVjdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7Ozs7O0dBUUc7OztBQUVILHVDQUF1QztBQUN2Qyw0QkFBNEI7QUFFNUIsaUNBQThCO0FBQzlCLG1DQUFnQztBQUNoQywyREFBMEU7QUFDMUUsbUNBQXVDO0FBRXZDLHlEQUFzRDtBQUN0RCxpQ0FBOEI7QUFDOUIsaUNBQTBCO0FBRTFCLG1DQU1pQjtBQWVqQjs7R0FFRztBQUNILE1BQWEsa0JBQWtDLFNBQVEsV0FBSTtJQXNDdkQsWUFBWSxJQUFTLEVBQUUsSUFBVSxFQUFFLElBQVU7UUFDekMsS0FBSyxFQUFFLENBQUM7UUFDUixJQUFJLFNBQVMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFO1lBQzNCLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDO1NBQzNCO2FBQU07WUFDSCxJQUFJLENBQUMsT0FBTyxHQUFHLElBQXdCLENBQUM7WUFFeEMsSUFBSSxTQUFTLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDM0IsTUFBTSxXQUFXLEdBQUcsSUFBa0QsQ0FBQztnQkFFdkUsOERBQThEO2dCQUM5RCwrREFBK0Q7Z0JBQy9ELGtFQUFrRTtnQkFDbEUsb0VBQW9FO2dCQUNwRSxJQUFJLFFBQVEsR0FBRyxTQUFTLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ2hDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7b0JBQ3pCLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTt3QkFDWixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU07NkJBQzdCLFdBQVcsQ0FBQyxJQUFBLFdBQUksRUFBQyxDQUFDLENBQUMsU0FBUyxF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