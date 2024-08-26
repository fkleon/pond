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
exports.indexedEvent = exports.timeRangeEvent = exports.timeEvent = exports.event = exports.Event = void 0;
const Immutable = require("immutable");
const _ = require("lodash");
const base_1 = require("./base");
const index_1 = require("./index");
const time_1 = require("./time");
const timerange_1 = require("./timerange");
const util_1 = require("./util");
/**
 * An Event is a mapping from a time based key to a data object represented
 * by an `Immutable.Map`.
 *
 * The key needs to be a sub-class of the base class `Key`, which typically
 * would be one of the following:
 *
 *  * `Time` - a single timestamp
 *  * `TimeRange` - a timerange over which the Event took place
 *  * `Index` - a different representation of a TimeRange
 *
 * The data object needs to be an `Immutable.Map<string, any>`.
 *
 * To get values out of the data, use `get()`. This method takes
 * what is called a field, which is a top level key of the data
 * map.
 *
 * Fields can refer to deep data with either a path (as an array)
 * or dot notation ("path.to.value").
 *
 * Example:
 *
 * ```
 * const timestamp = time(new Date("2015-04-22T03:30:00Z");
 * const e = event(t, Immutable.Map({ temperature: 75.2, humidity: 84 }));
 * const humidity = e.get("humidity");  // 84
 * ```
 *
 * There exists several static methods for `Event` that enable the
 * ability to compare `Events`, `merge()` or `combine()` lists of `Event`s or
 * check for duplicates.
 *
 * You can also do per-`Event` operations like `select()` out specific fields or
 * `collapse()` multiple fields into one using an aggregation function.
 *
 * Note: Managing multiple `Event`s is typically done with a `Collection`
 * which is literally a collections of `Event`s, or a `TimeSeries` which
 * is an chronological set of `Event`s plus some additional meta data.
 */
class Event extends base_1.Base {
    /**
     * Do the two supplied events contain the same data, even if they are not
     * the same instance? Uses `Immutable.is()` to compare the event data and
     * the key.
     */
    static is(event1, event2) {
        return (event1.getKey().toString() === event2.getKey().toString() &&
            event1.getData().equals(event2.getData()));
    }
    /**
     * Returns if the two supplied events are duplicates of each other.
     *
     * Duplicated is defined as the keys of the `Event`s being the same.
     * This is the case with incoming events sometimes where a second event
     * is either known to be the same (but duplicate) of the first, or
     * supersedes the first.
     *
     * You can also pass in `false` for `ignoreValues` and get a full compare,
     * including the data of the event, thus ignoring the supersede case.
     *
     * Example:
     * ```
     * const e1 = event(t, Immutable.Map({ a: 5, b: 6, c: 7 }));
     * const e2 = event(t, Immutable.Map({ a: 5, b: 6, c: 7 }));
     * const e3 = event(t, Immutable.Map({ a: 100, b: 6, c: 7 }));
     *
     * Event.isDuplicate(e1, e2)        // true
     * Event.isDuplicate(e1, e3)        // true
     * Event.isDuplicate(e1, e3, false) // false
     * Event.isDuplicate(e1, e2, false) // false
     * ```
     */
    static isDuplicate(event1, event2, ignoreValues = true) {
        if (ignoreValues) {
            return (event1.keyType() === event2.keyType() &&
                event1.getKey().toString() === event2.getKey().toString());
        }
        else {
            return event1.keyType() === event2.keyType() && Event.is(event1, event2);
        }
    }
    /**
     * Merges multiple `Event`'s together into a new array of `Event`s, one
     * for each key of the source events. Merging is done on the data of
     * each `Event`. Values from later events in the list overwrite
     * earlier values if fields conflict.
     *
     * Common use cases:
     *   * append events of different timestamps
     *     e.g. merge earlier events with later events
     *   * merge in events with one field to events with another field
     *     e.g. combine events with a field "in" with another list of events
     *          with a field "out" to get events with both "in" and "out"
     *   * merge in events that supersede the previous events
     *
     * Events in the supplied list need to be of homogeneous types
     *
     * See also:
     *  * `TimeSeries.timeSeriesListMerge()` if what you have is a
     * `TimeSeries`. That uses this code but with a friendlier API.
     *
     * Example:
     * ```
     * const t = time(new Date("2015-04-22T03:30:00Z"));
     * const event1 = event(t, Immutable.Map({ a: 5, b: 6 }));
     * const event2 = event(t, Immutable.Map({ c: 2 }));
     * const merged = Event.merge(Immutable.List([event1, event2]));
     * merged.get(0).get("a");    // 5
     * merged.get(0).get("b");    // 6
     * merged.get(0).get("c");    // 2
     */
    static merge(events, deep) {
        // Early exit
        if (events instanceof Immutable.List && events.size === 0) {
            return Immutable.List();
        }
        //
        // Group events by event key
        //
        const mergeDeep = deep || false;
        const eventList = [];
        const eventMap = {};
        const keyMap = {};
        events.forEach((e) => {
            const key = e.getKey();
            const k = key.toString();
            if (!_.has(eventMap, k)) {
                eventMap[k] = [];
                keyMap[k] = e.getKey();
            }
            eventMap[k].push(e);
        });
        //
        // For each key we'll build a new event of the same type as the source
        // events. Here we loop through all the events for that key, then for each field
        // we are considering, we get all the values and reduce them (sum, avg, etc)
        // to a new data object d, which we then build a new Event from.
        //
        const outEvents = [];
        _.each(eventMap, (perKeyEvents, key) => {
            let reduced = null;
            let d = null;
            _.each(perKeyEvents, (e) => {
                if (!reduced) {
                    reduced = e;
                    d = reduced.getData();
                }
                else {
                    d = mergeDeep ? d.mergeDeep(e.getData()) : d.merge(e.getData());
                }
                reduced = reduced.setData(d);
            });
            outEvents.push(reduced);
        });
        return Immutable.List(outEvents);
    }
    /**
     * Returns a function that will take a list of `Event`s and merge them
     * together using the `fieldSpec` provided. This is used as a `reducer` for
     * merging multiple `TimeSeries` together with `TimeSeries.timeSeriesListMerge()`.
     */
    static merger(deep) {
        return (events) => Event.merge(events, deep);
    }
    /**
     * Static function to combine multiple `Event`s together into a new array
     * of events, one `Event` for each key of the source events. The list of
     * `Events` should be specified as an array or `Immutable.List<Event<K>>`.
     *
     * Combining acts on the fields specified in the `fieldSpec` (or all
     * fields) and uses the `reducer` function supplied to take the multiple
     * values associated with the key and reduce them down to a single value.
     *
     * The return result will be an `Immutable.List<Event<K>>` of the same type K
     * as the input.
     *
     * Example:
     * ```
     * const t = time("2015-04-22T03:30:00Z");
     * const events = [
     *     event(t, Immutable.Map({ a: 5, b: 6, c: 7 })),
     *     event(t, Immutable.Map({ a: 2, b: 3, c: 4 })),
     *     event(t, Immutable.Map({ a: 1, b: 2, c: 3 }))
     * ];
     * const result = Event.combine(Immutable.List(events), sum());
     * // result[0] is {a: 8, b: 11, c: 14 }
     * ```
     * See also: `TimeSeries.timeSeriesListSum()`
     */
    static combine(events, reducer, fieldSpec) {
        if (events instanceof Immutable.List && events.size === 0) {
            return Immutable.List();
        }
        const eventTemplate = events instanceof Immutable.List ? events.get(0) : events[0];
        let fieldNames;
        if (_.isString(fieldSpec)) {
            fieldNames = [fieldSpec];
        }
        else if (_.isArray(fieldSpec)) {
            fieldNames = fieldSpec;
        }
        //
        // Group events by event key
        //
        const eventMap = {};
        const keyMap = {};
        events.forEach((e) => {
            const key = e.getKey();
            const k = key.toString();
            if (!_.has(eventMap, k)) {
                eventMap[k] = [];
                keyMap[k] = e.getKey();
            }
            eventMap[k].push(e);
        });
        //
        // For each key we'll build a new event of the same type as the source
        // events. Here we loop through all the events for that key, then for
        // each field we are considering, we get all the values and reduce
        // them (sum, avg, etc) to get a the new data for that key.
        //
        const outEvents = [];
        _.each(eventMap, (perKeyEvents, key) => {
            // tslint:disable-next-line
            const mapEvent = {};
            _.each(perKeyEvents, (perKeyEvent) => {
                let fields = fieldNames;
                if (!fields) {
                    const obj = perKeyEvent.getData().toJSON();
                    fields = _.map(obj, (v, fieldName) => `${fieldName}`);
                }
                fields.forEach((fieldName) => {
                    if (!mapEvent[fieldName]) {
                        mapEvent[fieldName] = [];
                    }
                    mapEvent[fieldName].push(perKeyEvent.getData().get(fieldName));
                });
            });
            const data = {};
            _.map(mapEvent, (values, fieldName) => {
                data[fieldName] = reducer(values);
            });
            const e = new Event(keyMap[key], eventTemplate.getData().merge(data));
            outEvents.push(e);
        });
        return Immutable.List(outEvents);
    }
    /**
     * Static method that returns a function that will take a list of `Event`'s
     * and combine them together using the `fieldSpec` and reducer function provided.
     * This is used as an event reducer for merging multiple `TimeSeries` together
     * with `timeSeriesListReduce()`.
     */
    static combiner(fieldSpec, reducer) {
        return (events) => Event.combine(events, reducer, fieldSpec);
    }
    static map(events, multiFieldSpec = "value") {
        const result = {};
        if (typeof multiFieldSpec === "string") {
            const fieldSpec = multiFieldSpec;
            events.forEach((e) => {
                if (!_.has(result, fieldSpec)) {
                    result[fieldSpec] = [];
                }
                const value = e.get(fieldSpec);
                result[fieldSpec].push(value);
            });
        }
        else if (_.isArray(multiFieldSpec)) {
            const fieldSpecList = multiFieldSpec;
            _.each(fieldSpecList, (fieldSpec) => {
                events.forEach((e) => {
                    if (!_.has(result, fieldSpec)) {
                        result[fieldSpec] = [];
                    }
                    result[fieldSpec].push(e.get(fieldSpec));
                });
            });
        }
        else {
            events.forEach((e) => {
                _.each(e.data().toJSON(), (value, key) => {
                    if (!_.has(result, key)) {
                        result[key] = [];
                    }
                    result[key].push(value);
                });
            });
        }
        return result;
    }
    /**
     * Static function that takes a `Immutable.List` of events, a `reducer` function and a
     * `fieldSpec` (field or list of fields) and returns an aggregated result in the form
     * of a new Event, for each column.
     *
     * The reducer is of the form:
     * ```
     * (values: number[]) => number
     * ```
     *
     * Example:
     * ```
     * const result = Event.aggregate(EVENT_LIST, avg(), ["in", "out"]);
     * // result = { in: 5, out: 14.25 }
     * ```
     */
    static aggregate(events, reducer, multiFieldSpec) {
        function reduce(mapped, f) {
            const result = {};
            _.each(mapped, (valueList, key) => {
                result[key] = f(valueList);
            });
            return result;
        }
        return reduce(this.map(events, multiFieldSpec), reducer);
    }
    /**
     * Construction of an `Event` requires both a time-based key and an
     * `Immutable.Map` of (`string` -> data) mappings.
     *
     * The time-based key should be either a `Time`, a `TimeRange` or an `Index`,
     * though it would be possible to subclass `Key` with another type so long
     * as it implements that abstract interface.
     *
     * The data portion maybe deep data. Using `Immutable.toJS()` is helpful in
     * that case.
     *
     * You can use `new Event<T>()` to create a new `Event`, but it's easier to use
     * one of the factory functions: `event()`, `timeEvent()`, `timeRangeEvent()` and
     * `indexedEvent()`
     *
     * Example 1:
     * ```
     * const e = event(time(new Date(1487983075328)), Immutable.Map({ name: "bob" }));
     * ```
     *
     * Example 2:
     * ```
     * // An event for a particular day with indexed key
     * const e = event(index("1d-12355"), Immutable.Map({ value: 42 }));
     * ```
     *
     * Example 3:
     * ```
     * // Outage event spans a timerange
     * const e = event(timerange(beginTime, endTime), Immutable.Map({ ticket: "A1787383" }));
     * ```
     *
     * Example 4:
     * ```
     * const e = timeEvent({
     *     time: 1487983075328,
     *     data: { a: 2, b: 3 }
     * });
     * ```
     */
    constructor(key, data) {
        super();
        this.key = key;
        this.data = data;
    }
    /**
     * Returns the key this `Event`.
     *
     * The result is of type T (a `Time`, `TimeRange` or `Index`), depending on
     * what the `Event` was constructed with.
     */
    getKey() {
        return this.key;
    }
    /**
     * Returns the label of the key
     */
    keyType() {
        return this.key.type();
    }
    /**
     * Returns the data associated with this event in the form
     * of an `Immutable.Map`. This is infact an accessor for the internal
     * representation of data in this `Event`.
     */
    getData() {
        return this.data;
    }
    /**
     * Sets new `data` associated with this event. The new `data` is supplied
     * in the form of an `Immutable.Map`. A new `Event<T>` will be returned
     * containing this new data, but having the same key.
     */
    setData(data) {
        return new Event(this.key, data);
    }
    /**
     * Gets the `value` of a specific field within the `Event`.
     *
     * You can refer to a fields with one of the following notations:
     *  * (undefined) -> "value"
     *  * "temperature"
     *  * "path.to.deep.data"
     *  * ["path", "to", "deep", "data"].
     *
     * Example 1:
     * ```
     * const e = event(index("1d-12355"), Immutable.Map({ value: 42 }));
     * e.get("value"); // 42
     * ```
     *
     * Example 2:
     * ```
     * const t = time(new Date("2015-04-22T03:30:00Z"));
     * const e = event(t, Immutable.fromJS({ a: 5, b: { c: 6 } }));
     * e.get("b.c"); // 6
     * ```
     *
     * Note: the default `field` is "value".
     */
    get(field = "value") {
        const f = util_1.default.fieldAsArray(field);
        return this.getData().getIn(f);
    }
    /**
     * Set a new `value` on the `Event` for the given `field`, and return a new `Event`.
     *
     * You can refer to a `field` with one of the following notations:
     *  * (undefined) -> "value"
     *  * "temperature"
     *  * "path.to.deep.data"
     *  * ["path", "to", "deep", "data"].
     *
     * `value` is the new value to set on for the given `field` on the `Event`.
     *
     * ```
     * const t = time(new Date(1487983075328));
     * const initial = event(t, Immutable.Map({ name: "bob" }));
     * const modified = e.set("name", "fred");
     * modified.toString() // {"time": 1487983075328, "data": {"name":"fred"} }
     * ```
     */
    set(field = "value", value) {
        const f = util_1.default.fieldAsArray(field);
        return new Event(this.getKey(), this.getData().setIn(f, value));
    }
    /**
     * Will return false if the value for the specified `fields` in this `Event` is
     * either `undefined`, `NaN` or `null` for the given field or fields. This
     * serves as a determination of a "missing" value within a `TimeSeries` or
     * `Collection`.
     */
    isValid(fields) {
        let invalid = false;
        const fieldList = _.isUndefined(fields) || _.isArray(fields) ? fields : [fields];
        fieldList.forEach((field) => {
            const v = this.get(field);
            invalid = _.isUndefined(v) || _.isNaN(v) || _.isNull(v);
        });
        return !invalid;
    }
    /**
     * Converts the `Event` into a standard Javascript object
     */
    toJSON() {
        const k = this.getKey().toJSON()[this.keyType()];
        return {
            [this.keyType()]: k,
            data: this.getData().toJSON(),
        };
    }
    /**
     * Converts the `Event` to a string
     */
    toString() {
        return JSON.stringify(this.toJSON());
    }
    /**
     * Returns the timestamp of the `Event`.
     *
     * This a convenience for calling `Event.getKey()` followed by `timestamp()`.
     */
    timestamp() {
        return this.getKey().timestamp();
    }
    /**
     * The begin time of the `Event`. If the key of the `Event` is a `Time` then
     * the begin and end time of the `Event` will be the same as the `Event`
     * timestamp.
     */
    begin() {
        return this.getKey().begin();
    }
    /**
     * The end time of the `Event`. If the key of the `Event` is a `Time` then
     * the begin and end time of the `Event` will be the same as the `Event`
     * timestamp.
     */
    end() {
        return this.getKey().end();
    }
    index() {
        return (0, index_1.index)(this.indexAsString());
    }
    indexAsString() {
        return this.key.toString();
    }
    /**
     * Returns the `TimeRange` over which this `Event` occurs. If this `Event`
     * has a `Time` key then the duration of this range will be 0.
     */
    timerange() {
        return new timerange_1.TimeRange(this.key.begin(), this.key.end());
    }
    /**
     * Shortcut for `timerange()` followed by `toUTCString()`.
     */
    timerangeAsUTCString() {
        return this.timerange().toUTCString();
    }
    /**
     * Shortcut for `timestamp()` followed by `toUTCString()`.
     */
    timestampAsUTCString() {
        return this.timestamp().toUTCString();
    }
    /**
     * Returns an array containing the key in the first element and then the data map
     * expressed as JSON as the second element. This is the method that is used by
     * a `TimeSeries` to build its wireformat representation.
     */
    toPoint(columns) {
        const values = [];
        columns.forEach((c) => {
            const v = this.getData().get(c);
            values.push(v === "undefined" ? null : v);
        });
        if (this.keyType() === "time") {
            return [this.timestamp().getTime(), ...values];
        }
        else if (this.keyType() === "index") {
            return [this.indexAsString(), ...values];
        }
        else if (this.keyType() === "timerange") {
            return [
                [this.timerange().begin().getTime(), this.timerange().end().getTime()],
                ...values,
            ];
        }
    }
    /**
     * Collapses an array of fields, specified in the `fieldSpecList`, into a single
     * field named `fieldName` using the supplied reducer function. Optionally you can keep
     * all existing fields by supplying the `append` argument as `true`.
     *
     * Example:
     * ```
     * const t = time(new Date("2015-04-22T03:30:00Z"));
     * const e = event(t, Immutable.Map({ in: 5, out: 6, status: "ok" }));
     * const result = e.collapse(["in", "out"], "total", sum(), true);
     * // { "in": 5, "out": 6, "status": "ok", "total": 11 } }
     * ```
     */
    collapse(fieldSpecList, fieldName, reducer, append = false) {
        const data = append ? this.getData().toJS() : {};
        const d = fieldSpecList.map((fs) => this.get(fs));
        data[fieldName] = reducer(d);
        return this.setData(Immutable.fromJS(data));
    }
    /**
     * Selects specific fields of an `Event` using the `fields` array of strings
     * and returns a new event with just those fields.
     *
     * Example:
     * ```
     * const t = time(new Date("2015-04-22T03:30:00Z"));
     * const e = event(t, Immutable.Map({ a: 5, b: 6, c: 7 }));
     * const result = e.select(["a", "b"]);  // data is { a: 5, b: 6 }}
     * ```
     */
    select(fields) {
        const data = {};
        _.each(fields, (fieldName) => {
            const value = this.get(fieldName);
            data[fieldName] = value;
        });
        return this.setData(Immutable.fromJS(data));
    }
}
exports.Event = Event;
function timeEvent(arg1, arg2) {
    if (arg1 instanceof time_1.Time && Immutable.Map.isMap(arg2)) {
        const data = arg2;
        return new Event(arg1, data);
    }
    else {
        const t = arg1.time;
        const data = arg1.data;
        return new Event((0, time_1.time)(t), Immutable.Map(data));
    }
}
exports.timeEvent = timeEvent;
function indexedEvent(arg1, arg2) {
    if (arg1 instanceof index_1.Index && Immutable.Map.isMap(arg2)) {
        const data = arg2;
        return new Event(arg1, data);
    }
    else {
        const i = arg1.index;
        const data = arg1.data;
        return new Event((0, index_1.index)(i), Immutable.Map(data));
    }
}
exports.indexedEvent = indexedEvent;
function timeRangeEvent(arg1, arg2) {
    if (arg1 instanceof timerange_1.TimeRange && Immutable.Map.isMap(arg2)) {
        const data = arg2;
        return new Event(arg1, data);
    }
    else {
        const tr = arg1.timerange;
        const data = arg1.data;
        return new Event((0, timerange_1.timerange)(tr[0], tr[1]), Immutable.Map(data));
    }
}
exports.timeRangeEvent = timeRangeEvent;
function event(key, data) {
    return new Event(key, data);
}
exports.event = event;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXZlbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvZXZlbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7OztHQVFHOzs7QUFFSCx1Q0FBdUM7QUFDdkMsNEJBQTRCO0FBRTVCLGlDQUE4QjtBQUM5QixtQ0FBdUM7QUFFdkMsaUNBQW9DO0FBQ3BDLDJDQUFtRDtBQUluRCxpQ0FBMEI7QUFFMUI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBc0NHO0FBQ0gsTUFBYSxLQUE0QixTQUFRLFdBQUk7SUFDakQ7Ozs7T0FJRztJQUNJLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBa0IsRUFBRSxNQUFrQjtRQUNuRCxPQUFPLENBQ0gsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLFFBQVEsRUFBRSxLQUFLLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxRQUFRLEVBQUU7WUFDekQsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FDNUMsQ0FBQztJQUNOLENBQUM7SUFFRDs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztPQXNCRztJQUNJLE1BQU0sQ0FBQyxXQUFXLENBQ3JCLE1BQWtCLEVBQ2xCLE1BQWtCLEVBQ2xCLGVBQXdCLElBQUk7UUFFNUIsSUFBSSxZQUFZLEVBQUU7WUFDZCxPQUFPLENBQ0gsTUFBTSxDQUFDLE9BQU8sRUFBRSxLQUFLLE1BQU0sQ0FBQyxPQUFPLEVBQUU7Z0JBQ3JDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxRQUFRLEVBQUUsS0FBSyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsUUFBUSxFQUFFLENBQzVELENBQUM7U0FDTDthQUFNO1lBQ0gsT0FBTyxNQUFNLENBQUMsT0FBTyxFQUFFLEtBQUssTUFBTSxDQUFDLE9BQU8sRUFBRSxJQUFJLEtBQUssQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFD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