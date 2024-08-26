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
exports.daily = exports.window = exports.Window = exports.DayWindow = exports.WindowBase = exports.WindowType = void 0;
const Immutable = require("immutable");
const _ = require("lodash");
const moment = require("moment-timezone");
const index_1 = require("./index");
const period_1 = require("./period");
const time_1 = require("./time");
const timerange_1 = require("./timerange");
var WindowType;
(function (WindowType) {
    WindowType[WindowType["Day"] = 1] = "Day";
    WindowType[WindowType["Month"] = 2] = "Month";
    WindowType[WindowType["Week"] = 3] = "Week";
    WindowType[WindowType["Year"] = 4] = "Year";
})(WindowType = exports.WindowType || (exports.WindowType = {}));
class WindowBase {
}
exports.WindowBase = WindowBase;
/**
 * Specifies a repeating day duration specific to the supplied timezone. You can
 * create one using the `daily()` factory function.
 *
 * Example:
 * ```
 * const dayWindowNewYork = daily("America/New_York");
 * const indexes = dayWindowNewYork.getIndexSet(Util.untilNow(duration("5d")));
 * ```
 */
// tslint:disable-next-line:max-classes-per-file
class DayWindow extends WindowBase {
    /**
     * Given an index string representing a day (e.g. "2015-08-22"), and optionally
     * the timezone (default is UTC), return the corresponding `TimeRange`.
     */
    static timeRangeOf(indexString, tz = "Etc/UTC") {
        const parts = indexString.split("-");
        if (parts.length !== 3) {
            throw new Error("Index string for day is badly formatted");
        }
        let beginTime;
        let endTime;
        if (!_.isNaN(parseInt(parts[0], 10)) &&
            !_.isNaN(parseInt(parts[1], 10)) &&
            !_.isNaN(parseInt(parts[2], 10))) {
            const year = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10);
            const day = parseInt(parts[2], 10);
            beginTime = moment.tz([year, month - 1, day], tz);
            endTime = moment.tz([year, month - 1, day], tz).endOf("day");
        }
    }
    /**
     * Construct a new `DayWindow`, optionally supplying the timezone `tz`
     * for the `Window`. The default is `UTC`.
     */
    constructor(tz = "Etc/UTC") {
        super();
        this._tz = tz;
    }
    /**
     * Returns an `Immutable.OrderedSet<Index>` set of day `Index`es for the
     * `Time` or `TimeRange` supplied as `t`.
     *
     * The simplest invocation of this function would be to pass in a `Time`
     * and get the day (e.g. "2017-09-10"). What day you get may depend on the
     * timezone specified when constructing this `DayWindow`. The most useful
     * aspect of a `DayWindow` is that you can use this index set to bucket
     * `Event`s into days in a particular timezone.
     */
    getIndexSet(t) {
        let results = Immutable.OrderedSet();
        let t1;
        let t2;
        if (t instanceof time_1.Time) {
            t1 = moment(+t).tz(this._tz);
            t2 = moment(+t).tz(this._tz);
        }
        else if (t instanceof timerange_1.TimeRange) {
            t1 = moment(+t.begin()).tz(this._tz);
            t2 = moment(+t.end()).tz(this._tz);
        }
        let tt = t1;
        while (tt.isSameOrBefore(t2)) {
            results = results.add((0, index_1.index)(t1.format("YYYY-MM-DD"), this._tz));
            tt = tt.add(1, "d");
        }
        return results;
    }
}
exports.DayWindow = DayWindow;
/**
 * A `Window` is a specification for repeating range of time range which is
 * typically used in Pond to describe an aggregation bounds.
 *
 * Windows have a `Period` (which defines the frequency and offset of window
 * placement) combined with a `Duration` (which is the size of the window
 * itself).
 *
 * If a `Window` is defined with only a `Duration` then the freqency of the
 * `Window` is equal to the duration of the window (i.e. a fixed window).
 * If the period is smaller than the duration we have a sliding window.
 *
 * From a `Window` you can get a set of `Index`es for a specific `Time` or
 * `TimeRange`, giving you the `Window` or `Window`s that overlap that `Time`
 * or `TimeRange`. The main use of this is it allows you to easily bucket
 * `Events` into the appropiate `Window`s.
 *
 * Example:
 * ```
 * const timeseries = timeSeries(data);
 * const everyThirtyMinutes = window(duration("30m"));
 * const dailyAvg = timeseries.fixedWindowRollup({
 *     window: everyThirtyMinutes,
 *     aggregation: { average: ["value", avg()] }
 * });
 * ```
 *
 * Note: You can also use `DayWindow` with a specified timezone for more
 * control over daily aggregations.
 */
class Window extends WindowBase {
    /**
     * To construct a `Window` you need to supply the `Duration` or length of the
     * window and the sliding `Period` of the window.
     *
     *  * Supply the `Duration` as the `d` arg.
     *  * Optionally supply the `Period`
     *
     * Repeats of the Window are given an index to represent that specific repeat.
     * That index is represented by an `Index` object and can also be represented
     * by a string that encodes the specific repeat.
     *
     * Since an `Index` can be a key for a `TimeSeries`, a repeated period and
     * associated data can be represented that way.
     *
     * ```
     *              |<- duration ---------->|
     * |<- offset ->|<- freq ->|                  (<- period )
     *              [-----------------------]
     *                         [-----------------------]
     *                                    [-----------------------]
     *                                            ...
     * ```
     *
     */
    // tslint:disable-next-line:max-classes-per-file
    constructor(d, period) {
        super();
        this._duration = d;
        this._period = period ? period : new period_1.Period(d);
    }
    toString() {
        if (+this._period.frequency() === +this.duration()) {
            return this._period.toString();
        }
        else {
            return `${this._duration}@${this._period}`;
        }
    }
    /**
     * Returns the underlying period of the Window
     */
    period() {
        return this._period;
    }
    /**
     * Returns the duration of the Window
     */
    duration() {
        return this._duration;
    }
    /**
     * Specify how often the underlying period repeats
     */
    every(frequency) {
        return new Window(this._duration, this._period.every(frequency));
    }
    /**
     * Specify an offset for the underlying period
     */
    offsetBy(t) {
        return new Window(this._duration, this._period.offsetBy(t));
    }
    /**
     * Returns the Window repeats as an `Immutable.Set<Index>` that covers
     * (in whole or in part) the time or timerange supplied. In this example,
     * B, C, D and E will be returned:
     *
     * ```
     *                    t (Time)
     *                    |
     *  [----------------]|                    A
     *      [-------------|--]                 B*
     *          [---------|------]             C*
     *              [-----|----------]         D*
     *                  [-|--------------]     E*
     *                    | [----------------] F
     * ```
     *
     */
    getIndexSet(t) {
        let t1;
        let t2;
        if (t instanceof time_1.Time) {
            t1 = t;
            t2 = t;
        }
        else if (t instanceof timerange_1.TimeRange) {
            t1 = t.begin();
            t2 = t.end();
        }
        let result = Immutable.OrderedSet();
        const prefix = this.toString();
        const scanBegin = this._period.next((0, time_1.time)(+t1 - +this._duration));
        let periodIndex = Math.ceil(+scanBegin / +this._period.frequency());
        const indexes = [];
        while (periodIndex * +this._period.frequency() <= +t2) {
            result = result.add(new index_1.Index(`${prefix}-${periodIndex}`));
            periodIndex += 1;
        }
        return result;
    }
}
exports.Window = Window;
function window(d, period) {
    return new Window(d, period);
}
exports.window = window;
/*
function daily() {
    return new Window(WindowType.Day);
}
function monthly() {
    return new Window(WindowType.Month);
}
function yearly() {
    return new Window(WindowType.Year);
}
*/
function daily(tz = "Etc/UTC") {
    return new DayWindow(tz);
}
exports.daily = daily;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2luZG93LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL3dpbmRvdy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7Ozs7O0dBUUc7OztBQUVILHVDQUF1QztBQUN2Qyw0QkFBNEI7QUFDNUIsMENBQTBDO0FBRzFDLG1DQUF1QztBQUN2QyxxQ0FBa0M7QUFDbEMsaUNBQW9DO0FBQ3BDLDJDQUF3QztBQUV4QyxJQUFZLFVBS1g7QUFMRCxXQUFZLFVBQVU7SUFDbEIseUNBQU8sQ0FBQTtJQUNQLDZDQUFLLENBQUE7SUFDTCwyQ0FBSSxDQUFBO0lBQ0osMkNBQUksQ0FBQTtBQUNSLENBQUMsRUFMVyxVQUFVLEdBQVYsa0JBQVUsS0FBVixrQkFBVSxRQUtyQjtBQUVELE1BQXNCLFVBQVU7Q0FFL0I7QUFGRCxnQ0FFQztBQUVEOzs7Ozs7Ozs7R0FTRztBQUNILGdEQUFnRDtBQUNoRCxNQUFhLFNBQVUsU0FBUSxVQUFVO0lBQ3JDOzs7T0FHRztJQUNJLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBbUIsRUFBRSxLQUFhLFNBQVM7UUFDakUsTUFBTSxLQUFLLEdBQUcsV0FBVyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNyQyxJQUFJLEtBQUssQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO1lBQ3BCLE1BQU0sSUFBSSxLQUFLLENBQUMseUNBQXlDLENBQUMsQ0FBQztTQUM5RDtRQUVELElBQUksU0FBd0IsQ0FBQztRQUM3QixJQUFJLE9BQXNCLENBQUM7UUFDM0IsSUFDSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUNoQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUNoQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFD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