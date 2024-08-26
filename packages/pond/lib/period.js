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
exports.period = exports.Period = void 0;
const Immutable = require("immutable");
const _ = require("lodash");
const time_1 = require("./time");
/**
 * A `Period` is a repeating time which is typically used to
 * either define the repeating nature of a `Window` or to describe periodic
 * boundaries of fill or align operations when doing data cleaning
 * on a `TimeSeries`.
 *
 * Periods have a frequency and an offset. If there is no offset, it
 * is aligned to Jan 1, 1970 00:00 UTC.
 *
 * To create a repeating window, see `Window` creation.
 */
class Period {
    /**
     * To define a `Period`, you need to supply the `duration` of the frequency that the
     * period repeats on. Optionally you can specify an `offset` for the period.
     *
     * Typically you would construct a `Period` object with the `period()` factory
     * function, which has a chaining style to it to make it easier to read in the code.
     * There is also a more standard constructor form.
     *
     * Example:
     * ```
     * const everyFiveMinutes = period()
     *     .every(duration("5m"))
     *     .offsetBy(time("2017-07-21T09:38:00.000Z"));
     * ```
     */
    constructor(frequency, offset) {
        this._frequency = frequency;
        this._offset = offset && !_.isNaN(offset) ? offset.timestamp().getTime() : 0;
    }
    /**
     * The `Period` expressed as a string, which is either $freq or $freq-$offset
     * depending on if an offset is present.
     */
    toString() {
        return this._offset ? `${this._frequency}+${this._offset}` : `${this._frequency}`;
    }
    /**
     * Returns the frequency part of the `Period`
     */
    frequency() {
        return this._frequency;
    }
    /**
     * Returns the offset of the `Period`
     */
    offset() {
        return this._offset;
    }
    /**
     * Chaining style specification of the `Duration` of the `Period`.
     * Returns a new `Period`.
     */
    every(frequency) {
        return new Period(frequency, (0, time_1.time)(this._offset));
    }
    /**
     * Chaining style specification of the offset, supplied as a `Time`.
     * Returns a new `Period`.
     */
    offsetBy(offset) {
        return new Period(this._frequency, offset);
    }
    /**
     * Returns true if the `Time` supplied is aligned with this `Period`.
     * If the `Period` is every 5m then 1:35pm align (true) while 1:36 would
     * not (false).
     */
    isAligned(t) {
        return ((+t - +this._offset) / +this._frequency) % 1 === 0;
    }
    /**
     * Given a `Time`, find the next `Time` aligned to the period.
     */
    next(t) {
        const index = Math.ceil((+t - +this._offset) / +this._frequency);
        const next = index * +this._frequency + this._offset;
        return next === +t ? new time_1.Time(next + +this._frequency) : new time_1.Time(next);
    }
    /**
     * Returns an `Immutable.List` of `Time`s within the given `TimeRange`
     * that align with this `Period`. Not this will potentially include
     * the start time of the timerange but never the end time of the timerange.
     *
     * Example:
     * ```
     * const range = timerange(
     *     time("2017-07-21T09:30:00.000Z"),
     *     time("2017-07-21T09:45:00.000Z")
     * );
     * const everyFiveMinutes = period()
     *     .every(duration("5m"))
     *     .offsetBy(time("2017-07-21T09:38:00.000Z"));
     *
     * const within = everyFiveMinutes.within(range);  // 9:33am, 9:38am, 9:43am
     * ```
     */
    within(timerange) {
        let result = Immutable.List();
        const t1 = (0, time_1.time)(timerange.begin());
        const t2 = (0, time_1.time)(timerange.end());
        let scan = this.isAligned(t1) ? t1 : this.next(t1);
        while (+scan < +t2) {
            result = result.push(scan);
            scan = this.next(scan);
        }
        return result;
    }
}
exports.Period = Period;
/**
 * A `Period` is a repeating time which is typically used in Pond to
 * either define the repeating nature of a `Window`
 * or to describe `Align` or `Fill` positions when doing data cleaning
 * on a `TimeSeries`.
 *
 * To define a `Period`, you need to supply the `duration` of the frequency that the
 * period repeats on. Optionally you can specify an `offset` for the period. You can
 * also use a chaining style construction.
 */
function period(frequency, offset) {
    return new Period(frequency, offset);
}
exports.period = period;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGVyaW9kLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL3BlcmlvZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7Ozs7O0dBUUc7OztBQUVILHVDQUF1QztBQUN2Qyw0QkFBNEI7QUFHNUIsaUNBQW9DO0FBR3BDOzs7Ozs7Ozs7O0dBVUc7QUFDSCxNQUFhLE1BQU07SUFJZjs7Ozs7Ozs7Ozs7Ozs7T0FjRztJQUNILFlBQVksU0FBb0IsRUFBRSxNQUFhO1FBQzNDLElBQUksQ0FBQyxVQUFVLEdBQUcsU0FBUyxDQUFDO1FBQzVCLElBQUksQ0FBQyxPQUFPLEdBQUcsTUFBTSxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDakYsQ0FBQztJQUVEOzs7T0FHRztJQUNILFFBQVE7UUFDSixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLFVBQVUsSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO0lBQ3RGLENBQUM7SUFFRDs7T0FFRztJQUNILFNBQVM7UUFDTCxPQUFPLElBQUksQ0FBQyxVQUFVLENBQUM7SUFDM0IsQ0FBQztJQUVEOztPQUVHO0lBQ0gsTUFBTTtRQUNGLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQztJQUN4QixDQUFDO0lBRUQ7OztPQUdHO0lBQ0gsS0FBSyxDQUFDLFNBQW1CO1FBQ3JCLE9BQU8sSUFBSSxNQUFNLENBQUMsU0FBUyxFQUFFLElBQUEsV0FBSSxFQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO0lBQ3JELENBQUM7SUFFRDs7O09BR0c7SUFDSCxRQUFRLENBQUMsTUFBWTtRQUNqQixPQUFPLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDL0MsQ0FBQztJQUVEOzs7O09BSUc7SUFDSCxTQUFTLENBQUMsQ0FBTztRQUNiLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDL0QsQ0FBQztJQUVEOztPQUVHO0lBQ0gsSUFBSSxDQUFDLENBQU87UUFDUixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDakUsTUFBTSxJQUFJLEdBQUcsS0FBSyxHQUFHLENBQUMsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDO1FBQ3JELE9BQU8sSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLFdBQUksQ0FBQyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksV0FBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzVFLENBQUM7SUFFRDs7Ozs7Ozs7Ozs7Ozs7Ozs7T0FpQkc7SUFDSCxNQUFNLENBQUMsU0FBb0I7UUFDdkIsSUFBSSxNQUFNLEdBQUcsU0FBUyxDQUFDLElBQUksRUFBUSxDQUFDO1FBRXBDLE1BQU0sRUFBRSxHQUFHLElBQUEsV0FBSSxFQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBQ25DLE1BQU0sRUFBRSxHQUFHLElBQUEsV0FBSSxFQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDO1FBRWpDLElBQUksSUFBSSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNuRCxPQUFPLENBQUMsSUFBSSxHQUFHLENBQUMsRUFBRSxFQUFFO1lBQ2hCLE1BQU0sR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzNCLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQzFCO1FBRUQsT0FBTyxNQUFNLENBQUM7SUFDbEIsQ0FBQztDQUNKO0FBaEhELHdCQWdIQztBQUVEOzs7Ozs7Ozs7R0FTRztBQUNILFNBQVMsTUFBTSxDQUFDLFNBQW9CLEVBQUUsTUFBYTtJQUMvQyxPQUFPLElBQUksTUFBTSxDQUFDLFNBQVMsRUFBRSxNQUFNLENBQUMsQ0FBQztBQUN6QyxDQUFDO0FBRVEsd0JBQU0ifQ==