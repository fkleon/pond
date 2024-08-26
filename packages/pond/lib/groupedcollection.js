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
exports.grouped = exports.GroupedCollection = void 0;
const Immutable = require("immutable");
const _ = require("lodash");
const sortedcollection_1 = require("./sortedcollection");
const windowedcollection_1 = require("./windowedcollection");
const util_1 = require("./util");
/**
 * Represents an association of group names to `Collection`s. Typically
 * this is the resulting representation of performing a `groupBy()` on
 * a `Collection`.
 */
class GroupedCollection {
    constructor(arg1, arg2) {
        if (Immutable.Map.isMap(arg1)) {
            const collectionMap = arg1;
            this.collections = collectionMap;
        }
        else {
            let fn;
            const collection = arg2;
            if (_.isFunction(arg1)) {
                fn = arg1;
            }
            else {
                const fieldSpec = arg1;
                const fs = util_1.default.fieldAsArray(fieldSpec);
                fn = (e) => e.get(fs);
            }
            this.collections = collection
                .eventList()
                .groupBy(fn)
                .toMap()
                .map((events) => new sortedcollection_1.SortedCollection(events.toList()));
        }
    }
    /**
     * Gets the `Collection` contained in the `grouping` specified.
     */
    get(grouping) {
        return this.collections.get(grouping);
    }
    /**
     * Aggregate per grouping, essentially forming a map from the group name
     * to the aggregate of the former `Collection` associated with that group name.
     *
     * Example:
     * ```
     * const eventCollection = new Collection(
     *     Immutable.List([
     *         event(time("2015-04-22T02:28:00Z"), map({ team: "raptors", score: 3 })),
     *         event(time("2015-04-22T02:29:00Z"), map({ team: "raptors", score: 4 })),
     *         event(time("2015-04-22T02:30:00Z"), map({ team: "raptors", score: 5 })),
     *         event(time("2015-04-22T02:29:00Z"), map({ team: "wildcats", score: 3 })),
     *         event(time("2015-04-22T02:30:00Z"), map({ team: "wildcats", score: 4 })),
     *         event(time("2015-04-22T02:31:00Z"), map({ team: "wildcats", score: 6 }))
     *     ])
     * );
     *
     * const rolledUp = eventCollection
     *     .groupBy("team")
     *     .aggregate({
     *         team: ["team", keep()],
     *         total: ["score", sum()]
     *     });
     *
     * const raptorsTotal = rolledUp.get("raptors").get("total");   // 12
     * const wildcatsTotal = rolledUp.get("wildcats").get("total"); // 13
     * ```
     */
    aggregate(aggregationSpec) {
        const result = {};
        this.collections.forEach((collection, group) => {
            const d = {};
            _.forEach(aggregationSpec, (src, dest) => {
                if (!_.isFunction(src)) {
                    const [srcField, reducer] = src;
                    d[dest] = collection.aggregate(reducer, srcField);
                }
                else {
                    d[dest] = src(collection);
                }
            });
            result[group] = d;
        });
        return Immutable.fromJS(result);
    }
    /**
     * Forms a single group from this `GroupedCollection`, returning a new
     * `GroupedCollection` with a single key `_` mapping to a `Collection`
     * containing all `Event`s in all the previous `Collection`s.
     */
    ungroup() {
        let eventList = Immutable.List();
        this.collections.forEach((collection, group) => {
            eventList = eventList.concat(collection.eventList());
        });
        const map = Immutable.Map({ _: new sortedcollection_1.SortedCollection(eventList) });
        return new GroupedCollection(map);
    }
    /**
     * Forms a single `Collection` from this `GroupedCollection`. That
     * `Collection` will containing all `Event`s in all the previously
     * grouped `Collection`s.
     */
    flatten() {
        return this.ungroup().get("_");
    }
    /**
     * Further groups this `GroupedCollection` per window, returning a
     * `WindowedCollection`. This allows you then to first `groupBy()`
     * a `Collection` and then further group by a window.
     *
     * The options are passed as a `WindowOptions` structure, but essentially
     * in the context of chaining `Collections` together this really just needs
     * to contain the `{ window: w }` where `w` here would be a `window` object
     * of some sort.
     *
     * Example:
     * ```
     * const w = window(duration("30m"));
     * const windowedCollection = eventCollection
     *     .groupBy("team")
     *     .window({ window: w });
     * ```
     */
    window(windowOptions) {
        return new windowedcollection_1.WindowedCollection(windowOptions, this.collections);
    }
    /**
     * Runs the `align()` method on each grouped `Collection`.
     */
    align(options) {
        const collections = this.collections.map((collection, group) => {
            return collection.align(options);
        });
        return new GroupedCollection(collections);
    }
    /**
     * Runs the `rate()` method on each grouped `Collection`.
     */
    rate(options) {
        const collections = this.collections.map((collection, group) => {
            return collection.rate(options);
        });
        return new GroupedCollection(collections);
    }
}
exports.GroupedCollection = GroupedCollection;
function groupedFactory(fieldSpec, collection) {
    return new GroupedCollection(fieldSpec, collection);
}
exports.grouped = groupedFactory;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ3JvdXBlZGNvbGxlY3Rpb24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvZ3JvdXBlZGNvbGxlY3Rpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7OztHQVFHOzs7QUFFSCx1Q0FBdUM7QUFDdkMsNEJBQTRCO0FBSTVCLHlEQUFzRDtBQUV0RCw2REFBMEQ7QUFVMUQsaUNBQTBCO0FBOEIxQjs7OztHQUlHO0FBQ0gsTUFBYSxpQkFBaUI7SUF3QzFCLFlBQVksSUFBUyxFQUFFLElBQVU7UUFDN0IsSUFBSSxTQUFTLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUMzQixNQUFNLGFBQWEsR0FBRyxJQUFrRCxDQUFDO1lBQ3pFLElBQUksQ0FBQyxXQUFXLEdBQUcsYUFBYSxDQUFDO1NBQ3BDO2FBQU07WUFDSCxJQUFJLEVBQXVCLENBQUM7WUFDNUIsTUFBTSxVQUFVLEdBQUcsSUFBMkIsQ0FBQztZQUMvQyxJQUFJLENBQUMsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQ3BCLEVBQUUsR0FBRyxJQUFJLENBQUM7YUFDYjtpQkFBTTtnQkFDSCxNQUFNLFNBQVMsR0FBRyxJQUF5QixDQUFDO2dCQUM1QyxNQUFNLEVBQUUsR0FBRyxjQUFJLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxDQUFDO2dCQUN4QyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7YUFDekI7WUFDRCxJQUFJLENBQUMsV0FBVyxHQUFHLFVBQVU7aUJBQ3hCLFNBQVMsRUFBRTtpQkFDWCxPQUFPLENBQUMsRUFBRSxDQUFDO2lCQUNYLEtBQUssRUFBRTtpQkFDUCxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLElBQUksbUNBQWdCLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztTQUMvRDtJ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