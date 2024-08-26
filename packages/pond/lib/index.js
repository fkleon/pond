"use strict";
/*
 *  Copyright (c) 2016-2017, The Regents of the University of California,
 *  through Lawrence Berkeley National Laboratory (subject to receipt
 *  of any required approvals from the U.S. Dept. of Energy).
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.index = exports.Index = void 0;
const key_1 = require("./key");
const util_1 = require("./util");
const types_1 = require("./types");
const time_1 = require("./time");
/**
 * An `Index` is a specific instance of a `Window`. For example
 * a `Window` may represent "every day", and so an `Index` would
 * represent a specific day like last Tuesday in that case.
 *
 * There are two basic types, determined by string format supplied
 * in the constructor:
 *
 * * *Duration index* - the number of some unit of time
 *                       (e.g. 5 minutes) since the UNIX epoch.
 * * *Calendar index* - a calendar range (e.g. Oct 2014) that
 *                      maybe and uneven amount of time.
 *
 * For the first type, a multiplier index, an example might be:
 *
 * ```text
 *     1d-12355      // 30th Oct 2003 (GMT), the 12355th day since the
 *                   // UNIX epoch
 * ```
 *
 * You can also use seconds (e.g. 30s), minutes (e.g. 5m), hours (e.g. 1h)
 * or days (e.g. 7d).
 *
 * For the second type, a calendar style `Index`, here are several examples:
 *
 * ```text
 *     2003-10-30    // 30th Oct 2003
 *     2014-09       // Sept 2014
 *     2015          // All of the year 2015
 * ```
 *
 * A specific `TimeRange`, and associated data can be associated up based
 * on that string. It also allows us to represent things like months,
 * which have variable length.
 *
 * Indexes also contain a timezone, which defaults to UTC. For instance if
 * you have a day 2017-08-11, then the `TimeRange` representation depends
 * on the timezone of that day.
 */
class Index extends key_1.Key {
    /**
     * Constructs a new `Index` by passing in the index string `s` and
     * optionally a timezone `tz`. You can also use the `index()` factory
     * function to construct one.
     *
     * Example:
     * ```
     * const idx = index("5m-4135541");
     * idx.toTimeRange().humanizeDuration();  // "5 minutes"
     * ```
     */
    constructor(s, tz = "Etc/UTC") {
        super();
        this._tz = tz;
        this._string = s;
        this._timerange = util_1.default.timeRangeFromIndexString(s, this._tz);
    }
    type() {
        return "index";
    }
    /**
     * Returns the timestamp as a `Date` to represent this `Index`, which in this
     * case will return the midpoint of the `TimeRange` this represents
     */
    timestamp() {
        return this._timerange.mid();
    }
    /**
     * Returns the `Index` as JSON, which will just be its string representation
     * within an object e.g. `{ index: 1d-1234 }`
     */
    toJSON() {
        return { index: this._string };
    }
    /**
     * Simply returns the `Index` as its string
     */
    toString() {
        return this._string;
    }
    /**
     * For the calendar style `Index`, this lets you return
     * that calendar range as a human readable format, e.g. "June, 2014".
     *
     * The `format` specified is a `Moment.format`.
     *
     * Example:
     * ```
     * const idx = index("2014-09-17");
     * idx.toNiceString("DD MMM YYYY") // "17 Sep 2014"
     * ```
     */
    toNiceString(format) {
        return util_1.default.niceIndexString(this._string, format);
    }
    /**
     * Alias for `toString()`
     */
    asString() {
        return this.toString();
    }
    /**
     * Returns a `Time` that is either at the beginning,
     * middle or end of this `Index`. Specify the alignment
     * of the output `Time` with the `align` parameter. This is
     * either:
     *  * TimeAlignment.Begin
     *  * TimeAlignment.Middle
     *  * TimeAlignment.End
     */
    toTime(align) {
        switch (align) {
            case types_1.TimeAlignment.Begin:
                return (0, time_1.time)(this.begin());
                break;
            case types_1.TimeAlignment.Middle:
                return (0, time_1.time)(this.toTimeRange().mid());
                break;
            case types_1.TimeAlignment.End:
                return (0, time_1.time)(this.end());
                break;
        }
    }
    /**
     * Returns the `Index` as a `TimeRange`
     */
    toTimeRange() {
        return this._timerange;
    }
    /**
     * Returns the start date of the `Index`
     */
    begin() {
        return this._timerange.begin();
    }
    /**
     * Returns the end date of the `Index`
     */
    end() {
        return this._timerange.end();
    }
}
exports.Index = Index;
/*
 * An `Index` is a specific instance of a `Window`. For example
 * a `Window` may represent "every day", then an `Index` could
 * represent a specific day like last Tuesday.
 *
 * There are two basic types:
 *
 * * *Duration index* - the number of some unit of time
 *                       (e.g. 5 minutes) since the UNIX epoch.
 * * *Calendar index* - a calendar range (e.g. Oct 2014) that
 *                      maybe and uneven amount of time.
 *
 * Indexes also contain a timezone `tz`, which defaults to UTC. For instance if
 * you have a day 2017-08-11, then the `TimeRange` representation depends
 * on the timezone of that day (a day in London is not the same time range
 * as a day in Los Angeles), they are offset from each other by their timezone
 * difference.
 */
function indexFactory(s, tz = "Etc/UTC") {
    return new Index(s, tz);
}
exports.index = indexFactory;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7OztHQVFHOzs7QUFLSCwrQkFBNEI7QUFFNUIsaUNBQTBCO0FBQzFCLG1DQUF3QztBQUN4QyxpQ0FBb0M7QUFFcEM7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBc0NHO0FBQ0gsTUFBYSxLQUFNLFNBQVEsU0FBRztJQUsxQjs7Ozs7Ozs7OztPQVVHO0lBQ0gsWUFBWSxDQUFDLEVBQUUsRUFBRSxHQUFHLFNBQVM7UUFDekIsS0FBSyxFQUFFLENBQUM7UUFDUixJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQztRQUNkLElBQUksQ0FBQyxPQUFPLEdBQUcsQ0FBQyxDQUFDO1FBQ2pCLElBQUksQ0FBQyxVQUFVLEdBQUcsY0FBSSxDQUFDLHdCQUF3QixDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDakUsQ0FBQztJQUVNLElBQUk7UUFDUCxPQUFPLE9BQU8sQ0FBQztJQUNuQixDQUFDO0lBRUQ7OztPQUdHO0lBQ0ksU0FBUztRQUNaLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUUsQ0FBQztJQUNqQyxDQUFDO0lBRUQ7OztPQUdHO0lBQ0ksTUFBTTtRQUNULE9BQU8sRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ25DLENBQUM7SUFFRDs7T0FFRztJQUNJLFFBQVE7UUFDWCxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUM7SUFDeEIsQ0FBQztJQUVEOzs7Ozs7Ozs7OztPQVdHO0lBQ0ksWUFBWSxDQUFDLE1BQWU7UUFDL0IsT0FBTyxjQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDdEQsQ0FBQztJQUVEOztPQUVHO0lBQ0ksUUFBUTtRQUNYLE9BQU8sSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO0lBQzNCLENBQUM7SUFFRDs7Ozs7Ozs7T0FRRztJQUNJLE1BQU0sQ0FBQyxLQUFvQjtRQUM5QixRQUFRLEtBQUssRUFBRTtZQUNYLEtBQUsscUJBQWEsQ0FBQyxLQUFLO2dCQUNwQixPQUFPLElBQUEsV0FBSSxFQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDO2dCQUMxQixNQUFNO1lBQ1YsS0FBSyxxQkFBYSxDQUFDLE1BQU07Z0JBQ3JCLE9BQU8sSUFBQSxXQUFJLEVBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUM7Z0JBQ3RDLE1BQU07WUFDVixLQUFLLHFCQUFhLENBQUMsR0FBRztnQkFDbEIsT0FBTyxJQUFBLFdBQUksRUFBQyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQztnQkFDeEIsTUFBTTtTQUNiO0lBQ0wsQ0FBQztJQUVEOztPQUVHO0lBQ0ksV0FBVztRQUNkLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQztJQUMzQixDQUFDO0lBRUQ7O09BRUc7SUFDSSxLQUFLO1FBQ1IsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQ25DLENBQUM7SUFFRDs7T0FFRztJQUNJLEdBQUc7UUFDTixPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFLENBQUM7SUFDakMsQ0FBQztDQUNKO0FBcEhELHNCQW9IQztBQUNEOzs7Ozs7Ozs7Ozs7Ozs7OztHQWlCRztBQUNILFNBQVMsWUFBWSxDQUFDLENBQUMsRUFBRSxFQUFFLEdBQUcsU0FBUztJQUNuQyxPQUFPLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztBQUM1QixDQUFDO0FBRXdCLDZCQUFLIn0=