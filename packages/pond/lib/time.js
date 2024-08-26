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
exports.time = exports.now = exports.Time = void 0;
const _ = require("lodash");
const key_1 = require("./key");
const timerange_1 = require("./timerange");
const types_1 = require("./types");
/**
 * Constructs a new `Time` object that can be used as a key for `Event`'s.
 *
 * A `Time` object represents a timestamp, and is stored as a Javascript `Date`
 * object. The difference with just a `Date` is that is conforms to the interface
 * required to be an `Event` key.
 */
class Time extends key_1.Key {
    static isTime(t) {
        return t instanceof Time;
    }
    constructor(d) {
        super();
        if (_.isDate(d)) {
            this._d = d;
        }
        else if (_.isNumber(d)) {
            this._d = new Date(d);
        }
        else if (_.isString(d)) {
            this._d = new Date(d);
        }
        else {
            this._d = new Date();
        }
    }
    type() {
        return "time";
    }
    toJSON() {
        return { time: +this._d };
    }
    toString() {
        return JSON.stringify(this.toJSON());
    }
    /**
     * Returns the native Date object for this `Time`
     */
    toDate() {
        return this.timestamp();
    }
    /**
     * The timestamp of this data, in UTC time, as a string.
     */
    toUTCString() {
        return this.timestamp().toUTCString();
    }
    /**
     * The timestamp of this data, in Local time, as a string.
     */
    toLocalString() {
        return this.timestamp().toString();
    }
    /**
     * The timestamp of this data
     */
    timestamp() {
        return this._d;
    }
    valueOf() {
        return +this._d;
    }
    /**
     * The begin time of this `Event`, which will be just the timestamp
     */
    begin() {
        return this.timestamp();
    }
    /**
     * The end time of this `Event`, which will be just the timestamp
     */
    end() {
        return this.timestamp();
    }
    /**
     * Takes this Time and returns a TimeRange of given duration
     * which is either centrally located around the Time, or aligned
     * to either the Begin or End time.
     *
     * For example remapping keys, each one of the keys is a Time, but
     * we want to convert the timeseries to use TimeRanges instead:
     * ```
     * const remapped = series.mapKeys(t => t.toTimeRange(duration("5m"), TimeAlignment.Middle));
     * ```
     *
     * The alignment is either:
     *  * TimeAlignment.Begin
     *  * TimeAlignment.Middle
     *  * TimeAlignment.End
     *
     */
    toTimeRange(duration, align) {
        const d = +duration;
        const timestamp = +this.timestamp();
        switch (align) {
            case types_1.TimeAlignment.Begin:
                return new timerange_1.TimeRange(timestamp, timestamp + d);
            case types_1.TimeAlignment.Middle:
                const half = Math.round(d / 2);
                return new timerange_1.TimeRange(timestamp - half, timestamp + d - half);
            case types_1.TimeAlignment.End:
                return new timerange_1.TimeRange(timestamp - d, timestamp);
        }
    }
}
exports.Time = Time;
/**
 * Constructs a new `Time` object. A `Time` object represents a timestamp,
 * and is stored as a Javascript `Date` object. The difference with just a Date is that
 * this conforms to the interface required to be an `Event` key.
 */
function timeFactory(d) {
    return new Time(d);
}
exports.time = timeFactory;
/**
 * Returns the the current time as a `Time` object
 */
function now() {
    return new Time(new Date());
}
exports.now = now;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGltZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy90aW1lLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7Ozs7R0FRRzs7O0FBRUgsNEJBQTRCO0FBRTVCLCtCQUE0QjtBQUM1QiwyQ0FBd0M7QUFDeEMsbUNBQXdDO0FBRXhDOzs7Ozs7R0FNRztBQUNILE1BQWEsSUFBSyxTQUFRLFNBQUc7SUFDekIsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFPO1FBQ2pCLE9BQU8sQ0FBQyxZQUFZLElBQUksQ0FBQztJQUM3QixDQUFDO0lBSUQsWUFBWSxDQUEwQjtRQUNsQyxLQUFLLEVBQUUsQ0FBQztRQUNSLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUNiLElBQUksQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1NBQ2Y7YUFBTSxJQUFJLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDdEIsSUFBSSxDQUFDLEVBQUUsR0FBRyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUN6QjthQUFNLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUN0QixJQUFJLENBQUMsRUFBRSxHQUFHLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQ3pCO2FBQU07WUFDSCxJQUFJLENBQUMsRUFBRSxHQUFHLElBQUksSUFBSSxFQUFFLENBQUM7U0FDeEI7SUFDTCxDQUFDO0lBRUQsSUFBSTtRQUNBLE9BQU8sTUFBTSxDQUFDO0lBQ2xCLENBQUM7SUFFRCxNQUFNO1FBQ0YsT0FBTyxFQUFFLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQztJQUM5QixDQUFDO0lBRUQsUUFBUTtRQUNKLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQztJQUN6QyxDQUFDO0lBRUQ7O09BRUc7SUFDSCxNQUFNO1FBQ0YsT0FBTyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7SUFDNUIsQ0FBQztJQUVEOztPQUVHO0lBQ0gsV0FBVztRQUNQLE9BQU8sSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDLFdBQVcsRUFBRSxDQUFDO0lBQzFDLENBQUM7SUFFRDs7T0FFRztJQUNILGFBQWE7UUFDVCxPQUFPLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQztJQUN2QyxDQUFDO0lBRUQ7O09BRUc7SUFDSCxTQUFTO1FBQ0wsT0FBTyxJQUFJLENBQUMsRUFBRSxDQUFDO0lBQ25CLENBQUM7SUFFRCxPQUFPO1FBQ0gsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7SUFDcEIsQ0FBQztJQUVEOztPQUVHO0lBQ0gsS0FBSztRQUNELE9BQU8sSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO0lBQzVCLENBQUM7SUFFRDs7T0FFRztJQUNILEdBQUc7UUFDQyxPQUFPLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztJQUM1QixDQUFDO0lBRUQ7Ozs7Ozs7Ozs7Ozs7Ozs7T0FnQkc7SUFDSCxXQUFXLENBQUMsUUFBa0IsRUFBRSxLQUFvQjtRQUNoRCxNQUFNLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQztRQUNwQixNQUFNLFNBQVMsR0FBRyxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUNwQyxRQUFRLEtBQUssRUFBRTtZQUNYLEtBQUsscUJBQWEsQ0FBQyxLQUFLO2dCQUNwQixPQUFPLElBQUkscUJBQVMsQ0FBQyxTQUFTLEVBQUUsU0FBUyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ25ELEtBQUsscUJBQWEsQ0FBQyxNQUFNO2dCQUNyQixNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztnQkFDL0IsT0FBTyxJQUFJLHFCQUFTLENBQUMsU0FBUyxHQUFHLElBQUksRUFBRSxTQUFTLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDO1lBQ2pFLEtBQUsscUJBQWEsQ0FBQyxHQUFHO2dCQUNsQixPQUFPLElBQUkscUJBQVMsQ0FBQyxTQUFTLEdBQUcsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1NBQ3REO0lBQ0wsQ0FBQztDQUNKO0FBNUdELG9CQTRHQztBQUVEOzs7O0dBSUc7QUFDSCxTQUFTLFdBQVcsQ0FBQyxDQUEwQjtJQUMzQyxPQUFPLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3ZCLENBQUM7QUFTNEIsMkJBQUk7QUFQakM7O0dBRUc7QUFDSCxTQUFTLEdBQUc7SUFDUixPQUFPLElBQUksSUFBSSxDQUFDLElBQUksSUFBSSxFQUFFLENBQUMsQ0FBQztBQUNoQyxDQUFDO0FBRVEsa0JBQUcifQ==