"use strict";
/**
 *  Copyright (c) 2016-2017, The Regents of the University of California,
 *  through Lawrence Berkeley National Laboratory (subject to receipt
 *  of any required approvals from the U.S. Dept. of Energy).
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Fill = void 0;
const Immutable = require("immutable");
const _ = require("lodash");
const processor_1 = require("./processor");
const util_1 = require("./util");
const types_1 = require("./types");
/**
 * A processor that fills missing/invalid values in the `Event` with
 * new values (zero, interpolated or padded).
 *
 * When doing a linear fill, Filler instances should be chained.
 */
class Fill extends processor_1.Processor {
    constructor(options) {
        super();
        const { fieldSpec, method = types_1.FillMethod.Pad, limit = null } = options;
        // Options
        this._fieldSpec = _.isString(fieldSpec) ? [fieldSpec] : fieldSpec;
        this._method = method;
        this._limit = limit;
        this._previous = null; // state for pad to refer to previous event
        this._keyCount = {}; // key count for zero and pad fill
        this._lastGoodLinear = null; // special state for linear fill
        this._linearFillCache = []; // cache of events pending linear fill
        // Special case: when using linear mode, only a single column
        //               will be processed per instance!
        if (this._method === types_1.FillMethod.Linear && this._fieldSpec.length > 1) {
            throw new Error("Linear fill takes a path to a single field");
        }
    }
    /**
     * Process and fill the values at the paths as apropos when the fill
     * method is either pad or zero.
     */
    constFill(data) {
        let newData = data;
        for (const path of this._fieldSpec) {
            const fieldPath = util_1.default.fieldAsArray(path);
            const pathKey = fieldPath.join(":");
            // initialize a counter for this column
            if (!_.has(this._keyCount, pathKey)) {
                this._keyCount[pathKey] = 0;
            }
            // this is pointing at a path that does not exist
            if (!newData.hasIn(fieldPath)) {
                continue;
            }
            // Get the next value using the fieldPath
            const val = newData.getIn(fieldPath);
            if (util_1.default.isMissing(val)) {
                // Have we hit the limit?
                if (this._limit && this._keyCount[pathKey] >= this._limit) {
                    continue;
                }
                if (this._method === types_1.FillMethod.Zero) {
                    // set to zero
                    newData = newData.setIn(fieldPath, 0);
                    this._keyCount[pathKey]++;
                }
                else if (this._method === types_1.FillMethod.Pad) {
                    // set to previous value
                    if (!_.isNull(this._previous)) {
                        const prevVal = this._previous.getData().getIn(fieldPath);
                        if (!util_1.default.isMissing(prevVal)) {
                            newData = newData.setIn(fieldPath, prevVal);
                            this._keyCount[pathKey]++;
                        }
                    }
                }
                else if (this._method === types_1.FillMethod.Linear) {
                    // noop
                }
            }
            else {
                this._keyCount[pathKey] = 0;
            }
        }
        return newData;
    }
    /**
     * Check to see if an `Event` has good values when doing
     * linear fill since we need to keep a completely intact
     * event for the values.
     * While we are inspecting the data payload, make a note if
     * any of the paths are pointing at a list. Then it
     * will trigger that filling code later.
     */
    isValidLinearEvent(event) {
        let valid = true;
        const fieldPath = util_1.default.fieldAsArray(this._fieldSpec[0]);
        // Detect path that doesn't exist
        if (!event.getData().hasIn(fieldPath)) {
            // tslint:disable-next-line
            console.warn(`path does not exist: ${fieldPath}`);
            return valid;
        }
        const val = event.getData().getIn(fieldPath);
        // Detect if missing or not a number
        if (util_1.default.isMissing(val) || !_.isNumber(val)) {
            valid = false;
        }
        return valid;
    }
    /**
     * This handles the linear filling. It returns a list of
     * zero or more `Event`'s to be emitted.
     *
     * If an `Event` is valid:
     *  * it has valid values for all of the field paths
     *  * it is cached as "last good" and returned to be emitted.
     * The return value is then a list of one `Event`.
     *
     * If an `Event` has invalid values, it is cached to be
     * processed later and an empty list is returned.
     *
     * Additional invalid `Event`'s will continue to be cached until
     * a new valid value is seen, then the cached events will
     * be filled and returned. That will be a list of indeterminate
     * length.
     */
    linearFill(event) {
        // See if the event is valid and also if it has any
        // list values to be filled.
        const isValidEvent = this.isValidLinearEvent(event);
        const events = [];
        if (isValidEvent && !this._linearFillCache.length) {
            // Valid event, no cached events, use as last good val
            this._lastGoodLinear = event;
            events.push(event);
        }
        else if (!isValidEvent && !_.isNull(this._lastGoodLinear)) {
            this._linearFillCache.push(event);
            // Check limit
            if (!_.isNull(this._limit) && this._linearFillCache.length >= this._limit) {
                // Flush the cache now because limit is reached
                this._linearFillCache.forEach((e) => {
                    events.push(e);
                });
                // Reset
                this._linearFillCache = [];
                this._lastGoodLinear = null;
            }
        }
        else if (!isValidEvent && _.isNull(this._lastGoodLinear)) {
            //
            // An invalid event but we have not seen a good
            // event yet so there is nothing to start filling "from"
            // so just return and live with it.
            //
            events.push(event);
        }
        else if (isValidEvent && this._linearFillCache) {
            // Linear interpolation between last good and this event
            const eventList = [this._lastGoodLinear, ...this._linearFillCache, event];
            const interpolatedEvents = this.interpolateEventList(eventList);
            //
            // The first event in the returned list from interpolatedEvents
            // is our last good event. This event has already been emitted so
            // it is sliced off.
            //
            interpolatedEvents.slice(1).forEach((e) => {
                events.push(e);
            });
            // Reset
            this._linearFillCache = [];
            this._lastGoodLinear = event;
        }
        return events;
    }
    /**
     * The fundamental linear interpolation workhorse code. Process
     * a list of `Event`'s and return a new list. Does a pass for
     * every `fieldSpec`.
     *
     * This is abstracted out like this because we probably want
     * to interpolate a list of `Event`'s not tied to a `Collection`.
     * A Pipeline result list, etc etc.
     *
     */
    interpolateEventList(events) {
        let prevValue;
        let prevTime;
        // new array of interpolated events for each field path
        const newEvents = [];
        const fieldPath = util_1.default.fieldAsArray(this._fieldSpec[0]);
        // setup done, loop through the events
        for (let i = 0; i < events.length; i++) {
            const e = events[i];
            // Can't interpolate first or last event so just save it
            // as is and move on.
            if (i === 0) {
                prevValue = e.get(fieldPath);
                prevTime = e.timestamp().getTime();
                newEvents.push(e);
                continue;
            }
            if (i === events.length - 1) {
                newEvents.push(e);
                continue;
            }
            // Detect non-numeric value
            if (!util_1.default.isMissing(e.get(fieldPath)) && !_.isNumber(e.get(fieldPath))) {
                // tslint:disable-next-line
                console.warn(`linear requires numeric values - skipping this field_spec`);
                return events;
            }
            // Found a missing value so start calculating.
            if (util_1.default.isMissing(e.get(fieldPath))) {
                // Find the next valid value in the original events
                let ii = i + 1;
                let nextValue = null;
                let nextTime = null;
                while (_.isNull(nextValue) && ii < events.length) {
                    const val = events[ii].get(fieldPath);
                    if (!util_1.default.isMissing(val)) {
                        nextValue = val;
                        // exits loop
                        nextTime = events[ii].timestamp().getTime();
                    }
                    ii++;
                }
                // Interpolate a new value to fill
                if (!_.isNull(prevValue) && !_.isNull(nextValue)) {
                    const currentTime = e.timestamp().getTime();
                    if (nextTime === prevTime) {
                        // If times are the same, just avg
                        const newValue = (prevValue + nextValue) / 2;
                        const d = e.getData().setIn(fieldPath, newValue);
                        newEvents.push(e.setData(d));
                    }
                    else {
                        const f = (currentTime - prevTime) / (nextTime - prevTime);
                        const newValue = prevValue + f * (nextValue - prevValue);
                        const d = e.getData().setIn(fieldPath, newValue);
                        newEvents.push(e.setData(d));
                    }
                }
                else {
                    newEvents.push(e);
                }
            }
            else {
                newEvents.push(e);
            }
        }
        return newEvents;
    }
    /**
     * Perform the fill operation on the `Event` and return filled
     * in events
     */
    addEvent(event) {
        const eventList = new Array();
        const d = event.getData();
        if (this._method === types_1.FillMethod.Zero || this._method === types_1.FillMethod.Pad) {
            const dd = this.constFill(d);
            const e = event.setData(dd);
            eventList.push(e);
            this._previous = e;
        }
        else if (this._method === types_1.FillMethod.Linear) {
            this.linearFill(event).forEach((e) => {
                eventList.push(e);
            });
        }
        return Immutable.List(eventList);
    }
}
exports.Fill = Fill;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9maWxsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7Ozs7R0FRRzs7O0FBRUgsdUNBQXVDO0FBQ3ZDLDRCQUE0QjtBQUk1QiwyQ0FBd0M7QUFDeEMsaUNBQTBCO0FBRTFCLG1DQUFrRDtBQUVsRDs7Ozs7R0FLRztBQUNILE1BQWEsSUFBb0IsU0FBUSxxQkFBZTtJQVlwRCxZQUFZLE9BQW9CO1FBQzVCLEtBQUssRUFBRSxDQUFDO1FBRVIsTUFBTSxFQUFFLFNBQVMsRUFBRSxNQUFNLEdBQUcsa0JBQVUsQ0FBQyxHQUFHLEVBQUUsS0FBSyxHQUFHLElBQUksRUFBRSxHQUFHLE9BQU8sQ0FBQztRQUVyRSxVQUFVO1FBQ1YsSUFBSSxDQUFDLFVBQVUsR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUM7UUFDbEUsSUFBSSxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUM7UUFDdEIsSUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUM7UUFFcEIsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsQ0FBQywyQ0FBMkM7UUFDbEUsSUFBSSxDQUFDLFNBQVMsR0FBRyxFQUFFLENBQUMsQ0FBQyxrQ0FBa0M7UUFDdkQsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUMsQ0FBQyxnQ0FBZ0M7UUFDN0QsSUFBSSxDQUFDLGdCQUFnQixHQUFHLEVBQUUsQ0FBQyxDQUFDLHNDQUFzQztRQUVsRSw2REFBNkQ7UUFDN0QsZ0RBQWdEO1FBQ2hELElBQUksSUFBSSxDQUFDLE9BQU8sS0FBSyxrQkFBVSxDQUFDLE1BQU0sSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7WUFDbEUsTUFBTSxJQUFJLEtBQUssQ0FBQyw0Q0FBNEMsQ0FBQyxDQUFD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