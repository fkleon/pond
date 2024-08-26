"use strict";
/**
 *  Copyright (c) 2015-2017, The Regents of the University of California,
 *  through Lawrence Berkeley National Laboratory (subject to receipt
 *  of any required approvals from the U.S. Dept. of Energy).
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const Immutable = require("immutable");
const _ = require("lodash");
const moment = require("moment-timezone");
const duration_1 = require("./duration");
const index_1 = require("./index");
const period_1 = require("./period");
const time_1 = require("./time");
const timerange_1 = require("./timerange");
const UNITS = {
    n: { label: "nanoseconds", length: 1 / 1000000 },
    u: { label: "microseconds", length: 1 / 1000 },
    l: { label: "milliseconds", length: 1 },
    s: { label: "seconds", length: 1000 },
    m: { label: "minutes", length: 60 * 1000 },
    h: { label: "hours", length: 60 * 60 * 1000 },
    d: { label: "days", length: 60 * 60 * 24 * 1000 },
};
/**
 * A value is valid if it isn't either undefined, null, or a NaN
 */
function isValid(v) {
    return !(_.isUndefined(v) || _.isNaN(v) || _.isNull(v));
}
/**
 * The last duration of time until now, represented as a `TimeRange`
 */
function untilNow(d) {
    const t = new Date();
    const begin = new Date(+t - +d);
    return new timerange_1.TimeRange(begin, t);
}
/**
 * Single zero left padding, for days and months.
 */
function leftPad(value) {
    return `${value < 10 ? "0" : ""}${value}`;
}
const indexStringRegex = /^((([0-9]+)([smhdlun]))@)*(([0-9]+)([smhdlun]))(\+([0-9]+))*-([0-9]+)$/;
/**
 * Returns a duration in milliseconds given a window period.
 * For example "30s" (30 seconds) should return 30000ms. Accepts
 * seconds (e.g. "30s"), minutes (e.g. "5m"), hours (e.g. "6h") and
 * days (e.g. "30d") as the period.
 */
function windowDuration(p) {
    // window should be two parts, a number and a letter if it's a
    // range based index, e.g "1h".
    const parts = indexStringRegex.exec(p);
    if (parts && parts.length >= 3) {
        const num = parseInt(parts[1], 10);
        const unit = parts[2];
        return num * UNITS[unit].length * 1000;
    }
}
/**
 * Decodes a period based index string. The result is a structure containing:
 *  - decodedPeriod
 *  - decodedDuration
 *  - decodedIndex
 */
function decodeIndexString(indexString) {
    const parts = indexStringRegex.exec(indexString);
    const [g1, d, g2, g3, g4, frequency, g6, g7, g8, offset, i] = parts;
    const decodedPeriod = (0, period_1.period)((0, duration_1.duration)(frequency), offset ? (0, time_1.time)(parseInt(offset, 10)) : null);
    const decodedDuration = d ? (0, duration_1.duration)(d) : decodedPeriod.frequency();
    const decodedIndex = parseInt(i, 10);
    return { decodedPeriod, decodedDuration, decodedIndex };
}
function isIndexString(indexString) {
    return indexStringRegex.test(indexString);
}
/**
 * Helper function to get the window position relative
 * to Jan 1, 1970.
 */
function windowPositionFromDate(p, date) {
    const d = this.windowDuration(p);
    let dd = moment.utc(date).valueOf();
    return Math.floor((dd /= d));
}
/**
 * Given an index string, return the `TimeRange` that represents. This is the
 * main parsing function as far as taking an index string and decoding it into
 * the timerange that it represents. For example, this is how the Index
 * constructor is able to take a string and represent a timerange. It is also
 * used when windowing to determine trigger times.
 */
function timeRangeFromIndexString(indexString, tz = "Etc/UTC") {
    const parts = indexString.split("-");
    let beginTime;
    let endTime;
    switch (parts.length) {
        case 3:
            // A day, month and year e.g. 2014-10-24
            if (!_.isNaN(parseInt(parts[0], 10)) &&
                !_.isNaN(parseInt(parts[1], 10)) &&
                !_.isNaN(parseInt(parts[2], 10))) {
                const parsedYear = parseInt(parts[0], 10);
                const parsedMonth = parseInt(parts[1], 10);
                const parsedDay = parseInt(parts[2], 10);
                beginTime = moment.tz([parsedYear, parsedMonth - 1, parsedDay], tz);
                endTime = moment.tz([parsedYear, parsedMonth - 1, parsedDay], tz).endOf("day");
            }
            break;
        case 2:
            if (isIndexString(indexString)) {
                // Period index string e.g. 1d-1234
                const { decodedPeriod, decodedDuration, decodedIndex } = decodeIndexString(indexString);
                const beginTimestamp = decodedIndex * +decodedPeriod.frequency();
                const endTimestamp = beginTimestamp + +decodedDuration;
                beginTime = moment(beginTimestamp).tz(tz);
                endTime = moment(endTimestamp).tz(tz);
            }
            else if (!_.isNaN(parseInt(parts[0], 10)) && !_.isNaN(parseInt(parts[1], 10))) {
                // A month and year e.g 2015-09
                const parsedYear = parseInt(parts[0], 10);
                const parsedMonth = parseInt(parts[1], 10);
                beginTime = moment.tz([parsedYear, parsedMonth - 1], tz);
                endTime = moment.tz([parsedYear, parsedMonth - 1], tz).endOf("month");
            }
            break;
        // A year e.g. 2015
        case 1:
            const year = parseInt(parts[0], 10);
            beginTime = moment.tz([year], tz);
            endTime = moment.tz([year], tz).endOf("year");
            break;
    }
    if (beginTime && beginTime.isValid() && endTime && endTime.isValid()) {
        return (0, timerange_1.timerange)(beginTime, endTime);
    }
    else {
        return undefined;
    }
}
/**
 * Returns a nice string for an index string. If the index string is of
 * the form 1d-2345 then just that string is returned (there's not nice
 * way to put it), but if it represents a day, month, or year
 * (e.g. 2015-07) then a nice string like "July" will be returned. It's
 * also possible to pass in the format of the reply for these types of
 * strings. See moment's format naming conventions:
 * http://momentjs.com/docs/#/displaying/format/
 */
function niceIndexString(indexString, format) {
    let t;
    const parts = indexString.split("-");
    switch (parts.length) {
        case 3:
            if (!_.isNaN(parseInt(parts[0], 10)) &&
                !_.isNaN(parseInt(parts[1], 10)) &&
                !_.isNaN(parseInt(parts[2], 10))) {
                const parsedYear = parseInt(parts[0], 10);
                const parsedMonth = parseInt(parts[1], 10);
                const parsedDay = parseInt(parts[2], 10);
                t = moment.utc([parsedYear, parsedMonth - 1, parsedDay]);
                if (format) {
                    return t.format(format);
                }
                else {
                    return t.format("MMMM Do YYYY");
                }
            }
            break;
        case 2:
            if (isIndexString(indexString)) {
                return indexString;
            }
            else if (!_.isNaN(parseInt(parts[0], 10)) && !_.isNaN(parseInt(parts[1], 10))) {
                const parsedYear = parseInt(parts[0], 10);
                const parsedMonth = parseInt(parts[1], 10);
                t = moment.utc([parsedYear, parsedMonth - 1]);
                if (format) {
                    return t.format(format);
                }
                else {
                    return t.format("MMMM");
                }
            }
            break;
        case 1:
            const year = parts[0];
            t = moment.utc([year]);
            if (format) {
                return t.format(format);
            }
            else {
                return t.format("YYYY");
            }
    }
    return indexString;
}
/**
 * Returns true if the value is null, undefined or NaN
 */
function isMissing(val) {
    return _.isNull(val) || _.isUndefined(val) || _.isNaN(val);
}
/**
 * Function to turn a constructor args into a timestamp
 */
function timestampFromArg(arg) {
    if (_.isNumber(arg)) {
        return new Date(arg);
    }
    else if (_.isString(arg)) {
        return new Date(+arg);
    }
    else if (_.isDate(arg)) {
        return new Date(arg.getTime());
    }
    else if (moment.isMoment(arg)) {
        return new Date(arg.valueOf());
    }
    else {
        throw new Error(`Unable to get timestamp from ${arg}. Should be a number, date, or moment.`);
    }
}
/**
 * Function to turn a constructor args into a `TimeRange`
 */
function timeRangeFromArg(arg) {
    if (arg instanceof timerange_1.TimeRange) {
        return arg;
    }
    else if (_.isString(arg)) {
        const [begin, end] = arg.split(",");
        return new timerange_1.TimeRange(+begin, +end);
    }
    else if (_.isArray(arg) && arg.length === 2) {
        const argArray = arg;
        return new timerange_1.TimeRange(argArray[0], argArray[1]);
    }
    else {
        throw new Error(`Unable to parse timerange. Should be a TimeRange. Got ${arg}.`);
    }
}
/**
 * Function to turn a constructor of two args into an `Index`.
 * The second arg defines the timezone (local or UTC)
 */
function indexFromArgs(arg1, arg2 = "Etc/UTC") {
    if (_.isString(arg1)) {
        return (0, index_1.index)(arg1, arg2);
    }
    else if (arg1 instanceof index_1.Index) {
        return arg1;
    }
    else {
        throw new Error(`Unable to get index from ${arg1}. Should be a string or Index.`);
    }
}
/**
 * Function to turn a constructor arg into an `Immutable.Map`
 * of data.
 */
function dataFromArg(arg) {
    let data;
    if (_.isObject(arg)) {
        // Deeply convert the data to Immutable Map
        data = Immutable.fromJS(arg);
    }
    else if (data instanceof Immutable.Map) {
        // Copy reference to the data
        data = arg;
    }
    else if (_.isNumber(arg) || _.isString(arg)) {
        // Just add it to the value key of a new Map
        // e.g. new Event(t, 25); -> t, {value: 25}
        data = Immutable.Map({ value: arg });
    }
    else {
        throw new Error(`Unable to interpret event data from ${arg}.`);
    }
    return data;
}
/**
 * Convert the `field spec` into a list if it is not already.
 */
function fieldAsArray(field) {
    if (_.isArray(field)) {
        return field;
    }
    else if (_.isString(field)) {
        return field.split(".");
    }
}
exports.default = {
    dataFromArg,
    fieldAsArray,
    indexFromArgs,
    isMissing,
    isValid,
    leftPad,
    isIndexString,
    decodeIndexString,
    niceIndexString,
    timeRangeFromArg,
    timeRangeFromIndexString,
    timestampFromArg,
    untilNow,
    windowDuration,
    windowPositionFromDate,
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy91dGlsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7Ozs7R0FRRzs7QUFFSCx1Q0FBdUM7QUFDdkMsNEJBQTRCO0FBQzVCLDBDQUEwQztBQUUxQyx5Q0FBZ0Q7QUFDaEQsbUNBQXVDO0FBQ3ZDLHFDQUEwQztBQUMxQyxpQ0FBOEI7QUFDOUIsMkNBQW1EO0FBRW5ELE1BQU0sS0FBSyxHQUFHO0lBQ1YsQ0FBQyxFQUFFLEVBQUUsS0FBSyxFQUFFLGFBQWEsRUFBRSxNQUFNLEVBQUUsQ0FBQyxHQUFHLE9BQU8sRUFBRTtJQUNoRCxDQUFDLEVBQUUsRUFBRSxLQUFLLEVBQUUsY0FBYyxFQUFFLE1BQU0sRUFBRSxDQUFDLEdBQUcsSUFBSSxFQUFFO0lBQzlDLENBQUMsRUFBRSxFQUFFLEtBQUssRUFBRSxjQUFjLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRTtJQUN2QyxDQUFDLEVBQUUsRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUU7SUFDckMsQ0FBQyxFQUFFLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsRUFBRSxHQUFHLElBQUksRUFBRTtJQUMxQyxDQUFDLEVBQUUsRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFLEdBQUcsRUFBRSxHQUFHLElBQUksRUFBRTtJQUM3QyxDQUFDLEVBQUUsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxJQUFJLEVBQUU7Q0FDcEQsQ0FBQztBQUVGOztHQUVHO0FBQ0gsU0FBUyxPQUFPLENBQUMsQ0FBUztJQUN0QixPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzVELENBQUM7QUFFRDs7R0FFRztBQUNILFNBQVMsUUFBUSxDQUFDLENBQVc7SUFDekIsTUFBTSxDQUFDLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQztJQUNyQixNQUFNLEtBQUssR0FBRyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ2hDLE9BQU8sSUFBSSxxQkFBUyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztBQUNuQyxDQUFDO0FBRUQ7O0dBRUc7QUFDSCxTQUFTLE9BQU8sQ0FBQyxLQUFhO0lBQzFCLE9BQU8sR0FBRyxLQUFLLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxLQUFLLEVBQUUsQ0FBQztBQUM5QyxDQUFDO0FBRUQsTUFBTSxnQkFBZ0IsR0FBRyx3RUFBd0UsQ0FBQztBQUVsRzs7Ozs7R0FLRztBQUNILFNBQVMsY0FBYyxDQUFDLENBQVM7SUFDN0IsOERBQThEO0lBQzlELCtCQUErQjtJQUUvQixNQUFNLEtBQUssR0FBRyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDdkMsSUFBSSxLQUFLLElBQUksS0FBSyxDQUFDLE1BQU0sSUFBSSxDQUFDLEVBQUU7UUFDNUIsTUFBTSxHQUFHLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUNuQyxNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdEIsT0FBTyxHQUFHLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUM7S0FDMUM7QUFDTCxDQUFDO0FBUUQ7Ozs7O0dBS0c7QUFDSCxTQUFTLGlCQUFpQixDQUFDLFdBQW1CO0lBQzFDLE1BQU0sS0FBSyxHQUFHLGdCQUFnQixDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUNqRCxNQUFNLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxTQUFTLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQztJQUVwRSxNQUFNLGFBQWEsR0FBRyxJQUFBLGVBQU0sRUFBQyxJQUFBLG1CQUFRLEVBQUMsU0FBUyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFBLFdBQUksRUFBQyxRQUFRLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzlGLE1BQU0sZUFBZSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBQSxtQkFBUSxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsU0FBUyxFQUFFLENBQUM7SUFDcEUsTUFBTSxZQUFZLEdBQUcsUUFBUSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUVyQyxPQUFPLEVBQUUsYUFBYSxFQUFFLGVBQWUsRUFBRSxZQUFZLEVBQUUsQ0FBQztBQUM1RCxDQUFDO0FBRUQsU0FBUyxhQUFhLENBQUMsV0FBbUI7SUFDdEMsT0FBTyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7QUFDOUMsQ0FBQztBQUVEOzs7R0FHRztBQUNILFNBQVMsc0JBQXNCLENBQUMsQ0FBUyxFQUFFLElBQVU7SUFDakQsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNqQyxJQUFJLEVBQUUsR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ3BDLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2pDLENBQUM7QUFFRDs7Ozs7O0dBTUc7QUFDSCxTQUFTLHdCQUF3QixDQUFDLFdBQW1CLEVBQUUsS0FBYSxTQUFTO0lBQ3pFLE1BQU0sS0FBSyxHQUFHLFdBQVcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7SUFFckMsSUFBSSxTQUFpQixDQUFDO0lBQ3RCLElBQUksT0FBZSxDQUFDO0lBRXBCLFFBQVEsS0FBSyxDQUFDLE1BQU0sRUFBRTtRQUNsQixLQUFLLENBQUM7WUFDRix3Q0FBd0M7WUFDeEMsSUFDSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDaEMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQ2hDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQ2xDO2dCQUNFLE1BQU0sVUFBVSxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQzFDLE1BQU0sV0FBVyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQzNDLE1BQU0sU0FBUyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQ3pDLFNBQVMsR0FBRyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsVUFBVSxFQUFFLFdBQVcsR0FBRyxDQUFDLEVBQUUsU0FBUyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQ3BFLE9BQU8sR0FBRyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsVUFBVSxFQUFFLFdBQVcsR0FBRyxDQUFDLEVBQUUsU0FBUyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDO2FBQ2xGO1lBQ0QsTUFBTTtRQUVWLEtBQUssQ0FBQztZQUNGLElBQUksYUFBYSxDQUFDLFdBQVcsQ0FBQyxFQUFFO2dCQUM1QixtQ0FBbUM7Z0JBQ25DLE1BQU0sRUFBRSxhQUFhLEVBQUUsZUFBZSxFQUFFLFlBQVksRUFBRSxHQUNsRCxpQkFBaUIsQ0FBQyxXQUFXLENBQUMsQ0FBQztnQkFDbkMsTUFBTSxjQUFjLEdBQUcsWUFBWSxHQUFHLENBQUMsYUFBYSxDQUFDLFNBQVMsRUFBRSxDQUFDO2dCQUNqRSxNQUFNLFlBQVksR0FBRyxjQUFjLEdBQUcsQ0FBQyxlQUFlLENBQUM7Z0JBQ3ZELFNBQVMsR0FBRyxNQUFNLENBQUMsY0FBYyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUMxQyxPQUFPLEdBQUcsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQzthQUN6QztpQkFBTSxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRTtnQkFDN0UsK0JBQStCO2dCQUMvQixNQUFNLFVBQVUsR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO2dCQUMxQyxNQUFNLFdBQVcsR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO2dCQUMzQyxTQUFTLEdBQUcsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFVBQVUsRUFBRSxXQUFXLEdBQUcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQ3pELE9BQU8sR0FBRyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsVUFBVSxFQUFFLFdBQVcsR0FBRyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7YUFDekU7WUFDRCxNQUFNO1FBRVYsbUJBQW1CO1FBQ25CLEtBQUssQ0FBQztZQUNGLE1BQU0sSUFBSSxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDcEMsU0FBUyxHQUFHLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUNsQyxPQUFPLEdBQUcsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUM5QyxNQUFNO0tBQ2I7SUFFRCxJQUFJLFNBQVMsSUFBSSxTQUFTLENBQUMsT0FBTyxFQUFFLElBQUksT0FBTyxJQUFJLE9BQU8sQ0FBQyxPQUFPLEVBQUUsRUFBRTtRQUNsRSxPQUFPLElBQUEscUJBQVMsRUFBQyxTQUFTLEVBQUUsT0FBTyxDQUFDLENBQUM7S0FDeEM7U0FBTTtRQUNILE9BQU8sU0FBUyxDQUFDO0tBQ3BCO0FBQ0wsQ0FBQztBQUVEOzs7Ozs7OztHQVFHO0FBQ0gsU0FBUyxlQUFlLENBQUMsV0FBbUIsRUFBRSxNQUFjO0lBQ3hELElBQUksQ0FBQyxDQUFDO0lBQ04sTUFBTSxLQUFLLEdBQUcsV0FBVyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNyQyxRQUFRLEtBQUssQ0FBQyxNQUFNLEVBQUU7UUFDbEIsS0FBSyxDQUFDO1lBQ0YsSUFDSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDaEMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQ2hDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQ2xDO2dCQUNFLE1BQU0sVUFBVSxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQzFDLE1BQU0sV0FBVyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQzNDLE1BQU0sU0FBUyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQ3pDLENBQUMsR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsVUFBVSxFQUFFLFdBQVcsR0FBRyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQztnQkFDekQsSUFBSSxNQUFNLEVBQUU7b0JBQ1IsT0FBTyxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2lCQUMzQjtxQkFBTTtvQkFDSCxPQUFPLENBQUMsQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLENBQUM7aUJBQ25DO2FBQ0o7WUFDRCxNQUFNO1FBQ1YsS0FBSyxDQUFDO1lBQ0YsSUFBSSxhQUFhLENBQUMsV0FBVyxDQUFDLEVBQUU7Z0JBQzVCLE9BQU8sV0FBVyxDQUFDO2FBQ3RCO2lCQUFNLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFO2dCQUM3RSxNQUFNLFVBQVUsR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO2dCQUMxQyxNQUFNLFdBQVcsR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO2dCQUMzQyxDQUFDLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLFVBQVUsRUFBRSxXQUFXLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDOUMsSUFBSSxNQUFNLEVBQUU7b0JBQ1IsT0FBTyxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2lCQUMzQjtxQkFBTTtvQkFDSCxPQUFPLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7aUJBQzNCO2FBQ0o7WUFDRCxNQUFNO1FBQ1YsS0FBSyxDQUFDO1lBQ0YsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3RCLENBQUMsR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUN2QixJQUFJLE1BQU0sRUFBRTtnQkFDUixPQUFPLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7YUFDM0I7aUJBQU07Z0JBQ0gsT0FBTyxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2FBQzNCO0tBQ1I7SUFDRCxPQUFPLFdBQVcsQ0FBQztBQUN2QixDQUFDO0FBRUQ7O0dBRUc7QUFDSCxTQUFTLFNBQVMsQ0FBQyxHQUFRO0lBQ3ZCLE9BQU8sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDL0QsQ0FBQztBQUVEOztHQUVHO0FBQ0gsU0FBUyxnQkFBZ0IsQ0FBQyxHQUFvQztJQUMxRCxJQUFJLENBQUMsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUU7UUFDakIsT0FBTyxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztLQUN4QjtTQUFNLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRTtRQUN4QixPQUFPLElBQUksSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7S0FDekI7U0FBTSxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEVBQUU7UUFDdEIsT0FBTyxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQztLQUNsQztTQUFNLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRTtRQUM3QixPQUFPLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO0tBQ2xDO1NBQU07UUFDSCxNQUFNLElBQUksS0FBSyxDQUNYLGdDQUFnQyxHQUFHLHdDQUF3QyxDQUM5RSxDQUFDO0tBQ0w7QUFDTCxDQUFDO0FBRUQ7O0dBRUc7QUFDSCxTQUFTLGdCQUFnQixDQUFDLEdBQWdDO0lBQ3RELElBQUksR0FBRyxZQUFZLHFCQUFTLEVBQUU7UUFDMUIsT0FBTyxHQUFHLENBQUM7S0FDZDtTQUFNLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRTtRQUN4QixNQUFNLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDcEMsT0FBTyxJQUFJLHFCQUFTLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQztLQUN0QztTQUFNLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxHQUFHLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtRQUMzQyxNQUFNLFFBQVEsR0FBRyxHQUFhLENBQUM7UUFDL0IsT0FBTyxJQUFJLHFCQUFTLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQ2xEO1NBQU07UUFDSCxNQUFNLElBQUksS0FBSyxDQUFDLHlEQUF5RCxHQUFHLEdBQUcsQ0FBQyxDQUFDO0tBQ3BGO0FBQ0wsQ0FBQztBQUVEOzs7R0FHRztBQUNILFNBQVMsYUFBYSxDQUFDLElBQW9CLEVBQUUsT0FBZSxTQUFTO0lBQ2pFLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUNsQixPQUFPLElBQUEsYUFBSyxFQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztLQUM1QjtTQUFNLElBQUksSUFBSSxZQUFZLGFBQUssRUFBRTtRQUM5QixPQUFPLElBQUksQ0FBQztLQUNmO1NBQU07UUFDSCxNQUFNLElBQUksS0FBSyxDQUFDLDRCQUE0QixJQUFJLGdDQUFnQyxDQUFDLENBQUM7S0FDckY7QUFDTCxDQUFDO0FBRUQ7OztHQUdHO0FBQ0gsU0FBUyxXQUFXLENBQ2hCLEdBQXNEO0lBRXRELElBQUksSUFBSSxDQUFDO0lBQ1QsSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUFFO1FBQ2pCLDJDQUEyQztRQUMzQyxJQUFJLEdBQUcsU0FBUyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztLQUNoQztTQUFNLElBQUksSUFBSSxZQUFZLFNBQVMsQ0FBQyxHQUFHLEVBQUU7UUFDdEMsNkJBQTZCO1FBQzdCLElBQUksR0FBRyxHQUFHLENBQUM7S0FDZDtTQUFNLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUFFO1FBQzNDLDRDQUE0QztRQUM1QywyQ0FBMkM7UUFDM0MsSUFBSSxHQUFHLFNBQVMsQ0FBQyxHQUFHLENBQUMsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQztLQUN4QztTQUFNO1FBQ0gsTUFBTSxJQUFJLEtBQUssQ0FBQyx1Q0FBdUMsR0FBRyxHQUFHLENBQUMsQ0FBQztLQUNsRTtJQUNELE9BQU8sSUFBSSxDQUFDO0FBQ2hCLENBQUM7QUFFRDs7R0FFRztBQUNILFNBQVMsWUFBWSxDQUFDLEtBQXdCO0lBQzFDLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsRUFBRTtRQUNsQixPQUFPLEtBQUssQ0FBQztLQUNoQjtTQUFNLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsRUFBRTtRQUMxQixPQUFPLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7S0FDM0I7QUFDTCxDQUFDO0FBRUQsa0JBQWU7SUFDWCxXQUFXO0lBQ1gsWUFBWTtJQUNaLGFBQWE7SUFDYixTQUFTO0lBQ1QsT0FBTztJQUNQLE9BQU87SUFDUCxhQUFhO0lBQ2IsaUJBQWlCO0lBQ2pCLGVBQWU7SUFDZixnQkFBZ0I7SUFDaEIsd0JBQXdCO0lBQ3hCLGdCQUFnQjtJQUNoQixRQUFRO0lBQ1IsY0FBYztJQUNkLHNCQUFzQjtDQUN6QixDQUFDIn0=